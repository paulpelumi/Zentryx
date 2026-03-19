import { pgTable, serial, text, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const projectStageEnum = pgEnum("project_stage", [
  "ideation", "research", "formulation", "testing", "validation", "scale_up", "commercialization"
]);

export const projectStatusEnum = pgEnum("project_status", [
  "active", "on_hold", "completed", "cancelled"
]);

export const priorityEnum = pgEnum("priority", [
  "low", "medium", "high", "critical"
]);

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  stage: projectStageEnum("stage").notNull().default("ideation"),
  status: projectStatusEnum("status").notNull().default("active"),
  priority: priorityEnum("priority").notNull().default("medium"),
  leadId: integer("lead_id").references(() => usersTable.id),
  startDate: timestamp("start_date"),
  targetDate: timestamp("target_date"),
  successRate: numeric("success_rate", { precision: 5, scale: 2 }),
  revenueImpact: numeric("revenue_impact", { precision: 15, scale: 2 }),
  productCategory: text("product_category"),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
