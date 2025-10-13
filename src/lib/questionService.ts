// Question Papers Service for Database Operations
import { supabase } from './supabaseClient';

export interface QuestionPaper {
  id: number;  // Changed to number to match existing table
  title: string;
  course_code: string;
  course_name: string;
  semester: string;
  year: number;
  exam_type: 'midterm' | 'final' | 'quiz' | 'assignment';
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  file_url: string;
  uploaded_by_name: string;
  uploaded_by_email: string;
  download_count: number;
  uploaded_at: string;
}

export interface QuestionUploadData {
  title: string;
  course_code: string;
  course_name?: string;
  semester: string;
  year: number;
  exam_type: 'midterm' | 'final' | 'quiz' | 'assignment';
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by_name: string;
  uploaded_by_email: string;
}

export class QuestionService {
  
  /**
   * Upload a question paper file to Supabase Storage
   */
  static async uploadFile(file: File, metadata: QuestionUploadData): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🔄 Starting upload process...', { fileName: file.name, size: file.size });
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${metadata.course_code}_${metadata.exam_type}_${metadata.year}_${metadata.semester}_${timestamp}_${file.name}`;
      const filePath = `${metadata.course_code}/${metadata.year}/${metadata.semester}/${fileName}`;
      
      console.log('📁 Upload path:', filePath);
      
      // Upload to Supabase Storage
      console.log('⬆️ Uploading to Supabase Storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('question-papers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('❌ Storage upload failed:', uploadError);
        return { success: false, error: `Upload failed: ${uploadError.message}` };
      }
      
      console.log('✅ Storage upload successful!', uploadData);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('question-papers')
        .getPublicUrl(filePath);
      
      console.log('🔗 Generated public URL:', urlData.publicUrl);
      
      // Save metadata to database
      console.log('💾 Saving metadata to database...');
      const questionData = {
        title: metadata.title,
        course_code: metadata.course_code,
        course_name: metadata.course_name,
        semester: metadata.semester,
        year: metadata.year,
        exam_type: metadata.exam_type,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type, // Re-added after column creation
        storage_path: filePath,
        file_url: urlData.publicUrl,
        uploaded_by_name: metadata.uploaded_by_name,
        uploaded_by_email: metadata.uploaded_by_email
      };
      
      const { data: dbData, error: dbError } = await supabase
        .from('question_papers')
        .insert([questionData])
        .select()
        .single();
      
      if (dbError) {
        console.error('❌ Database insert failed:', dbError);
        // If DB insert fails, cleanup the uploaded file
        console.log('🧹 Cleaning up uploaded file...');
        await supabase.storage
          .from('question-papers')
          .remove([filePath]);
        return { success: false, error: `Database error: ${dbError.message}` };
      }
      
      console.log('✅ Database insert successful!', dbData);
      return { success: true, data: dbData };
      
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get all question papers with filtering
   */
  static async getQuestions(filters: {
    course_code?: string;
    exam_type?: string;
    semester?: string;
    year?: number;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ questions: QuestionPaper[]; total: number }> {
    try {
      let query = supabase
        .from('question_papers')
        .select('*', { count: 'exact' })
        .eq('is_approved', true)
        .order('uploaded_at', { ascending: false });
      
      // Apply filters
      if (filters.course_code) {
        query = query.eq('course_code', filters.course_code);
      }
      
      if (filters.exam_type) {
        query = query.eq('exam_type', filters.exam_type);
      }
      
      if (filters.semester) {
        query = query.eq('semester', filters.semester);
      }
      
      if (filters.year) {
        query = query.eq('year', filters.year);
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,course_name.ilike.%${filters.search}%`);
      }
      
      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        questions: data || [],
        total: count || 0
      };
      
    } catch (error) {
      console.error('Error fetching questions:', error);
      throw error;
    }
  }
  
  /**
   * Record a download for analytics
   */
  static async recordDownload(questionId: number, userEmail: string, userName?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('question_downloads')
        .insert([{
          question_id: questionId,
          user_email: userEmail,
          user_name: userName
        }]);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error recording download:', error);
      throw error;
    }
  }
  
  /**
   * Delete a question paper (file and database record)
   */
  static async deleteQuestion(questionId: number, userEmail: string): Promise<boolean> {
    try {
      // First get the question to verify ownership and get storage path
      const { data: question, error: fetchError } = await supabase
        .from('question_papers')
        .select('storage_path, uploaded_by_email, title, file_name')
        .eq('id', questionId)
        .single();
      
      if (fetchError || !question) {
        throw new Error('Question not found');
      }
      
      // Check ownership
      if (question.uploaded_by_email !== userEmail) {
        throw new Error('Unauthorized: You can only delete your own uploads');
      }
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('question-papers')
        .remove([question.storage_path]);
      
      if (storageError) {
        console.warn('Storage delete warning:', storageError.message);
      }
      
      // Delete from database (this will cascade delete downloads)
      const { error: dbError } = await supabase
        .from('question_papers')
        .delete()
        .eq('id', questionId);
      
      if (dbError) {
        throw dbError;
      }
      
      return true;
      
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  }
  
  /**
   * Get user's own questions
   */
  static async getUserQuestions(userEmail: string): Promise<QuestionPaper[]> {
    try {
      const { data, error } = await supabase
        .from('question_papers')
        .select('*')
        .eq('uploaded_by_email', userEmail)
        .order('uploaded_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data || [];
      
    } catch (error) {
      console.error('Error fetching user questions:', error);
      throw error;
    }
  }
}