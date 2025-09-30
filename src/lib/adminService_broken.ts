import { supabase } from './supabaseClient';

// Types
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'moderator' | 'course_admin';
  is_active: boolean;
  last_login?: string;
  created_at: string;
}
          admin_notes: adminNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId); 'course_admin';
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface ReportedContent {
  id: string;
  content_type: 'faculty_review' | 'question_paper' | 'suggestion_post' | 'suggestion_comment';
  content_id: string;
  reason: string;
  description?: string;
  reporter_email: string;
  reporter_name?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  content_snapshot: any;
  created_at: string;
  admin_action?: string;
  admin_notes?: string;
}

export interface Course {
  id: string;
  course_code: string;
  course_name: string;
  credits: number;
  department: string;
  is_active: boolean;
  created_at: string;
}

export interface Faculty {
  id: string;
  faculty_initial: string;
  full_name: string;
  department: string;
  designation?: string;
  email?: string;
  is_active: boolean;
  courses_taught?: string[];
  created_at: string;
}

export interface StudentMessage {
  id: string;
  student_email: string;
  student_name: string;
  student_id?: string;
  subject: string;
  message_type: string;
  message_content: string;
  status: 'unread' | 'read' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
}

export interface BannedUser {
  id: string;
  user_email: string;
  user_name: string;
  reason: string;
  banned_by: string;
  ban_duration?: string;
  is_permanent: boolean;
  is_active: boolean;
  created_at: string;
}

export class AdminService {
  // Authentication
  static async authenticateAdmin(username: string, password: string): Promise<AdminUser | null> {
    try {
      console.log('=== ADMIN AUTHENTICATION ATTEMPT ===');
      console.log('Username:', username);
      console.log('Password:', password);
      
      // First check if admin_users table exists and has data (PUBLIC SCHEMA)
      console.log('\n1. Checking admin_users table in public schema...');
      const { data: testUsers, error: testError } = await supabase
        .from('admin_users')
        .select('username, password_hash, is_active, full_name')
        .limit(10);
      
      console.log('Available admin users:', testUsers);
      console.log('Table access error:', testError);
      
      if (testError) {
        console.error('Database table access failed:', testError);
        throw new Error('Database not setup. Please run WORKING_ADMIN_SETUP.sql first.');
      }

      if (!testUsers || testUsers.length === 0) {
        console.error('No admin users found in database');
        throw new Error('No admin users found. Please run WORKING_ADMIN_SETUP.sql first.');
      }

      // Check if the exact username/password exists
      console.log('\n2. Checking exact credentials...');
      const matchingUser = testUsers.find(user => 
        user.username === username && user.password_hash === password
      );
      console.log('Matching user from table:', matchingUser);

      // Direct database query (PUBLIC SCHEMA - ONLY method, no RPC)
      console.log('\n3. Direct database authentication in public schema...');
      const { data: directData, error: directError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .eq('password_hash', password)
        .eq('is_active', true)
        .single();

      console.log('Direct query result - data:', directData);
      console.log('Direct query result - error:', directError);

      if (directError) {
        if (directError.code === 'PGRST116') {
          console.error('No matching user found with those credentials');
          return null;
        }
        console.error('Database query failed:', directError);
        throw new Error(`Database error: ${directError.message}`);
      }

      if (directData) {
        console.log('✅ Authentication successful!');
        
        // Update last login (PUBLIC SCHEMA)
        const { error: updateError } = await supabase
          .from('admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', directData.id);
        
        if (updateError) {
          console.warn('Failed to update last_login:', updateError);
        }
        
        const result = {
          id: directData.id,
          username: directData.username,
          email: directData.email,
          full_name: directData.full_name,
          role: directData.role,
          is_active: directData.is_active,
          created_at: directData.created_at
        };
        
        console.log('Returning admin user:', result);
        return result;
      }
      
      console.log('❌ Authentication failed - no user data returned');
      return null;
    } catch (error) {
      console.error('Admin authentication error:', error);
      throw error;
    }
  }

  // Reported Content Management
  static async getReportedContent(): Promise<ReportedContent[]> {
    try {
      const { data, error } = await supabase
        .from('admin_reported_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching reported content:', error);
      throw new Error('Failed to load reported content');
    }
  }

  static async updateReportStatus(
    reportId: string, 
    status: ReportedContent['status'],
    adminAction?: string,
    adminNotes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('reported_content')
        .update({
          status,
          admin_action: adminAction,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating report status:', error);
      throw new Error('Failed to update report status');
    }
  }

  static async createReport(reportData: Partial<ReportedContent>): Promise<ReportedContent> {
    try {
      const { data, error } = await supabase
        .from('reported_content')
        .insert([reportData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating report:', error);
      throw new Error('Failed to create report');
    }
  }

  // Course Management
  static async getCourses(): Promise<Course[]> {
    try {
      const { data, error } = await supabase
        .from('courses_admin')
        .select('*')
        .order('course_code');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching courses:', error);
      
      // Return mock data for testing
      return [
        {
          id: '1',
          course_code: 'CSE110',
          course_name: 'Programming Language I',
          credits: 3.0,
          department: 'CSE',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          course_code: 'CSE111',
          course_name: 'Programming Language II',
          credits: 3.0,
          department: 'CSE',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];
    }
  }

  static async createCourse(courseData: Omit<Course, 'id' | 'created_at'>): Promise<Course> {
    try {
      const { data, error } = await supabase
        .from('courses_admin')
        .insert([courseData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating course:', error);
      throw new Error('Failed to create course');
    }
  }

  static async updateCourse(courseId: string, courseData: Partial<Course>): Promise<Course> {
    try {
      const { data, error } = await supabase
        .from('courses_admin')
        .update(courseData)
        .eq('id', courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating course:', error);
      throw new Error('Failed to update course');
    }
  }

  static async deleteCourse(courseId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('courses_admin')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting course:', error);
      throw new Error('Failed to delete course');
    }
  }

  // Faculty Management
  static async getFaculty(): Promise<Faculty[]> {
    try {
      const { data, error } = await supabase
        .from('faculty_admin')
        .select('*')
        .order('faculty_initial');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching faculty:', error);
      
      // Return mock data for testing
      return [
        {
          id: '1',
          faculty_initial: 'ABC',
          full_name: 'Dr. Abdul Rahman Chowdhury',
          department: 'CSE',
          designation: 'Professor',
          email: 'abc@bracu.ac.bd',
          is_active: true,
          courses_taught: ['CSE110', 'CSE220', 'CSE370'],
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          faculty_initial: 'DEF',
          full_name: 'Ms. Fatema Rahman',
          department: 'CSE',
          designation: 'Senior Lecturer',
          email: 'def@bracu.ac.bd',
          is_active: true,
          courses_taught: ['CSE111', 'CSE230'],
          created_at: new Date().toISOString()
        }
      ];
    }
  }

  static async createFaculty(facultyData: Omit<Faculty, 'id' | 'created_at'>): Promise<Faculty> {
    try {
      const { data, error } = await supabase
        .from('faculty_admin')
        .insert([facultyData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating faculty:', error);
      throw new Error('Failed to create faculty');
    }
  }

  static async updateFaculty(facultyId: string, facultyData: Partial<Faculty>): Promise<Faculty> {
    try {
      const { data, error } = await supabase
        .from('faculty_admin')
        .update(facultyData)
        .eq('id', facultyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating faculty:', error);
      throw new Error('Failed to update faculty');
    }
  }

  static async deleteFaculty(facultyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('faculty_admin')
        .update({ is_active: false })
        .eq('id', facultyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deactivating faculty:', error);
      throw new Error('Failed to deactivate faculty');
    }
  }

  // Student Messages
  static async getStudentMessages(): Promise<StudentMessage[]> {
    try {
      const { data, error } = await supabase
        .from('student_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching student messages:', error);
      
      // Return mock data for testing
      return [
        {
          id: '1',
          student_email: 'helpful.student@g.bracu.ac.bd',
          student_name: 'Alice Johnson',
          student_id: '21101234',
          subject: 'New Faculty Information',
          message_type: 'new_faculty_info',
          message_content: 'I would like to inform you that Dr. XYZ has joined the CSE department as an Assistant Professor. Could you please add them to the faculty database?',
          status: 'unread',
          priority: 'medium',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          student_email: 'urgent.student@g.bracu.ac.bd',
          student_name: 'David Lee',
          student_id: '21109876',
          subject: 'Platform Bug Report',
          message_type: 'bug_report',
          message_content: 'There is a critical issue with the faculty review system. Students cannot submit reviews and getting error 500.',
          status: 'unread',
          priority: 'urgent',
          created_at: new Date().toISOString()
        }
      ];
    }
  }

  static async updateMessageStatus(messageId: string, status: StudentMessage['status']): Promise<void> {
    try {
      const { error } = await supabase
        .from('student_messages')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating message status:', error);
      throw new Error('Failed to update message status');
    }
  }

  static async createStudentMessage(messageData: Omit<StudentMessage, 'id' | 'created_at'>): Promise<StudentMessage> {
    try {
      const { data, error } = await supabase
        .from('student_messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating student message:', error);
      throw new Error('Failed to create student message');
    }
  }

  // User Management
  static async getBannedUsers(): Promise<BannedUser[]> {
    try {
      const { data, error } = await supabase
        .from('banned_users')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching banned users:', error);
      throw new Error('Failed to load banned users');
    }
  }

  static async banUser(userData: {
    user_email: string;
    user_name: string;
    reason: string;
    banned_by: string;
    ban_duration?: string;
    is_permanent: boolean;
  }): Promise<BannedUser> {
    try {
      const { data, error } = await supabase
        .from('banned_users')
        .insert([{
          ...userData,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error banning user:', error);
      throw new Error('Failed to ban user');
    }
  }

  static async unbanUser(banId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('banned_users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', banId);

      if (error) throw error;
    } catch (error) {
      console.error('Error unbanning user:', error);
      throw new Error('Failed to unban user');
    }
  }

  // Analytics and Statistics
  static async getDashboardStats(): Promise<{
    pendingReports: number;
    unreadMessages: number;
    totalCourses: number;
    activeFaculty: number;
    bannedUsers: number;
  }> {
    try {
      const [reports, messages, courses, faculty, banned] = await Promise.all([
        supabase.from('reported_content').select('id').eq('status', 'pending'),
        supabase.from('student_messages').select('id').eq('status', 'unread'),
        supabase.from('courses_admin').select('id').eq('is_active', true),
        supabase.from('faculty_admin').select('id').eq('is_active', true),
        supabase.from('banned_users').select('id').eq('is_active', true)
      ]);

      return {
        pendingReports: reports.data?.length || 0,
        unreadMessages: messages.data?.length || 0,
        totalCourses: courses.data?.length || 0,
        activeFaculty: faculty.data?.length || 0,
        bannedUsers: banned.data?.length || 0
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error('Failed to load dashboard statistics');
    }
  }

  // Activity Logging
  static async logActivity(
    adminId: string,
    actionType: string,
    targetType: string,
    targetId: string,
    description: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_activity_log')
        .insert([{
          admin_id: adminId,
          action_type: actionType,
          target_type: targetType,
          target_id: targetId,
          description: description
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error logging admin activity:', error);
      // Don't throw error for logging failures
    }
  }

  // System Settings
  static async getSystemSettings(): Promise<Record<string, string>> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value');

      if (error) throw error;
      
      const settings: Record<string, string> = {};
      data?.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value;
      });
      
      return settings;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      throw new Error('Failed to load system settings');
    }
  }

  static async updateSystemSetting(key: string, value: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: key,
          setting_value: value,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating system setting:', error);
      throw new Error('Failed to update system setting');
    }
  }

  // Real-time subscriptions
  static subscribeToReports(callback: (reports: ReportedContent[]) => void) {
    return supabase
      .channel('reported_content_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'admin_dashboard',
          table: 'reported_content'
        },
        () => {
          // Refetch data when changes occur
          this.getReportedContent().then(callback);
        }
      )
      .subscribe();
  }

  static subscribeToMessages(callback: (messages: StudentMessage[]) => void) {
    return supabase
      .channel('student_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'admin_dashboard',
          table: 'student_messages'
        },
        () => {
          this.getStudentMessages().then(callback);
        }
      )
      .subscribe();
  }
}

export default AdminService;