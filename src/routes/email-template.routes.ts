import express from 'express';
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate
} from '../controllers/email-template.controller';

const router = express.Router();

// @route   GET /api/email-templates
// @desc    Get all email templates
// @access  Private
router.get('/', getAllTemplates);

// @route   GET /api/email-templates/:id
// @desc    Get email template by ID
// @access  Private
router.get('/:id', getTemplateById);

// @route   POST /api/email-templates
// @desc    Create a new email template
// @access  Private
router.post('/', createTemplate);

// @route   PUT /api/email-templates/:id
// @desc    Update an email template
// @access  Private
router.put('/:id', updateTemplate);

// @route   DELETE /api/email-templates/:id
// @desc    Delete an email template
// @access  Private
router.delete('/:id', deleteTemplate);

// @route   PATCH /api/email-templates/:id/set-default
// @desc    Set a template as default
// @access  Private
router.patch('/:id/set-default', setDefaultTemplate);

export default router; 