import { Router } from 'express';
import { 
  getFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getDueFollowUps
} from '../controllers/follow-up.controller';
import { authenticate } from '../middleware/auth.middleware';
import { RequestHandler } from 'express';

const router = Router();

// All routes require authentication
router.use(authenticate as RequestHandler);

// Route: /api/followups
router.route('/')
  .get(getFollowUps as RequestHandler)
  .post(createFollowUp as RequestHandler);

// Route: /api/followups/:followupId
router.route('/:followupId')
  .get(getFollowUpById as RequestHandler)
  .put(updateFollowUp as RequestHandler)
  .delete(deleteFollowUp as RequestHandler);

// Route: /api/followups/due
router.route('/due')
  .get(getDueFollowUps as RequestHandler);

export default router; 