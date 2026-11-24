import { pgPool, firestore, FieldValue } from '../config';

// Check whether a user belongs to this chat in PostgreSQL.
export async function isChatMember(chatId: number, userId: string): Promise<boolean> {
  const result = await pgPool.query(
    'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
    [chatId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

// Return an existing one-to-one chat or create it with both members.
export async function createOrGetChat(
  userAId: string,
  userBId: string
): Promise<{ chatId: number; created: boolean }> {
  const client = await pgPool.connect();

  try {
    await client.query('BEGIN');

    // Lock this pair while checking and creating, to prevent duplicate chats.
    const pair = [userAId, userBId].sort().join(':');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [pair]);

    const existing = await client.query<{ id: number }>(
      `SELECT c.id
       FROM chats c
       JOIN chat_members a ON a.chat_id = c.id AND a.user_id = $1
       JOIN chat_members b ON b.chat_id = c.id AND b.user_id = $2
       WHERE c.is_group = FALSE
         AND (SELECT COUNT(*) FROM chat_members m WHERE m.chat_id = c.id) = 2
       LIMIT 1`,
      [userAId, userBId]
    );

    if (existing.rows.length) {
      await client.query('COMMIT');
      return { chatId: existing.rows[0].id, created: false };
    }

    const inserted = await client.query<{ id: number }>(
      'INSERT INTO chats (is_group) VALUES (FALSE) RETURNING id'
    );
    const chatId = inserted.rows[0].id;

    await client.query(
      'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)',
      [chatId, userAId, userBId]
    );
    await client.query('COMMIT');

    return { chatId, created: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

// Save a message in the chat's Firestore messages collection.
export async function sendMessage(chatId: number, senderId: string, text: string): Promise<string> {
  const message = await firestore.collection('chats').doc(String(chatId))
    .collection('messages').add({
      senderId,
      text,
      timestamp: FieldValue.serverTimestamp(),
      readBy: [senderId],
    });

  return message.id;
}

// Fetch the newest messages, then return them in chronological order.
export async function getMessages(chatId: number, limit: number): Promise<{
  messageId: string;
  senderId: unknown;
  text: unknown;
  timestamp: string | null;
  readBy: unknown;
}[]> {
  const snapshot = await firestore.collection('chats').doc(String(chatId))
    .collection('messages').orderBy('timestamp', 'desc').limit(limit).get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      messageId: doc.id,
      senderId: data.senderId,
      text: data.text,
      timestamp: data.timestamp?.toDate().toISOString() ?? null,
      readBy: data.readBy ?? [],
    };
  }).reverse();
}

// Add the user to a message's readBy list. Return false if the message is missing.
export async function markMessageRead(
  chatId: number,
  messageId: string,
  userId: string
): Promise<boolean> {
  const message = firestore.collection('chats').doc(String(chatId))
    .collection('messages').doc(messageId);
  const found = await message.get();

  if (!found.exists) return false;

  await message.update({ readBy: FieldValue.arrayUnion(userId) });
  return true;
}

// Save the user's latest read position. Return false if the message is missing.
export async function updateLastSeen(
  chatId: number,
  userId: string,
  messageId: string
): Promise<boolean> {
  const chat = firestore.collection('chats').doc(String(chatId));
  const message = await chat.collection('messages').doc(messageId).get();

  if (!message.exists) return false;

  await chat.collection('lastSeen').doc(userId).set({
    lastSeenMessageId: messageId,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return true;
}
