import { Request, Response } from 'express';
import {
  createOrGetChat,
  getMessages as loadMessages,
  isChatMember,
  markMessageRead as saveReadReceipt,
  sendMessage as saveMessage,
  updateLastSeen as saveLastSeen,
} from '../services/chatService';
import { parseChatId } from '../utils/chatId';

// POST /chat/create
export async function createChat(req: Request, res: Response): Promise<void> {
  const { userAId, userBId } = req.body as { userAId?: string; userBId?: string };
  if (!userAId || !userBId || userAId === userBId) {
    res.status(400).json({ error: 'Two different user IDs are required' });
    return;
  }

  try {
    const result = await createOrGetChat(userAId, userBId);
    res.status(result.created ? 201 : 200).json({ chatId: String(result.chatId) });
  } catch (error) {
    res.status(500).json({ error: 'Could not create chat' });
  }
}

// POST /chat/:chatId/message/send
export async function sendChatMessage(req: Request, res: Response): Promise<void> {
  const chatId = parseChatId(req.params.chatId);
  const { senderId, text } = req.body as { senderId?: string; text?: string };

  if (!chatId || !senderId || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'A valid chat, sender, and message text are required' });
    return;
  }

  try {
    if (!(await isChatMember(chatId, senderId))) {
      res.status(403).json({ error: 'User is not a member of this chat' });
      return;
    }

    const cleanText = text.trim();
    const messageId = await saveMessage(chatId, senderId, cleanText);
    res.status(201).json({ messageId, chatId: String(chatId), senderId, text: cleanText });
  } catch (error) {
    res.status(500).json({ error: 'Could not send message' });
  }
}

// GET /chat/:chatId/messages?limit=50
export async function listMessages(req: Request, res: Response): Promise<void> {
  const chatId = parseChatId(req.params.chatId);
  const userId = typeof req.query.userId === 'string' ? req.query.userId : '';
  const requested = Number(req.query.limit ?? 50);
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 100) : 50;

  if (!chatId) {
    res.status(400).json({ error: 'Invalid chat ID' });
    return;
  }

  try {
    if (userId && !(await isChatMember(chatId, userId))) {
      res.status(403).json({ error: 'User is not a member of this chat' });
      return;
    }

    const messages = await loadMessages(chatId, limit);
    res.json({ chatId: String(chatId), messages });
  } catch (error) {
    res.status(500).json({ error: 'Could not load messages' });
  }
}

// POST /chat/:chatId/message/:messageId/read
export async function markMessageRead(req: Request, res: Response): Promise<void> {
  const chatId = parseChatId(req.params.chatId);
  const messageId = req.params.messageId;
  const { userId } = req.body as { userId?: string };

  if (!chatId || !userId || typeof messageId !== 'string') {
    res.status(400).json({ error: 'A valid chat ID and user ID are required' });
    return;
  }

  try {
    if (!(await isChatMember(chatId, userId))) {
      res.status(403).json({ error: 'User is not a member of this chat' });
      return;
    }

    const updated = await saveReadReceipt(chatId, messageId, userId);
    if (!updated) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    res.json({ success: true, messageId, readByUser: userId });
  } catch (error) {
    res.status(500).json({ error: 'Could not mark message as read' });
  }
}

// POST /chat/:chatId/lastseen
export async function updateLastSeen(req: Request, res: Response): Promise<void> {
  const chatId = parseChatId(req.params.chatId);
  const { userId, messageId } = req.body as { userId?: string; messageId?: string };

  if (!chatId || !userId || !messageId) {
    res.status(400).json({ error: 'A valid chat ID, user ID, and message ID are required' });
    return;
  }

  try {
    if (!(await isChatMember(chatId, userId))) {
      res.status(403).json({ error: 'User is not a member of this chat' });
      return;
    }

    const updated = await saveLastSeen(chatId, userId, messageId);
    if (!updated) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    res.json({ success: true, chatId: String(chatId), userId, lastSeenMessageId: messageId });
  } catch (error) {
    res.status(500).json({ error: 'Could not update last seen message' });
  }
}
