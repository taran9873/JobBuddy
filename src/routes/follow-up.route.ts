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
import { RequestHandler, Request, Response } from 'express';
import FollowUp from '../models/follow-up.model';
import JobApplication from '../models/job-application.model';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import schedulerService from '../services/scheduler.service';

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

/**
 * Get scheduler health status
 */
export const getSchedulerHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = schedulerService.getStatus();
    
    res.status(200).json({
      success: true,
      data: {
        ...status,
        lastRunTime: status.lastRunTime?.toISOString() || null
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};

// Add the health check route
router.route('/scheduler/health')
  .get(getSchedulerHealth as RequestHandler);

export default router; 