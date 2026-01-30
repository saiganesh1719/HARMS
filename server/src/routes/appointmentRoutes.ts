
import express from 'express';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '../controllers/appointmentController';
import { protect, restrictTo } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAppointments)
  .post(restrictTo('Patient'), createAppointment);

router.route('/:id')
  .put(restrictTo('Admin', 'Doctor'), updateAppointment)
  .delete(restrictTo('Admin'), deleteAppointment);

export default router;
