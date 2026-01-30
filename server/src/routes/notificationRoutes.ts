import express from 'express';
import { getNotifications, markNotificationAsRead } from '../controllers/notificationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.route('/').get(getNotifications);
router.route('/:id/read').put(markNotificationAsRead);

export default router;