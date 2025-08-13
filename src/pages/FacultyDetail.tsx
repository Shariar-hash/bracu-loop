import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { ArrowLeft, Star, MessageCircle, ThumbsUp, ThumbsDown, Flag, Send, X, Edit, Trash2, Mail, MapPin } from 'lucide-react';

interface Review {
  faculty_initial: string;
  course_code?: string;
  rating: number;
  comment: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  user_name: string;
  user_email: string;
  parent_faculty_initial?: string;
  parent_course_code?: string;
  parent_created_at?: string;
  user_votes?: { user_id: string, vote_type: 'upvote' | 'downvote' }[];
  replies?: Review[];
}

interface Faculty {
  initial: string;
  full_name: string;
  email?: string;
  desk?: string;
}

interface Course {
  course_code: string;
  course_name: string;
}

const FacultyDetail: React.FC = () => {
  const { facultyId } = useParams<{ facultyId: string }>(); // facultyId is actually the initial
  const navigate = useNavigate();
  const { user } = useAuth();
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userVotes, setUserVotes] = useState<{[key: string]: 'upvote' | 'downvote'}>({});
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // created_at of review being replied to
  const [replyingToUser, setReplyingToUser] = useState<string | null>(null); // name of user being replied to
  const [replyingToType, setReplyingToType] = useState<'review' | 'reply' | null>(null); // what type we're replying to
  const [replyText, setReplyText] = useState('');
  const [editingReview, setEditingReview] = useState<string | null>(null); // created_at of review being edited
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState<number>(0);
  const [showAllReplies, setShowAllReplies] = useState<{[key: string]: boolean}>({});
  const [sortBy, setSortBy] = useState<'recent' | 'upvoted'>('recent'); // Comment sorting filter
  const [isFetchingReviews, setIsFetchingReviews] = useState(false); // Prevent multiple simultaneous fetches

  // FACEBOOK-STYLE: Format reply text to highlight @mentions
  const formatReplyText = (text: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = text.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a mentioned username - make it stand out like Facebook
        return (
          <span key={index} className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 px-1 rounded">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  // Check if this is a reply to someone (has @mention at the start)
  const getReplyToInfo = (text: string) => {
    console.log('Checking mention in text:', text);
    
    // Try different mention patterns
    const patterns = [
      /^@(\w+)\s+(.*)$/,        // @username followed by space
      /^@(\w+)(.*)$/,           // @username without space
      /^@([^\s]+)\s+(.*)$/,     // @name.with.dots followed by space
      /^@([^\s]+)(.*)$/         // @name.with.dots without space
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        console.log('Found mention match:', match);
        return {
          mentionedUser: match[1],
          remainingText: match[2] || ''
        };
      }
    }
    
    console.log('No mention found in:', text);
    return null;
  };

  // SIMPLE SOLUTION: Determine who this reply was directed to based on reply order
  const getReplyTarget = (reply: Review, parentReview: Review) => {
    console.log('Getting reply target for:', reply.user_name, 'parent review by:', parentReview.user_name);
    console.log('Parent review replies count:', parentReview.replies?.length || 0);
    
    // If this is the first reply, it's replying to the main review author
    if (!parentReview.replies || parentReview.replies.length <= 1) {
      console.log('First reply - targeting main author:', parentReview.user_name);
      return parentReview.user_name;
    }
    
    // Find the most recent reply before this one (chronologically)
    const sortedReplies = [...(parentReview.replies || [])].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    console.log('Sorted replies:', sortedReplies.map(r => `${r.user_name} at ${r.created_at}`));
    
    const currentIndex = sortedReplies.findIndex(r => r.created_at === reply.created_at);
    console.log('Current reply index:', currentIndex);
    
    if (currentIndex > 0) {
      // Reply to the previous reply author (unless it's the same person)
      const previousReply = sortedReplies[currentIndex - 1];
      console.log('Previous reply by:', previousReply.user_name);
      if (previousReply.user_name !== reply.user_name) {
        console.log('Targeting previous reply author:', previousReply.user_name);
        return previousReply.user_name;
      }
    }
    
    // Fallback to main review author (if different from current user)
    const target = parentReview.user_name !== reply.user_name ? parentReview.user_name : null;
    console.log('Fallback target:', target);
    return target;
  };

  // SIMPLE: Parse reply target from comment
  const parseReplyTarget = (comment: string) => {
    console.log('Parsing comment:', comment.substring(0, 50) + (comment.length > 50 ? '...' : ''));
    
    if (comment.startsWith('replied_to:')) {
      const parts = comment.split('|');
      if (parts.length >= 2) {
        const targetUser = parts[0].replace('replied_to:', '').trim();
        const actualComment = parts.slice(1).join('|'); // Handle | in actual comment
        console.log('Found reply target:', targetUser, 'comment:', actualComment.substring(0, 30) + '...');
        return { targetUser, actualComment };
      }
    }
    
    console.log('No reply target found, treating as regular comment');
    return { targetUser: null, actualComment: comment };
  };

  // Optimized helper to fetch reviews and nest replies
  const fetchReviews = async () => {
    if (!user || isFetchingReviews) return; // Prevent multiple simultaneous calls
    
    setIsFetchingReviews(true);
    
    try {
      // Use Promise.all to fetch data in parallel instead of sequentially
      const [reviewResult, voteResult] = await Promise.all([
        supabase
          .from('reviews')
          .select('*')
          .eq('faculty_initial', facultyId)
          .order('created_at', { ascending: false }), // Most recent first for better perceived performance
          
        supabase
          .from('review_votes')
          .select('review_faculty_initial, review_created_at, review_course_code, vote_type')
          .eq('user_email', user.email)
          .eq('review_faculty_initial', facultyId) // Only get votes for this faculty
      ]);

      const { data: reviewData, error: reviewError } = reviewResult;
      const { data: voteData, error: voteError } = voteResult;
      
      if (reviewError) {
        console.error('Error fetching reviews:', reviewError);
        return;
      }
      
      if (voteError) {
        console.error('Error fetching votes:', voteError);
      }
      
      // Create user votes map - optimized
      const votesMap: {[key: string]: 'upvote' | 'downvote'} = {};
      (voteData || []).forEach(vote => {
        const key = `${vote.review_faculty_initial}_${vote.review_created_at}_${vote.review_course_code || 'null'}`;
        votesMap[key] = vote.vote_type;
      });
      setUserVotes(votesMap);
      
      // Optimized nesting with single pass
      const reviews: Review[] = [];
      const repliesMap: { [key: string]: Review[] } = {};
      
      // Single pass: separate reviews and replies
      (reviewData || []).forEach((r: any) => {
        if (r.parent_created_at && r.parent_faculty_initial) {
          // This is a reply
          const parentKey = r.parent_created_at + (r.parent_course_code || '');
          if (!repliesMap[parentKey]) repliesMap[parentKey] = [];
          repliesMap[parentKey].push(r);
        } else {
          // This is a main review
          reviews.push(r);
        }
      });
      
      // Attach replies to parents in one pass
      reviews.forEach(r => {
        const key = r.created_at + (r.course_code || '');
        r.replies = repliesMap[key] || [];
      });
      
      setReviews(reviews);
      
    } catch (error) {
      console.error('Error in fetchReviews:', error);
      setError('Failed to load reviews. Please try again.');
    } finally {
      setIsFetchingReviews(false);
    }
  };

  // Optimized function to update local state without full refetch
  const updateReviewLocally = (updatedReview: Review, isNew: boolean = false) => {
    setReviews(prevReviews => {
      if (isNew) {
        // Add new review at the beginning
        return [updatedReview, ...prevReviews];
      }
      
      // Update existing review
      return prevReviews.map(review => {
        if (review.created_at === updatedReview.created_at && 
            review.course_code === updatedReview.course_code) {
          return updatedReview;
        }
        return review;
      });
    });
  };
  
  // Optimized function to update reply locally
  const updateReplyLocally = (parentReview: Review, newReply: Review) => {
    setReviews(prevReviews => {
      return prevReviews.map(review => {
        if (review.created_at === parentReview.created_at && 
            review.course_code === parentReview.course_code) {
          return {
            ...review,
            replies: [newReply, ...(review.replies || [])]
          };
        }
        return review;
      });
    });
  };

  useEffect(() => {
    const fetchFacultyDetail = async () => {
      setLoading(true);
      setError('');
      // Fetch faculty info by initial
      const { data: facultyData, error: facultyError } = await supabase
        .from('faculties')
        .select('initial, full_name, email, desk')
        .eq('initial', facultyId)
        .single();
      if (facultyError || !facultyData) {
        setError('Faculty not found.');
        setLoading(false);
        return;
      }
      setFaculty(facultyData);
      // Fetch courses taught by faculty (assuming faculty_courses has faculty_initial and course_code)
      const { data: courseData } = await supabase
        .from('faculty_courses')
        .select('course_code, courses(course_name)')
        .eq('faculty_initial', facultyId);
      setCourses(courseData?.map((fc: any) => ({ course_code: fc.course_code, course_name: fc.courses?.course_name })) || []);
      setLoading(false);
    };
    
    const init = async () => {
      await fetchFacultyDetail();
      await fetchReviews();
    };
    
    init();
    // eslint-disable-next-line
  }, [facultyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      alert('Please select a rating.');
      return;
    }
    
    if (!comment.trim()) {
      alert('Please write a review comment.');
      return;
    }
    
    if (!user) {
      alert('Please sign in to submit a review.');
      return;
    }
    
    try {
      const insertData: any = {
        faculty_initial: facultyId,
        user_name: user.name || 'Anonymous',
        user_email: user.email!,
        rating,
        comment: comment.trim(),
        upvotes: 0,
        downvotes: 0,
      };
      
      // Only add course_code if a course is selected
      if (courses.length > 1 && selectedCourse) {
        insertData.course_code = selectedCourse;
      }
      
      console.log('Submitting review:', insertData); // Debug log
      
      const { data, error } = await supabase.from('reviews').insert([insertData]).select();
      
      if (error) {
        console.error('Review submission error:', error);
        alert(`Failed to submit review: ${error.message}`);
      } else {
        console.log('Review submitted successfully:', data); // Debug log
        
        // Update local state instead of refetching
        if (data && data[0]) {
          updateReviewLocally(data[0], true);
        }
        
        setComment('');
        setRating(0);
        setSelectedCourse('');
        alert('Review submitted successfully!');
      }
    } catch (err) {
      console.error('Review submission error:', err);
      alert('An error occurred while submitting your review. Please try again.');
    }
  };

  // Upvote/Downvote with user tracking (NO MULTIPLE VOTES ALLOWED)
  const handleVote = async (review: Review, type: 'upvote' | 'downvote') => {
    if (!user) {
      alert('Please sign in to vote on reviews.');
      return;
    }
    
    try {
      console.log('HandleVote called:', { 
        review: {
          faculty_initial: review.faculty_initial,
          created_at: review.created_at,
          course_code: review.course_code
        }, 
        type, 
        user_email: user.email 
      });

      // FIXED: Generate vote key consistently - always use the course_code that was stored in the vote record
      // For replies, this should be null since replies don't have course codes in the database
      const voteKeyCode = review.parent_faculty_initial ? 'null' : (review.course_code || 'null');
      const voteKey = `${review.faculty_initial}_${review.created_at}_${voteKeyCode}`;
      const existingVote = userVotes[voteKey];
      
      console.log('Handling vote:', type, 'for key:', voteKey, review.parent_faculty_initial ? '(reply)' : '(review)');
      console.log('Existing vote:', existingVote);
      
      // If user already voted the same way, REMOVE the vote (unlike Facebook)
      if (existingVote === type) {
        console.log('Removing existing vote from database...');
        // Remove ALL votes from this user for this review to handle duplicates
        // For replies, course_code should be null in the database
        const deleteKey = review.parent_faculty_initial ? null : (review.course_code || null);
          
        const { error: deleteError } = await supabase
          .from('review_votes')
          .delete()
          .eq('user_email', user.email)
          .eq('review_faculty_initial', review.faculty_initial)
          .eq('review_created_at', review.created_at)
          .eq('review_course_code', deleteKey);
        
        if (deleteError) {
          console.error('Delete vote error:', deleteError);
          alert('Failed to remove vote. Please try again.');
          return;
        } else {
        }
        
        // Decrease vote count
        const voteField = type === 'upvote' ? 'upvotes' : 'downvotes';
        const newCount = Math.max(0, (review[voteField] || 0) - 1);
        
        console.log('Removing vote:', {
          voteField, 
          newCount, 
          review_id: review.created_at,
          is_reply: !!review.parent_faculty_initial 
        });
        
        // Build update query that works for both reviews and replies
        let updateQuery = supabase
          .from('reviews')
          .update({ [voteField]: newCount })
          .eq('faculty_initial', review.faculty_initial)
          .eq('created_at', review.created_at);

        // Handle course_code properly for both reviews and replies
        if (review.course_code) {
          updateQuery = updateQuery.eq('course_code', review.course_code);
        } else {
          updateQuery = updateQuery.is('course_code', null);
        }

        // For replies, add parent fields to ensure we're updating the right record
        if (review.parent_faculty_initial) {
          updateQuery = updateQuery.eq('parent_faculty_initial', review.parent_faculty_initial);
          if (review.parent_created_at) {
            updateQuery = updateQuery.eq('parent_created_at', review.parent_created_at);
          }
        }

        const { error: updateError } = await updateQuery;
        
        if (updateError) {
          console.error('Update vote count error:', updateError);
        } else {
          
          // Update local state instead of refetching
          setUserVotes(prev => {
            const newVotes = {...prev};
            delete newVotes[voteKey];
            return newVotes;
          });
          
          setReviews(prevReviews => {
            return prevReviews.map(r => {
              // Update main review
              if (r.created_at === review.created_at && 
                  (r.course_code || null) === (review.course_code || null) &&
                  !review.parent_faculty_initial) {
                return {
                  ...r,
                  [voteField]: newCount
                };
              }
              
              // Update replies within their parent review
              if (review.parent_faculty_initial && r.replies) {
                const updatedReplies = r.replies.map(reply => {
                  if (reply.created_at === review.created_at && 
                      reply.faculty_initial === review.faculty_initial) {
                    return {
                      ...reply,
                      [voteField]: newCount
                    };
                  }
                  return reply;
                });
                
                if (updatedReplies !== r.replies) {
                  return { ...r, replies: updatedReplies };
                }
              }
              
              return r;
            });
          });
        }
        return;
      }
      
      // If user voted differently, change the vote
      if (existingVote) {
        // Remove ALL old votes from database to handle duplicates
        // For replies, course_code should be null in the database
        const deleteKey = review.parent_faculty_initial ? null : (review.course_code || null);
          
        await supabase
          .from('review_votes')
          .delete()
          .eq('user_email', user.email)
          .eq('review_faculty_initial', review.faculty_initial)
          .eq('review_created_at', review.created_at)
          .eq('review_course_code', deleteKey);
        
        // Decrease old vote count
        const oldVoteField = existingVote === 'upvote' ? 'upvotes' : 'downvotes';
        const oldNewCount = Math.max(0, (review[oldVoteField] || 0) - 1);
        
        console.log('Decreasing old vote:', {
          oldVoteField, 
          oldNewCount, 
          is_reply: !!review.parent_faculty_initial 
        });
        
        // Build update query for old vote decrease
        let oldUpdateQuery = supabase
          .from('reviews')
          .update({ [oldVoteField]: oldNewCount })
          .eq('faculty_initial', review.faculty_initial)
          .eq('created_at', review.created_at);

        // Handle course_code properly for both reviews and replies
        if (review.course_code) {
          oldUpdateQuery = oldUpdateQuery.eq('course_code', review.course_code);
        } else {
          oldUpdateQuery = oldUpdateQuery.is('course_code', null);
        }

        // For replies, add parent fields
        if (review.parent_faculty_initial) {
          oldUpdateQuery = oldUpdateQuery.eq('parent_faculty_initial', review.parent_faculty_initial);
          if (review.parent_created_at) {
            oldUpdateQuery = oldUpdateQuery.eq('parent_created_at', review.parent_created_at);
          }
        }

        await oldUpdateQuery;
      }
      
      // Add new vote to database
      // For replies, course_code should be null in the database
      const insertKey = review.parent_faculty_initial ? null : (review.course_code || null);
        
      const voteData = {
        user_email: user.email,
        review_faculty_initial: review.faculty_initial,
        review_created_at: review.created_at,
        review_course_code: insertKey,
        vote_type: type
      };
      
      
      // Use upsert to handle any remaining duplicates
      const { error: insertError } = await supabase
        .from('review_votes')
        .upsert([voteData], { 
          onConflict: 'review_faculty_initial,review_created_at,review_course_code,user_email',
          ignoreDuplicates: false 
        });
      
      if (insertError) {
        console.error('Insert vote error:', insertError);
        // If upsert fails, try delete + insert
        await supabase
          .from('review_votes')
          .delete()
          .eq('user_email', user.email)
          .eq('review_faculty_initial', review.faculty_initial)
          .eq('review_created_at', review.created_at)
          .eq('review_course_code', review.course_code || null);
        
        const { error: insertError2 } = await supabase.from('review_votes').insert([voteData]);
        if (insertError2) {
          console.error('Second insert attempt failed:', insertError2);
          alert('Failed to register vote. Please try again.');
          return;
        }
      }
      
      // Increase new vote count
      const newVoteField = type === 'upvote' ? 'upvotes' : 'downvotes';
      const newCount = (review[newVoteField] || 0) + 1;
      
      console.log('Increasing vote count:', {
        newVoteField, 
        newCount, 
        review_id: review.created_at,
        faculty_initial: review.faculty_initial,
        course_code: review.course_code,
        is_reply: !!review.parent_faculty_initial
      });
      
      // Build update query that works for both reviews and replies
      let updateQuery = supabase
        .from('reviews')
        .update({ [newVoteField]: newCount })
        .eq('faculty_initial', review.faculty_initial)
        .eq('created_at', review.created_at);

      // Handle course_code properly for both reviews and replies
      if (review.course_code) {
        updateQuery = updateQuery.eq('course_code', review.course_code);
      } else {
        updateQuery = updateQuery.is('course_code', null);
      }

      // For replies, add parent fields to ensure we're updating the right record
      if (review.parent_faculty_initial) {
        updateQuery = updateQuery.eq('parent_faculty_initial', review.parent_faculty_initial);
        if (review.parent_created_at) {
          updateQuery = updateQuery.eq('parent_created_at', review.parent_created_at);
        }
      }

      const { error: updateError } = await updateQuery;
      
      if (updateError) {
        console.error('Update vote count error:', updateError);
        alert('Failed to update vote count. Please try again.');
      } else {
        
        // Update local state instead of refetching
        setUserVotes(prev => ({
          ...prev,
          [voteKey]: type
        }));
        
        setReviews(prevReviews => {
          return prevReviews.map(r => {
            // Update main review
            if (r.created_at === review.created_at && 
                (r.course_code || null) === (review.course_code || null) &&
                !review.parent_faculty_initial) {
              return {
                ...r,
                [newVoteField]: newCount,
                // If changing vote, also decrease the old vote count
                ...(existingVote && {
                  [existingVote === 'upvote' ? 'upvotes' : 'downvotes']: Math.max(0, (r[existingVote === 'upvote' ? 'upvotes' : 'downvotes'] || 0) - 1)
                })
              };
            }
            
            // Update replies within their parent review
            if (review.parent_faculty_initial && r.replies) {
              const updatedReplies = r.replies.map(reply => {
                if (reply.created_at === review.created_at && 
                    reply.faculty_initial === review.faculty_initial) {
                  return {
                    ...reply,
                    [newVoteField]: newCount,
                    // If changing vote, also decrease the old vote count
                    ...(existingVote && {
                      [existingVote === 'upvote' ? 'upvotes' : 'downvotes']: Math.max(0, (reply[existingVote === 'upvote' ? 'upvotes' : 'downvotes'] || 0) - 1)
                    })
                  };
                }
                return reply;
              });
              
              if (updatedReplies !== r.replies) {
                return { ...r, replies: updatedReplies };
              }
            }
            
            return r;
          });
        });
      }
    } catch (err) {
      console.error('Vote error:', err);
      alert('An error occurred while voting. Please try again.');
    }
  };

  // Reply submission fix
  const handleReply = async (parent: Review) => {
    if (!replyText.trim()) {
      alert('Please write a reply before submitting.');
      return;
    }
    
    if (!user) {
      alert('Please sign in to post a reply.');
      return;
    }
    
    try {
      // FACEBOOK-STYLE THREADING: Determine the root parent for nested replies
      const rootParent = parent.parent_faculty_initial ? {
        faculty_initial: parent.parent_faculty_initial,
        created_at: parent.parent_created_at,
        course_code: parent.parent_course_code
      } : {
        faculty_initial: parent.faculty_initial,
        created_at: parent.created_at,
        course_code: parent.course_code
      };
      
      // SIMPLE SOLUTION: Just store the reply text as-is
      const finalReplyText = replyText.trim();
      
      const insertData: any = {
        faculty_initial: parent.faculty_initial,
        user_name: user.name || 'Anonymous',
        user_email: user.email!,
        comment: `replied_to:${replyingToUser}|${finalReplyText}`, // SIMPLE: Store who we replied to in comment
        rating: 0, // Replies don't have ratings
        course_code: null, // Replies don't have course codes
        // Always point to the root parent (Facebook threading)
        parent_created_at: rootParent.created_at,
        parent_faculty_initial: rootParent.faculty_initial,
        parent_course_code: rootParent.course_code,
        upvotes: 0,
        downvotes: 0
      };
      
      
      const { data, error } = await supabase.from('reviews').insert([insertData]).select();
      
      if (error) {
        console.error('Reply submission error:', error);
        alert(`Failed to submit reply: ${error.message}`);
      } else {
        
        // Update local state instead of refetching
        if (data && data[0]) {
          updateReplyLocally(parent, data[0]);
        }
        
        setReplyingTo(null);
        setReplyingToUser(null);
        setReplyingToType(null);
        setReplyText('');
        alert('Reply posted successfully!');
      }
    } catch (err) {
      console.error('Reply submission error:', err);
      alert('An error occurred while submitting your reply. Please try again.');
    }
  };

  // Report (placeholder)
  const handleReport = async (review: Review) => {
    try {
      // You could implement a reports table here in the future
      // For now, just show a confirmation
      const confirmed = confirm('Are you sure you want to report this review?');
      if (confirmed) {
        // Here you could insert into a reports table
        // await supabase.from('reports').insert([{...}]);
        alert('Review reported successfully. Moderators will review it.');
      }
    } catch (err) {
      console.error('Report error:', err);
      alert('Failed to report review.');
    }
  };

  // Edit review handler
  const handleEditReview = async (review: Review) => {
    console.log('Editing review:', {
      faculty_initial: review.faculty_initial,
      created_at: review.created_at,
      is_reply: !!review.parent_faculty_initial,
      course_code: review.course_code,
      parent_course_code: review.parent_course_code,
      parent_faculty_initial: review.parent_faculty_initial
    });
    
    if (!editText.trim()) {
      alert('Please write a review comment.');
      return;
    }
    
    if (!user || user.email !== review.user_email) {
      alert('You can only edit your own reviews.');
      return;
    }
    
    try {
      const updateData: any = {
        comment: editText.trim(),
      };
      
      // Only update rating for main reviews (not replies)
      if (!review.parent_faculty_initial && editRating > 0) {
        updateData.rating = editRating;
      }
      
      // FIXED: For replies, use parent fields to match database structure
      let updateQuery = supabase
        .from('reviews')
        .update(updateData)
        .eq('faculty_initial', review.faculty_initial)
        .eq('created_at', review.created_at);
        
      // For replies, match using course_code = null and parent fields
      if (review.parent_faculty_initial) {
        updateQuery = updateQuery
          .is('course_code', null)
          .eq('parent_faculty_initial', review.parent_faculty_initial)
          .eq('parent_created_at', review.parent_created_at);
        if (review.parent_course_code) {
          updateQuery = updateQuery.eq('parent_course_code', review.parent_course_code);
        }
      } else {
        // For main reviews, use course_code normally
        if (review.course_code) {
          updateQuery = updateQuery.eq('course_code', review.course_code);
        } else {
          updateQuery = updateQuery.is('course_code', null);
        }
      }
      
      const { error } = await updateQuery;
      
      if (error) {
        console.error('Edit review error:', error);
        alert(`Failed to update review: ${error.message}`);
      } else {
        
        // Update local state instead of refetching
        setReviews(prevReviews => {
          return prevReviews.map(r => {
            if (r.created_at === review.created_at && 
                (r.course_code || null) === (review.course_code || null)) {
              return {
                ...r,
                comment: editText,
                ...(updateData.rating && { rating: editRating })
              };
            }
            return r;
          });
        });
        
        setEditingReview(null);
        setEditText('');
        setEditRating(0);
        alert('Review updated successfully!');
      }
    } catch (err) {
      console.error('Edit review error:', err);
      alert('An error occurred while updating your review. Please try again.');
    }
  };

  // Delete review handler
  const handleDeleteReview = async (review: Review) => {
    if (!user || user.email !== review.user_email) {
      alert('You can only delete your own reviews.');
      return;
    }
    
    const confirmed = confirm('Are you sure you want to delete this review? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      console.log('Deleting review:', {
        faculty_initial: review.faculty_initial,
        created_at: review.created_at,
        course_code: review.course_code,
        parent_faculty_initial: review.parent_faculty_initial,
        user_email: review.user_email
      });

      // Delete associated votes first
      // For replies, use null course_code to match vote records
      const voteKey = review.parent_faculty_initial ? null : (review.course_code || null);
        
      const { error: voteDeleteError } = await supabase
        .from('review_votes')
        .delete()
        .eq('review_faculty_initial', review.faculty_initial)
        .eq('review_created_at', review.created_at)
        .eq('review_course_code', voteKey);

      if (voteDeleteError) {
      }
      
      // Delete the review - use all available identifying fields
      let deleteQuery = supabase
        .from('reviews')
        .delete()
        .eq('faculty_initial', review.faculty_initial)
        .eq('created_at', review.created_at);

      // Add course_code condition (handles both null and actual values)
      if (review.course_code) {
        deleteQuery = deleteQuery.eq('course_code', review.course_code);
      } else {
        deleteQuery = deleteQuery.is('course_code', null);
      }

      // For replies, also match parent fields to be extra sure
      if (review.parent_faculty_initial) {
        deleteQuery = deleteQuery.eq('parent_faculty_initial', review.parent_faculty_initial);
        if (review.parent_created_at) {
          deleteQuery = deleteQuery.eq('parent_created_at', review.parent_created_at);
        }
      }

      const { error } = await deleteQuery;
      
      if (error) {
        console.error('Delete review error:', error);
        alert(`Failed to delete review: ${error.message}`);
      } else {
        
        // Update local state instead of refetching
        setReviews(prevReviews => {
          return prevReviews.filter(r => {
            return !(r.created_at === review.created_at && 
                    (r.course_code || null) === (review.course_code || null));
          });
        });
        
        // Also remove from user votes using consistent key generation
        const voteKeyCode = review.parent_faculty_initial ? 'null' : (review.course_code || 'null');
        const voteKey = `${review.faculty_initial}_${review.created_at}_${voteKeyCode}`;
        setUserVotes(prev => {
          const newVotes = {...prev};
          delete newVotes[voteKey];
          return newVotes;
        });
        
        alert('Review deleted successfully!');
      }
    } catch (err) {
      console.error('Delete review error:', err);
      alert('An error occurred while deleting your review. Please try again.');
    }
  };

  // Upvote, Downvote, Reply, Report handlers would go here

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!faculty) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <button 
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-all duration-200 hover:translate-x-1 mb-4 sm:mb-6 group" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="text-sm sm:text-base">Back to Faculty List</span>
          </button>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 lg:p-10 transition-all duration-300 hover:scale-[1.02] animate-in slide-in-from-top-4 fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl lg:text-3xl font-bold shadow-lg animate-in zoom-in duration-300 hover:rotate-3 transition-transform">
                {faculty?.initial}
              </div>
              <div className="flex-1 w-full sm:w-auto">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-4 animate-in slide-in-from-left-6 fade-in duration-700 delay-200">
                  {faculty?.full_name}
                </h1>
                
                {/* Faculty Contact Info */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-slate-600 dark:text-slate-400 animate-in slide-in-from-left-6 fade-in duration-700 delay-300 mb-4">
                  {faculty?.email && (
                    <span className="flex items-center gap-2 text-sm sm:text-base bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                      <Mail className="h-4 w-4 text-blue-500" />
                      {faculty.email}
                    </span>
                  )}
                  {faculty?.desk && (
                    <span className="flex items-center gap-2 text-sm sm:text-base bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                      <MapPin className="h-4 w-4 text-green-500" />
                      Desk {faculty.desk}
                    </span>
                  )}
                </div>
                
                {/* Courses Taught */}
                {courses.length > 0 && (
                  <div className="animate-in slide-in-from-left-6 fade-in duration-700 delay-400">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Courses Taught:</h3>
                    <div className="flex flex-wrap gap-2 w-full">
                      {courses.map((course, index) => (
                        <span 
                          key={course.course_code}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 text-blue-800 dark:text-blue-200 rounded-full border border-blue-200 dark:border-blue-700 hover:scale-105 transition-transform duration-200 flex-shrink-0"
                          style={{ animationDelay: `${400 + index * 100}ms` }}
                        >
                          <span className="whitespace-nowrap">{course.course_code}</span>
                          {course.course_name && (
                            <span className="ml-1 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                              • {(() => {
                                // Remove credit information like "(3 credits)" or "(3 cr)" etc.
                                const cleanName = course.course_name.replace(/\s*\(\s*\d+(\.\d+)?\s*(credit|credits|cr|crs?)\s*\)/gi, '').trim();
                                return cleanName.length > 15 ? cleanName.substring(0, 15) + '...' : cleanName;
                              })()}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Post Review Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 lg:mb-12 transition-all duration-300 hover:scale-[1.01] animate-in slide-in-from-bottom-4 fade-in duration-500 delay-100">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2 animate-in slide-in-from-left-4 fade-in duration-500 delay-200">
            <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 animate-pulse" />
            Share Your Experience
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Rating */}
              <div className="transform transition-all duration-200 hover:scale-[1.02]">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 sm:mb-3">
                  Rating
                </label>
                <div className="flex items-center gap-1"> 
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-1 transition-all duration-200 hover:scale-110 ${
                        star <= rating 
                          ? 'text-yellow-400 hover:text-yellow-500' 
                          : 'text-slate-300 dark:text-slate-600 hover:text-yellow-300'
                      }`}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star 
                        size={24} 
                        fill={star <= rating ? 'currentColor' : 'none'}
                        className="transition-colors duration-200"
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                      {rating} star{rating > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {rating === 0 && (
                  <p className="text-xs text-red-500 mt-1">Please select a rating</p>
                )}
              </div>

              {/* Course Selection */}
              {courses.length > 1 && (
                <div className="transform transition-all duration-200 hover:scale-[1.02]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 sm:mb-3">
                    Course (Optional)
                  </label>
                  <select 
                    value={selectedCourse} 
                    onChange={e => setSelectedCourse(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300 text-sm sm:text-base"
                  >
                    <option value="">General Review</option>
                    {courses.map(course => (
                      <option key={course.course_code} value={course.course_code}>
                        {course.course_code}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Comment */}
            <div className="transform transition-all duration-200 hover:scale-[1.01]">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 sm:mb-3">
                Your Review
              </label>
              <textarea
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300 resize-none text-sm sm:text-base"
                placeholder="Share your experience with this faculty member..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full lg:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              <Send className="h-4 w-4" />
              Submit Review
            </button>
          </form>
        </div>

        {/* Reviews Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 lg:p-8 transition-all duration-300 hover:scale-[1.01] animate-in slide-in-from-bottom-4 fade-in duration-500 delay-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2 animate-in slide-in-from-left-4 fade-in duration-500 delay-300">
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
              Reviews ({reviews.length})
            </h2>
            
            {/* Sort Filter */}
            <div className="flex items-center gap-2 animate-in slide-in-from-right-4 fade-in duration-500 delay-400">
              <span className="text-sm text-slate-600 dark:text-slate-400">Sort by:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'upvoted')}
                className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-300"
              >
                <option value="recent">Most Recent</option>
                <option value="upvoted">Most Upvoted</option>
              </select>
            </div>
          </div>
          
          {reviews.length === 0 ? (
            <div className="text-center py-12 sm:py-16 lg:py-20 animate-in fade-in duration-500">
              <div className="animate-in zoom-in duration-300 delay-200">
                <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 text-slate-300 dark:text-slate-600 mx-auto mb-4 sm:mb-6 animate-pulse" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-300">
                No reviews yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base animate-in slide-in-from-bottom-4 fade-in duration-500 delay-400">
                Be the first to share your experience with this faculty member!
              </p>
              <div className="mt-6 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-500">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg text-sm">
                  <Star className="h-4 w-4" />
                  <span>Share your thoughts above</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sort reviews based on user selection */}
              {(() => {
                const sortedReviews = [...reviews].sort((a, b) => {
                  if (sortBy === 'upvoted') {
                    // Calculate net votes (upvotes - downvotes) for sorting
                    const aNetVotes = (a.upvotes || 0) - (a.downvotes || 0);
                    const bNetVotes = (b.upvotes || 0) - (b.downvotes || 0);
                    return bNetVotes - aNetVotes; // Higher net votes first
                  } else {
                    // Most recent first (default)
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  }
                });

                return sortedReviews.map((review, idx) => {
                const voteKey = `${review.faculty_initial}_${review.created_at}_${review.course_code || 'null'}`;
                const userVote = userVotes[voteKey];
                
                return (
                  <div 
                    key={review.created_at + (review.course_code || '') + idx} 
                    className="border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group animate-in slide-in-from-bottom-4 fade-in duration-500"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    {/* Review Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: review.rating }, (_, i) => (
                            <Star 
                              key={i} 
                              className="h-4 w-4 sm:h-5 sm:w-5 fill-yellow-400 text-yellow-400 transition-all duration-200 group-hover:scale-110" 
                              style={{ animationDelay: `${i * 50}ms` }}
                            />
                          ))}
                          {Array.from({ length: 5 - review.rating }, (_, i) => (
                            <Star 
                              key={i + review.rating} 
                              className="h-4 w-4 sm:h-5 sm:w-5 text-slate-300 dark:text-slate-600" 
                            />
                          ))}
                        </div>
                        <span className="px-3 py-1 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-300 text-xs sm:text-sm rounded-full transition-all duration-200 hover:scale-105">
                          {review.course_code || 'General'}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-lg">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* User Profile Section - Facebook Style */}
                    <div className="flex items-center gap-3 mb-4 animate-in slide-in-from-left-4 fade-in duration-300 delay-100">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm sm:text-base shadow-lg transition-all duration-200 hover:scale-110 hover:rotate-3">
                        {review.user_name ? review.user_name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                          {review.user_name || 'Anonymous'}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                          {new Date(review.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Review Content */}
                    <div className="prose prose-slate dark:prose-invert max-w-none mb-4 animate-in slide-in-from-bottom-2 fade-in duration-400 delay-200">
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                        {review.comment}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 animate-in slide-in-from-bottom-2 fade-in duration-400 delay-300">
                      <button 
                        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 text-xs sm:text-sm ${
                          userVote === 'upvote' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 shadow-md' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-400 hover:shadow-md'
                        }`}
                        onClick={() => handleVote(review, 'upvote')}
                      >
                        <ThumbsUp className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{review.upvotes || 0}</span>
                      </button>
                      
                      <button 
                        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 text-xs sm:text-sm ${
                          userVote === 'downvote' 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 shadow-md' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-400 hover:shadow-md'
                        }`}
                        onClick={() => handleVote(review, 'downvote')}
                      >
                        <ThumbsDown className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{review.downvotes || 0}</span>
                      </button>
                      
                      <button 
                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-400 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md text-xs sm:text-sm"
                        onClick={() => {
                          const reviewKey = review.created_at + (review.course_code || '');
                          if (replyingTo === reviewKey) {
                            // Close reply form
                            setReplyingTo(null);
                            setReplyingToUser(null);
                            setReplyingToType(null);
                          } else {
                            // Open reply form for this review
                            setReplyingTo(reviewKey);
                            setReplyingToUser(review.user_name);
                            setReplyingToType('review');
                          }
                        }}
                      >
                        <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Reply {review.replies && review.replies.length > 0 && `(${review.replies.length})`}</span>
                      </button>
                      
                      {/* Edit/Delete buttons - only show for user's own reviews */}
                      {user && user.email === review.user_email && (
                        <>
                          <button 
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 dark:bg-slate-700 dark:hover:bg-blue-900 dark:text-slate-400 dark:hover:text-blue-300 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md text-xs sm:text-sm"
                            onClick={() => {
                              setEditingReview(review.created_at + (review.course_code || ''));
                              setEditText(review.comment);
                              setEditRating(review.rating);
                            }}
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            Edit
                          </button>
                          
                          <button 
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 dark:bg-slate-700 dark:hover:bg-red-900 dark:text-slate-400 dark:hover:text-red-300 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md text-xs sm:text-sm"
                            onClick={() => handleDeleteReview(review)}
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            Delete
                          </button>
                        </>
                      )}
                      
                      <button 
                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 dark:bg-slate-700 dark:hover:bg-red-900 dark:text-slate-400 dark:hover:text-red-300 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md text-xs sm:text-sm"
                        onClick={() => handleReport(review)}
                      >
                        <Flag className="h-3 w-3 sm:h-4 sm:w-4" />
                        Report
                      </button>
                    </div>

                    {/* Reply Form - Facebook Style */}
                    {replyingTo === review.created_at + (review.course_code || '') && (
                      <div className="mt-4 p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 rounded-lg sm:rounded-xl border-l-4 border-blue-500 animate-in slide-in-from-top-4 fade-in duration-300 shadow-sm">
                        {/* Reply to indicator */}
                        {replyingToUser && (
                          <div className="flex items-center gap-2 mb-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 animate-in slide-in-from-left-2 fade-in duration-200">
                            <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                            <span>
                              Replying to {replyingToType === 'review' ? 'review by' : 'reply by'} 
                              {user && user.name === replyingToUser ? (
                                <span className="font-semibold text-purple-600 dark:text-purple-400 ml-1">yourself</span>
                              ) : (
                                <span className="font-semibold text-blue-600 dark:text-blue-400 ml-1">@{replyingToUser}</span>
                              )}
                            </span>
                            <button 
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyingToUser(null);
                                setReplyingToType(null);
                                setReplyText('');
                              }}
                              className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-200 hover:scale-110 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-500"
                            >
                              <X className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        )}
                        
                        {/* DEBUG: Show what will be stored */}
                        {replyingToUser && replyText && (
                          <div className="mb-3 p-2 bg-blue-100 dark:bg-blue-800 rounded text-xs text-blue-700 dark:text-blue-300 animate-in slide-in-from-top-2 fade-in duration-200">
                            <strong>Will store:</strong> replied_to:{replyingToUser}|{replyText}
                          </div>
                        )}
                        <textarea
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-sm sm:text-base hover:border-blue-300"
                          placeholder={replyingToUser ? 
                            (user && user.name === replyingToUser ? 
                              `Write your reply to your own ${replyingToType || 'comment'}...` : 
                              `Write your reply to @${replyingToUser}...`) : 
                            'Write your reply...'
                          }
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex flex-col sm:flex-row gap-2 mt-3 animate-in slide-in-from-bottom-2 fade-in duration-200 delay-100">
                          <button 
                            className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg text-sm sm:text-base"
                            onClick={() => handleReply(review)}
                          >
                            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                            Submit Reply
                          </button>
                          <button 
                            className="px-3 sm:px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 text-sm sm:text-base"
                            onClick={() => {setReplyingTo(null); setReplyText('');}}
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edit Form */}
                    {editingReview === review.created_at + (review.course_code || '') && (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
                        <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">Edit Review</h4>
                        
                        {/* Rating selector for main reviews only */}
                        {!review.parent_faculty_initial && (
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                              Rating
                            </label>
                            <select 
                              value={editRating} 
                              onChange={e => setEditRating(Number(e.target.value))} 
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              required
                            >
                              <option value={0}>Select Rating</option>
                              {[1,2,3,4,5].map(star => (
                                <option key={star} value={star}>{star} Stars</option>
                              ))}
                            </select>
                          </div>
                        )}
                        
                        <textarea
                          className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                          placeholder="Edit your review..."
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          rows={4}
                        />
                        <div className="flex gap-2 mt-3">
                          <button 
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center gap-2"
                            onClick={() => handleEditReview(review)}
                          >
                            <Send className="h-4 w-4" />
                            Update Review
                          </button>
                          <button 
                            className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg transition-all flex items-center gap-2"
                            onClick={() => {setEditingReview(null); setEditText(''); setEditRating(0);}}
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Replies - Facebook Style Threading with "View More" */}
                    {review.replies && review.replies.length > 0 && (
                      <div className="mt-6 pl-6 border-l-2 border-blue-200 dark:border-blue-700 space-y-4 relative">
                        {/* Visual connection line */}
                        <div className="absolute -left-[2px] top-0 w-4 h-4 bg-blue-200 dark:bg-blue-700 rounded-full border-4 border-white dark:border-slate-800"></div>
                        
                        {/* Facebook-style reply pagination */}
                        {(() => {
                          const reviewKey = review.created_at + (review.course_code || '');
                          const showAll = showAllReplies[reviewKey] || false;
                          const REPLIES_TO_SHOW = 3; // Show first 3 replies by default
                          
                          // Sort replies based on user preference
                          const sortedReplies = [...review.replies].sort((a, b) => {
                            if (sortBy === 'upvoted') {
                              const aNetVotes = (a.upvotes || 0) - (a.downvotes || 0);
                              const bNetVotes = (b.upvotes || 0) - (b.downvotes || 0);
                              return bNetVotes - aNetVotes;
                            } else {
                              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                            }
                          });
                          
                          const repliesToDisplay = showAll ? sortedReplies : sortedReplies.slice(0, REPLIES_TO_SHOW);
                          const hasMoreReplies = sortedReplies.length > REPLIES_TO_SHOW;
                          
                          return (
                            <>
                              {/* Show "View previous replies" button if there are hidden replies */}
                              {hasMoreReplies && !showAll && (
                                <button 
                                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
                                  onClick={() => setShowAllReplies(prev => ({...prev, [reviewKey]: true}))}
                                >
                                  View {sortedReplies.length - REPLIES_TO_SHOW} previous replies
                                </button>
                              )}
                              
                              {repliesToDisplay.map((reply, ridx) => {
                          // FIXED: Use consistent key generation - replies always have null course_code in vote records
                          const replyVoteKey = `${reply.faculty_initial}_${reply.created_at}_null`;
                          const replyUserVote = userVotes[replyVoteKey];
                          
                          
                          const replyInfo = getReplyToInfo(reply.comment);
                          
                          return (
                            <div key={reply.created_at + (reply.course_code || '') + ridx} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                              {/* Reply User Profile */}
                              <div className="flex items-center gap-2 mb-3 animate-in slide-in-from-left-2 fade-in duration-300" style={{ animationDelay: `${ridx * 50}ms` }}>
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-green-500 via-teal-500 to-blue-600 flex items-center justify-center text-white text-xs sm:text-sm font-semibold shadow-md transition-all duration-200 hover:scale-110 hover:rotate-3">
                                  {reply.user_name ? reply.user_name.charAt(0).toUpperCase() : 'A'}
                                </div>
                                <div className="flex-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                    <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                                      {reply.user_name || 'Anonymous'}
                                    </p>
                                    {/* SIMPLE SOLUTION: Show "replied to X" using stored data */}
                                    {(() => {
                                      const { targetUser, actualComment } = parseReplyTarget(reply.comment);
                                      console.log('Reply target info:', {
                                        'targetUser': targetUser, 
                                        'actualComment': actualComment ? actualComment.substring(0, 30) + '...' : 'none',
                                        'originalComment': reply.comment.substring(0, 50) + '...'
                                      });
                                      
                                      if (targetUser && targetUser !== 'null') {
                                        // Show who they replied to (even if it's themselves)
                                        const isSelfReply = targetUser === reply.user_name;
                                        return (
                                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 animate-in slide-in-from-right-2 fade-in duration-200 delay-100">
                                            <span>replied to</span>
                                            <span className={`font-semibold ${isSelfReply ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                              {isSelfReply ? 'themselves' : `@${targetUser}`}
                                            </span>
                                            {/* Show green dot for new system */}
                                            <div className="w-1 h-1 bg-green-500 rounded-full ml-1 animate-pulse" title="Reply tracking active"></div>
                                          </div>
                                        );
                                      }
                                      
                                      // FALLBACK: For old replies without the new format, try simple logic
                                      if (!targetUser && review.replies && review.replies.length > 1) {
                                        // Find position in chronological order
                                        const chronologicalReplies = [...review.replies].sort((a, b) => 
                                          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                                        );
                                        const currentIndex = chronologicalReplies.findIndex(r => r.created_at === reply.created_at);
                                        
                                        if (currentIndex > 0) {
                                          const previousReply = chronologicalReplies[currentIndex - 1];
                                          if (previousReply.user_name !== reply.user_name) {
                                            return (
                                              <div className="flex items-center gap-1 text-xs text-orange-500 dark:text-orange-400">
                                                <span>replied to</span>
                                                <span className="font-semibold">
                                                  {previousReply.user_name}
                                                </span>
                                                {/* Show orange dot for fallback */}
                                                <div className="w-1 h-1 bg-orange-500 rounded-full ml-1" title="Fallback logic"></div>
                                              </div>
                                            );
                                          }
                                        } else {
                                          // First reply, must be to main review author
                                          if (review.user_name !== reply.user_name) {
                                            return (
                                              <div className="flex items-center gap-1 text-xs text-orange-500 dark:text-orange-400">
                                                <span>replied to</span>
                                                <span className="font-semibold">
                                                  {review.user_name}
                                                </span>
                                                {/* Show orange dot for fallback */}
                                                <div className="w-1 h-1 bg-orange-500 rounded-full ml-1" title="Fallback logic"></div>
                                              </div>
                                            );
                                          }
                                        }
                                      }
                                      
                                      return null;
                                    })()}
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(reply.created_at).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </p>
                                </div>
                              </div>
                              {/* Reply Content - Show actual comment without metadata */}
                              <div className="text-slate-700 dark:text-slate-300 mb-3">
                                {(() => {
                                  const { actualComment } = parseReplyTarget(reply.comment);
                                  return actualComment;
                                })()}
                              </div>
                              <div className="flex items-center gap-3">
                                <button 
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-all ${
                                    replyUserVote === 'upvote' 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                      : 'bg-slate-200 hover:bg-slate-300 text-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-400'
                                  }`}
                                  onClick={() => handleVote(reply, 'upvote')}
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                  {reply.upvotes || 0}
                                </button>
                                <button 
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-all ${
                                    replyUserVote === 'downvote' 
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' 
                                      : 'bg-slate-200 hover:bg-slate-300 text-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-400'
                                  }`}
                                  onClick={() => handleVote(reply, 'downvote')}
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                  {reply.downvotes || 0}
                                </button>
                                
                                {/* Edit/Delete buttons for replies - only show for user's own replies */}
                                {user && user.email === reply.user_email && (
                                  <>
                                    <button 
                                      className="flex items-center gap-1 px-2 py-1 bg-slate-200 hover:bg-blue-200 text-slate-600 hover:text-blue-600 dark:bg-slate-600 dark:hover:bg-blue-800 dark:text-slate-400 dark:hover:text-blue-300 rounded text-sm transition-all"
                                      onClick={() => {
                                        // FIXED: Use unique identifier for reply edit state
                                        const editKey = `reply_${reply.created_at}_${reply.parent_faculty_initial}`;
                                        setEditingReview(editKey);
                                        setEditText(reply.comment);
                                        setEditRating(0); // Replies don't have ratings
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                      Edit
                                    </button>
                                    
                                    <button 
                                      className="flex items-center gap-1 px-2 py-1 bg-slate-200 hover:bg-red-200 text-slate-600 hover:text-red-600 dark:bg-slate-600 dark:hover:bg-red-800 dark:text-slate-400 dark:hover:text-red-300 rounded text-sm transition-all"
                                      onClick={() => handleDeleteReview(reply)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Delete
                                    </button>
                                  </>
                                )}
                                
                                {/* Reply to reply button - Facebook style nested threading */}
                                <button 
                                  className="flex items-center gap-1 px-2 py-1 bg-slate-200 hover:bg-blue-200 text-slate-600 hover:text-blue-600 dark:bg-slate-600 dark:hover:bg-blue-800 dark:text-slate-400 dark:hover:text-blue-300 rounded text-sm transition-all"
                                  onClick={() => {
                                    const reviewKey = review.created_at + (review.course_code || '');
                                    if (replyingTo === reviewKey && replyingToUser === reply.user_name) {
                                      // Close reply form
                                      setReplyingTo(null);
                                      setReplyingToUser(null);
                                      setReplyingToType(null);
                                    } else {
                                      // Open reply form for this reply (still goes to main review but mentions the reply author)
                                      setReplyingTo(reviewKey);
                                      setReplyingToUser(reply.user_name);
                                      setReplyingToType('reply');
                                    }
                                  }}
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  Reply
                                </button>
                                
                                <button 
                                  className="flex items-center gap-1 px-2 py-1 bg-slate-200 hover:bg-red-200 text-slate-600 hover:text-red-600 dark:bg-slate-600 dark:hover:bg-red-800 dark:text-slate-400 dark:hover:text-red-300 rounded text-sm transition-all"
                                  onClick={() => handleReport(reply)}
                                >
                                  <Flag className="h-3 w-3" />
                                  Report
                                </button>
                              </div>
                              
                              {/* Edit Form for Reply */}
                              {editingReview === `reply_${reply.created_at}_${reply.parent_faculty_initial}` && (
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
                                  <h5 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Edit Reply</h5>
                                  <textarea
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-sm"
                                    placeholder="Edit your reply..."
                                    value={editText}
                                    onChange={e => setEditText(e.target.value)}
                                    rows={3}
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button 
                                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-all flex items-center gap-1"
                                      onClick={() => handleEditReview(reply)}
                                    >
                                      <Send className="h-3 w-3" />
                                      Update
                                    </button>
                                    <button 
                                      className="px-3 py-1 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded text-sm transition-all flex items-center gap-1"
                                      onClick={() => {setEditingReview(null); setEditText(''); setEditRating(0);}}
                                    >
                                      <X className="h-3 w-3" />
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* "Hide replies" button when showing all */}
                        {hasMoreReplies && showAll && (
                          <button 
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
                            onClick={() => setShowAllReplies(prev => ({...prev, [reviewKey]: false}))}
                          >
                            Hide replies
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        });
      })()}
    </div>
  )}
      </div>
    </div>
  );
};

export default FacultyDetail;
