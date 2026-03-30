import { Router } from "express";
import { db } from "@workspace/db";
import {
  weeklyReportsTable, weeklyActivitiesTable, notificationsTable, usersTable
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function formatWeekLabel(monday: Date, friday: Date): string {
  const m = `${DAYS[monday.getDay()]}, ${MONTHS[monday.getMonth()]} ${monday.getDate()}`;
  const f = `${DAYS[friday.getDay()]}, ${MONTHS[friday.getMonth()]} ${friday.getDate()}, ${friday.getFullYear()}`;
  return `${m} - ${f}`;
}

function generateWeekTemplates(year: number, month: number) {
  const result: any[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  let cursor = new Date(firstDay);
  const dow = cursor.getDay();
  if (dow !== 1) {
    const daysToMon = dow === 0 ? 1 : 8 - dow;
    cursor.setDate(cursor.getDate() + daysToMon);
  }

  let weekNum = 1;
  while (cursor.getMonth() === month - 1 && cursor <= lastDay) {
    const monday = new Date(cursor);
    const friday = new Date(cursor);
    friday.setDate(friday.getDate() + 4);
    result.push({
      weekNumber: weekNum,
      startDate: monday.toISOString().split("T")[0],
      endDate: friday.toISOString().split("T")[0],
      label: `Week ${weekNum}: ${formatWeekLabel(monday, friday)}`,
      month,
      year,
    });
    weekNum++;
    cursor.setDate(cursor.getDate() + 7);
  }
  return result;
}

router.get("/weeks", requireAuth, async (req: AuthRequest, res) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const templates = generateWeekTemplates(year, month);
    const existing = await db.select().from(weeklyReportsTable)
      .where(and(eq(weeklyReportsTable.month, month), eq(weeklyReportsTable.year, year)));

    const existingNums = new Set(existing.map(w => w.weekNumber));
    const toCreate = templates.filter(t => !existingNums.has(t.weekNumber));

    if (toCreate.length > 0) {
      await db.insert(weeklyReportsTable).values(toCreate.map(t => ({
        month: t.month, year: t.year, weekNumber: t.weekNumber,
        startDate: t.startDate, endDate: t.endDate, label: t.label, samplesSent: "",
      })));
    }

    const all = await db.select().from(weeklyReportsTable)
      .where(and(eq(weeklyReportsTable.month, month), eq(weeklyReportsTable.year, year)))
      .orderBy(weeklyReportsTable.weekNumber);

    res.json(all);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.put("/weeks/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { samplesSent } = req.body;
    const [row] = await db.update(weeklyReportsTable)
      .set({ samplesSent: samplesSent ?? "", updatedAt: new Date() })
      .where(eq(weeklyReportsTable.id, id))
      .returning();
    res.json(row);
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.get("/weeks/:id/activities", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const id = parseInt(_req.params.id);
    const activities = await db.select().from(weeklyActivitiesTable)
      .where(eq(weeklyActivitiesTable.weeklyReportId, id))
      .orderBy(weeklyActivitiesTable.createdAt);
    const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, avatar: usersTable.avatar })
      .from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u]));
    const result = activities.map(a => ({
      ...a,
      assignedUser: a.assignedUserId ? (userMap.get(a.assignedUserId) ?? null) : null,
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.post("/weeks/:id/activities", requireAuth, async (req: AuthRequest, res) => {
  try {
    const weeklyReportId = parseInt(req.params.id);
    const b = req.body;
    const [row] = await db.insert(weeklyActivitiesTable).values({
      weeklyReportId,
      assignedUserId: b.assignedUserId ?? null,
      projectTitle: b.projectTitle ?? "",
      productType: b.productType ?? null,
      status: b.status ?? "not_started",
      priority: b.priority ?? "medium",
      remarks: b.remarks ?? "",
    }).returning();
    const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, avatar: usersTable.avatar }).from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u]));
    res.json({ ...row, assignedUser: row.assignedUserId ? (userMap.get(row.assignedUserId) ?? null) : null });
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.put("/activities/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { createdAt, weeklyReportId, assignedUser, ...rest } = req.body;
    const [row] = await db.update(weeklyActivitiesTable)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(weeklyActivitiesTable.id, id))
      .returning();
    const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, avatar: usersTable.avatar }).from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u]));
    res.json({ ...row, assignedUser: row.assignedUserId ? (userMap.get(row.assignedUserId) ?? null) : null });
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.delete("/activities/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(weeklyActivitiesTable).where(eq(weeklyActivitiesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.post("/notify", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userIds, title, message } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ error: "No users selected" });
      return;
    }
    const notifs = (userIds as number[]).map(userId => ({
      userId,
      type: "system" as const,
      title: title || "Weekly Activity Notification",
      message: message || "You have a new notification.",
      isRead: false,
    }));
    await db.insert(notificationsTable).values(notifs);
    res.json({ success: true, sent: userIds.length });
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

export default router;
