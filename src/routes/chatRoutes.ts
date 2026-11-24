import { Router } from 'express';
import {
  createChat,
  listMessages,
  markMessageRead,
  sendChatMessage,
  updateLastSeen,
} from '../controllers/chatController';

const router = Router();

router.post('/create', createChat);
router.post('/:chatId/message/send', sendChatMessage);
router.get('/:chatId/messages', listMessages);
router.post('/:chatId/message/:messageId/read', markMessageRead);
router.post('/:chatId/lastseen', updateLastSeen);

export default router;
