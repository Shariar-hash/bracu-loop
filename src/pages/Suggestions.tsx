import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { 
  MessageSquarePlus, 
  MessageCircle, 
  Edit, 
  Trash2, 
  Flag, 
  Heart,
  MoreHorizontal,
  GraduationCap,
  Users,
  Send
} from "lucide-react";

interface SuggestionPost {
  id: string;
  content: string;
  author_name: string;
  author_email: string;
  author_student_id?: string;
  created_at: string;
  updated_at?: string;
  likes_count: number;
  comments_count: number;
}

interface Comment {
  id: string;
  post_id: string;
  content: string;
  author_name: string;
  author_email: string;
  author_student_id?: string;
  created_at: string;
  updated_at?: string;
  parent_comment_id?: string; // For nested threading like Faculty Review
  replies?: Comment[]; // Nested replies
}

interface StudentInfo {
  student_id: string;
  semester: number;
  admission_year: number;
  admission_semester: 'Spring' | 'Fall' | 'Summer';
  is_alumni: boolean;
  seniority_level: 'Junior' | 'Senior' | 'Super Senior' | 'Alumni';
}

// Supabase API Functions for Posts
const fetchPosts = async (): Promise<SuggestionPost[]> => {
  const { data, error } = await supabase
    .from('suggestion_posts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
  
  return data || [];
};

const createPostInDB = async (post: Omit<SuggestionPost, 'id' | 'created_at' | 'updated_at'>): Promise<SuggestionPost> => {
  console.log('Creating post with data:', post);
  
  // Since we're using Google auth (not Supabase auth) and RLS is disabled, 
  // we can directly insert without auth checks
  const { data, error } = await supabase
    .from('suggestion_posts')
    .insert([post])
    .select()
    .single();
  
  if (error) {
    console.error('Detailed error creating post:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    throw error;
  }
  
  console.log('Post created successfully:', data);
  return data;
};

const updatePostInDB = async (id: string, content: string): Promise<SuggestionPost> => {
  const { data, error } = await supabase
    .from('suggestion_posts')
    .update({ 
      content: content.trim(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating post:', error);
    throw error;
  }
  
  return data;
};

const deletePostFromDB = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('suggestion_posts')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};

// Supabase API Functions for Likes
const fetchUserLikes = async (userEmail: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('suggestion_likes')
      .select('post_id')
      .eq('user_email', userEmail);
    
    if (error) {
      console.error('Error fetching likes:', error);
      return [];
    }
    
    return data.map(like => like.post_id);
  } catch (error) {
    console.error('Error in fetchUserLikes:', error);
    return [];
  }
};

const toggleLikeInDB = async (postId: string, userEmail: string): Promise<boolean> => {
  // First check if like exists
  const { data: existingLike } = await supabase
    .from('suggestion_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_email', userEmail)
    .single();
  
  if (existingLike) {
    // Remove like
    const { error } = await supabase
      .from('suggestion_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_email', userEmail);
    
    if (error) {
      console.error('Error removing like:', error);
      throw error;
    }
    return false; // unliked
  } else {
    // Add like
    const { error } = await supabase
      .from('suggestion_likes')
      .insert([{ post_id: postId, user_email: userEmail }]);
    
    if (error) {
      console.error('Error adding like:', error);
      throw error;
    }
    return true; // liked
  }
};

// Supabase API Functions for Comments
const fetchComments = async (postId: string): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from('suggestion_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
  
  // Organize comments with nested structure
  const comments = data || [];
  const mainComments = comments.filter(c => !c.parent_comment_id);
  
  // Add replies to each main comment
  const commentsWithReplies = mainComments.map(comment => ({
    ...comment,
    replies: comments.filter(c => c.parent_comment_id === comment.id)
  }));
  
  return commentsWithReplies;
};

const createCommentInDB = async (comment: Omit<Comment, 'id' | 'created_at' | 'updated_at'>): Promise<Comment> => {
  console.log('Creating comment with data:', comment);
  
  const { data, error } = await supabase
    .from('suggestion_comments')
    .insert([comment])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating comment:', error);
    console.error('Error details:', error.message);
    throw error;
  }
  
  console.log('Comment created successfully:', data);
  return data;
};

const updateCommentInDB = async (id: string, content: string): Promise<Comment> => {
  const { data, error } = await supabase
    .from('suggestion_comments')
    .update({ 
      content: content.trim(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
  
  return data;
};

const deleteCommentFromDB = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('suggestion_comments')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

const Suggestions = () => {
  const [posts, setPosts] = useState<SuggestionPost[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [showStudentIdDialog, setShowStudentIdDialog] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // comment ID we're replying to
  const [replyingToUser, setReplyingToUser] = useState<string | null>(null); // user we're replying to
  const [editingComment, setEditingComment] = useState<string | null>(null); // comment/reply ID being edited
  const [editCommentContent, setEditCommentContent] = useState("");
  
  const { user } = useAuth();

  // CORRECTED Semester calculation algorithm
  const calculateStudentInfo = (studentId: string): StudentInfo => {
    // Validate student ID format (should be 8 digits: YYXNNNN)
    if (!/^\d{8}$/.test(studentId)) {
      throw new Error("Invalid student ID format. Should be 8 digits.");
    }

    const yearDigits = studentId.substring(0, 2);
    const semesterCode = parseInt(studentId.substring(2, 3));
    const admissionYear = parseInt(`20${yearDigits}`);
    
    // CORRECTED Semester mapping: 1=Spring, 2=Fall, 3=Summer
    const semesterMap = {
      1: 'Spring' as const,
      2: 'Fall' as const,
      3: 'Summer' as const
    };
    
    if (!semesterMap[semesterCode as keyof typeof semesterMap]) {
      throw new Error("Invalid semester code. Should be 1 (Spring), 2 (Fall), or 3 (Summer).");
    }
    
    const admissionSemester = semesterMap[semesterCode as keyof typeof semesterMap];
    
    // Calculate current semester based on progression from admission
    // Current semester is Fall 2025 (September 2025)
    
    // Semester progression: Spring → Summer → Fall → Spring → ...
    const semesterOrder = ['Spring', 'Summer', 'Fall'];
    const currentSemesterInYear = 'Fall'; // Fall 2025
    const currentYear = 2025;
    
    // Calculate total semesters from admission to current
    let semesterCount = 0;
    let yearCounter = admissionYear;
    let currentSemesterIndex = semesterOrder.indexOf(admissionSemester);
    
    // Count semesters until we reach Fall 2025
    while (yearCounter < currentYear || 
           (yearCounter === currentYear && 
            semesterOrder.indexOf(currentSemesterInYear) >= currentSemesterIndex)) {
      
      semesterCount++;
      currentSemesterIndex++;
      
      // Move to next year after Fall
      if (currentSemesterIndex >= 3) {
        currentSemesterIndex = 0;
        yearCounter++;
      }
      
      // Don't count beyond current semester
      if (yearCounter === currentYear && currentSemesterIndex > semesterOrder.indexOf(currentSemesterInYear)) {
        break;
      }
    }
    
    // Determine seniority and alumni status
    const isAlumni = semesterCount > 12 || admissionYear <= 2021;
    let seniorityLevel: StudentInfo['seniority_level'];
    
    if (isAlumni) seniorityLevel = 'Alumni';
    else if (semesterCount >= 10) seniorityLevel = 'Super Senior';
    else if (semesterCount >= 8) seniorityLevel = 'Senior';
    else seniorityLevel = 'Junior'; // Will show just semester number
    
    return {
      student_id: studentId,
      semester: semesterCount,
      admission_year: admissionYear,
      admission_semester: admissionSemester,
      is_alumni: isAlumni,
      seniority_level: seniorityLevel
    };
  };

  const getSeniorityBadge = (info: StudentInfo) => {
    // Show just semester for 1st-7th, then Senior/Super Senior tags
    let badgeText = '';
    let badgeClass = '';
    
    if (info.seniority_level === 'Alumni') {
      badgeText = `Alumni`;
      badgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200';
    } else if (info.seniority_level === 'Super Senior') {
      badgeText = `Super Senior (${info.semester}th Sem)`;
      badgeClass = 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200';
    } else if (info.seniority_level === 'Senior') {
      badgeText = `Senior (${info.semester}th Sem)`;
      badgeClass = 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200';
    } else {
      // For 1st-7th semester, just show semester number
      badgeText = `${info.semester}th Semester`;
      badgeClass = 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200';
    }
    
    return (
      <Badge variant="outline" className={`text-xs ${badgeClass}`}>
        <GraduationCap className="h-3 w-3 mr-1" />
        {badgeText}
      </Badge>
    );
  };

  useEffect(() => {
    // Check if student info exists in localStorage
    const savedStudentInfo = localStorage.getItem('studentInfo');
    if (savedStudentInfo) {
      setStudentInfo(JSON.parse(savedStudentInfo));
    } else if (user) {
      // Show student ID dialog for new users
      setShowStudentIdDialog(true);
    }
    
    loadPosts();
    
    // Set up real-time subscriptions
    const postsChannel = supabase
      .channel('suggestion_posts_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'suggestion_posts' },
        (payload) => {
          console.log('Posts change detected:', payload);
          // Refresh posts when any change occurs
          loadPosts();
        }
      )
      .subscribe();

    const commentsChannel = supabase
      .channel('suggestion_comments_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'suggestion_comments' },
        (payload) => {
          console.log('Comments change detected:', payload);
          // Refresh posts and comments when comment changes occur
          loadPosts();
        }
      )
      .subscribe();

    const likesChannel = supabase
      .channel('suggestion_likes_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'suggestion_likes' },
        (payload) => {
          console.log('Likes change detected:', payload);
          // Refresh posts and user likes when like changes occur
          loadPosts();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [user]);

  const [tempStudentId, setTempStudentId] = useState("");
  const [showAlumniCheck, setShowAlumniCheck] = useState(false);

  const handleStudentIdChange = (value: string) => {
    setTempStudentId(value);
    if (value.length === 8) {
      try {
        const tempInfo = calculateStudentInfo(value);
        setShowAlumniCheck(tempInfo.semester > 12);
      } catch {
        setShowAlumniCheck(false);
      }
    } else {
      setShowAlumniCheck(false);
    }
  };

  const handleStudentIdSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const studentId = formData.get('student_id') as string;
    const isAlumniConfirm = formData.get('is_alumni') === 'on';

    try {
      let calculatedInfo = calculateStudentInfo(studentId);
      
      // If semester count > 12 and user confirmed alumni
      if (calculatedInfo.semester > 12 && isAlumniConfirm) {
        calculatedInfo.is_alumni = true;
        calculatedInfo.seniority_level = 'Alumni';
      }
      
      // Save to localStorage (not posted publicly)
      localStorage.setItem('studentInfo', JSON.stringify(calculatedInfo));
      setStudentInfo(calculatedInfo);
      setShowStudentIdDialog(false);
      
      const displayLevel = calculatedInfo.seniority_level === 'Junior' 
        ? `${calculatedInfo.semester}th Semester Student` 
        : calculatedInfo.seniority_level;
      
      toast.success(`Welcome ${displayLevel}! Your info is saved locally.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid student ID format');
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      
      // Load posts from Supabase
      const postsData = await fetchPosts();
      setPosts(postsData);
      
      // Load user's likes if logged in
      if (user?.email) {
        const userLikes = await fetchUserLikes(user.email);
        setLikedPosts(new Set(userLikes));
      }
      
      // Load comments for all posts from Supabase
      const commentsData: Record<string, Comment[]> = {};
      for (const post of postsData) {
        const postComments = await fetchComments(post.id);
        commentsData[post.id] = postComments;
      }
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    console.log('CreatePost called - User:', user);
    console.log('Student info:', studentInfo);
    console.log('New post content:', newPost);
    
    if (!user || !studentInfo || !newPost.trim()) {
      console.log('Missing required data:', { user: !!user, studentInfo: !!studentInfo, newPost: !!newPost.trim() });
      alert(`Missing data: User: ${!!user}, StudentInfo: ${!!studentInfo}, Post: ${!!newPost.trim()}`);
      return;
    }
    
    try {
      setIsPosting(true);
      const postData = {
        content: newPost.trim(),
        author_name: user.name || user.email!.split('@')[0],
        author_email: user.email!,
        author_student_id: studentInfo.student_id,
        likes_count: 0,
        comments_count: 0
      };
      
      console.log('Creating post with data:', postData);
      
      console.log('Attempting to create post with data:', postData);
      
      // Test Supabase connection first
      console.log('Testing Supabase connection...');
      const { data: testData, error: testError } = await supabase.from('suggestion_posts').select('count').limit(1);
      if (testError) {
        console.error('Supabase connection test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      console.log('Supabase connection test passed');
      
      const newPostFromDB = await createPostInDB(postData);
      const updatedPosts = [newPostFromDB, ...posts];
      setPosts(updatedPosts);
      
      setNewPost("");
      toast.success('Post created successfully!');
    } catch (error: any) {
      console.error('Create post error:', error);
      console.error('Error type:', typeof error);
      console.error('Error stringified:', JSON.stringify(error, null, 2));
      
      // Show detailed error in toast for debugging
      const errorMessage = error?.message || error?.error_description || error?.toString() || 'Unknown error';
      toast.error(`Failed to create post: ${errorMessage}`);
      
      // Also alert the error for immediate visibility
      alert(`Debug - Create post failed: ${errorMessage}`);
    } finally {
      setIsPosting(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await deletePostFromDB(postId);
      const updatedPosts = posts.filter(p => p.id !== postId);
      setPosts(updatedPosts);
      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Delete post error:', error);
      toast.error('Failed to delete post');
    }
  };

  const editPost = async (postId: string) => {
    if (!editContent.trim()) return;
    
    try {
      const updatedPost = await updatePostInDB(postId, editContent.trim());
      const updatedPosts = posts.map(p => 
        p.id === postId ? updatedPost : p
      );
      setPosts(updatedPosts);
      setEditingPost(null);
      setEditContent("");
      toast.success('Post updated successfully');
    } catch (error) {
      console.error('Edit post error:', error);
      toast.error('Failed to update post');
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user?.email) {
      toast.error('Please sign in to like posts');
      return;
    }

    try {
      const isLiked = await toggleLikeInDB(postId, user.email);
      const newLikedPosts = new Set(likedPosts);
      
      // Update local state based on the result
      if (isLiked) {
        newLikedPosts.add(postId);
      } else {
        newLikedPosts.delete(postId);
      }
      
      setLikedPosts(newLikedPosts);
      
      // Refresh posts to get updated like counts from database
      const updatedPosts = await fetchPosts();
      setPosts(updatedPosts);
      
    } catch (error) {
      console.error('Toggle like error:', error);
      toast.error('Failed to update like');
    }
  };

  const reportPost = async (postId: string) => {
    // Simple report system for now
    if (window.confirm('Report this post as inappropriate?')) {
      toast.success('Post reported. Thank you for keeping our community safe.');
      // In a real app, this would send to moderation
    }
  };

  // Parse reply target from comment (like Faculty Review)
  const parseReplyTarget = (content: string) => {
    if (content.startsWith('replied_to:')) {
      const parts = content.split('|');
      if (parts.length >= 2) {
        const targetUser = parts[0].replace('replied_to:', '').trim();
        const actualContent = parts.slice(1).join('|');
        return { targetUser, actualContent };
      }
    }
    return { targetUser: null, actualContent: content };
  };

  const addComment = async (postId: string, parentCommentId?: string) => {
    if (!user || !studentInfo || !newComment[postId]?.trim()) return;
    
    try {
      // Format comment with reply target (if replying)
      let finalContent = newComment[postId].trim();
      if (replyingTo && replyingToUser) {
        finalContent = `replied_to:${replyingToUser}|${finalContent}`;
      }
      
      const commentData = {
        post_id: postId,
        content: finalContent,
        author_name: user.name || user.email!.split('@')[0],
        author_email: user.email!,
        author_student_id: studentInfo.student_id,
        parent_comment_id: parentCommentId || null
      };
      
      const newCommentFromDB = await createCommentInDB(commentData);
      
      // Refresh comments for this post to get the updated structure
      const updatedPostComments = await fetchComments(postId);
      const updatedComments = { ...comments };
      updatedComments[postId] = updatedPostComments;
      setComments(updatedComments);
      
      // Refresh posts to get updated comment counts from database
      const updatedPosts = await fetchPosts();
      setPosts(updatedPosts);
      
      // Clear comment input and reply state
      setNewComment(prev => ({ ...prev, [postId]: "" }));
      setReplyingTo(null);
      setReplyingToUser(null);
      
      toast.success(parentCommentId ? 'Reply added!' : 'Comment added!');
    } catch (error: any) {
      console.error('Add comment error:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', error?.message || error);
      
      const errorMessage = error?.message || error?.error_description || 'Unknown error';
      toast.error(`Failed to add comment: ${errorMessage}`);
      
      // Also alert for debugging
      alert(`Debug - Add comment failed: ${errorMessage}`);
    }
  };

  const toggleComments = (postId: string) => {
    const newShowComments = new Set(showComments);
    if (showComments.has(postId)) {
      newShowComments.delete(postId);
    } else {
      newShowComments.add(postId);
    }
    setShowComments(newShowComments);
  };

  const editComment = async (postId: string, commentId: string, isReply: boolean, parentCommentId?: string) => {
    if (!editCommentContent.trim()) return;

    try {
      await updateCommentInDB(commentId, editCommentContent.trim());
      
      // Refresh comments for this post to get the updated structure
      const updatedPostComments = await fetchComments(postId);
      const updatedComments = { ...comments };
      updatedComments[postId] = updatedPostComments;
      setComments(updatedComments);
      
      setEditingComment(null);
      setEditCommentContent("");
      toast.success('Comment updated!');
    } catch (error) {
      console.error('Edit comment error:', error);
      toast.error('Failed to update comment');
    }
  };

  const deleteComment = async (postId: string, commentId: string, isReply: boolean, parentCommentId?: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteCommentFromDB(commentId);
      
      // Refresh comments for this post to get the updated structure
      const updatedPostComments = await fetchComments(postId);
      const updatedComments = { ...comments };
      updatedComments[postId] = updatedPostComments;
      setComments(updatedComments);
      
      // Refresh posts to get updated comment counts from database
      const updatedPosts = await fetchPosts();
      setPosts(updatedPosts);
      
      toast.success('Comment deleted!');
    } catch (error) {
      console.error('Delete comment error:', error);
      toast.error('Failed to delete comment');
    }
  };

  const reportComment = async (commentId: string, authorName: string) => {
    if (window.confirm(`Report comment by ${authorName} as inappropriate?`)) {
      toast.success('Comment reported. Thank you for keeping our community safe.');
      // In a real app, this would send to moderation
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-4">Sign In to Access Suggestions</h2>
            <p className="text-muted-foreground mb-6">
              Connect with seniors and get guidance from the BRACU community.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-24 bg-muted rounded-lg"></div>
              <div className="h-24 bg-muted rounded-lg"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-2 sm:gap-3">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Suggestions & Guidance
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Connect with seniors, ask questions, and help junior students
            </p>
          </div>

          {/* Student ID Dialog */}
          <Dialog open={showStudentIdDialog} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Complete Your Profile</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleStudentIdSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="student_id">Student ID</Label>
                  <Input 
                    id="student_id" 
                    name="student_id"
                    value={tempStudentId}
                    onChange={(e) => handleStudentIdChange(e.target.value)}
                    placeholder="Enter your 8-digit student ID"
                    required
                    pattern="\d{8}"
                    title="8-digit student ID"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    🔒 This ID is for privacy verification only and will never be posted anywhere
                  </p>
                </div>
                
                {showAlumniCheck && (
                  <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                    <input type="checkbox" id="is_alumni" name="is_alumni" />
                    <Label htmlFor="is_alumni" className="text-sm">
                      I am an alumni (already graduated)
                    </Label>
                  </div>
                )}
                
                <Button type="submit" className="w-full">
                  Save Profile
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Create Post */}
          {studentInfo && (
            <Card className="mb-6">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-3">
                      <span className="font-medium text-sm sm:text-base">{user.name || user.email?.split('@')[0]}</span>
                      {getSeniorityBadge(studentInfo)}
                    </div>
                    <Textarea
                      placeholder="Ask a question or share advice..."
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      className="min-h-[80px] sm:min-h-[100px] mb-3 text-sm sm:text-base"
                      maxLength={1000}
                    />
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {newPost.length}/1000 characters
                      </span>
                      <Button 
                        onClick={createPost}
                        disabled={!newPost.trim() || isPosting}
                        className="flex items-center gap-2 w-full sm:w-auto"
                        size="sm"
                      >
                        <MessageSquarePlus className="h-3 w-3 sm:h-4 sm:w-4" />
                        {isPosting ? 'Posting...' : 'Post'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts Feed */}
          <div className="space-y-4 sm:space-y-6">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Be the first to ask a question or share advice!
                  </p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="font-semibold text-sm sm:text-base truncate">{post.author_name}</span>
                            {post.author_student_id && (
                              getSeniorityBadge(calculateStudentInfo(post.author_student_id))
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {new Date(post.created_at).toLocaleString()}
                            </span>
                            {post.updated_at && post.updated_at !== post.created_at && (
                              <span className="text-xs text-muted-foreground">(edited)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Post Actions Menu */}
                      {user && post.author_email === user.email && (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-1 sm:p-2"
                            onClick={() => {
                              setEditingPost(post.id);
                              setEditContent(post.content);
                            }}
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-1 sm:p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deletePost(post.id)}
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {editingPost === post.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => editPost(post.id)}>
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingPost(null);
                              setEditContent("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mb-4 text-sm sm:text-base leading-relaxed">{post.content}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 sm:gap-4">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className={`flex items-center gap-1 p-1 sm:p-2 ${
                                likedPosts.has(post.id) ? 'text-red-500' : ''
                              }`}
                              onClick={() => toggleLike(post.id)}
                            >
                              <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${
                                likedPosts.has(post.id) ? 'fill-current' : ''
                              }`} />
                              <span className="text-xs sm:text-sm">{post.likes_count}</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="flex items-center gap-1 p-1 sm:p-2"
                              onClick={() => toggleComments(post.id)}
                            >
                              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="text-xs sm:text-sm">{post.comments_count}</span>
                            </Button>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-1 sm:p-2"
                            onClick={() => reportPost(post.id)}
                          >
                            <Flag className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                    
                    {/* Comments Section */}
                    {showComments.has(post.id) && (
                      <div className="mt-4 pt-4 border-t">
                        {/* Add Comment Form */}
                        {user && studentInfo && (
                          <div className="mb-4">
                            {/* Reply indicator */}
                            {replyingTo && replyingToUser && (
                              <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 dark:bg-blue-900 rounded text-sm">
                                <MessageCircle className="h-3 w-3 text-blue-500" />
                                <span className="text-blue-700 dark:text-blue-300">
                                  Replying to <span className="font-semibold">@{replyingToUser}</span>
                                </span>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyingToUser(null);
                                  }}
                                  className="ml-auto p-1 h-auto"
                                >
                                  ✕
                                </Button>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Input
                                placeholder={replyingTo ? `Reply to @${replyingToUser}...` : "Write a comment..."}
                                value={newComment[post.id] || ""}
                                onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    addComment(post.id, replyingTo || undefined);
                                  }
                                }}
                                className="flex-1"
                              />
                              <Button 
                                size="sm" 
                                onClick={() => addComment(post.id, replyingTo || undefined)}
                                disabled={!newComment[post.id]?.trim()}
                              >
                                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Comments List with Threading */}
                        <div className="space-y-3">
                          {comments[post.id]?.filter(c => !c.parent_comment_id).map((comment) => (
                            <div key={comment.id}>
                              {/* Main Comment */}
                              <div className="bg-muted/50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{comment.author_name}</span>
                                    {comment.author_student_id && (
                                      getSeniorityBadge(calculateStudentInfo(comment.author_student_id))
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(comment.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-xs p-1"
                                      onClick={() => {
                                        if (replyingTo === comment.id) {
                                          setReplyingTo(null);
                                          setReplyingToUser(null);
                                        } else {
                                          setReplyingTo(comment.id);
                                          setReplyingToUser(comment.author_name);
                                        }
                                      }}
                                    >
                                      <MessageCircle className="h-3 w-3 mr-1" />
                                      Reply
                                    </Button>
                                    
                                    {/* Edit/Delete for comment author */}
                                    {user && comment.author_email === user.email && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-xs p-1"
                                          onClick={() => {
                                            setEditingComment(`${post.id}_${comment.id}`);
                                            setEditCommentContent(parseReplyTarget(comment.content).actualContent);
                                          }}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-xs p-1 text-red-500 hover:text-red-700"
                                          onClick={() => deleteComment(post.id, comment.id, false)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                    
                                    {/* Report for other users */}
                                    {user && comment.author_email !== user.email && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs p-1 text-orange-500 hover:text-orange-700"
                                        onClick={() => reportComment(comment.id, comment.author_name)}
                                      >
                                        <Flag className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Edit Mode or Display Content */}
                                {editingComment === `${post.id}_${comment.id}` ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editCommentContent}
                                      onChange={(e) => setEditCommentContent(e.target.value)}
                                      className="min-h-[60px] text-sm"
                                      placeholder="Edit your comment..."
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => editComment(post.id, comment.id, false)}
                                        disabled={!editCommentContent.trim()}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingComment(null);
                                          setEditCommentContent("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Parse and display comment content */
                                  (() => {
                                    const { targetUser, actualContent } = parseReplyTarget(comment.content);
                                    return (
                                      <div>
                                        {targetUser && (
                                          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
                                            <span>replied to</span>
                                            <span className="font-semibold">@{targetUser}</span>
                                          </div>
                                        )}
                                        <p className="text-sm">{actualContent}</p>
                                      </div>
                                    );
                                  })()
                                )}
                              </div>
                              
                              {/* Nested Replies - Facebook Style */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="mt-3 pl-6 border-l-2 border-blue-200 dark:border-blue-700 space-y-3">
                                  {comment.replies.map((reply) => (
                                    <div key={reply.id} className="bg-muted/30 rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm">{reply.author_name}</span>
                                          {reply.author_student_id && (
                                            getSeniorityBadge(calculateStudentInfo(reply.author_student_id))
                                          )}
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(reply.created_at).toLocaleString()}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs p-1"
                                            onClick={() => {
                                              if (replyingTo === comment.id && replyingToUser === reply.author_name) {
                                                setReplyingTo(null);
                                                setReplyingToUser(null);
                                              } else {
                                                setReplyingTo(comment.id); // Still reply to main comment
                                                setReplyingToUser(reply.author_name); // But mention this user
                                              }
                                            }}
                                          >
                                            <MessageCircle className="h-3 w-3 mr-1" />
                                            Reply
                                          </Button>
                                          
                                          {/* Edit/Delete for reply author */}
                                          {user && reply.author_email === user.email && (
                                            <>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-xs p-1"
                                                onClick={() => {
                                                  setEditingComment(`${post.id}_${comment.id}_${reply.id}`);
                                                  setEditCommentContent(parseReplyTarget(reply.content).actualContent);
                                                }}
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-xs p-1 text-red-500 hover:text-red-700"
                                                onClick={() => deleteComment(post.id, reply.id, true, comment.id)}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </>
                                          )}
                                          
                                          {/* Report for other users */}
                                          {user && reply.author_email !== user.email && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="text-xs p-1 text-orange-500 hover:text-orange-700"
                                              onClick={() => reportComment(reply.id, reply.author_name)}
                                            >
                                              <Flag className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Edit Mode or Display Content */}
                                      {editingComment === `${post.id}_${comment.id}_${reply.id}` ? (
                                        <div className="space-y-2">
                                          <Textarea
                                            value={editCommentContent}
                                            onChange={(e) => setEditCommentContent(e.target.value)}
                                            className="min-h-[60px] text-sm"
                                            placeholder="Edit your reply..."
                                          />
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              onClick={() => editComment(post.id, reply.id, true, comment.id)}
                                              disabled={!editCommentContent.trim()}
                                            >
                                              Save
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                setEditingComment(null);
                                                setEditCommentContent("");
                                              }}
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        /* Parse and display reply content */
                                        (() => {
                                          const { targetUser, actualContent } = parseReplyTarget(reply.content);
                                          return (
                                            <div>
                                              {targetUser && (
                                                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
                                                  <span>replied to</span>
                                                  <span className="font-semibold">@{targetUser}</span>
                                                </div>
                                              )}
                                              <p className="text-sm">{actualContent}</p>
                                            </div>
                                          );
                                        })()
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )) || (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No comments yet. Be the first to comment!
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Suggestions;
