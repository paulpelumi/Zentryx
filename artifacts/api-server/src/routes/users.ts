import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, AuthRequest } from "../lib/auth";

const router = Router();

const formatUser = (user: typeof usersTable.$inferSelect) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  department: user.department,
  jobPosition: user.jobPosition,
  phone: user.phone,
  country: user.country,
  avatar: user.avatar,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

router.get("/", requireAuth, async (_req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(usersTable.name);
    res.json(users.map(formatUser));
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(formatUser(user));
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.put("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, department, jobPosition, phone, country, avatar, currentPassword, newPassword } = req.body;
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!existing) { res.status(404).json({ error: "NotFound" }); return; }

    const updateData: Partial<typeof usersTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updateData.name = name;
    if (department !== undefined) updateData.department = department || null;
    if (jobPosition !== undefined) updateData.jobPosition = jobPosition || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (country !== undefined) updateData.country = country || null;
    if (avatar !== undefined) updateData.avatar = avatar || null;

    if (newPassword) {
      if (!currentPassword) { res.status(400).json({ error: "BadRequest", message: "Current password required" }); return; }
      const valid = await bcrypt.compare(currentPassword, existing.passwordHash);
      if (!valid) { res.status(400).json({ error: "BadRequest", message: "Current password is incorrect" }); return; }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, req.user!.userId)).returning();
    res.json(formatUser(user));
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(formatUser(user));
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.post("/", requireAuth, requireRole("admin"), async (req: AuthRequest, res) => {
  try {
    const { email, name, role, department, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({ email, name, role, department, passwordHash }).returning();
    res.status(201).json(formatUser(user));
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "Conflict", message: "Email already exists" });
    } else {
      res.status(500).json({ error: "InternalServerError" });
    }
  }
});

const canManageUsers = (role: string) =>
  ["admin", "manager", "ceo"].includes(role) || role.includes("head");

router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!canManageUsers(req.user!.role)) {
      res.status(403).json({ error: "Forbidden", message: "Insufficient permissions" });
      return;
    }
    const id = parseInt(req.params.id);
    const { name, role, department, jobPosition, phone, country, avatar, isActive } = req.body;
    const [user] = await db.update(usersTable)
      .set({ name, role, department, jobPosition, phone, country, avatar, isActive, updatedAt: new Date() })
      .where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(formatUser(user));
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

// Promote user to admin — available to admins, managers, CEOs, heads
router.post("/:id/make-admin", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!canManageUsers(req.user!.role)) {
      res.status(403).json({ error: "Forbidden", message: "Insufficient permissions" });
      return;
    }
    const id = parseInt(req.params.id);
    const [user] = await db.update(usersTable)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(formatUser(user));
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "InternalServerError" });
  }
});

export default router;
