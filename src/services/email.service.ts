import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Email service for sending emails and follow-ups
 */
class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly fromName: string;
  private readonly fromEmail: string;
  
  constructor() {
    this.fromName = process.env.EMAIL_NAME || 'Automated Emails';
    this.fromEmail = process.env.EMAIL_USERNAME || '';
    
    // Validate required environment variables
    if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
      console.error('Missing required email credentials. Please set EMAIL_USERNAME and EMAIL_PASSWORD in your .env file');
      throw new Error('Missing email credentials');
    }
    
    // Initialize transporter with improved settings for deliverability
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      },
      // Add TLS settings for secure connections
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });

    // Verify transporter configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email service configuration error:', error);
        throw new Error('Failed to configure email service: ' + error.message);
      }
      console.log('Email service is ready to send messages');
    });
  }
  
  /**
   * Generate plain text version from HTML
   * @param html HTML content
   * @returns Plain text version
   */
  private generatePlainText(html: string): string {
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
  }
  
  /**
   * Send an email
   * @param to Recipient email
   * @param subject Email subject
   * @param html Email content in HTML format
   * @param attachments Optional attachments
   * @returns Promise with the result
   */
  async sendEmail(
    to: string, 
    subject: string, 
    html: string, 
    attachments?: Array<{ filename: string; path: string }>
  ): Promise<boolean> {
    try {
      if (!this.fromEmail) {
        throw new Error('Email service not properly configured');
      }

      // Generate plain text alternative
      const plainText = this.generatePlainText(html);
      
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
        text: plainText,
        attachments,
        headers: {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'X-Mailer': 'JobBuddy Application System',
          'List-Unsubscribe': `<mailto:${this.fromEmail}?subject=Unsubscribe>`
        }
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error(`Failed to send email to ${to}:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
  
  /**
   * Load an email template
   * @param templateName Name of the template file
   * @param replacements Key-value pairs for template variables
   * @returns The processed template content
   */
  loadTemplate(templateName: string, replacements: Record<string, string>): string {
    try {
      // Read template file
      const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
      let content = fs.readFileSync(templatePath, 'utf8');
      
      // Replace variables
      Object.entries(replacements).forEach(([key, value]) => {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
      
      return content;
    } catch (error) {
      console.error(`Failed to load template ${templateName}:`, error);
      // Return a basic template if the file doesn't exist
      return `<div>${replacements.content || ''}</div>`;
    }
  }
  
  /**
   * Send a follow-up email
   * @param to Recipient email
   * @param subject Email subject
   * @param content Email content
   * @param originalApplication Original application details (for context)
   * @returns Promise with the result
   */
  async sendFollowUp(
    to: string, 
    subject: string, 
    content: string, 
    originalApplication: { company: string; position: string; sentDate: Date | string | number }
  ): Promise<boolean> {
    // Format date
    const sentDate = new Date(originalApplication.sentDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Load template with replacements
    const html = this.loadTemplate('follow-up', {
      content,
      company: originalApplication.company || 'your company',
      position: originalApplication.position || 'the position',
      sentDate
    });
    
    return this.sendEmail(to, subject, html);
  }
}

// Export as singleton
export default new EmailService(); 