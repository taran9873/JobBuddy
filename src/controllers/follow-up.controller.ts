import { Request, Response } from 'express';
import FollowUp from '../models/follow-up.model';
import JobApplication from '../models/job-application.model';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

/**
 * Get all follow-ups with optional filtering
 */
export const getFollowUps = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      recipient_email, 
      company, 
      position, 
      status, 
      original_application_id,
      limit = 100, 
      skip = 0,
      sort_field = 'updated_at',
      sort_order = -1 
    } = req.query;
    
    // Build query with user context
    const query: any = {
      user: req.user?._id
    };
    
    if (recipient_email) query.recipient_email = recipient_email;
    if (company) query.company = company;
    if (position) query.position = position;
    if (status) query.status = status;
    if (original_application_id) {
      query.original_application_id = mongoose.Types.ObjectId.isValid(original_application_id as string) 
        ? original_application_id 
        : null;
    }
    
    // Build sort object
    const sortField = sort_field as string;
    const sortOrder = Number(sort_order);
    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sortField] = sortOrder as 1 | -1;
    
    // Execute query with pagination
    const followUps = await FollowUp.find(query)
      .sort(sortObj)
      .limit(Number(limit))
      .skip(Number(skip));
    
    res.status(200).json(followUps);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};

/**
 * Get job applications due for follow-up
 */
export const getDueFollowUps = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find job applications due for follow-up with user context
    const dueApplications = await JobApplication.find({
      user: req.user?._id,
      'follow_up_settings.next_follow_up_date': { $lte: Date.now() },
      'follow_up_settings.follow_up_count': { 
        $lt: { $ifNull: ['$follow_up_settings.max_count', 1] } 
      },
      status: 'sent' // Only process applications that are sent but not responded
    }).sort({ 'follow_up_settings.next_follow_up_date': 1 });
    
    res.status(200).json(dueApplications);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};

/**
 * Get a single follow-up by ID
 */
export const getFollowUpById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.followupId;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid follow-up ID format'
      });
      return;
    }
    
    const followUp = await FollowUp.findOne({
      _id: id,
      user: req.user?._id
    });
    
    if (!followUp) {
      res.status(404).json({
        success: false,
        error: 'Follow-up not found'
      });
      return;
    }
    
    res.status(200).json(followUp);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};

/**
 * Create a new follow-up
 */
export const createFollowUp = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      recipient_email,
      subject,
      content,
      company,
      position,
      original_application_id,
      status = 'sent',
      follow_up_number = 1,
      // Email sending parameters
      sender_email,
      sender_name,
      sender_password,
      smtp_server = 'smtp.gmail.com',
      smtp_port = 587
    } = req.body;
    
    // Validate required fields for database
    if (!recipient_email || !subject || !content) {
      res.status(400).json({
        success: false,
        error: 'Please provide recipient_email, subject, and content'
      });
      return;
    }
    
    // Create follow-up record in database with user context
    const followUp = await FollowUp.create({
      user: req.user?._id,
      recipient_email,
      subject,
      content,
      company,
      position,
      original_application_id,
      status,
      follow_up_number,
      created_at: Date.now(),
      updated_at: Date.now(),
      sent_at: status === 'sent' ? Date.now() : null
    });
    
    // Update original application if available
    if (original_application_id && mongoose.Types.ObjectId.isValid(original_application_id)) {
      await JobApplication.findOneAndUpdate(
        {
          _id: original_application_id,
          user: req.user?._id
        },
        {
          $inc: { 'follow_up_settings.follow_up_count': 1 },
          $set: {
            'follow_up_settings.last_follow_up_date': Date.now(),
            updated_at: Date.now()
          }
        }
      );
    }
    
    // If email credentials are provided, attempt to send email
    let emailSent = false;
    let emailError = null;
    
    if (sender_email && sender_password) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtp_server,
          port: smtp_port,
          secure: smtp_port === 465,
          auth: {
            user: sender_email,
            pass: sender_password
          }
        });
        
        await transporter.sendMail({
          from: `"${sender_name || 'Job Application Follow-up'}" <${sender_email}>`,
          to: recipient_email,
          subject: subject,
          html: content
        });
        
        emailSent = true;
      } catch (error: any) {
        emailError = error.message;
        // Update follow-up status to failed
        await FollowUp.findByIdAndUpdate(followUp._id, { status: 'failed' });
      }
    }
    
    res.status(201).json({
      id: followUp._id,
      success: true,
      email_sent: emailSent,
      email_error: emailError
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};

/**
 * Update a follow-up
 */
export const updateFollowUp = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.followupId;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid follow-up ID format'
      });
      return;
    }
    
    // Add updated_at timestamp to the update payload
    const updateData = { ...req.body, updated_at: Date.now() };
    
    const followUp = await FollowUp.findOneAndUpdate(
      {
        _id: id,
        user: req.user?._id
      },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!followUp) {
      res.status(404).json({
        success: false,
        error: 'Follow-up not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};

/**
 * Delete a follow-up
 */
export const deleteFollowUp = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.followupId;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid follow-up ID format'
      });
      return;
    }
    
    const followUp = await FollowUp.findOneAndDelete({
      _id: id,
      user: req.user?._id
    });
    
    if (!followUp) {
      res.status(404).json({
        success: false,
        error: 'Follow-up not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
}; 