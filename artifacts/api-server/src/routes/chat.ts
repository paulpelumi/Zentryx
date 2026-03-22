import { Router } from "express";
import { db } from "@workspace/db";
import { chatRoomsTable, chatRoomMembersTable, chatMessagesTable, usersTable } from "@workspace/db";
import { eq, and, inArray, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
const upload = multer({ dest: "uploads/chat/", limits: { fileSize: 50 * 1024 * 1024 } });

if (!fs.existsSync("uploads/chat")) fs.mkdirSync("uploads/chat", { recursive: true });

// Get all rooms for current user
router.get("/rooms", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rooms = await db.select().from(chatRoomsTable).orderBy(chatRoomsTable.createdAt);
    res.json(rooms);
  } catch (err) { console.error(err); res.status(500).json({ error: "InternalServerError" }); }
});

// Create a room
router.post("/rooms", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, isGroup, memberIds } = req.body;
    const [room] = await db.insert(chatRoomsTable).values({
      name, isGroup: isGroup !== false, createdById: req.user!.userId,
    }).returning();
    const allMemberIds = [...new Set([req.user!.userId, ...(memberIds || [])])];
    for (const uid of allMemberIds) {
      await db.insert(chatRoomMembersTable).values({ roomId: room.id, userId: uid }).catch(() => {});
    }
    res.status(201).json(room);
  } catch (err) { console.error(err); res.status(500).json({ error: "InternalServerError" }); }
});

// Delete a room (creator only) or leave it
router.delete("/rooms/:roomId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const userId = req.user!.userId;
    const [room] = await db.select().from(chatRoomsTable).where(eq(chatRoomsTable.id, roomId)).limit(1);
    if (!room) { res.status(404).json({ error: "NotFound" }); return; }
    if (room.createdById === userId) {
      await db.delete(chatRoomsTable).where(eq(chatRoomsTable.id, roomId));
      res.json({ deleted: true });
    } else {
      await db.delete(chatRoomMembersTable).where(
        and(eq(chatRoomMembersTable.roomId, roomId), eq(chatRoomMembersTable.userId, userId))
      );
      res.json({ left: true });
    }
  } catch (err) { console.error(err); res.status(500).json({ error: "InternalServerError" }); }
});

// Get messages for a room
router.get("/rooms/:roomId/messages", requireAuth, async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const messages = await db.select({
      id: chatMessagesTable.id,
      roomId: chatMessagesTable.roomId,
      messageType: chatMessagesTable.messageType,
      content: chatMessagesTable.content,
      fileUrl: chatMessagesTable.fileUrl,
      fileName: chatMessagesTable.fileName,
      createdAt: chatMessagesTable.createdAt,
      senderId: chatMessagesTable.senderId,
      senderName: usersTable.name,
      senderRole: usersTable.role,
    })
    .from(chatMessagesTable)
    .leftJoin(usersTable, eq(chatMessagesTable.senderId, usersTable.id))
    .where(eq(chatMessagesTable.roomId, roomId))
    .orderBy(chatMessagesTable.createdAt)
    .limit(limit);
    res.json(messages);
  } catch { res.status(500).json({ error: "InternalServerError" }); }
});

// Send a text message
router.post("/rooms/:roomId/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const { content, messageType } = req.body;
    const [msg] = await db.insert(chatMessagesTable).values({
      roomId, senderId: req.user!.userId,
      messageType: messageType || "text",
      content,
    }).returning();
    const [withSender] = await db.select({
      id: chatMessagesTable.id, roomId: chatMessagesTable.roomId,
      messageType: chatMessagesTable.messageType, content: chatMessagesTable.content,
      fileUrl: chatMessagesTable.fileUrl, fileName: chatMessagesTable.fileName,
      createdAt: chatMessagesTable.createdAt, senderId: chatMessagesTable.senderId,
      senderName: usersTable.name, senderRole: usersTable.role,
    })
    .from(chatMessagesTable)
    .leftJoin(usersTable, eq(chatMessagesTable.senderId, usersTable.id))
    .where(eq(chatMessagesTable.id, msg.id));
    res.status(201).json(withSender);
  } catch (err) { console.error(err); res.status(500).json({ error: "InternalServerError" }); }
});

// Delete a message (sender or admin)
router.delete("/rooms/:roomId/messages/:messageId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user!.userId;
    const [msg] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, messageId)).limit(1);
    if (!msg) { res.status(404).json({ error: "NotFound" }); return; }
    if (msg.senderId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, messageId));
    res.json({ deleted: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "InternalServerError" }); }
});

// Upload image or voice note
router.post("/rooms/:roomId/upload", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const roomId = parseInt(req.params.roomId);
    const messageType = (req.body.messageType as any) || (req.file.mimetype.startsWith("audio") ? "voice_note" : "image");
    const fileUrl = `/api/chat/uploads/${req.file.filename}`;
    const [msg] = await db.insert(chatMessagesTable).values({
      roomId, senderId: req.user!.userId, messageType,
      fileUrl, fileName: req.file.originalname,
    }).returning();
    const [withSender] = await db.select({
      id: chatMessagesTable.id, roomId: chatMessagesTable.roomId,
      messageType: chatMessagesTable.messageType, content: chatMessagesTable.content,
      fileUrl: chatMessagesTable.fileUrl, fileName: chatMessagesTable.fileName,
      createdAt: chatMessagesTable.createdAt, senderId: chatMessagesTable.senderId,
      senderName: usersTable.name, senderRole: usersTable.role,
    })
    .from(chatMessagesTable)
    .leftJoin(usersTable, eq(chatMessagesTable.senderId, usersTable.id))
    .where(eq(chatMessagesTable.id, msg.id));
    res.status(201).json(withSender);
  } catch (err) { console.error(err); res.status(500).json({ error: "InternalServerError" }); }
});

// Serve uploaded files
router.get("/uploads/:filename", (req, res) => {
  const filePath = path.resolve("uploads/chat", req.params.filename);
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).json({ error: "NotFound" });
  });
});

// Get all users for private chat
router.get("/users", requireAuth, async (_req, res) => {
  try {
    const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, isActive: usersTable.isActive })
      .from(usersTable).where(eq(usersTable.isActive, true));
    res.json(users);
  } catch { res.status(500).json({ error: "InternalServerError" }); }
});

export default router;
