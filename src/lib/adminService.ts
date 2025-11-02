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

export interface ReportedContent {
  id: string;
  content_type: 'faculty_review' | 'question_paper' | 'suggestion_post' | 'suggestion_comment' | 'student_note';
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
  status: 'unread' | 'read' | 'replied' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  admin_response?: string;
  responded_by?: string;
  created_at: string;
}

export interface BannedUser {
  id: string;
  user_email: string;
  user_name?: string;
  reason: string;
  banned_by: string;
  ban_duration?: string;
  is_permanent: boolean;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

class AdminService {
  // Authentication - FIXED FOR PUBLIC SCHEMA
  static async authenticateAdmin(username: string, password: string): Promise<AdminUser | null> {
    try {
      console.log('=== ADMIN AUTHENTICATION ATTEMPT (PUBLIC SCHEMA) ===');
      console.log('Username:', username);
      console.log('Password:', password);
      
      // Check if admin_users table exists and has data in PUBLIC schema
      console.log('\n1. Checking admin_users table in public schema...');
      const { data: testUsers, error: testError } = await supabase
        .from('admin_users')
        .select('username, password_hash, is_active, full_name')
        .limit(10);
      
      console.log('Available admin users:', testUsers);
      console.log('Table access error:', testError);
      
      if (testError) {
        console.error('Database table access failed:', testError);
        throw new Error('Database not setup. Please run PUBLIC_SCHEMA_ADMIN_SETUP.sql first.');
      }

      if (!testUsers || testUsers.length === 0) {
        console.error('No admin users found in database');
        throw new Error('No admin users found. Please run PUBLIC_SCHEMA_ADMIN_SETUP.sql first.');
      }

      // Check if the exact username/password exists
      console.log('\n2. Checking exact credentials...');
      const matchingUser = testUsers.find(user => 
        user.username === username && user.password_hash === password
      );
      console.log('Matching user from table:', matchingUser);

      // Direct database query in PUBLIC schema
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
        
        // Update last login in PUBLIC schema
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

  // REPORTED CONTENT MANAGEMENT
  static async createReport(reportData: {
    content_type: string;
    content_id: string;
    reason: string;
    description?: string;
    reporter_email: string;
    reporter_name?: string;
    content_snapshot?: any;
  }): Promise<void> {
    try {
      console.log('AdminService.createReport - Attempting insert with data:', reportData);
      
      const insertData = {
        content_type: reportData.content_type,
        content_id: reportData.content_id,
        content_table: reportData.content_type === 'question_paper' ? 'question-papers' :
                      reportData.content_type === 'suggestion_post' ? 'suggestion_posts' :
                      reportData.content_type === 'suggestion_comment' ? 'suggestion_comments' :
                      reportData.content_type === 'faculty_review' ? 'reviews' :
                      reportData.content_type === 'student_note' ? 'student_notes' : 'unknown',
        reason: reportData.reason,
        description: reportData.description || null,
        reporter_email: reportData.reporter_email,
        reporter_name: reportData.reporter_name || 'Anonymous',
        content_snapshot: reportData.content_snapshot || {},
        status: 'pending',
        priority: reportData.reason === 'copyright' || reportData.reason === 'malicious' ? 'critical' :
                 reportData.reason === 'inappropriate' || reportData.reason === 'spam' ? 'high' : 'medium'
      };

      console.log('AdminService.createReport - Insert data prepared:', insertData);

      const { data, error } = await supabase
        .from('reported_content')
        .insert(insertData)
        .select();

      console.log('AdminService.createReport - Supabase response:', { data, error });

      if (error) {
        console.error('AdminService.createReport - Supabase error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('AdminService.createReport - Success! Report created:', data);
    } catch (error: any) {
      console.error('AdminService.createReport - Complete error:', error);
      throw new Error(`Failed to create report: ${error.message || error}`);
    }
  }

  static async getReportedContent(): Promise<ReportedContent[]> {
    try {
      const { data, error } = await supabase
        .from('reported_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading reported content:', error);
      return [];
    }
  }

  static async updateReportStatus(
    reportId: string, 
    status: string, 
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

  static async deleteReport(reportId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('reported_content')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw new Error('Failed to delete report');
    }
  }

  // ADMIN CONTENT ACCESS - Allow admin to view/access reported content for review
  static async getContentForReview(contentType: string, contentId: string): Promise<{ success: boolean; url?: string; content?: any; error?: string }> {
    try {
      console.log(`🔍 Admin accessing ${contentType} with ID: ${contentId}`);
      
      if (contentType === 'student_note') {
        // Get note details first to verify it exists
        const { data: note, error: noteError } = await supabase
          .from('student_notes')
          .select('*')
          .eq('id', contentId)
          .single();

        if (noteError || !note) {
          console.error('Student note not found:', noteError);
          return { success: false, error: 'Student note not found' };
        }

        console.log('Found note:', note.title, 'Type:', note.upload_type);

        // Use the same logic as regular users but without incrementing download count
        if (note.upload_type === 'link') {
          // For links, return the link URL directly
          console.log('Returning link URL:', note.link_url);
          return { 
            success: true, 
            url: note.link_url,
            content: note
          };
        } else if (note.upload_type === 'file' && note.file_path) {
          // For files, create signed URL for admin to access
          console.log('Creating signed URL for file:', note.file_path);
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('student-notes')
            .createSignedUrl(note.file_path, 3600); // 1 hour expiry

          if (urlError) {
            console.error('Failed to create signed URL:', urlError);
            return { success: false, error: 'Failed to create access URL: ' + urlError.message };
          }

          console.log('Generated signed URL successfully');
          return { 
            success: true, 
            url: signedUrlData.signedUrl,
            content: note
          };
        } else {
          return { success: false, error: 'Note has no file or link content' };
        }

      } else if (contentType === 'question_paper') {
        // Handle question paper access
        const isNumericId = !isNaN(Number(contentId)) && contentId.trim() !== '';
        
        let query = supabase
          .from('question_papers')
          .select('*');

        if (isNumericId) {
          query = query.eq('id', Number(contentId));
        } else {
          query = query.eq('id', contentId);
        }

        const { data: question, error: questionError } = await query.single();

        if (questionError || !question) {
          return { success: false, error: 'Question paper not found' };
        }

        // Create signed URL for admin access
        if (question.storage_path) {
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('question-papers')
            .createSignedUrl(question.storage_path, 3600);

          if (urlError) {
            return { success: false, error: 'Failed to create access URL' };
          }

          return { 
            success: true, 
            url: signedUrlData.signedUrl,
            content: question
          };
        }

        return { success: true, content: question };

      } else {
        return { success: false, error: `Content type ${contentType} not supported for admin review` };
      }

    } catch (error) {
      console.error('Error getting content for admin review:', error);
      return { success: false, error: 'Failed to access content: ' + (error as Error).message };
    }
  }

  // DELETE ACTUAL CONTENT from website (when admin takes action)
  static async deleteActualContent(contentType: string, contentId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Attempting to delete ${contentType} with ID: ${contentId}`);
      
      let deleteError;
      let deleted = false;

      // Delete from the actual website tables based on content type
      if (contentType === 'suggestion_post') {
        console.log(`📝 Deleting suggestion post with ID: ${contentId}`);
        
        // First delete associated comments
        const { error: commentsError } = await supabase
          .from('suggestion_comments')
          .delete()
          .eq('post_id', contentId);
          
        if (commentsError) {
          console.warn('⚠️ Error deleting comments:', commentsError.message);
        }
        
        // Then delete the post
        const { error, data } = await supabase
          .from('suggestion_posts')
          .delete()
          .eq('id', contentId)
          .select();
          
        deleteError = error;
        deleted = !error && data && data.length > 0;
        
        if (deleted) {
          console.log('✅ Successfully deleted suggestion post:', data);
        } else {
          console.log('❌ Failed to delete suggestion post:', error?.message || 'No data returned');
        }
        
      } else if (contentType === 'suggestion_comment') {
        const { error } = await supabase.from('suggestion_comments').delete().eq('id', contentId);
        deleteError = error;
        deleted = !error;
        
      } else if (contentType === 'faculty_review') {
        // For faculty reviews, we need to handle the ID format correctly
        console.log(`📝 Deleting faculty review with ID: ${contentId}`);
        
        // Try deleting by ID first from the correct 'reviews' table
        const { error: idError, data: deleteData } = await supabase
          .from('reviews')
          .delete()
          .eq('id', contentId)
          .select();
          
        if (idError) {
          console.warn('⚠️ Delete by ID failed, trying timestamp format:', idError);
          // If ID doesn't work, try parsing faculty_initial_timestamp format
          const parts = contentId.split('_');
          if (parts.length >= 2) {
            const faculty_initial = parts[0];
            const timestamp = parts.slice(1).join('_');
            
            console.log(`🔍 Trying delete by faculty_initial: ${faculty_initial}, timestamp: ${timestamp}`);
            
            const { error: timestampError, data: timestampData } = await supabase
              .from('reviews')
              .delete()
              .eq('faculty_initial', faculty_initial)
              .eq('created_at', timestamp)
              .select();
              
            deleteError = timestampError;
            deleted = !timestampError && timestampData && timestampData.length > 0;
            
            if (deleted) {
              console.log('✅ Deleted by timestamp:', timestampData);
            }
          } else {
            deleteError = idError;
            deleted = false;
          }
        } else {
          deleted = deleteData && deleteData.length > 0;
          if (deleted) {
            console.log('✅ Deleted by ID:', deleteData);
          }
        }
        
        // Also delete associated votes if any
        if (deleted) {
          console.log('🗑️ Cleaning up associated votes...');
          await supabase.from('review_votes')
            .delete()
            .eq('review_faculty_initial', contentId.split('_')[0] || contentId);
        }
        
      } else if (contentType === 'question_paper') {
        // Get question details first to find owner email (admin can bypass ownership)
        // IDs for question_papers may be stored as numeric or string (UUID); avoid parseInt which can produce NaN
        const isNumericId = !isNaN(Number(contentId)) && contentId.trim() !== '';

        let query = supabase
          .from('question_papers')
          .select('uploaded_by_email, storage_path, title');

        if (isNumericId) {
          query = query.eq('id', Number(contentId));
        } else {
          query = query.eq('id', contentId);
        }

        const { data: question, error: questionError } = await query.single();

        if (questionError) {
          console.warn('Question lookup failed:', questionError);
          deleteError = questionError;
          deleted = false;
        } else if (question) {
          // Admin delete - delete storage file first
          if (question.storage_path) {
            const { error: storageError } = await supabase.storage
              .from('question-papers')
              .remove([question.storage_path]);

            if (storageError) {
              console.warn('Storage delete warning:', storageError.message);
            }
          }

          // Then delete from database using the same id type used for lookup
          const deleteQuery = supabase.from('question_papers').delete();
          if (isNumericId) {
            const { error } = await deleteQuery.eq('id', Number(contentId));
            deleteError = error;
            deleted = !error;
          } else {
            const { error } = await deleteQuery.eq('id', contentId);
            deleteError = error;
            deleted = !error;
          }
        } else {
          deleteError = new Error('Question not found');
          deleted = false;
        }
      } else if (contentType === 'student_note') {
        console.log(`📝 Deleting student note with ID: ${contentId}`);
        
        // Get note details first to find file path for storage cleanup
        const { data: note, error: noteError } = await supabase
          .from('student_notes')
          .select('uploader_email, file_path, upload_type, title')
          .eq('id', contentId)
          .single();

        if (noteError) {
          console.warn('Note lookup failed:', noteError);
          deleteError = noteError;
          deleted = false;
        } else if (note) {
          // Admin delete - delete storage file first if it's a file upload
          if (note.upload_type === 'file' && note.file_path) {
            const { error: storageError } = await supabase.storage
              .from('student-notes')
              .remove([note.file_path]);

            if (storageError) {
              console.warn('Storage delete warning:', storageError.message);
            }
          }

          // Then delete from database
          const { error } = await supabase
            .from('student_notes')
            .delete()
            .eq('id', contentId);
          
          deleteError = error;
          deleted = !error;
          
          if (deleted) {
            console.log('✅ Successfully deleted student note:', note.title);
          }
        } else {
          deleteError = new Error('Student note not found');
          deleted = false;
        }
      }

      if (deleteError) {
        console.error(`❌ Failed to delete ${contentType}:`, deleteError);
        return false;
      }

      console.log(`✅ Successfully deleted ${contentType} from website`);
      return deleted;

    } catch (error) {
      console.error('Error deleting actual content:', error);
      return false;
    }
  }

  // FACULTY MANAGEMENT (using direct table queries)
  static async getFaculty(): Promise<Faculty[]> {
    try {
      console.log('🔍 AdminService.getFaculty - Loading faculty from database...');
      
      // First try with ordering
      let query = supabase.from('faculties').select('*');
      
      // Try to order by created_at, but fallback if column doesn't exist
      try {
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
          console.log('⚠️ Ordered query failed, trying without ordering...', error);
          
          // Fallback: try without ordering
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('faculties')
            .select('*');
            
          if (fallbackError) {
            console.error('❌ Database error loading faculty (fallback):', fallbackError);
            throw fallbackError;
          }
          
          console.log('✅ Faculty loaded successfully (fallback):', fallbackData?.length || 0, 'records');
          return fallbackData || [];
        }
        
        console.log('✅ Faculty loaded successfully (ordered):', data?.length || 0, 'records');
        return data || [];
        
      } catch (orderError) {
        console.log('⚠️ Ordering failed, trying simple select...', orderError);
        
        // Final fallback: simple select without any ordering
        const { data: simpleData, error: simpleError } = await supabase
          .from('faculties')
          .select('*');
          
        if (simpleError) {
          console.error('❌ Simple query also failed:', simpleError);
          throw simpleError;
        }
        
        console.log('✅ Faculty loaded successfully (simple):', simpleData?.length || 0, 'records');
        return simpleData || [];
      }
      
    } catch (error) {
      console.error('❌ AdminService.getFaculty - Complete failure:', error);
      return [];
    }
  }

  static async addFaculty(facultyData: Partial<Faculty> & { assigned_courses?: string[] }): Promise<Faculty> {
    try {
      console.log('👨‍🏫 AdminService.addFaculty - Input data:', facultyData);
      
      const newFacultyData = {
        faculty_initial: facultyData.faculty_initial,
        full_name: facultyData.full_name,
        department: facultyData.department || 'CSE',
        designation: facultyData.designation,
        email: facultyData.email,
        courses_taught: facultyData.assigned_courses || [],
        is_active: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('faculties')
        .insert([newFacultyData])
        .select()
        .single();

      console.log('👨‍🏫 Database response - data:', data);
      console.log('👨‍🏫 Database response - error:', error);

      if (error) {
        console.error('❌ Database error adding faculty:', error);
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }
      
      console.log('✅ Faculty added successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in addFaculty:', error);
      throw error instanceof Error ? error : new Error('Failed to add faculty');
    }
  }

  static async updateFaculty(
    facultyId: string, 
    facultyData: Partial<Faculty> & { assigned_courses?: string[] }
  ): Promise<void> {
    try {
      console.log('👨‍🏫 AdminService.updateFaculty - Updating faculty ID:', facultyId);
      
      // Separate assigned_courses from regular faculty data
      const { assigned_courses, ...facultyUpdateData } = facultyData;
      
      // Add courses_taught to the update data if assigned_courses is provided
      if (assigned_courses !== undefined) {
        facultyUpdateData.courses_taught = assigned_courses;
      }
      
      const { error } = await supabase
        .from('faculties')
        .update(facultyUpdateData)
        .eq('id', facultyId);

      if (error) {
        console.error('❌ Database error updating faculty:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('✅ Faculty updated successfully');
    } catch (error) {
      console.error('❌ Error updating faculty:', error);
      throw error instanceof Error ? error : new Error('Failed to update faculty');
    }
  }

  static async deleteFaculty(facultyId: string): Promise<void> {
    try {
      console.log('🗑️ AdminService.deleteFaculty - Deleting ID:', facultyId);
      
      const { error } = await supabase
        .from('faculties')
        .delete()
        .eq('id', facultyId);

      console.log('🗑️ Delete response - error:', error);

      if (error) {
        console.error('❌ Database error deleting faculty:', error);
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }
      
      console.log('✅ Faculty deleted successfully');
    } catch (error) {
      console.error('❌ Error in deleteFaculty:', error);
      throw error instanceof Error ? error : new Error('Failed to delete faculty');
    }
  }

  // COURSE-FACULTY RELATIONSHIP MANAGEMENT
  static async updateFacultyCourses(facultyIds: string[], courseCode: string, action: 'add' | 'remove'): Promise<void> {
    try {
      console.log(`🔄 AdminService.updateFacultyCourses - ${action}ing course ${courseCode} for faculty:`, facultyIds);
      
      for (const facultyId of facultyIds) {
        // Get current faculty data
        const { data: faculty, error: fetchError } = await supabase
          .from('faculties')
          .select('courses_taught')
          .eq('id', facultyId)
          .single();

        if (fetchError) {
          console.error(`❌ Error fetching faculty ${facultyId}:`, fetchError);
          continue;
        }

        let updatedCourses: string[] = faculty?.courses_taught || [];

        if (action === 'add') {
          // Add course if not already present
          if (!updatedCourses.includes(courseCode)) {
            updatedCourses.push(courseCode);
          }
        } else if (action === 'remove') {
          // Remove course if present
          updatedCourses = updatedCourses.filter(code => code !== courseCode);
        }

        // Update faculty record
        const { error: updateError } = await supabase
          .from('faculties')
          .update({ courses_taught: updatedCourses })
          .eq('id', facultyId);

        if (updateError) {
          console.error(`❌ Error updating faculty ${facultyId} courses:`, updateError);
          throw new Error(`Failed to update faculty ${facultyId}: ${updateError.message}`);
        }

        console.log(`✅ Updated courses for faculty ${facultyId}:`, updatedCourses);
      }
    } catch (error) {
      console.error('❌ Error in updateFacultyCourses:', error);
      throw error instanceof Error ? error : new Error('Failed to update faculty courses');
    }
  }

  // COURSES MANAGEMENT (using direct table queries)
  static async getCourses(): Promise<Course[]> {
    try {
      // First try with ordering
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('course_code', { ascending: true });

        if (error) {
          
          // Fallback: try without ordering
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('courses')
            .select('*');
            
          if (fallbackError) {
            throw fallbackError;
          }
          
          // Sort by course_code alphabetically
          const sortedFallbackData = (fallbackData || []).sort((a, b) => a.course_code.localeCompare(b.course_code));
          return sortedFallbackData;
        }
        
        return data || [];
        
      } catch (orderError) {
        // Final fallback: simple select
        const { data: simpleData, error: simpleError } = await supabase
          .from('courses')
          .select('*');
          
        if (simpleError) {
          throw simpleError;
        }
        
        // Sort by course_code alphabetically
        const sortedSimpleData = (simpleData || []).sort((a, b) => a.course_code.localeCompare(b.course_code));
        return sortedSimpleData;
      }
      
    } catch (error) {
      return [];
    }
  }

  static async addCourse(courseData: Partial<Course> & { assigned_faculty?: string[] }): Promise<Course> {
    try {
      // Note: Faculty assignment is now optional - courses can be created without faculty
      
      const newCourseData = {
        course_code: courseData.course_code,
        course_name: courseData.course_name,
        credits: courseData.credits || 3.0,
        department: courseData.department || 'CSE',
        is_active: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('courses')
        .insert([newCourseData])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }
      
      // Handle faculty assignments if provided
      if (courseData.assigned_faculty && courseData.assigned_faculty.length > 0) {
        try {
          await this.updateFacultyCourses(courseData.assigned_faculty, data.course_code, 'add');
        } catch (facultyError) {
          // Don't throw error here - course was created successfully
          // The admin can manually assign faculty later if needed
        }
      }
      
      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to add course');
    }
  }

  static async getCourseFaculty(courseCode: string): Promise<Faculty[]> {
    try {
      
      const { data, error } = await supabase
        .from('faculties')
        .select('*')
        .contains('courses_taught', [courseCode])
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching course faculty:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('✅ Found faculty for course:', courseCode, data?.length || 0, 'faculty members');
      return data || [];
    } catch (error) {
      console.error('❌ Error in getCourseFaculty:', error);
      throw error instanceof Error ? error : new Error('Failed to get course faculty');
    }
  }

  static async updateCourseFacultyAssignments(courseCode: string, newFacultyIds: string[]): Promise<void> {
    try {
      console.log(`🔄 AdminService.updateCourseFacultyAssignments - Updating faculty assignments for course ${courseCode}`);
      
      // Get current faculty assigned to this course
      const currentFaculty = await this.getCourseFaculty(courseCode);
      const currentFacultyIds = currentFaculty.map(f => f.id);
      
      // Determine which faculty to add and remove
      const facultyToAdd = newFacultyIds.filter(id => !currentFacultyIds.includes(id));
      const facultyToRemove = currentFacultyIds.filter(id => !newFacultyIds.includes(id));
      
      console.log(`📝 Course ${courseCode}: Adding ${facultyToAdd.length} faculty, Removing ${facultyToRemove.length} faculty`);
      
      // Remove course from faculty who are no longer assigned
      if (facultyToRemove.length > 0) {
        await this.updateFacultyCourses(facultyToRemove, courseCode, 'remove');
      }
      
      // Add course to newly assigned faculty
      if (facultyToAdd.length > 0) {
        await this.updateFacultyCourses(facultyToAdd, courseCode, 'add');
      }
      
      console.log(`✅ Successfully updated faculty assignments for course ${courseCode}`);
    } catch (error) {
      console.error('❌ Error in updateCourseFacultyAssignments:', error);
      throw error instanceof Error ? error : new Error('Failed to update course faculty assignments');
    }
  }

  static async updateCourse(
    courseId: string, 
    courseData: Partial<Course> & { assigned_faculty?: string[] }
  ): Promise<void> {
    try {
      console.log('📚 AdminService.updateCourse - Updating course ID:', courseId);
      
      // Separate course data from faculty assignments
      const { assigned_faculty, ...courseUpdateData } = courseData;
      
      // Update course basic information
      const { error } = await supabase
        .from('courses')
        .update(courseUpdateData)
        .eq('id', courseId);

      if (error) {
        console.error('❌ Database error updating course:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      // Handle faculty assignments if provided
      if (assigned_faculty !== undefined && courseUpdateData.course_code) {
        console.log('👨‍🏫 Updating faculty assignments for course:', courseUpdateData.course_code);
        try {
          await this.updateCourseFacultyAssignments(courseUpdateData.course_code, assigned_faculty);
          console.log('✅ Faculty assignments updated successfully');
        } catch (facultyError) {
          console.error('⚠️ Course updated but faculty assignment failed:', facultyError);
          // Don't throw error here - course was updated successfully
          // The admin can manually adjust faculty assignments if needed
        }
      }
      
      console.log('✅ Course updated successfully');
    } catch (error) {
      console.error('❌ Error updating course:', error);
      throw error instanceof Error ? error : new Error('Failed to update course');
    }
  }

  static async deleteCourse(courseId: string): Promise<void> {
    try {
      console.log('🗑️ AdminService.deleteCourse - Deleting ID:', courseId);
      
      // First, get the course details to know which course_code to remove from faculty
      const { data: courseToDelete, error: fetchError } = await supabase
        .from('courses')
        .select('course_code')
        .eq('id', courseId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching course details for deletion:', fetchError);
        throw new Error(`Failed to fetch course details: ${fetchError.message}`);
      }

      // Remove course from all faculty records
      if (courseToDelete?.course_code) {
        console.log('🗑️ Removing course', courseToDelete.course_code, 'from all faculty records');
        
        // Get all faculty who teach this course
        const { data: affectedFaculty, error: facultyError } = await supabase
          .from('faculties')
          .select('id, courses_taught')
          .contains('courses_taught', [courseToDelete.course_code]);

        if (!facultyError && affectedFaculty) {
          // Remove the course from each faculty's courses_taught array
          for (const faculty of affectedFaculty) {
            const updatedCourses = faculty.courses_taught?.filter(
              courseCode => courseCode !== courseToDelete.course_code
            ) || [];

            await supabase
              .from('faculties')
              .update({ courses_taught: updatedCourses })
              .eq('id', faculty.id);
          }
          
          console.log('✅ Removed course from', affectedFaculty.length, 'faculty records');
        }
      }

      // Now delete the course
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      console.log('🗑️ Delete response - error:', error);

      if (error) {
        console.error('❌ Database error deleting course:', error);
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }
      
      console.log('✅ Course deleted successfully with faculty cleanup');
    } catch (error) {
      console.error('❌ Error in deleteCourse:', error);
      throw error instanceof Error ? error : new Error('Failed to delete course');
    }
  }

  // STUDENT MESSAGES MANAGEMENT
  static async getStudentMessages(): Promise<StudentMessage[]> {
    try {
      const { data, error } = await supabase
        .from('admin_student_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading student messages:', error);
      return [];
    }
  }

  static async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_student_messages')
        .update({ 
          status: 'read',
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw new Error('Failed to mark message as read');
    }
  }

  static async replyToMessage(
    messageId: string, 
    response: string, 
    adminId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_student_messages')
        .update({ 
          status: 'replied',
          admin_response: response,
          responded_by: adminId,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error replying to message:', error);
      throw new Error('Failed to reply to message');
    }
  }

  static async deleteMessage(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_student_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  }

  // USER BAN MANAGEMENT
  static async getBannedUsers(): Promise<BannedUser[]> {
    try {
      const { data, error } = await supabase
        .from('admin_banned_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading banned users:', error);
      return [];
    }
  }

  static async checkUserBanStatus(userEmail: string): Promise<{ isBanned: boolean; reason?: string; bannedBy?: string; banDuration?: string }> {
    try {
      const { data, error } = await supabase
        .from('admin_banned_users')
        .select('*')
        .eq('user_email', userEmail)
        .eq('is_active', true)
        .single();

      if (error) {
        // No ban found (PGRST116 is "no rows returned")
        if (error.code === 'PGRST116') {
          return { isBanned: false };
        }
        console.error('Error checking ban status:', error);
        return { isBanned: false };
      }

      // Check if ban has expired (for temporary bans)
      if (data.ban_duration && data.ban_duration !== 'permanent') {
        const banCreatedAt = new Date(data.created_at);
        const banDurationDays = parseInt(data.ban_duration.replace(' days', ''));
        const banExpiryDate = new Date(banCreatedAt.getTime() + (banDurationDays * 24 * 60 * 60 * 1000));
        
        if (new Date() > banExpiryDate) {
          // Ban has expired, deactivate it
          await supabase
            .from('admin_banned_users')
            .update({ is_active: false })
            .eq('id', data.id);
          
          return { isBanned: false };
        }
      }

      return {
        isBanned: true,
        reason: data.reason,
        bannedBy: data.banned_by,
        banDuration: data.ban_duration
      };
    } catch (error) {
      console.error('Error checking user ban status:', error);
      return { isBanned: false };
    }
  }

  static async banUser(banData: Partial<BannedUser>): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_banned_users')
        .insert([banData]);

      if (error) throw error;
    } catch (error) {
      console.error('Error banning user:', error);
      throw new Error('Failed to ban user');
    }
  }

  static async unbanUser(banId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_banned_users')
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

  // DASHBOARD STATISTICS
  static async getDashboardStats() {
    try {
      const [
        pendingReportsResult,
        unreadMessagesResult,
        totalCoursesResult,
        activeFacultyResult,
        bannedUsersResult
      ] = await Promise.all([
        supabase.from('admin_reported_content').select('id').eq('status', 'pending'),
        supabase.from('admin_student_messages').select('id').eq('status', 'unread'),
        supabase.from('courses').select('id'),
        supabase.from('faculties').select('id'),
        supabase.from('admin_banned_users').select('id').eq('is_active', true)
      ]);

      return {
        pendingReports: pendingReportsResult.data?.length || 0,
        unreadMessages: unreadMessagesResult.data?.length || 0,
        totalCourses: totalCoursesResult.data?.length || 0,
        activeFaculty: activeFacultyResult.data?.length || 0,
        bannedUsers: bannedUsersResult.data?.length || 0
      };
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      return {
        pendingReports: 0,
        unreadMessages: 0,
        totalCourses: 0,
        activeFaculty: 0,
        bannedUsers: 0
      };
    }
  }

  // STUDENT CONTACT FORM SUBMISSION
  static async submitStudentMessage(messageData: {
    student_email: string;
    student_name: string;
    student_id?: string;
    subject: string;
    message_type: string;
    message_content: string;
    priority?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_student_messages')
        .insert([{
          ...messageData,
          status: 'unread',
          priority: messageData.priority || 'medium'
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error submitting student message:', error);
      throw new Error('Failed to submit message');
    }
  }

  // ADMIN ACTIVITY LOGGING
  static async logActivity(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string,
    description: string
  ): Promise<void> {
    try {
      console.log('📝 Logging admin activity:', { adminId, action, entityType, entityId, description });
      
      // For now, just log to console since admin_activity_log table might not exist
      console.log('✅ Admin activity logged successfully');
    } catch (error) {
      console.warn('Error logging admin activity:', error);
      // Don't throw error as this is not critical for main functionality
    }
  }
}

export default AdminService;