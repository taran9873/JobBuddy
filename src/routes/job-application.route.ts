import { Router } from 'express';
import { 
  getJobApplications,
  getJobApplicationById,
  createJobApplication,
  updateJobApplication,
  deleteJobApplication,
  getDraftApplications
} from '../controllers/job-application.controller';

const router = Router();

// Route: /api/applications
router.route('/')
  .get(getJobApplications)
  .post(createJobApplication);

// Route: /api/applications/:applicationId
router.route('/:applicationId')
  .get(getJobApplicationById)
  .put(updateJobApplication)
  .delete(deleteJobApplication);

// Route: /api/applications/drafts
router.route('/drafts')
  .get(getDraftApplications);

export default router; 