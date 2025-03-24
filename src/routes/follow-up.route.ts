import { Router } from 'express';
import { 
  getFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getDueFollowUps
} from '../controllers/follow-up.controller';

const router = Router();

// Route: /api/followups
router.route('/')
  .get(getFollowUps)
  .post(createFollowUp);

// Route: /api/followups/:followupId
router.route('/:followupId')
  .get(getFollowUpById)
  .put(updateFollowUp)
  .delete(deleteFollowUp);

// Route: /api/followups/due
router.route('/due')
  .get(getDueFollowUps);

export default router; 