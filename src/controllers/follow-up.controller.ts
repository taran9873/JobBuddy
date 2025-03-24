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
    
    // Build query
    const query: any = {};
    
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
    
    // Return the follow-ups array directly
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
    // Find job applications due for follow-up
    const dueApplications = await JobApplication.find({
      'follow_up_settings.next_follow_up_date': { $lte: Date.now() },
      'follow_up_settings.follow_up_count': { 
        $lt: { $ifNull: ['$follow_up_settings.max_count', 1] } 
      },
      status: 'sent' // Only process applications that are sent but not responded
    }).sort({ 'follow_up_settings.next_follow_up_date': 1 });
    
    // Return the applications array directly
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
    
    const followUp = await FollowUp.findById(id);
    
    if (!followUp) {
      res.status(404).json({
        success: false,
        error: 'Follow-up not found'
      });
      return;
    }
    
    // Return the follow-up object directly
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
    
    // Create follow-up record in database
    const followUp = await FollowUp.create({
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
      await JobApplication.findByIdAndUpdate(
        original_application_id,
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
        // Create transporter
        const transporter = nodemailer.createTransport({
          host: smtp_server,
          port: Number(smtp_port),
          secure: Number(smtp_port) === 465, // true for 465, false for other ports
          auth: {
            user: sender_email,
            pass: sender_password
          }
        });
        
        // Configure mail options
        const mailOptions = {
          from: `"${sender_name || 'Automated Follow-up'}" <${sender_email}>`,
          to: recipient_email,
          subject: subject,
          html: content.replace(/\n/g, '<br>')
        };
        
        // Send email
        console.log('Attempting to send follow-up email with transporter:', {
          host: smtp_server,
          port: smtp_port,
          secure: Number(smtp_port) === 465,
          auth: { user: sender_email }
        });
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Follow-up email sent:', info.messageId);
        emailSent = true;
      } catch (emailErr: any) {
        console.error('Error sending follow-up email:', emailErr);
        emailError = emailErr.message;
        
        // Update status to failed if email sending fails
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
    console.error('Error in createFollowUp:', error);
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
    
    const followUp = await FollowUp.findByIdAndUpdate(
      id,
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
    
    const followUp = await FollowUp.findByIdAndDelete(id);
    
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