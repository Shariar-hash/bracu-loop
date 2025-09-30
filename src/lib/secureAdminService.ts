import { supabase } from './supabaseClient';

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

      return data.id;
    } catch (error: any) {
      console.error('Contact form submission error');
      throw new Error('Failed to submit contact form');
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

      // TODO: Send email to student (implement email service)
      // await this.sendEmailToStudent(submission.student_email, reply);
      
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