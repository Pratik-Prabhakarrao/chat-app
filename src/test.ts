const apiUrl = process.env.API_URL ?? 'http://127.0.0.1:3000';

type ApiResponse = Record<string, unknown>;

async function check<T extends ApiResponse>(
  name: string,
  path: string,
  options: RequestInit,
  expectedStatus: number | number[]
): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, options);
  const body = await response.json() as T & { error?: string };
  const allowedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

  if (!allowedStatuses.includes(response.status)) {
    throw new Error(`${name} failed (${response.status}): ${body.error ?? 'Unexpected response'}`);
  }

  console.log(`PASS ${name}`);
  return body;
}

function post(body: object): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

async function main(): Promise<void> {
  // Create a chat or get the existing chat for the two sample users.
  const chat = await check<{ chatId: string }>(
    'Create or get chat',
    '/chat/create',
    post({ userAId: 'user_1', userBId: 'user_2' }),
    [200, 201]
  );

  // Check that the invalid create request is rejected.
  await check(
    'Reject invalid chat request',
    '/chat/create',
    post({ userAId: 'user_1', userBId: 'user_1' }),
    400
  );

  // Confirm the chat list contains the new or existing chat and its members.
  const chatList = await check<{
    chats: { chatId: string; memberIds: string[] }[];
  }>('List user chats', '/user/user_1/chats', { method: 'GET' }, 200);
  const listedChat = chatList.chats.some((item) =>
    item.chatId === chat.chatId && item.memberIds.includes('user_2')
  );
  if (!listedChat) throw new Error('List user chats did not return the expected chat members');

  // Send a uniquely named message so it can be found in the messages response.
  const text = `API test message ${new Date().toISOString()}`;
  const sent = await check<{ messageId: string }>(
    'Send message',
    `/chat/${chat.chatId}/message/send`,
    post({ senderId: 'user_1', text }),
    201
  );

  // A non-member must not be allowed to send to this chat.
  await check(
    'Reject message from non-member',
    `/chat/${chat.chatId}/message/send`,
    post({ senderId: 'not_a_member', text: 'This should be rejected' }),
    403
  );

  // Read messages and make sure the message just sent is included.
  const messages = await check<{
    messages: { messageId: string; text: string }[];
  }>('Get messages', `/chat/${chat.chatId}/messages?limit=50`, { method: 'GET' }, 200);
  if (!messages.messages.some((message) => message.messageId === sent.messageId)) {
    throw new Error('Get messages did not return the message just sent');
  }

  await check(
    'Reject invalid chat ID when getting messages',
    '/chat/not-a-number/messages',
    { method: 'GET' },
    400
  );

  // Mark the message as read by the other chat member.
  await check(
    'Mark message as read',
    `/chat/${chat.chatId}/message/${sent.messageId}/read`,
    post({ userId: 'user_2' }),
    200
  );

  await check(
    'Reject read receipt from non-member',
    `/chat/${chat.chatId}/message/${sent.messageId}/read`,
    post({ userId: 'not_a_member' }),
    403
  );

  // Store user_2's last-seen message for this chat.
  await check(
    'Update last seen message',
    `/chat/${chat.chatId}/lastseen`,
    post({ userId: 'user_2', messageId: sent.messageId }),
    200
  );

  await check(
    'Reject last-seen update for missing message',
    `/chat/${chat.chatId}/lastseen`,
    post({ userId: 'user_2', messageId: 'missing-message' }),
    404
  );

  console.log('All chat API checks passed.');
  console.log(`Chat ID: ${chat.chatId}`);
  console.log(`Test message ID: ${sent.messageId}`);
}

main().catch((error: unknown) => {
  console.error('API checks failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
