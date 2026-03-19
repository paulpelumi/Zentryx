import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, usersTable, tasksTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";
import { logActivity } from "../lib/activity";

const router = Router();

async function enrichProject(project: typeof projectsTable.$inferSelect) {
  const lead = project.leadId
    ? (await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, department: usersTable.department, avatar: usersTable.avatar, isActive: usersTable.isActive, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.id, project.leadId)).limit(1))[0] || null
    : null;

  const tasks = await db.select({ status: tasksTable.status }).from(tasksTable).where(eq(tasksTable.projectId, project.id));
  const taskCount = tasks.length;
  const completedTaskCount = tasks.filter(t => t.status === "done").length;

  return {
    ...project,
    successRate: project.successRate ? parseFloat(project.successRate) : null,
    revenueImpact: project.revenueImpact ? parseFloat(project.revenueImpact) : null,
    lead,
    taskCount,
    completedTaskCount,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, stage } = req.query;
    let query = db.select().from(projectsTable);
    const conditions = [];
    if (status) conditions.push(eq(projectsTable.status, status as any));
    if (stage) conditions.push(eq(projectsTable.stage, stage as any));
    
    const projects = conditions.length > 0
      ? await db.select().from(projectsTable).where(and(...conditions)).orderBy(projectsTable.createdAt)
      : await db.select().from(projectsTable).orderBy(projectsTable.createdAt);

    const enriched = await Promise.all(projects.map(enrichProject));
    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    if (!project) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(await enrichProject(project));
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, description, stage, status, priority, leadId, startDate, targetDate, revenueImpact, productCategory, tags } = req.body;
    const [project] = await db.insert(projectsTable).values({
      name, description, stage: stage || "ideation", status: status || "active",
      priority: priority || "medium", leadId, 
      startDate: startDate ? new Date(startDate) : null,
      targetDate: targetDate ? new Date(targetDate) : null,
      revenueImpact, productCategory, tags: tags || [],
    }).returning();
    await logActivity(req.user!.userId, "created", "project", project.id, `Created project: ${name}`);
    res.status(201).json(await enrichProject(project));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, stage, status, priority, leadId, startDate, targetDate, successRate, revenueImpact, productCategory, tags } = req.body;
    const [project] = await db.update(projectsTable).set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(stage !== undefined && { stage }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(leadId !== undefined && { leadId }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
      ...(successRate !== undefined && { successRate }),
      ...(revenueImpact !== undefined && { revenueImpact }),
      ...(productCategory !== undefined && { productCategory }),
      ...(tags !== undefined && { tags }),
      updatedAt: new Date(),
    }).where(eq(projectsTable.id, id)).returning();
    if (!project) { res.status(404).json({ error: "NotFound" }); return; }
    await logActivity(req.user!.userId, "updated", "project", project.id, `Updated project: ${project.name}`);
    res.json(await enrichProject(project));
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
    await logActivity(req.user!.userId, "deleted", "project", id, `Deleted project #${id}`);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

export default router;
