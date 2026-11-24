import { Router } from 'express';
import { listUserChats } from '../controllers/userController';

const router = Router();

router.get('/:userId/chats', listUserChats);

export default router;
