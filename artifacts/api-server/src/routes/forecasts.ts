import { Router } from "express";
import { db } from "@workspace/db";
import { accountForecastsTable, notificationsTable, accountsTable, accountProductionOrdersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const forecasts = await db.select().from(accountForecastsTable)
      .orderBy(desc(accountForecastsTable.forecastDate));
    res.json(forecasts);
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    const [f] = await db.insert(accountForecastsTable).values({
      accountId: b.accountId || null,
      company: b.company,
      productName: b.productName,
      productType: b.productType || null,
      customerType: b.customerType || null,
      isStrategic: !!b.isStrategic,
      lastOrderDate: b.lastOrderDate || null,
      lastOrderVolume: b.lastOrderVolume || null,
      forecastDate: b.forecastDate,
      forecastVolume: b.forecastVolume || null,
      confidence: b.confidence ?? 50,
      status: b.status ?? "pending",
      notes: b.notes || null,
    }).returning();
    res.json(f);
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { createdAt, ...rest } = req.body;
    const [f] = await db.update(accountForecastsTable)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(accountForecastsTable.id, id))
      .returning();
    res.json(f);
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(accountForecastsTable).where(eq(accountForecastsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.post("/seed", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const accounts = await db.select().from(accountsTable)
      .where(eq(accountsTable.isActive, true));
    const existing = await db.select({ accountId: accountForecastsTable.accountId })
      .from(accountForecastsTable);
    const existingIds = new Set(existing.map(f => f.accountId));

    const toInsert: any[] = [];
    for (const account of accounts) {
      if (existingIds.has(account.id)) continue;
      const lastOrders = await db.select().from(accountProductionOrdersTable)
        .where(eq(accountProductionOrdersTable.accountId, account.id))
        .orderBy(desc(accountProductionOrdersTable.dateOrdered))
        .limit(1);
      const lo = lastOrders[0];
      const d = new Date();
      d.setDate(d.getDate() + 30);
      toInsert.push({
        accountId: account.id,
        company: account.company,
        productName: account.productName,
        productType: account.productType ?? null,
        customerType: account.customerType ?? null,
        isStrategic: account.customerType === "existing",
        lastOrderDate: lo?.dateOrdered ?? null,
        lastOrderVolume: lo?.volume ?? account.volume ?? null,
        forecastDate: d.toISOString().split("T")[0],
        forecastVolume: lo?.volume ?? account.volume ?? null,
        confidence: 50,
        status: "pending" as const,
      });
    }

    if (toInsert.length > 0) {
      await db.insert(accountForecastsTable).values(toInsert);
    }
    const all = await db.select().from(accountForecastsTable)
      .orderBy(desc(accountForecastsTable.forecastDate));
    res.json(all);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.post("/notify-procurement", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userIds, title, message } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ error: "No users selected" });
      return;
    }
    const notifs = (userIds as number[]).map(userId => ({
      userId,
      type: "system" as const,
      title: title || "Procurement Notification",
      message: message || "You have a new procurement notification.",
      isRead: false,
    }));
    await db.insert(notificationsTable).values(notifs);
    res.json({ success: true, sent: userIds.length });
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

export default router;
