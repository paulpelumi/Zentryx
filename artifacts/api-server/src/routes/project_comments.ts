import { Router } from "express";
import { db } from "@workspace/db";
import { projectCommentsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const comments = await db.select({
      id: projectCommentsTable.id,
      projectId: projectCommentsTable.projectId,
      content: projectCommentsTable.content,
      createdAt: projectCommentsTable.createdAt,
      updatedAt: projectCommentsTable.updatedAt,
      authorId: projectCommentsTable.authorId,
      authorName: usersTable.name,
      authorRole: usersTable.role,
    })
    .from(projectCommentsTable)
    .leftJoin(usersTable, eq(projectCommentsTable.authorId, usersTable.id))
    .where(eq(projectCommentsTable.projectId, projectId))
    .orderBy(projectCommentsTable.createdAt);
    res.json(comments);
  } catch { res.status(500).json({ error: "InternalServerError" }); }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { content } = req.body;
    if (!content) { res.status(400).json({ error: "BadRequest", message: "Content required" }); return; }
    const [comment] = await db.insert(projectCommentsTable).values({
      projectId, content, authorId: req.user!.userId,
    }).returning();
    const [withAuthor] = await db.select({
      id: projectCommentsTable.id,
      projectId: projectCommentsTable.projectId,
      content: projectCommentsTable.content,
      createdAt: projectCommentsTable.createdAt,
      updatedAt: projectCommentsTable.updatedAt,
      authorId: projectCommentsTable.authorId,
      authorName: usersTable.name,
      authorRole: usersTable.role,
    })
    .from(projectCommentsTable)
    .leftJoin(usersTable, eq(projectCommentsTable.authorId, usersTable.id))
    .where(eq(projectCommentsTable.id, comment.id));
    res.status(201).json(withAuthor);
  } catch { res.status(500).json({ error: "InternalServerError" }); }
});

router.delete("/:commentId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    await db.delete(projectCommentsTable).where(eq(projectCommentsTable.id, commentId));
    res.status(204).send();
  } catch { res.status(500).json({ error: "InternalServerError" }); }
});

export default router;
