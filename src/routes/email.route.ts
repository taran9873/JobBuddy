import { Router } from 'express';
import { sendEmail, testFollowUp } from '../controllers/email.controller';

const router = Router();

// Route: /api/send-email
router.route('/send-email')
  .post(sendEmail);

// Route: /api/test-followup
router.route('/test-followup')
  .get(testFollowUp);

export default router; 