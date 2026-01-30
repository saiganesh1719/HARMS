
import express from 'express';
import { login, getProfile, register, getDoctors, getUsers, createUser, updateUser, deleteUser } from '../controllers/authController';
import { protect, restrictTo } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.get('/doctors', protect, getDoctors);

// Admin User Management Routes
router.route('/users')
  .get(protect, restrictTo('Admin'), getUsers)
  .post(protect, restrictTo('Admin'), createUser);

router.route('/users/:id')
  .put(protect, restrictTo('Admin'), updateUser)
  .delete(protect, restrictTo('Admin'), deleteUser);

export default router;
