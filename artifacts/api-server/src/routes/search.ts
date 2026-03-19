import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, formulationsTable, tasksTable, usersTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const q = (req.query.q as string || "").toLowerCase().trim();
    if (!q) {
      res.json({ projects: [], formulations: [], tasks: [] });
      return;
    }

    const allProjects = await db.select().from(projectsTable);
    const allFormulations = await db.select().from(formulationsTable);
    const allTasks = await db.select().from(tasksTable);

    const projects = allProjects
      .filter(p => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q) || (p.productCategory || "").toLowerCase().includes(q))
      .slice(0, 10)
      .map(p => ({
        ...p,
        successRate: p.successRate ? parseFloat(p.successRate) : null,
        revenueImpact: p.revenueImpact ? parseFloat(p.revenueImpact) : null,
        lead: null,
        taskCount: 0,
        completedTaskCount: 0,
      }));

    const formulations = allFormulations
      .filter(f => f.name.toLowerCase().includes(q) || (f.notes || "").toLowerCase().includes(q))
      .slice(0, 10)
      .map(f => ({
        ...f,
        costPerUnit: f.costPerUnit ? parseFloat(f.costPerUnit) : null,
        targetMargin: f.targetMargin ? parseFloat(f.targetMargin) : null,
      }));

    const tasks = allTasks
      .filter(t => t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q))
      .slice(0, 10)
      .map(t => ({ ...t, assignee: null }));

    res.json({ projects, formulations, tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "InternalServerError" });
  }
});

export default router;
