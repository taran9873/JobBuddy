import { Request, Response } from 'express';
import JobApplication from '../models/job-application.model';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

/**
 * Get all job applications with optional filtering
 */
export const getJobApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      recipient_email, 
      company, 
      position, 
      status, 
      limit = 100, 
      skip = 0,
      sort_field = 'updated_at',
      sort_order = -1
    } = req.query;
    
    // Build query
    const query: any = {
      user: req.user?._id
    };
    
    if (recipient_email) query.recipient_email = recipient_email;
    if (company) query.company = company;
    if (position) query.position = position;
    if (status) query.status = status;
    
    // Build sort object
    const sortField = sort_field as string;
    const sortOrder = Number(sort_order);
    const sortObj: Record<string, 1 | -1> = {};
    
    // Ensure date fields are properly sorted by timestamp
    if (sortField === 'updated_at' || sortField === 'created_at' || sortField === 'sent_at') {
      sortObj[sortField] = sortOrder as 1 | -1;
    } else {
      sortObj[sortField] = sortOrder as 1 | -1;
    }
    
    // Execute query with pagination
    const applications = await JobApplication.find(query)
      .sort(sortObj)
      .limit(Number(limit))
      .skip(Number(skip));
    
    res.status(200).json(applications);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};

/**
 * Get all draft job applications
 */
export const getDraftApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      limit = 5, 
      skip = 0,
      sort_field = 'updated_at',
      sort_order = -1 
    } = req.query;
    
    // Build sort object
    const sortField = sort_field as string;
    const sortOrder = Number(sort_order);
    const sortObj: Record<string, 1 | -1> = {};
    
    // Ensure date fields are properly sorted by timestamp
    if (sortField === 'updated_at' || sortField === 'created_at' || sortField === 'sent_at') {
      sortObj[sortField] = sortOrder as 1 | -1;
    } else {
      sortObj[sortField] = sortOrder as 1 | -1;
    }
    
    // Find drafts with user context
    const drafts = await JobApplication.find({ 
      status: 'draft',
      user: req.user?._id
    })
      .sort(sortObj)
      .limit(Number(limit))
      .skip(Number(skip));
    
    res.status(200).json(drafts);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};

/**
 * Get a single job application by ID
 */
export const getJobApplicationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.applicationId;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid application ID format'
      });
      return;
    }
    
    const application = await JobApplication.findOne({
      _id: id,
      user: req.user?._id
    });
    
    if (!application) {
      res.status(404).json({
        success: false,
        error: 'Job application not found'
      });
      return;
    }
    
    res.status(200).json(application);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};

/**
 * Create a new job application
 */
export const createJobApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      recipient_email,
      subject,
      content,
      company,
      position,
      status = 'sent',
      attachment_path,
      follow_up_settings,
      full_name,
      portfolio_url,
      linkedin_url,
      sender_email,
      sender_name,
      sender_password
    } = req.body;
    
    // Validate required fields
    if (!recipient_email || !subject || !content) {
      res.status(400).json({
        success: false,
        error: 'Please provide recipient_email, subject, and content'
      });
      return;
    }
    
    let finalStatus = status;
    let emailError = null;
    
    // Create new application with initial status and user context
    const application = await JobApplication.create({
      user: req.user?._id,
      recipient_email,
      subject,
      content,
      company,
      position,
      status: finalStatus,
      attachment_path,
      follow_up_settings,
      full_name,
      portfolio_url,
      linkedin_url,
      created_at: Date.now(),
      updated_at: Date.now()
    });
    
    // If status is 'processing', attempt to send the email and update status
    if (status === 'processing' && sender_email && sender_password) {
      try {
        // Create email transport with improved settings
        const transporter = nodemailer.createTransport({
          host: req.body.smtp_server || 'smtp.gmail.com',
          port: req.body.smtp_port || 587,
          secure: (req.body.smtp_port || 587) === 465,
          auth: {
            user: sender_email,
            pass: sender_password
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        
        // Generate plain text version of the HTML content
        const plainText = content
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<p.*?>/gi, '\n')
          .replace(/<li.*?>/gi, '\n- ')
          .replace(/<.*?>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        
        // Configure mail options
        const mailOptions: nodemailer.SendMailOptions = {
          from: `"${sender_name || 'Automated Email'}" <${sender_email}>`,
          to: recipient_email,
          subject: subject,
          html: content,
          text: plainText,
          headers: {
            'X-Priority': '3',
            'X-MSMail-Priority': 'Normal',
            'X-Mailer': 'JobBuddy Application System',
            'List-Unsubscribe': `<mailto:${sender_email}?subject=Unsubscribe>`
          }
        };
        
        if (attachment_path) {
          mailOptions.attachments = [
            {
              path: attachment_path
            }
          ];
        }
        
        // Send email
        await transporter.sendMail(mailOptions);
        
        // Update application status to 'sent'
        await JobApplication.findByIdAndUpdate(
          application._id,
          { 
            status: 'sent', 
            updated_at: Date.now(),
            sent_at: Date.now()
          }
        );
        
        res.status(201).json(application);
      } catch (error: any) {
        // Update application status to 'failed'
        await JobApplication.findByIdAndUpdate(
          application._id,
          { 
            status: 'failed', 
            updated_at: Date.now()
          }
        );
        
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to send email'
        });
      }
    } else {
      res.status(201).json(application);
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};

/**
 * Update a job application
 */
export const updateJobApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.applicationId;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid application ID format'
      });
      return;
    }
    
    // Find and update application with user context
    const application = await JobApplication.findOneAndUpdate(
      {
        _id: id,
        user: req.user?._id
      },
      {
        ...req.body,
        updated_at: Date.now()
      },
      { new: true }
    );
    
    if (!application) {
      res.status(404).json({
        success: false,
        error: 'Job application not found'
      });
      return;
    }
    
    res.status(200).json(application);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};

/**
 * Delete a job application
 */
export const deleteJobApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.applicationId;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid application ID format'
      });
      return;
    }
    
    // Delete application with user context
    const application = await JobApplication.findOneAndDelete({
      _id: id,
      user: req.user?._id
    });
    
    if (!application) {
      res.status(404).json({
        success: false,
        error: 'Job application not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Job application deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
}; 