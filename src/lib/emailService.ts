// Email Service for Contact Form Notifications
// This service handles sending email notifications to admins when students submit contact forms

export interface EmailTemplate {
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export interface ContactNotificationData {
  studentName: string;
  studentEmail: string;
  subject: string;
  messageType: string;
  message: string;
  submittedAt: string;
  submissionId: string;
}

export interface ReplyNotificationData {
  studentName: string;
  studentEmail: string;
  originalSubject: string;
  originalMessage: string;
  adminReply: string;
  repliedBy: string;
  repliedAt: string;
}

export class EmailService {
  // Admin email addresses
  private static readonly ADMIN_EMAILS = [
    'montasirshariar@gmail.com',
    'sifatullah.fahim@g.bracu.ac.bd'
  ];

  // App configuration
  private static readonly APP_NAME = 'BRACU Loop';
  private static readonly APP_URL = 'https://your-domain.com'; // Update with actual domain
  private static readonly ADMIN_DASHBOARD_URL = `${this.APP_URL}/admin`;

  /**
   * Generate email template for new contact form submission to admins
   */
  static generateAdminNotificationEmail(data: ContactNotificationData): EmailTemplate {
    const subject = `[${this.APP_NAME}] New Contact Message: ${data.subject}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Contact Message - ${this.APP_NAME}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
        .message-box { background: #f1f3f5; padding: 15px; border-left: 4px solid #0066cc; margin: 15px 0; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #666; }
        .button { display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; }
        .label { font-weight: bold; color: #495057; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🔔 New Contact Message Received</h2>
            <p>A student has submitted a new contact message through ${this.APP_NAME}</p>
        </div>
        
        <div class="content">
            <p><span class="label">From:</span> ${data.studentName}</p>
            <p><span class="label">Email:</span> <a href="mailto:${data.studentEmail}">${data.studentEmail}</a></p>
            <p><span class="label">Subject:</span> ${data.subject}</p>
            <p><span class="label">Message Type:</span> ${this.formatMessageType(data.messageType)}</p>
            <p><span class="label">Submitted:</span> ${new Date(data.submittedAt).toLocaleString()}</p>
            
            <div class="message-box">
                <p class="label">Message:</p>
                <p>${data.message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <p style="margin-top: 20px;">
                <a href="${this.ADMIN_DASHBOARD_URL}" class="button">Open Admin Dashboard</a>
            </p>
        </div>
        
        <div class="footer">
            <p><strong>How to Reply:</strong></p>
            <p>1. Reply directly to this email (it will go to: ${data.studentEmail})</p>
            <p>2. Or use the Admin Dashboard to send a formal reply</p>
            <p>---</p>
            <p>This is an automated notification from ${this.APP_NAME}.</p>
            <p>Submission ID: ${data.submissionId}</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
New Contact Message - ${this.APP_NAME}

From: ${data.studentName} (${data.studentEmail})
Subject: ${data.subject}
Message Type: ${this.formatMessageType(data.messageType)}
Submitted: ${new Date(data.submittedAt).toLocaleString()}

Message:
${data.message}

---
To reply: Send email to ${data.studentEmail}
Admin Dashboard: ${this.ADMIN_DASHBOARD_URL}
Submission ID: ${data.submissionId}
    `.trim();

    return {
      to: this.ADMIN_EMAILS,
      subject,
      html,
      text
    };
  }

  /**
   * Generate email template for admin reply to student
   */
  static generateStudentReplyEmail(data: ReplyNotificationData): EmailTemplate {
    const subject = `[${this.APP_NAME}] Reply to your message: ${data.originalSubject}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reply from ${this.APP_NAME} Admin Team</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
        .original-message { background: #f8f9fa; padding: 15px; border-left: 4px solid #6c757d; margin: 15px 0; }
        .admin-reply { background: #e7f3ff; padding: 15px; border-left: 4px solid #0066cc; margin: 15px 0; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #666; }
        .label { font-weight: bold; color: #495057; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>✅ Reply from ${this.APP_NAME} Admin Team</h2>
            <p>Hello ${data.studentName},</p>
            <p>Thank you for contacting us. We have a response to your message:</p>
        </div>
        
        <div class="content">
            <div class="original-message">
                <p class="label">Your Original Message:</p>
                <p><strong>Subject:</strong> ${data.originalSubject}</p>
                <p>${data.originalMessage.replace(/\n/g, '<br>')}</p>
            </div>
            
            <div class="admin-reply">
                <p class="label">Our Reply:</p>
                <p>${data.adminReply.replace(/\n/g, '<br>')}</p>
            </div>
            
            <p><span class="label">Replied by:</span> ${data.repliedBy}</p>
            <p><span class="label">Reply date:</span> ${new Date(data.repliedAt).toLocaleString()}</p>
        </div>
        
        <div class="footer">
            <p>If you have any follow-up questions, please feel free to contact us again through the ${this.APP_NAME} contact form.</p>
            <p>---</p>
            <p><strong>Best regards,</strong><br>${this.APP_NAME} Admin Team</p>
            <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Reply from ${this.APP_NAME} Admin Team

Hello ${data.studentName},

Thank you for contacting us. Here is our response to your message:

Your Original Message:
Subject: ${data.originalSubject}
${data.originalMessage}

Our Reply:
${data.adminReply}

---
Replied by: ${data.repliedBy}
Reply date: ${new Date(data.repliedAt).toLocaleString()}

If you have any follow-up questions, please feel free to contact us again.

Best regards,
${this.APP_NAME} Admin Team
    `.trim();

    return {
      to: [data.studentEmail],
      subject,
      html,
      text
    };
  }

  /**
   * Send email using external service (placeholder - implement with your preferred service)
   * Examples: SendGrid, Mailgun, AWS SES, Resend, etc.
   */
  static async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      // TODO: Implement actual email sending with your preferred service
      // Example with fetch to a serverless function or email API:
      
      console.log('📧 Email would be sent:');
      console.log('To:', template.to);
      console.log('Subject:', template.subject);
      console.log('HTML Preview:', template.html.substring(0, 200) + '...');
      
      // Placeholder for actual email sending
      // const response = await fetch('/api/send-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(template)
      // });
      // return response.ok;
      
      // For now, just log the email (replace with actual implementation)
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send notification to admins about new contact form submission
   */
  static async notifyAdminsNewContact(data: ContactNotificationData): Promise<boolean> {
    const emailTemplate = this.generateAdminNotificationEmail(data);
    return await this.sendEmail(emailTemplate);
  }

  /**
   * Send reply notification to student
   */
  static async notifyStudentReply(data: ReplyNotificationData): Promise<boolean> {
    const emailTemplate = this.generateStudentReplyEmail(data);
    return await this.sendEmail(emailTemplate);
  }

  /**
   * Format message type for display
   */
  private static formatMessageType(messageType: string): string {
    const typeMap: Record<string, string> = {
      'general': 'General Inquiry',
      'technical': 'Technical Support',
      'account': 'Account Issues',
      'content': 'Content Issues',
      'faculty': 'Faculty Information',
      'course': 'Course Information',
      'bug_report': 'Bug Report',
      'feature_request': 'Feature Request',
      'feedback': 'Feedback & Suggestions',
      'other': 'Other'
    };
    
    return typeMap[messageType] || messageType;
  }
}

export default EmailService;