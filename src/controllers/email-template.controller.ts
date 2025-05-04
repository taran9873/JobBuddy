import { Request, Response } from 'express';
import EmailTemplate, { EmailTemplateType } from '../models/email-template.model';
import mongoose from 'mongoose';

/**
 * Get all email templates
 * @route GET /api/email-templates
 * @access Private
 */
export const getAllTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.query.type as EmailTemplateType | undefined;
    const query = type ? { type } : {};
    
    const templates = await EmailTemplate.find(query).sort({ isDefault: -1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Get email template by ID
 * @route GET /api/email-templates/:id
 * @access Private
 */
export const getTemplateById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid template ID format'
      });
      return;
    }
    
    const template = await EmailTemplate.findById(id);
    
    if (!template) {
      res.status(404).json({
        success: false,
        error: 'Template not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Create a new email template
 * @route POST /api/email-templates
 * @access Private
 */
export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, type, subject, body, isDefault } = req.body;
    
    // Basic validation
    if (!name || !type || !subject || !body) {
      res.status(400).json({
        success: false,
        error: 'Please provide all required fields: name, type, subject, body'
      });
      return;
    }
    
    // Validate template type
    if (!Object.values(EmailTemplateType).includes(type)) {
      res.status(400).json({
        success: false,
        error: `Invalid template type. Must be one of: ${Object.values(EmailTemplateType).join(', ')}`
      });
      return;
    }
    
    // Create new template
    const template = new EmailTemplate({
      name,
      type,
      subject,
      body,
      isDefault: isDefault || false
    });
    
    const savedTemplate = await template.save();
    
    res.status(201).json({
      success: true,
      data: savedTemplate
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Update an email template
 * @route PUT /api/email-templates/:id
 * @access Private
 */
export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, type, subject, body, isDefault } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid template ID format'
      });
      return;
    }
    
    // Validate template type if provided
    if (type && !Object.values(EmailTemplateType).includes(type)) {
      res.status(400).json({
        success: false,
        error: `Invalid template type. Must be one of: ${Object.values(EmailTemplateType).join(', ')}`
      });
      return;
    }
    
    // Check if template exists
    const existingTemplate = await EmailTemplate.findById(id);
    
    if (!existingTemplate) {
      res.status(404).json({
        success: false,
        error: 'Template not found'
      });
      return;
    }
    
    // Update the template
    const updatedTemplate = await EmailTemplate.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(type && { type }),
        ...(subject && { subject }),
        ...(body && { body }),
        ...(isDefault !== undefined && { isDefault })
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedTemplate
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Delete an email template
 * @route DELETE /api/email-templates/:id
 * @access Private
 */
export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid template ID format'
      });
      return;
    }
    
    const template = await EmailTemplate.findById(id);
    
    if (!template) {
      res.status(404).json({
        success: false,
        error: 'Template not found'
      });
      return;
    }
    
    // Don't allow deletion of the default template
    if (template.isDefault) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete the default template'
      });
      return;
    }
    
    await EmailTemplate.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Set a template as default
 * @route PATCH /api/email-templates/:id/set-default
 * @access Private
 */
export const setDefaultTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid template ID format'
      });
      return;
    }
    
    const template = await EmailTemplate.findById(id);
    
    if (!template) {
      res.status(404).json({
        success: false,
        error: 'Template not found'
      });
      return;
    }
    
    // Unset any existing default templates of the same type
    await EmailTemplate.updateMany(
      { type: template.type, isDefault: true },
      { isDefault: false }
    );
    
    // Set this template as default
    template.isDefault = true;
    await template.save();
    
    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}; 