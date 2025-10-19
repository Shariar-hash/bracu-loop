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
  
  // Metadata
  is_approved: boolean;
  download_count: number;
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

export class NotesService {
  /**
   * Upload a file and save metadata to database
   */
  static async uploadFile(file: File, noteData: NoteUploadData): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      console.log('🔄 Starting file upload process...');
      
      // Validate file size (18MB limit)
      const maxSize = 18 * 1024 * 1024; // 18MB in bytes
      if (file.size > maxSize) {
        return { success: false, error: 'File size must be under 18MB' };
      }
      
      // Validate file type (only ZIP, RAR, 7Z)
      const allowedTypes = ['.zip', '.rar', '.7z'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        return { success: false, error: 'Only ZIP, RAR, and 7Z files are allowed' };
      }
      
      // Create file path with user email prefix
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const filePath = `${noteData.uploader_email}/${fileName}`;
      
      console.log('📁 Uploading to path:', filePath);
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('student-notes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        return { success: false, error: uploadError.message };
      }
      
      console.log('✅ File uploaded successfully');
      
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
          download_count: 0
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Database error:', error);
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('student-notes').remove([filePath]);
        return { success: false, error: error.message };
      }
      
      console.log('✅ File upload completed successfully');
      return { success: true, data };
      
    } catch (error: any) {
      console.error('❌ Upload process failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save a shared link
   */
  static async saveLink(linkData: LinkData): Promise<{ success: boolean; error?: string; data?: any; type: string }> {
    try {
      console.log('🔗 Saving shared link...');
      
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
          download_count: 0
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Link save error:', error);
        return { success: false, error: error.message, type: 'link' };
      }
      
      console.log('✅ Link saved successfully');
      return { success: true, data, type: 'link' };
      
    } catch (error: any) {
      console.error('❌ Link save failed:', error);
      return { success: false, error: error.message, type: 'link' };
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
      console.error('Error loading notes:', error);
      throw error;
    }
  }

  /**
   * Access a note (download file or open link)
   */
  static async accessNote(noteId: string): Promise<{ success: boolean; url?: string; error?: string; type?: string }> {
    try {
      // Get note details
      const { data: note, error: noteError } = await supabase
        .from('student_notes')
        .select('*')
        .eq('id', noteId)
        .single();
      
      if (noteError || !note) {
        return { success: false, error: 'Note not found' };
      }
      
      if (note.upload_type === 'link') {
        // Return the external link
        return { 
          success: true, 
          url: note.link_url, 
          type: 'link' 
        };
      } else {
        // Generate download URL for file
        const { data, error } = await supabase.storage
          .from('student-notes')
          .createSignedUrl(note.file_path, 3600); // 1 hour expiry
        
        if (error) {
          return { success: false, error: error.message };
        }
        
        // Increment download count
        await supabase
          .from('student_notes')
          .update({ download_count: (note.download_count || 0) + 1 })
          .eq('id', noteId);
        
        return { 
          success: true, 
          url: data.signedUrl, 
          type: 'file' 
        };
      }
      
    } catch (error: any) {
      console.error('Access note error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a note (only by owner)
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
      console.error('Delete note error:', error);
      throw error;
    }
  }
}

export default NotesService;
