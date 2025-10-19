import { supabase } from './supabaseClient';
import EmailService from './emailService';
import SimpleEmailNotifier from './simpleEmailNotifier';
import emailjs from '@emailjs/browser';

export interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
}

export interface AdminSession {
  session_token: string;
  expires_at: string;
}

export interface BannedUser {
  id: string;
  user_email: string;
  reason: string;
  banned_by: string;
  banned_at: string;
}

export interface ReportedContent {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description?: string;
  reporter_email: string;
  reporter_name?: string;
  content_snapshot: any;
  status: string;
  priority: string;
  created_at: string;
  admin_notes?: string;
}

export interface ContactSubmission {
  id: string;
  student_name: string;
  student_email: string;
  subject: string;
  message: string;
  status: 'pending' | 'replied' | 'resolved';
  submitted_at: string;
  admin_reply?: string;
  replied_at?: string;
  replied_by?: string;
}

class SecureAdminService {
  private static sessionToken: string | null = null;
  private static adminUser: AdminUser | null = null;

  // SECURE AUTHENTICATION - No password exposure
  static async authenticateAdmin(username: string, password: string): Promise<{user: AdminUser, session: AdminSession} | null> {
    try {
      // Input validation and sanitization
      const cleanUsername = username.trim().replace(/[<>]/g, ''); // Basic XSS prevention
      const cleanPassword = password.trim();
      
      if (!cleanUsername || !cleanPassword) {
        throw new Error('Username and password are required');
      }
      
      if (cleanUsername.length > 50 || cleanPassword.length > 100) {
        throw new Error('Invalid input length');
      }

      // Call secure authentication function (NO LOGGING OF SENSITIVE DATA)
      const { data, error } = await supabase.rpc('authenticate_admin_secure', {
        username_input: cleanUsername,
        password_input: cleanPassword
      });

      if (error) {
        console.error('Authentication error:', error.message); // Safe to log
        throw new Error('Authentication failed');
      }

      // The function returns an array with one object: [{success: bool, session_token: string, message: string}]
      const result = Array.isArray(data) ? data[0] : data;
      
      if (!result || !result.success) {
        // No detailed error messages to prevent information disclosure
        throw new Error('Invalid credentials');
      }

      // Store session securely
      this.sessionToken = result.session_token;
      
      // Create admin user object (since our function doesn't return full user details)
      const adminUser: AdminUser = {
        id: 'admin', // We'll get the actual ID from session validation
        username: cleanUsername,
        full_name: 'Administrator',
        is_active: true
      };
      
      this.adminUser = adminUser;

      // Store in secure sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_session', result.session_token);
        // Session expires in 24 hours (as set in the database function)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        sessionStorage.setItem('admin_expires', expiresAt);
      }

      return {
        user: adminUser,
        session: {
          session_token: result.session_token,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      };
    } catch (error) {
      // Generic error message - no sensitive data exposure
      console.error('Admin authentication failed'); // Safe generic message
      throw new Error('Authentication failed');
    }
  }

  // Validate existing session
  static async validateSession(sessionToken?: string): Promise<AdminUser | null> {
    try {
      const token = sessionToken || this.sessionToken || 
                   (typeof window !== 'undefined' ? sessionStorage.getItem('admin_session') : null);

      if (!token) {
        return null;
      }

      const { data, error } = await supabase.rpc('validate_admin_session', {
        token_input: token
      });

      if (error) {
        console.error('Session validation error:', error.message);
        this.logout();
        return null;
      }

      // The function returns an array with one object: [{valid: bool, admin_id: uuid, username: string}]
      const result = Array.isArray(data) ? data[0] : data;
      
      if (!result || !result.valid) {
        this.logout();
        return null;
      }

      // Create admin user object from session validation result
      const adminUser: AdminUser = {
        id: result.admin_id,
        username: result.username,
        full_name: 'Administrator',
        is_active: true
      };

      this.adminUser = adminUser;
      this.sessionToken = token;

      return adminUser;
    } catch (error) {
      console.error('Session validation failed');
      this.logout();
      return null;
    }
  }

  // Secure logout
  static async logout(): Promise<void> {
    try {
      // Clean up client-side data
      this.sessionToken = null;
      this.adminUser = null;
      
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('admin_session');
        sessionStorage.removeItem('admin_expires');
      }

      // Optionally invalidate session on server
      // Could add a revoke_session function to the database
    } catch (error) {
      console.error('Logout error');
    }
  }

  // Get current admin user
  static getCurrentUser(): AdminUser | null {
    return this.adminUser;
  }

  // Check if user is banned (existing functionality)
  static async checkUserBanStatus(userEmail: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('admin_banned_users')
        .select('id')
        .eq('user_email', userEmail)
        .eq('is_active', true)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  // CONTACT FORM METHODS
  
  // Submit contact form (for students)
  static async submitContactForm(formData: {
    student_name: string;
    student_email: string;
    subject: string;
    message: string;
  }): Promise<string> {
    try {
      // Input validation and sanitization
      const cleanData = {
        student_name: formData.student_name.trim().substring(0, 100),
        student_email: formData.student_email.trim().toLowerCase().substring(0, 100),
        subject: formData.subject.trim().substring(0, 200),
        message: formData.message.trim().substring(0, 2000)
      };

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanData.student_email)) {
        throw new Error('Invalid email format');
      }

      // Insert contact submission
      const { data, error } = await supabase
        .from('admin_contact_submissions')
        .insert([{
          student_name: cleanData.student_name,
          student_email: cleanData.student_email,
          subject: cleanData.subject,
          message: cleanData.message,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Send email notification via EmailJS and fallback
      try {
        await SecureAdminService.sendEmailJSNotification({
          id: data.id,
          student_name: cleanData.student_name,
          student_email: cleanData.student_email,
          subject: cleanData.subject,
          message: cleanData.message,
          submitted_at: data.submitted_at || new Date().toISOString()
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      return data.id;
    } catch (error: any) {
      console.error('Contact form submission error');
      throw new Error('Failed to submit contact form');
    }
  }

  // Send email notification via EmailJS (simpler than webhooks!)
  private static async sendEmailJSNotification(contactData: {
    id: string;
    student_name: string;
    student_email: string;
    subject: string;
    message: string;
    submitted_at: string;
  }): Promise<void> {
    // EmailJS configuration
    const emailjsConfig = {
      serviceId: 'service_t65amr9',
      templateId: 'template_f4q3mzh',
      publicKey: 'l6u-pMXlgYyXxdumb'
    };

    try {
      // Initialize EmailJS with public key
      emailjs.init(emailjsConfig.publicKey);
      console.log('📧 EmailJS initialized successfully with public key');
    } catch (initError) {
      console.error('❌ EmailJS initialization failed:', initError);
      throw new Error('EmailJS init failed: ' + initError.message);
    }

    // Template parameters that match your EmailJS template variables
    const templateParams = {
      name: contactData.student_name,      // matches {{name}} in template
      email: contactData.student_email,    // matches {{email}} in template  
      subject: contactData.subject,        // matches {{subject}} in template
      message: contactData.message,        // matches {{message}} in template
      time: new Date(contactData.submitted_at).toLocaleString(),
      submission_id: contactData.id
    };

    try {
      // Use the simpler emailjs.send method
      const result = await emailjs.send(
        emailjsConfig.serviceId,
        emailjsConfig.templateId,
        templateParams
      );
      
      return; // Success - don't run fallback
      
    } catch (error: any) {
      // Use fallback method when EmailJS fails
      SecureAdminService.sendFallbackNotification(contactData);
    }
  }

  // Keep webhook method as backup
  static async sendWebhookNotification(contactData: {
    id: string;
    student_name: string;
    student_email: string;
    subject: string;
    message: string;
    submitted_at: string;
  }): Promise<void> {
    const webhookUrls = [
      // Replace with your actual webhook URLs
      'https://hook.us1.make.com/YOUR_WEBHOOK_URL_HERE', // Replace with your Make.com webhook
      'https://hooks.zapier.com/hooks/catch/YOUR_ZAPIER_URL_HERE', // Replace with your Zapier webhook (optional)
    ];

    const emailPayload = {
      to: ['montasirshariar123@gmail.com', 'sifatullah.fahim@g.bracu.ac.bd'],
      subject: `[BRACU Loop] New Contact: ${contactData.subject}`,
      html: this.generateEmailHTML(contactData),
      text: this.generateEmailText(contactData),
      contact_data: contactData
    };

    // Try each webhook URL
    for (const webhookUrl of webhookUrls) {
      if (webhookUrl.includes('placeholder')) {
        console.log('⚠️ Webhook URL not configured, using fallback method');
        continue;
      }

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload)
        });

        if (response.ok) {
          console.log('✅ Webhook notification sent successfully');
          return; // Success, exit early
        } else {
          console.log(`⚠️ Webhook failed with status: ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ Webhook error for ${webhookUrl}:`, error);
      }
    }

    // Fallback: Use simple notification method
    console.log('📧 Webhook failed, using fallback email method');
    SecureAdminService.sendFallbackNotification(contactData);
  }

  // Generate HTML email content
  static generateEmailHTML(contactData: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
        .message-box { background: #f1f3f5; padding: 15px; border-left: 4px solid #0066cc; margin: 15px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 15px; }
        .button { display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>🔔 New Contact Message - BRACU Loop</h2>
        <p>A student has submitted a new message through the contact form.</p>
    </div>
    
    <div class="content">
        <p><strong>From:</strong> ${contactData.student_name}</p>
        <p><strong>Email:</strong> <a href="mailto:${contactData.student_email}">${contactData.student_email}</a></p>
        <p><strong>Subject:</strong> ${contactData.subject}</p>
        <p><strong>Submitted:</strong> ${new Date(contactData.submitted_at).toLocaleString()}</p>
        
        <div class="message-box">
            <p><strong>Message:</strong></p>
            <p>${contactData.message.replace(/\n/g, '<br>')}</p>
        </div>
        
        <p>
            <a href="mailto:${contactData.student_email}?subject=Re: ${encodeURIComponent(contactData.subject)}" class="button">
                Reply to Student
            </a>
        </p>
    </div>
    
    <div class="footer">
        <p><strong>How to respond:</strong></p>
        <p>1. Click "Reply to Student" button above</p>
        <p>2. Or send email directly to: ${contactData.student_email}</p>
        <p>3. View in admin dashboard for more options</p>
        <hr>
        <p>Submission ID: ${contactData.id}</p>
        <p>This is an automated notification from BRACU Loop</p>
    </div>
</body>
</html>`;
  }

  // Generate plain text email content
  static generateEmailText(contactData: any): string {
    return `
🔔 New Contact Message - BRACU Loop

From: ${contactData.student_name}
Email: ${contactData.student_email}
Subject: ${contactData.subject}
Submitted: ${new Date(contactData.submitted_at).toLocaleString()}

Message:
${contactData.message}

---
Reply to: ${contactData.student_email}
Submission ID: ${contactData.id}

This is an automated notification from BRACU Loop.
    `.trim();
  }

  // Fallback notification method
  static sendFallbackNotification(contactData: any): void {
    // Create a visible notification in the console with formatting
    console.log('%c📧 NEW CONTACT MESSAGE', 'background: #0066cc; color: white; padding: 8px; border-radius: 4px; font-weight: bold;');
    console.log(`From: ${contactData.student_name} (${contactData.student_email})`);
    console.log(`Subject: ${contactData.subject}`);
    console.log(`Message: ${contactData.message}`);
    console.log(`Submitted: ${new Date(contactData.submitted_at).toLocaleString()}`);
    console.log(`ID: ${contactData.id}`);
    
    // Try to open a mailto link as last resort
    try {
      const mailtoLink = `mailto:montasirshariar@gmail.com,sifatullah.fahim@g.bracu.ac.bd?subject=${encodeURIComponent(`[BRACU Loop] New Contact: ${contactData.subject}`)}&body=${encodeURIComponent(this.generateEmailText(contactData))}`;
      
      const link = document.createElement('a');
      link.href = mailtoLink;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('📬 Mailto link opened - check your default email client');
    } catch (error) {
      console.error('Mailto fallback also failed:', error);
    }
  }

  // Get all contact submissions (for admin dashboard)
  static async getContactSubmissions(): Promise<ContactSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('admin_contact_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to load contact submissions');
      throw new Error('Failed to load contact submissions');
    }
  }

  // Reply to contact submission
  static async replyToContact(
    submissionId: string, 
    reply: string, 
    adminName: string
  ): Promise<void> {
    try {
      const cleanReply = reply.trim().substring(0, 2000);
      
      if (!cleanReply) {
        throw new Error('Reply cannot be empty');
      }

      // First, get the submission details for the email
      const { data: submission, error: fetchError } = await supabase
        .from('admin_contact_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (fetchError || !submission) {
        throw new Error('Contact submission not found');
      }

      // Update submission with reply
      const { error } = await supabase
        .from('admin_contact_submissions')
        .update({
          admin_reply: cleanReply,
          replied_at: new Date().toISOString(),
          replied_by: adminName,
          status: 'replied'
        })
        .eq('id', submissionId);

      if (error) {
        throw error;
      }

      // Send email notification to student
      try {
        await EmailService.notifyStudentReply({
          studentName: submission.student_name,
          studentEmail: submission.student_email,
          originalSubject: submission.subject,
          originalMessage: submission.message,
          adminReply: cleanReply,
          repliedBy: adminName,
          repliedAt: new Date().toISOString()
        });
      } catch (emailError) {
        console.error('Failed to send reply notification email:', emailError);
        // Don't throw error here - reply should still be recorded
      }
      
    } catch (error) {
      console.error('Failed to reply to contact submission');
      throw new Error('Failed to send reply');
    }
  }

  // EXISTING ADMIN METHODS (keeping all current functionality)

  static async getReportedContent(): Promise<ReportedContent[]> {
    try {
      const { data, error } = await supabase
        .from('admin_reported_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to load reported content');
      throw new Error('Failed to load reported content');
    }
  }

  static async getBannedUsers(): Promise<BannedUser[]> {
    try {
      const { data, error } = await supabase
        .from('admin_banned_users')
        .select('*')
        .eq('is_active', true)
        .order('banned_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to load banned users');
      throw new Error('Failed to load banned users');
    }
  }

  static async banUser(userEmail: string, reason: string, adminName: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_banned_users')
        .insert([{
          user_email: userEmail.toLowerCase().trim(),
          reason: reason.trim(),
          banned_by: adminName,
          is_active: true
        }]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to ban user');
      throw new Error('Failed to ban user');
    }
  }

  static async unbanUser(banId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_banned_users')
        .update({ is_active: false })
        .eq('id', banId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to unban user');
      throw new Error('Failed to unban user');
    }
  }

  // Content deletion methods (existing functionality)
  static async deleteActualContent(contentType: string, contentId: string): Promise<boolean> {
    try {
      let deleteResult;

      switch (contentType) {
        case 'faculty_review':
          // Faculty reviews are in the 'reviews' table
          deleteResult = await supabase
            .from('reviews')
            .delete()
            .or(`id.eq.${contentId},(faculty_initial||'_'||created_at).eq.${contentId}`);
          break;

        case 'suggestion_post':
          deleteResult = await supabase
            .from('suggestion_posts')
            .delete()
            .eq('id', contentId);
          break;

        case 'suggestion_comment':
          deleteResult = await supabase
            .from('suggestion_comments')
            .delete()
            .eq('id', contentId);
          break;

        case 'question_paper':
          deleteResult = await supabase
            .from('question-papers')
            .delete()
            .eq('id', contentId);
          break;

        default:
          throw new Error(`Unsupported content type: ${contentType}`);
      }

      if (deleteResult.error) {
        throw deleteResult.error;
      }

      return true;
    } catch (error) {
      console.error(`Failed to delete ${contentType}:`, error);
      return false;
    }
  }

  static async updateReportStatus(reportId: string, status: string, adminNotes?: string): Promise<void> {
    try {
      const updateData: any = { status };
      if (adminNotes) {
        updateData.admin_notes = adminNotes;
      }

      const { error } = await supabase
        .from('admin_reported_content')
        .update(updateData)
        .eq('id', reportId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update report status');
      throw new Error('Failed to update report status');
    }
  }
}

export default SecureAdminService;