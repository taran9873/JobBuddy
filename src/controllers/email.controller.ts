import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import JobApplication from '../models/job-application.model';

/**
 * Generate plain text version from HTML
 * @param html HTML content
 * @returns Plain text version
 */
const generatePlainText = (html: string): string => {
  // Simple HTML to text conversion
  return html
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
};

/**
 * Send an email
 */
export const sendEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      recipient_email,
      subject,
      email_content,
      sender_email,
      sender_name,
      sender_password,
      smtp_server = 'smtp.gmail.com',
      smtp_port = 587,
      attachment_path,
      application_id
    } = req.body;
    
    // Validate required fields
    if (!recipient_email || !subject || !email_content || !sender_email || !sender_password) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields for sending email'
      });
      return;
    }
    
    // Create transporter with improved deliverability settings
    const transporter = nodemailer.createTransport({
      host: smtp_server,
      port: smtp_port,
      secure: smtp_port === 465, // true for 465, false for other ports
      auth: {
        user: sender_email,
        pass: sender_password
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });
    
    // Generate plain text alternative
    const plainText = generatePlainText(email_content);
    
    // Configure mail options with improved deliverability settings
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${sender_name || 'Automated Email'}" <${sender_email}>`,
      to: recipient_email,
      subject: subject,
      html: email_content,
      text: plainText, // Plain text alternative
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'JobBuddy Application System',
        'List-Unsubscribe': `<mailto:${sender_email}?subject=Unsubscribe>`
      }
    };
    
    // Add attachment if provided
    if (attachment_path) {
      mailOptions.attachments = [
        {
          path: attachment_path
        }
      ];
    }
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    // If application_id is provided, create/update job application
    if (application_id) {
      // If it's already in the database, update it
      await JobApplication.findByIdAndUpdate(
        application_id,
        {
          status: 'sent',
          sent_at: new Date(),
          updated_at: new Date()
        },
        { new: true }
      );
    } else {
      // Create new job application record
      await JobApplication.create({
        recipient_email,
        subject,
        content: email_content,
        status: 'sent',
        attachment: attachment_path ? attachment_path.split('/').pop() : null,
        sent_at: new Date()
      });
    }
    
    // Return success
    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
};

/**
 * Test follow-up endpoint (for development/testing)
 */
export const testFollowUp = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'This is a test endpoint for follow-up functionality',
    tip: 'To test the follow-up functionality, use the /api/followups POST endpoint with the correct request format'
  });
}; 