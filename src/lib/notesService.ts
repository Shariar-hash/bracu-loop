import { supabase } from './supabaseClient';

export interface StudentNote {
  id: string;
  title: string;
  description?: string;
  course_code: string;
  course_name?: string;
  category: string;
  
  // File information
  file_name?: string;
  file_size?: number;
  file_type?: string;
  file_path?: string;
  
  // Link information
  upload_type: 'file' | 'link';
  link_url?: string;
  link_type?: string;
  
  // Uploader information
  uploader_name: string;
  uploader_email: string;
  uploader_student_id?: string;
  
  // Engagement metrics
  download_count: number;
  rating_sum: number;
  rating_count: number;
  average_rating?: number;
  
  // Moderation
  is_approved: boolean;
  is_reported: boolean;
  report_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface NoteUploadData {
  title: string;
  description?: string;
  course_code: string;
  course_name?: string;
  category: string;
  uploader_name: string;
  uploader_email: string;
  uploader_student_id?: string;
}

export interface LinkData extends NoteUploadData {
  link_url: string;
  link_type: 'google_drive' | 'onedrive' | 'dropbox' | 'other';
}

class NotesService {
  /**
   * Upload a file to Supabase Storage and save metadata
   */
  static async uploadFile(file: File, noteData: NoteUploadData): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      // Check file size (max 18MB)
      const maxSize = 18 * 1024 * 1024;
      if (file.size > maxSize) {
        return { success: false, error: 'File size must be less than 18MB' };
      }
      
      // Check file type (ZIP files only)
      const allowedTypes = [
        'application/zip',
        'application/x-zip-compressed',
        'application/x-rar-compressed',
        'application/x-7z-compressed'
      ];
      
      if (!allowedTypes.includes(file.type) && !file.name.endsWith('.zip') && !file.name.endsWith('.rar')) {
        return { success: false, error: 'Please upload ZIP or RAR files only' };
      }
      
      console.log(`📤 Uploading ${file.name} to Supabase Storage...`);
      
      // DEBUG: Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('🔐 Current user:', user?.email || 'NOT AUTHENTICATED');
      console.log('📦 File size:', Math.round(file.size / 1024 / 1024 * 100) / 100, 'MB');
      
      if (!user) {
        return { success: false, error: 'You must be signed in to upload files' };
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedName}`;
      const filePath = `${noteData.course_code}/${fileName}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('student-notes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        return { success: false, error: uploadError.message };
      }
      
      console.log('✅ File uploaded to Supabase:', filePath);
      
      // Save metadata to database
      const { data, error } = await supabase
        .from('student_notes')
        .insert([{
          title: noteData.title,
          description: noteData.description,
          course_code: noteData.course_code,
          course_name: noteData.course_name,
          category: noteData.category,
          upload_type: 'file',
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_path: filePath,
          uploader_name: noteData.uploader_name,
          uploader_email: noteData.uploader_email,
          uploader_student_id: noteData.uploader_student_id,
          is_approved: true,
          download_count: 0,
          rating_sum: 0,
          rating_count: 0,
          report_count: 0,
          is_reported: false
        }])
        .select()
        .single();
      
      if (error) {
        // Cleanup uploaded file if database insert fails
        await supabase.storage.from('student-notes').remove([filePath]);
        console.error('❌ Database error:', error);
        return { success: false, error: 'Failed to save note information' };
      }
      
      console.log('✅ Note saved to database:', data.id);
      return { success: true, data };
      
    } catch (error: any) {
      console.error('Upload error:', error);
      return { success: false, error: error.message || 'Upload failed' };
    }
  }

  /**
   * Save a link (Google Drive, OneDrive, etc.)
   */
  static async saveLink(linkData: LinkData): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      console.log('🔗 Saving link:', linkData.link_url);
      
      // Save link to database
      const { data, error } = await supabase
        .from('student_notes')
        .insert([{
          title: linkData.title,
          description: linkData.description,
          course_code: linkData.course_code,
          course_name: linkData.course_name,
          category: linkData.category,
          upload_type: 'link',
          link_url: linkData.link_url,
          link_type: linkData.link_type,
          uploader_name: linkData.uploader_name,
          uploader_email: linkData.uploader_email,
          uploader_student_id: linkData.uploader_student_id,
          is_approved: true,
          download_count: 0,
          rating_sum: 0,
          rating_count: 0,
          report_count: 0,
          is_reported: false
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Database error:', error);
        return { success: false, error: 'Failed to save link' };
      }
      
      console.log('✅ Link saved to database:', data.id);
      return { success: true, data };
      
    } catch (error: any) {
      console.error('Save link error:', error);
      return { success: false, error: error.message || 'Failed to save link' };
    }
  }

  /**
   * Get notes with filtering
   */
  static async getNotes(options: {
    courseCode?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ notes: StudentNote[]; total: number }> {
    try {
      let query = supabase
        .from('student_notes')
        .select('*', { count: 'exact' })
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      
      if (options.courseCode) {
        query = query.eq('course_code', options.courseCode);
      }
      
      if (options.category) {
        query = query.eq('category', options.category);
      }
      
      if (options.search) {
        query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        notes: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching notes:', error);
      return { notes: [], total: 0 };
    }
  }

  /**
   * Access a note (download file or open link)
   */
  static async accessNote(noteId: string): Promise<{ success: boolean; error?: string; type: 'file' | 'link'; url?: string }> {
    try {
      // Get note details
      const { data: note, error } = await supabase
        .from('student_notes')
        .select('*')
        .eq('id', noteId)
        .single();
      
      if (error || !note) {
        return { success: false, error: 'Note not found', type: 'file' };
      }
      
      if (note.upload_type === 'link') {
        // For links, just return the URL
        return {
          success: true,
          type: 'link',
          url: note.link_url
        };
      } else {
        // For files, get download URL from Supabase Storage
        const { data: urlData } = await supabase.storage
          .from('student-notes')
          .createSignedUrl(note.file_path, 3600); // 1 hour expiry
        
        if (urlData) {
          return {
            success: true,
            type: 'file',
            url: urlData.signedUrl
          };
        } else {
          return { success: false, error: 'Could not generate download link', type: 'file' };
        }
      }
    } catch (error: any) {
      console.error('Access error:', error);
      return { success: false, error: error.message, type: 'file' };
    }
  }

  /**
   * Delete a note
   */
  static async deleteNote(noteId: string, userEmail: string): Promise<boolean> {
    try {
      // Get note
      const { data: note, error: noteError } = await supabase
        .from('student_notes')
        .select('*')
        .eq('id', noteId)
        .single();
      
      if (noteError || !note) {
        throw new Error('Note not found');
      }
      
      // Check if user owns the note
      if (note.uploader_email !== userEmail) {
        throw new Error('You can only delete your own notes');
      }
      
      console.log(`🗑️ Deleting note: ${note.title}`);
      
      // Delete file from storage if it's a file upload
      if (note.upload_type === 'file' && note.file_path) {
        await supabase.storage
          .from('student-notes')
          .remove([note.file_path]);
      }
      
      // Delete from database
      const { error } = await supabase
        .from('student_notes')
        .delete()
        .eq('id', noteId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error: any) {
      console.error('Error in deleteNote:', error);
      return false;
    }
  }

  /**
   * Get user's notes
   */
  static async getUserNotes(userEmail: string): Promise<StudentNote[]> {
    try {
      const { data, error } = await supabase
        .from('student_notes')
        .select('*')
        .eq('uploader_email', userEmail)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching user notes:', error);
      return [];
    }
  }
}

export default NotesService;