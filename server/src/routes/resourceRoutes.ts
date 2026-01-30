
import express from 'express';
import { getResources, createResource, updateResource, deleteResource } from '../controllers/resourceController';
import { protect, restrictTo } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getResources)
  .post(restrictTo('Admin'), createResource);

router.route('/:id')
  .put(restrictTo('Admin'), updateResource)
  .delete(restrictTo('Admin'), deleteResource);

export default router;
