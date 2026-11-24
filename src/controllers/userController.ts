import { Request, Response } from 'express';
import { getUserChats } from '../services/userService';

// GET /user/:userId/chats
export async function listUserChats(req: Request, res: Response): Promise<void> {
  const userId = req.params.userId;
  if (typeof userId !== 'string') {
    res.status(400).json({ error: 'A valid user ID is required' });
    return;
  }

  try {
    const rows = await getUserChats(userId);
    const chats = rows.map((row) => ({
      chatId: String(row.id),
      name: row.name,
      isGroup: row.is_group,
      memberIds: row.member_ids,
      createdAt: row.created_at,
    }));

    res.json({ userId, chats });
  } catch (error) {
    res.status(500).json({ error: 'Could not load chats' });
  }
}
