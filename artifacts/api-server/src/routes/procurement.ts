import { Router } from "express";
import { db } from "@workspace/db";
import {
  vendorsTable, purchaseRequestsTable, purchaseRequestApprovalsTable,
  purchaseOrdersTable, purchaseOrderItemsTable, purchaseOrderReceiptsTable,
  vendorPerformanceTable, usersTable, notificationsTable, departmentsTable,
} from "@workspace/db";
import { eq, and, desc, asc, sql, inArray, ne, gte, lte } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────────
async function getUserMap() {
  const users = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role, department: usersTable.department }).from(usersTable);
  return new Map(users.map(u => [u.id, u]));
}

async function getVendorMap() {
  const vendors = await db.select({ id: vendorsTable.id, name: vendorsTable.name, currency: vendorsTable.currency }).from(vendorsTable);
  return new Map(vendors.map(v => [v.id, v]));
}

function generatePoNumber(): string {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `PO-${year}-${rand}`;
}

async function notifyUsers(userIds: number[], title: string, message: string) {
  if (!userIds.length) return;
  await db.insert(notificationsTable).values(userIds.map(userId => ({
    userId, type: "system" as const, title, message, isRead: false,
  })));
}

async function getManagerIds(): Promise<number[]> {
  const managers = await db.select({ id: usersTable.id }).from(usersTable)
    .where(sql`${usersTable.role} IN ('admin','manager','ceo')`);
  return managers.map(m => m.id);
}

async function enrichPR(pr: any, userMap: Map<number, any>) {
  const approvals = await db.select().from(purchaseRequestApprovalsTable)
    .where(eq(purchaseRequestApprovalsTable.purchaseRequestId, pr.id))
    .orderBy(asc(purchaseRequestApprovalsTable.level));
  return {
    ...pr,
    requestedBy: userMap.get(pr.requestedById) ?? null,
    approvals: approvals.map(a => ({ ...a, approver: userMap.get(a.approverId) ?? null })),
  };
}

async function enrichPO(po: any, userMap: Map<number, any>, vendorMap: Map<number, any>) {
  const [items, receipts, perf] = await Promise.all([
    db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.purchaseOrderId, po.id)),
    db.select().from(purchaseOrderReceiptsTable).where(eq(purchaseOrderReceiptsTable.purchaseOrderId, po.id)),
    db.select().from(vendorPerformanceTable).where(eq(vendorPerformanceTable.purchaseOrderId, po.id)),
  ]);
  return {
    ...po,
    vendor: vendorMap.get(po.vendorId) ?? null,
    raisedBy: userMap.get(po.raisedById) ?? null,
    items,
    receipts,
    performance: perf[0] ?? null,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// VENDORS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/vendors", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { category, status, country, rating } = req.query as any;
    let query = db.select().from(vendorsTable).orderBy(asc(vendorsTable.name)) as any;
    const conditions: any[] = [];
    if (category) conditions.push(eq(vendorsTable.category, category));
    if (status) conditions.push(eq(vendorsTable.status, status));
    if (country) conditions.push(eq(vendorsTable.country, country));
    if (rating) conditions.push(eq(vendorsTable.rating, parseInt(rating)));
    if (conditions.length) query = query.where(and(...conditions));
    const vendors = await query;

    // Enrich with PO count and total spend
    const pos = await db.select({
      vendorId: purchaseOrdersTable.vendorId,
      totalAmount: purchaseOrdersTable.totalAmount,
      status: purchaseOrdersTable.status,
    }).from(purchaseOrdersTable);

    const enriched = vendors.map((v: any) => {
      const vendorPos = pos.filter((p: any) => p.vendorId === v.id);
      const activePOs = vendorPos.filter((p: any) => !["received", "closed", "cancelled"].includes(p.status)).length;
      const totalSpend = vendorPos.reduce((sum: number, p: any) => sum + (parseFloat(p.totalAmount ?? "0") || 0), 0);
      return { ...v, activePOs, totalSpend };
    });
    res.json(enriched);
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.post("/vendors", requireAuth, async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    const [vendor] = await db.insert(vendorsTable).values({
      name: b.name, category: b.category ?? "other", contactName: b.contactName ?? "",
      contactEmail: b.contactEmail ?? "", contactPhone: b.contactPhone ?? "",
      country: b.country ?? "", address: b.address ?? "",
      paymentTerms: b.paymentTerms ?? "net30", currency: b.currency ?? "ngn",
      rating: b.rating ? parseInt(b.rating) : 3, status: b.status ?? "active", notes: b.notes ?? "",
    }).returning();
    res.status(201).json(vendor);
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.get("/vendors/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id));
    if (!vendor) { res.status(404).json({ error: "NotFound" }); return; }

    const userMap = await getUserMap();
    const pos = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.vendorId, id)).orderBy(desc(purchaseOrdersTable.createdAt));
    const vendorMap = new Map([[id, vendor]]);
    const enrichedPos = await Promise.all(pos.map(po => enrichPO(po, userMap, vendorMap)));

    const perfRecords = await db.select().from(vendorPerformanceTable).where(eq(vendorPerformanceTable.vendorId, id));
    const avgDelivery = perfRecords.length ? perfRecords.reduce((s, r) => s + r.deliveryScore, 0) / perfRecords.length : null;
    const avgQuality = perfRecords.length ? perfRecords.reduce((s, r) => s + r.qualityScore, 0) / perfRecords.length : null;
    const avgComm = perfRecords.length ? perfRecords.reduce((s, r) => s + r.communicationScore, 0) / perfRecords.length : null;

    res.json({ ...vendor, orders: enrichedPos, performance: { avgDelivery, avgQuality, avgComm, records: perfRecords } });
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.put("/vendors/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const b = req.body;
    const [vendor] = await db.update(vendorsTable).set({
      name: b.name, category: b.category, contactName: b.contactName, contactEmail: b.contactEmail,
      contactPhone: b.contactPhone, country: b.country, address: b.address, paymentTerms: b.paymentTerms,
      currency: b.currency, rating: b.rating ? parseInt(b.rating) : undefined, status: b.status, notes: b.notes,
      updatedAt: new Date(),
    }).where(eq(vendorsTable.id, id)).returning();
    res.json(vendor);
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.delete("/vendors/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(vendorsTable).set({ status: "inactive", updatedAt: new Date() }).where(eq(vendorsTable.id, id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "InternalServerError" }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// PURCHASE REQUESTS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/requests", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status, priority, departmentId, requestedById } = req.query as any;
    const conditions: any[] = [];
    if (status) conditions.push(eq(purchaseRequestsTable.status, status));
    if (priority) conditions.push(eq(purchaseRequestsTable.priority, priority));
    if (departmentId) conditions.push(eq(purchaseRequestsTable.departmentId, parseInt(departmentId)));
    if (requestedById) conditions.push(eq(purchaseRequestsTable.requestedById, parseInt(requestedById)));

    let prs = conditions.length
      ? await db.select().from(purchaseRequestsTable).where(and(...conditions)).orderBy(desc(purchaseRequestsTable.createdAt))
      : await db.select().from(purchaseRequestsTable).orderBy(desc(purchaseRequestsTable.createdAt));

    const userMap = await getUserMap();
    const departments = await db.select().from(departmentsTable);
    const deptMap = new Map(departments.map(d => [d.id, d]));

    const enriched = await Promise.all(prs.map(async pr => {
      const approvals = await db.select().from(purchaseRequestApprovalsTable)
        .where(eq(purchaseRequestApprovalsTable.purchaseRequestId, pr.id))
        .orderBy(asc(purchaseRequestApprovalsTable.level));
      return {
        ...pr,
        requestedBy: userMap.get(pr.requestedById) ?? null,
        department: pr.departmentId ? (deptMap.get(pr.departmentId) ?? null) : null,
        approvals: approvals.map(a => ({ ...a, approver: userMap.get(a.approverId) ?? null })),
      };
    }));
    res.json(enriched);
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.post("/requests", requireAuth, async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    const requestedById = b.requestedById ?? (req as any).user?.id;
    const [pr] = await db.insert(purchaseRequestsTable).values({
      title: b.title, description: b.description ?? "",
      requestedById, departmentId: b.departmentId ?? null, vendorId: b.vendorId ?? null,
      category: b.category ?? "other", priority: b.priority ?? "medium", status: "draft",
      estimatedAmount: b.estimatedAmount ? String(b.estimatedAmount) : null, currency: b.currency ?? "ngn",
      requiredByDate: b.requiredByDate ?? null, justification: b.justification ?? "", attachmentUrl: b.attachmentUrl ?? null,
    }).returning();
    res.status(201).json(pr);
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.get("/requests/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [pr] = await db.select().from(purchaseRequestsTable).where(eq(purchaseRequestsTable.id, id));
    if (!pr) { res.status(404).json({ error: "NotFound" }); return; }
    const userMap = await getUserMap();
    res.json(await enrichPR(pr, userMap));
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.put("/requests/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(purchaseRequestsTable).where(eq(purchaseRequestsTable.id, id));
    if (!existing || !["draft", "rejected"].includes(existing.status)) {
      res.status(400).json({ error: "Cannot edit this request" }); return;
    }
    const b = req.body;
    const [pr] = await db.update(purchaseRequestsTable).set({
      title: b.title, description: b.description, category: b.category, priority: b.priority,
      estimatedAmount: b.estimatedAmount ? String(b.estimatedAmount) : null, currency: b.currency,
      requiredByDate: b.requiredByDate, justification: b.justification, vendorId: b.vendorId ?? null, updatedAt: new Date(),
    }).where(eq(purchaseRequestsTable.id, id)).returning();
    const userMap = await getUserMap();
    res.json(await enrichPR(pr, userMap));
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.post("/requests/:id/submit", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [pr] = await db.update(purchaseRequestsTable)
      .set({ status: "pending_approval", updatedAt: new Date() })
      .where(and(eq(purchaseRequestsTable.id, id), eq(purchaseRequestsTable.status, "draft")))
      .returning();
    if (!pr) { res.status(400).json({ error: "Cannot submit" }); return; }

    // Create level-1 approval slot for all managers
    const managerIds = await getManagerIds();
    if (managerIds.length) {
      await db.insert(purchaseRequestApprovalsTable).values(managerIds.map(mid => ({
        purchaseRequestId: id, approverId: mid, level: 1, status: "pending" as const,
      })));
      await notifyUsers(managerIds, "Purchase Request Pending Approval",
        `A new purchase request "${pr.title}" requires your approval.`);
    }
    const userMap = await getUserMap();
    res.json(await enrichPR(pr, userMap));
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.post("/requests/:id/approve", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    const { comment } = req.body;

    await db.update(purchaseRequestApprovalsTable).set({
      status: "approved", comment: comment ?? "", decidedAt: new Date(),
    }).where(and(
      eq(purchaseRequestApprovalsTable.purchaseRequestId, id),
      eq(purchaseRequestApprovalsTable.approverId, userId),
      eq(purchaseRequestApprovalsTable.status, "pending"),
    ));

    const [pr] = await db.update(purchaseRequestsTable)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(purchaseRequestsTable.id, id)).returning();

    await notifyUsers([pr.requestedById], "Purchase Request Approved", `Your purchase request "${pr.title}" has been approved.`);
    const userMap = await getUserMap();
    res.json(await enrichPR(pr, userMap));
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.post("/requests/:id/reject", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    const { comment } = req.body;
    if (!comment) { res.status(400).json({ error: "Comment required for rejection" }); return; }

    await db.update(purchaseRequestApprovalsTable).set({
      status: "rejected", comment, decidedAt: new Date(),
    }).where(and(
      eq(purchaseRequestApprovalsTable.purchaseRequestId, id),
      eq(purchaseRequestApprovalsTable.approverId, userId),
      eq(purchaseRequestApprovalsTable.status, "pending"),
    ));

    const [pr] = await db.update(purchaseRequestsTable)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(purchaseRequestsTable.id, id)).returning();

    await notifyUsers([pr.requestedById], "Purchase Request Rejected", `Your purchase request "${pr.title}" was rejected. Reason: ${comment}`);
    const userMap = await getUserMap();
    res.json(await enrichPR(pr, userMap));
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.post("/requests/:id/convert-to-po", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    const [pr] = await db.select().from(purchaseRequestsTable).where(eq(purchaseRequestsTable.id, id));
    if (!pr || pr.status !== "approved") { res.status(400).json({ error: "Request must be Approved" }); return; }

    const poNumber = generatePoNumber();
    const [po] = await db.insert(purchaseOrdersTable).values({
      poNumber, purchaseRequestId: id, vendorId: pr.vendorId ?? 1,
      raisedById: userId, status: "draft", totalAmount: pr.estimatedAmount, currency: pr.currency,
      paymentStatus: "unpaid", notes: pr.justification ?? "",
    }).returning();

    await db.update(purchaseRequestsTable)
      .set({ status: "converted_to_po", updatedAt: new Date() })
      .where(eq(purchaseRequestsTable.id, id));

    res.status(201).json(po);
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status, vendorId, paymentStatus } = req.query as any;
    const conditions: any[] = [];
    if (status) conditions.push(eq(purchaseOrdersTable.status, status));
    if (vendorId) conditions.push(eq(purchaseOrdersTable.vendorId, parseInt(vendorId)));
    if (paymentStatus) conditions.push(eq(purchaseOrdersTable.paymentStatus, paymentStatus));

    const pos = conditions.length
      ? await db.select().from(purchaseOrdersTable).where(and(...conditions)).orderBy(desc(purchaseOrdersTable.createdAt))
      : await db.select().from(purchaseOrdersTable).orderBy(desc(purchaseOrdersTable.createdAt));

    const [userMap, vendorMap] = await Promise.all([getUserMap(), getVendorMap()]);
    const enriched = await Promise.all(pos.map(po => enrichPO(po, userMap, vendorMap)));
    res.json(enriched);
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.post("/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    const userId = (req as any).user?.id;
    const poNumber = generatePoNumber();
    const [po] = await db.insert(purchaseOrdersTable).values({
      poNumber, purchaseRequestId: b.purchaseRequestId ?? null,
      vendorId: parseInt(b.vendorId), raisedById: userId, status: "draft",
      totalAmount: b.totalAmount ? String(b.totalAmount) : null, currency: b.currency ?? "ngn",
      paymentStatus: "unpaid", paymentDue: b.paymentDue ?? null,
      deliveryAddress: b.deliveryAddress ?? "", deliveryDue: b.deliveryDue ?? null, notes: b.notes ?? "",
    }).returning();

    // Insert line items if provided
    if (b.items?.length) {
      await db.insert(purchaseOrderItemsTable).values(b.items.map((item: any) => ({
        purchaseOrderId: po.id, description: item.description, quantity: String(item.quantity),
        unit: item.unit ?? "units", unitPrice: String(item.unitPrice), totalPrice: String(item.totalPrice),
        productType: item.productType ?? null, notes: item.notes ?? "",
      })));
    }
    res.status(201).json(po);
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.get("/orders/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
    if (!po) { res.status(404).json({ error: "NotFound" }); return; }
    const [userMap, vendorMap] = await Promise.all([getUserMap(), getVendorMap()]);
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, po.vendorId));
    const vendorFullMap = new Map([[po.vendorId, vendor]]);
    res.json(await enrichPO(po, userMap, vendorFullMap));
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.put("/orders/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
    if (!existing || existing.status !== "draft") { res.status(400).json({ error: "Can only edit Draft POs" }); return; }
    const b = req.body;
    const [po] = await db.update(purchaseOrdersTable).set({
      vendorId: b.vendorId ? parseInt(b.vendorId) : undefined,
      totalAmount: b.totalAmount ? String(b.totalAmount) : undefined,
      currency: b.currency, paymentStatus: b.paymentStatus, paymentDue: b.paymentDue,
      deliveryAddress: b.deliveryAddress, deliveryDue: b.deliveryDue, notes: b.notes, updatedAt: new Date(),
    }).where(eq(purchaseOrdersTable.id, id)).returning();

    // Update items if provided
    if (b.items) {
      await db.delete(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.purchaseOrderId, id));
      if (b.items.length) {
        await db.insert(purchaseOrderItemsTable).values(b.items.map((item: any) => ({
          purchaseOrderId: id, description: item.description, quantity: String(item.quantity),
          unit: item.unit ?? "units", unitPrice: String(item.unitPrice), totalPrice: String(item.totalPrice),
          productType: item.productType ?? null, notes: item.notes ?? "",
        })));
      }
    }
    res.json(po);
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.post("/orders/:id/send", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [po] = await db.update(purchaseOrdersTable)
      .set({ status: "sent_to_vendor", updatedAt: new Date() })
      .where(eq(purchaseOrdersTable.id, id)).returning();
    res.json(po);
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.post("/orders/:id/receive", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    const { quantityReceived, condition, notes } = req.body;

    const [receipt] = await db.insert(purchaseOrderReceiptsTable).values({
      purchaseOrderId: id, receivedById: userId,
      quantityReceived: quantityReceived ? String(quantityReceived) : null,
      condition: condition ?? "good", notes: notes ?? "",
    }).returning();

    const newStatus = condition === "partial" ? "partially_received" : "received";
    const [po] = await db.update(purchaseOrdersTable)
      .set({ status: newStatus as any, updatedAt: new Date() })
      .where(eq(purchaseOrdersTable.id, id)).returning();

    // Notify original requester if came from PR
    if (po.purchaseRequestId) {
      const [pr] = await db.select().from(purchaseRequestsTable).where(eq(purchaseRequestsTable.id, po.purchaseRequestId));
      if (pr) await notifyUsers([pr.requestedById], "Purchase Order Received", `Your purchase order ${po.poNumber} has been marked as ${newStatus.replace(/_/g, " ")}.`);
    }
    res.json({ po, receipt });
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.post("/orders/:id/rate-vendor", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    const { deliveryScore, qualityScore, communicationScore, notes } = req.body;
    const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
    if (!po) { res.status(404).json({ error: "NotFound" }); return; }

    const overall = ((deliveryScore + qualityScore + communicationScore) / 3).toFixed(2);
    const [perf] = await db.insert(vendorPerformanceTable).values({
      vendorId: po.vendorId, purchaseOrderId: id,
      deliveryScore: parseInt(deliveryScore), qualityScore: parseInt(qualityScore),
      communicationScore: parseInt(communicationScore), overallScore: overall,
      reviewedById: userId, notes: notes ?? "",
    }).returning();

    // Update vendor average rating
    const allPerf = await db.select().from(vendorPerformanceTable).where(eq(vendorPerformanceTable.vendorId, po.vendorId));
    const avgRating = Math.round(allPerf.reduce((s, r) => s + (parseFloat(String(r.overallScore ?? "3")) || 3), 0) / allPerf.length);
    await db.update(vendorsTable).set({ rating: Math.min(5, Math.max(1, avgRating)), updatedAt: new Date() }).where(eq(vendorsTable.id, po.vendorId));

    res.status(201).json(perf);
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// PO ITEMS
// ══════════════════════════════════════════════════════════════════════════════

router.post("/orders/:id/items", requireAuth, async (req: AuthRequest, res) => {
  try {
    const purchaseOrderId = parseInt(req.params.id);
    const b = req.body;
    const [item] = await db.insert(purchaseOrderItemsTable).values({
      purchaseOrderId, description: b.description, quantity: String(b.quantity),
      unit: b.unit ?? "units", unitPrice: String(b.unitPrice),
      totalPrice: String(parseFloat(b.quantity) * parseFloat(b.unitPrice)),
      productType: b.productType ?? null, notes: b.notes ?? "",
    }).returning();
    res.status(201).json(item);
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

router.delete("/orders/:orderId/items/:itemId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    await db.delete(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.id, itemId));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "InternalServerError" }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/analytics", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStr = now.toISOString().split("T")[0];

    const [allPos, allPRs, allVendors, allItems] = await Promise.all([
      db.select().from(purchaseOrdersTable).orderBy(desc(purchaseOrdersTable.createdAt)),
      db.select().from(purchaseRequestsTable),
      db.select().from(vendorsTable),
      db.select().from(purchaseOrderItemsTable),
    ]);

    // Monthly spend
    const thisMonthPos = allPos.filter(po => new Date(po.createdAt) >= startOfMonth);
    const totalSpendMonth = thisMonthPos.reduce((s, po) => s + (parseFloat(String(po.totalAmount ?? 0)) || 0), 0);

    // PO status distribution
    const statusDist: Record<string, number> = {};
    allPos.forEach(po => { statusDist[po.status] = (statusDist[po.status] || 0) + 1; });

    // Top 5 vendors by spend
    const vendorSpend: Record<number, number> = {};
    allPos.forEach(po => {
      vendorSpend[po.vendorId] = (vendorSpend[po.vendorId] || 0) + (parseFloat(String(po.totalAmount ?? 0)) || 0);
    });
    const vendorMap = new Map(allVendors.map(v => [v.id, v.name]));
    const topVendors = Object.entries(vendorSpend)
      .map(([id, spend]) => ({ name: vendorMap.get(parseInt(id)) ?? "Unknown", spend }))
      .sort((a, b) => b.spend - a.spend).slice(0, 8);

    // Pending approvals
    const pendingApprovals = allPRs.filter(pr => pr.status === "pending_approval").length;

    // Overdue deliveries
    const overdueDeliveries = allPos.filter(po =>
      po.deliveryDue && po.deliveryDue < todayStr && !["received", "closed", "cancelled"].includes(po.status)
    ).length;

    // Monthly spend trend (last 12 months)
    const monthlyTrend: { month: string; spend: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const monthPos = allPos.filter(po => {
        const created = new Date(po.createdAt);
        return created >= d && created <= end;
      });
      monthlyTrend.push({
        month: label,
        spend: monthPos.reduce((s, po) => s + (parseFloat(String(po.totalAmount ?? 0)) || 0), 0),
        count: monthPos.length,
      });
    }

    // Spend by category — join items → POs → vendors category
    const categorySpend: Record<string, number> = {};
    const poVendorMap = new Map(allPos.map(po => [po.id, po.vendorId]));
    const vendorCategoryMap = new Map(allVendors.map(v => [v.id, v.category]));
    allItems.forEach(item => {
      const vendorId = poVendorMap.get(item.purchaseOrderId);
      if (!vendorId) return;
      const cat = vendorCategoryMap.get(vendorId) ?? "other";
      categorySpend[cat] = (categorySpend[cat] || 0) + (parseFloat(String(item.totalPrice ?? 0)) || 0);
    });

    res.json({
      totalSpendMonth,
      posThisMonth: thisMonthPos.length,
      pendingApprovals,
      overdueDeliveries,
      statusDistribution: Object.entries(statusDist).map(([status, count]) => ({ status, count })),
      topVendors,
      monthlyTrend,
      categorySpend: Object.entries(categorySpend).map(([category, spend]) => ({ category, spend })),
    });
  } catch (e) { console.error(e); res.status(500).json({ error: "InternalServerError" }); }
});

export default router;
