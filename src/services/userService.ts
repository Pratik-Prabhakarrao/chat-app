import { pgPool } from '../config';

export type UserChat = {
  id: number;
  name: string | null;
  is_group: boolean;
  created_at: Date;
  member_ids: string[];
};

// Find chats the user belongs to, including every member ID for each chat.
export async function getUserChats(userId: string): Promise<UserChat[]> {
  const result = await pgPool.query<UserChat>(
    `SELECT c.id, c.name, c.is_group, c.created_at,
            ARRAY_AGG(m.user_id ORDER BY m.user_id) AS member_ids
     FROM chats c
     JOIN chat_members mine ON mine.chat_id = c.id AND mine.user_id = $1
     JOIN chat_members m ON m.chat_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [userId]
  );

  return result.rows;
}
