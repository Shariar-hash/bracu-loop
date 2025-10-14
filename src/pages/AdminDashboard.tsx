import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import AdminService, {
  type Course,
  type Faculty,
  type StudentMessage,
  type BannedUser
} from "@/lib/adminService";
import SecureAdminService, { 
  type AdminUser, 
  type ReportedContent,
  type ContactSubmission
} from "@/lib/secureAdminService";
import { testDatabaseConnection } from "@/lib/testDatabase";
import {
  Shield,
  Users,
  AlertTriangle,
  MessageSquare,
  BookOpen,
  GraduationCap,
  BarChart3,
  Settings,
  Eye,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Edit,
  Mail,
  TrendingUp,
  Activity,
  Download
} from "lucide-react";

// Using imported types from AdminService

const AdminDashboard = () => {
  // Auth State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  
  // Data States
  const [reportedContent, setReportedContent] = useState<ReportedContent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([]);
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [courseFaculty, setCourseFaculty] = useState<Record<string, Faculty[]>>({});
  const [dashboardStats, setDashboardStats] = useState({
    pendingReports: 0,
    unreadMessages: 0,
    totalCourses: 0,
    activeFaculty: 0,
    bannedUsers: 0
  });
  const [loading, setLoading] = useState(false);
  
  // UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddFaculty, setShowAddFaculty] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportedContent | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<StudentMessage | null>(null);
  const [replyContent, setReplyContent] = useState('');
  
  // Form States
  const [courseForm, setCourseForm] = useState({
    course_code: '',
    course_name: '',
    credits: 3.0,
    department: 'CSE',
    assigned_faculty: [] as string[]
  });
  
  const [facultyForm, setFacultyForm] = useState({
    faculty_initial: '',
    full_name: '',
    department: 'CSE',
    designation: '',
    email: '',
    assigned_courses: [] as string[]
  });

  // Edit States
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [showEditFaculty, setShowEditFaculty] = useState(false);

  // Check for existing session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await SecureAdminService.validateSession();
        if (user) {
          setAdminUser(user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Session validation failed');
      }
    };

    checkSession();
  }, []);

  // Authentication Functions - SECURE VERSION
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await SecureAdminService.authenticateAdmin(
        loginForm.username, 
        loginForm.password
      );
      
      if (result) {
        setAdminUser(result.user);
        setIsAuthenticated(true);
        toast.success(`Welcome back, ${result.user.full_name}!`);
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error'); // No sensitive data in logs
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await SecureAdminService.logout();
    setAdminUser(null);
    setIsAuthenticated(false);
    setLoginForm({ username: '', password: '' });
    toast.success('Logged out successfully');
  };

  // Data Loading Functions
  const loadReportedContent = async () => {
    try {
      console.log('🔄 Loading reported content...');
      const reports = await AdminService.getReportedContent();
      console.log('📊 Loaded reports:', reports.length, 'reports found');
      console.log('📝 Sample report:', reports[0]);
      setReportedContent(reports);
      
      if (reports.length === 0) {
        toast.info('No reports found', {
          description: 'Users can report content from Faculty Reviews, Suggestions, and Questions pages'
        });
      } else {
        console.log('✅ Successfully loaded', reports.length, 'reports');
      }
    } catch (error) {
      console.error('❌ Error loading reports:', error);
      toast.error('Failed to load reported content', {
        description: error.message || 'Database connection issue'
      });
    }
  };

  const loadCourses = async () => {
    try {
      const courses = await AdminService.getCourses();
      setCourses(courses);
      
      // Load faculty assignments for courses
      if (courses.length > 0) {
        const facultyMappings: Record<string, Faculty[]> = {};
        
        for (const course of courses) {
          try {
            const courseFaculty = await AdminService.getCourseFaculty(course.course_code);
            facultyMappings[course.course_code] = courseFaculty;
          } catch (error) {
            console.error(`Error loading faculty for course ${course.course_code}:`, error);
            facultyMappings[course.course_code] = [];
          }
        }
        
        setCourseFaculty(facultyMappings);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const loadFaculty = async () => {
    try {
      console.log('🔍 AdminDashboard.loadFaculty - Starting...');
      
      // Test database connection first
      const dbTest = await testDatabaseConnection();
      console.log('🔍 Database test result:', dbTest);
      
      if (!dbTest.success) {
        console.error('❌ Database connection test failed:', dbTest.error);
        toast.error(`Database connection failed: ${dbTest.error?.message || 'Unknown error'}`);
        return;
      }
      
      console.log('✅ Database connection test passed, fetching faculty...');
      const faculty = await AdminService.getFaculty();
      console.log('✅ Faculty loaded successfully:', faculty?.length || 0, 'records');
      setFaculty(faculty);
      
      if (faculty.length === 0) {
        toast.info('No faculty records found. Add some faculty to get started.');
      }
    } catch (error) {
      console.error('❌ Error loading faculty:', error);
      toast.error(`Failed to load faculty: ${error?.message || 'Unknown error'}`);
    }
  };

  const loadMessages = async () => {
    try {
      const messages = await AdminService.getStudentMessages();
      setMessages(messages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const loadDashboardStats = async () => {
    try {
      const stats = await AdminService.getDashboardStats();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    }
  };

  const loadBannedUsers = async () => {
    try {
      const users = await AdminService.getBannedUsers();
      setBannedUsers(users);
    } catch (error) {
      console.error('Error loading banned users:', error);
      toast.error('Failed to load banned users');
    }
  };

  const loadCourseFaculty = async () => {
    try {
      const facultyMappings: Record<string, Faculty[]> = {};
      
      // Load faculty for each course
      for (const course of courses) {
        try {
          const courseFaculty = await AdminService.getCourseFaculty(course.course_code);
          facultyMappings[course.course_code] = courseFaculty;
        } catch (error) {
          console.error(`Error loading faculty for course ${course.course_code}:`, error);
          facultyMappings[course.course_code] = [];
        }
      }
      
      setCourseFaculty(facultyMappings);
    } catch (error) {
      console.error('Error loading course faculty mappings:', error);
      toast.error('Failed to load course faculty assignments');
    }
  };

  const unbanUser = async (bannedUser: BannedUser) => {
    try {
      await AdminService.unbanUser(bannedUser.id);
      await loadBannedUsers(); // Reload the banned users list
      toast.success(`User ${bannedUser.user_email} has been unbanned`);
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error(`Failed to unban user: ${error.message || 'Unknown error'}`);
    }
  };

  // Admin Actions
  const handleReportAction = async (reportId: string, action: string, notes?: string) => {
    try {
      // Update the report status
      await AdminService.updateReportStatus(reportId, 'resolved', action, notes);
      
      // If action is content removal, delete the actual content from the website
      if (action === 'content_removed' && selectedReport) {
        try {
          const deleted = await AdminService.deleteActualContent(
            selectedReport.content_type,
            selectedReport.content_id
          );
          
          if (deleted) {
            toast.success(`${selectedReport.content_type} deleted successfully`);
          } else {
            toast.warning('Content may have already been deleted');
          }
        } catch (error) {
          console.error('Error deleting content:', error);
          toast.error('Failed to delete content: ' + error.message);
        }
      }

      // If action is user suspension/ban, add user to banned list
      if ((action === 'user_suspended' || action === 'user_banned') && selectedReport) {
        console.log('Admin banning/suspending user:', {
          reportId,
          userEmail: selectedReport.content_snapshot?.author_email || selectedReport.reporter_email,
          userName: selectedReport.content_snapshot?.author_name || selectedReport.reporter_name,
          reason: selectedReport.reason
        });

        // Extract user info from the report content snapshot
        const userEmail = selectedReport.content_snapshot?.author_email || 
                         selectedReport.content_snapshot?.user_email ||
                         selectedReport.content_snapshot?.uploaded_by_email ||
                         selectedReport.content_snapshot?.uploader_email ||
                         selectedReport.reporter_email;
        const userName = selectedReport.content_snapshot?.author_name || 
                        selectedReport.content_snapshot?.user_name ||
                        selectedReport.content_snapshot?.uploaded_by_name ||
                        selectedReport.content_snapshot?.uploader_name ||
                        selectedReport.reporter_name;

        if (userEmail && adminUser) {
          await AdminService.banUser({
            user_email: userEmail,
            user_name: userName || 'Unknown User',
            reason: `${selectedReport.reason}: ${notes || 'Admin action from report'}`,
            banned_by: adminUser.username,
            ban_duration: action === 'user_suspended' ? '30 days' : 'permanent',
            is_active: true
          });
          
          console.log('✅ User successfully banned/suspended');
        } else {
          console.warn('⚠️ Could not extract user information for banning');
        }
      }
      
      // Log the admin activity
      if (adminUser) {
        let logMessage = `Resolved report with action: ${action}`;
        if (action === 'content_removed') {
          logMessage += ' - Actual content deleted from website';
        } else if (action === 'user_suspended') {
          logMessage += ' - User suspended for 30 days';
        } else if (action === 'user_banned') {
          logMessage += ' - User permanently banned';
        }
        
        await AdminService.logActivity(
          adminUser.id,
          'report_resolved',
          'reported_content',
          reportId,
          logMessage
        );
      }
      
      // Reload the reports
      await loadReportedContent();
      setSelectedReport(null);
      
      let successMessage = `Report ${action} successfully`;
      if (action === 'content_removed') {
        successMessage += ' - Content removed from website';
      } else if (action === 'user_suspended') {
        successMessage += ' - User suspended for 30 days';
      } else if (action === 'user_banned') {
        successMessage += ' - User permanently banned';
      }
      
      toast.success(successMessage);
    } catch (error) {
      console.error('Error handling report:', error);
      toast.error('Failed to process report');
    }
  };

  const addCourse = async () => {
    try {
      console.log('📚 Adding course with data:', courseForm);
      
      const newCourse = await AdminService.addCourse({
        course_code: courseForm.course_code,
        course_name: courseForm.course_name,
        credits: courseForm.credits,
        department: courseForm.department,
        assigned_faculty: courseForm.assigned_faculty
      });
      
      console.log('✅ Course added successfully:', newCourse);
      
      // Log the admin activity
      if (adminUser) {
        await AdminService.logActivity(
          adminUser.id,
          'course_added',
          'course',
          newCourse.id,
          `Added course: ${newCourse.course_code} - ${newCourse.course_name}`
        );
      }
      
      // Reload courses list to get updated data
      await loadCourses();
      
      setCourseForm({ course_code: '', course_name: '', credits: 3.0, department: 'CSE', assigned_faculty: [] });
      setShowAddCourse(false);
      toast.success('Course added successfully');
    } catch (error) {
      console.error('❌ Error adding course:', error);
      toast.error(`Failed to add course: ${error.message || 'Unknown error'}`);
    }
  };

  const addFaculty = async () => {
    try {
      console.log('🏫 Adding faculty with data:', facultyForm);
      
      // Check if email already exists
      const { data: existingFaculty, error: checkError } = await supabase
        .from('faculties')
        .select('faculty_initial, full_name, email')
        .eq('email', facultyForm.email)
        .limit(1);
        
      if (existingFaculty && existingFaculty.length > 0) {
        toast.error(`Email "${facultyForm.email}" is already used by faculty ${existingFaculty[0].faculty_initial} (${existingFaculty[0].full_name})`);
        return;
      }
      
      const newFaculty = await AdminService.addFaculty({
        faculty_initial: facultyForm.faculty_initial,
        full_name: facultyForm.full_name,
        department: facultyForm.department,
        designation: facultyForm.designation,
        email: facultyForm.email,
        assigned_courses: facultyForm.assigned_courses,
        is_active: true
      });
      
      console.log('✅ Faculty added successfully:', newFaculty);
      
      // Log the admin activity
      if (adminUser) {
        await AdminService.logActivity(
          adminUser.id,
          'faculty_added',
          'faculty',
          newFaculty.id,
          `Added faculty: ${newFaculty.faculty_initial} - ${newFaculty.full_name}`
        );
      }
      
      // Reload faculty list to get updated data
      await loadFaculty();
      
      setFacultyForm({
        faculty_initial: '',
        full_name: '',
        department: 'CSE',
        designation: '',
        email: '',
        assigned_courses: []
      });
      setShowAddFaculty(false);
      toast.success('Faculty added successfully');
    } catch (error) {
      console.error('❌ Error adding faculty:', error);
      toast.error(`Failed to add faculty: ${error.message || 'Unknown error'}`);
    }
  };

  // Edit Functions
  const editCourse = async (course: Course) => {
    setEditingCourse(course);
    
    // Load currently assigned faculty for this course
    let currentlyAssignedFaculty: string[] = [];
    try {
      const courseFaculty = await AdminService.getCourseFaculty(course.course_code);
      currentlyAssignedFaculty = courseFaculty.map(f => f.id);
    } catch (error) {
      console.error('Error loading assigned faculty for course edit:', error);
    }
    
    setCourseForm({
      course_code: course.course_code,
      course_name: course.course_name,
      credits: course.credits || 3.0,
      department: course.department || 'CSE',
      assigned_faculty: currentlyAssignedFaculty
    });
    setShowEditCourse(true);
  };

  const editFaculty = (faculty: Faculty) => {
    setEditingFaculty(faculty);
    setFacultyForm({
      faculty_initial: faculty.faculty_initial,
      full_name: faculty.full_name,
      department: faculty.department || 'CSE',
      designation: faculty.designation || '',
      email: faculty.email || '',
      assigned_courses: faculty.courses_taught || []
    });
    setShowEditFaculty(true);
  };

  const updateCourse = async () => {
    if (!editingCourse) return;
    
    try {
      await AdminService.updateCourse(editingCourse.id, {
        course_code: courseForm.course_code,
        course_name: courseForm.course_name,
        credits: courseForm.credits,
        department: courseForm.department,
        assigned_faculty: courseForm.assigned_faculty
      });

      // Reload courses list to get updated data
      await loadCourses();
      
      setCourseForm({ course_code: '', course_name: '', credits: 3.0, department: 'CSE', assigned_faculty: [] });
      setEditingCourse(null);
      setShowEditCourse(false);
      toast.success('Course updated successfully');
    } catch (error) {
      console.error('❌ Error updating course:', error);
      toast.error(`Failed to update course: ${error.message || 'Unknown error'}`);
    }
  };

  const updateFaculty = async () => {
    if (!editingFaculty) return;
    
    try {
      await AdminService.updateFaculty(editingFaculty.id, {
        faculty_initial: facultyForm.faculty_initial,
        full_name: facultyForm.full_name,
        department: facultyForm.department,
        designation: facultyForm.designation,
        email: facultyForm.email,
        assigned_courses: facultyForm.assigned_courses
      });

      // Reload faculty list to get updated data
      await loadFaculty();
      
      setFacultyForm({
        faculty_initial: '',
        full_name: '',
        department: 'CSE',
        designation: '',
        email: '',
        assigned_courses: []
      });
      setEditingFaculty(null);
      setShowEditFaculty(false);
      toast.success('Faculty updated successfully');
    } catch (error) {
      console.error('❌ Error updating faculty:', error);
      toast.error(`Failed to update faculty: ${error.message || 'Unknown error'}`);
    }
  };

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadReportedContent();
      loadCourses();
      loadFaculty();
      loadMessages();
      loadDashboardStats();
      loadBannedUsers();
    }
  }, [isAuthenticated]);

  // Update banned users count in dashboard stats
  useEffect(() => {
    setDashboardStats(prev => ({
      ...prev,
      bannedUsers: bannedUsers.length
    }));
  }, [bannedUsers]);

  // Message Reply Functions
  const handleReplyToMessage = (message: StudentMessage) => {
    setSelectedMessage(message);
    setReplyContent('');
    setShowReplyModal(true);
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyContent.trim() || !adminUser) {
      toast.error('Please enter a reply message');
      return;
    }

    try {
      console.log('📧 Sending reply to message:', selectedMessage.id);
      
      // Update the message with admin response
      const { error } = await supabase
        .from('admin_student_messages')
        .update({
          admin_response: replyContent.trim(),
          responded_by: adminUser.id,
          status: 'replied',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMessage.id);

      if (error) {
        console.error('❌ Error sending reply:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Log the admin activity
      await AdminService.logActivity(
        adminUser.id,
        'message_replied',
        'student_message',
        selectedMessage.id,
        `Replied to message from ${selectedMessage.student_name}: "${selectedMessage.subject}"`
      );

      // Reload messages
      await loadMessages();
      
      // Close modal
      setShowReplyModal(false);
      setSelectedMessage(null);
      setReplyContent('');
      
      toast.success('Reply sent successfully', {
        description: `Response sent to ${selectedMessage.student_name}`
      });
      
    } catch (error) {
      console.error('❌ Error in sendReply:', error);
      toast.error('Failed to send reply', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const markMessageResolved = async (message: StudentMessage) => {
    if (!adminUser) return;

    try {
      console.log('✅ Marking message as resolved:', message.id);
      
      const { error } = await supabase
        .from('admin_student_messages')
        .update({
          status: 'resolved',
          updated_at: new Date().toISOString()
        })
        .eq('id', message.id);

      if (error) {
        console.error('❌ Error marking message as resolved:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Log the admin activity
      await AdminService.logActivity(
        adminUser.id,
        'message_resolved',
        'student_message',
        message.id,
        `Resolved message from ${message.student_name}: "${message.subject}"`
      );

      // Reload messages
      await loadMessages();
      
      toast.success('Message marked as resolved');
      
    } catch (error) {
      console.error('❌ Error in markMessageResolved:', error);
      toast.error('Failed to resolve message', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Admin Dashboard
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold">BRACU Loop Admin</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {adminUser?.full_name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 h-screen sticky top-0 border-r">
          <nav className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical">
              <TabsList className="grid w-full grid-cols-1 h-auto gap-2">
                <TabsTrigger value="dashboard" className="justify-start gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="reports" className="justify-start gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Reported Content
                  {reportedContent.filter(r => r.status === 'pending').length > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {reportedContent.filter(r => r.status === 'pending').length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="users" className="justify-start gap-2">
                  <Users className="h-4 w-4" />
                  User Management
                </TabsTrigger>
                <TabsTrigger value="courses" className="justify-start gap-2">
                  <BookOpen className="h-4 w-4" />
                  Course Management
                </TabsTrigger>
                <TabsTrigger value="faculty" className="justify-start gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Faculty Management
                </TabsTrigger>
                <TabsTrigger value="messages" className="justify-start gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Student Messages
                  {messages.filter(m => m.status === 'unread').length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {messages.filter(m => m.status === 'unread').length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="settings" className="justify-start gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Dashboard Overview */}
            <TabsContent value="dashboard" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
                
                {/* Debug Section */}
                <Card className="mb-6 border-orange-200">
                  <CardHeader>
                    <CardTitle className="text-orange-600">🔧 Debug Tools</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          const result = await testDatabaseConnection();
                          console.log('Manual DB test result:', result);
                          if (result.success) {
                            toast.success(`Database OK - Faculties: ${result.facultiesCount}, Courses: ${result.coursesCount}`);
                          } else {
                            toast.error(`Database Error: ${result.error?.message}`);
                          }
                        }}
                      >
                        Test Database Connection
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          loadFaculty();
                          toast.info('Retrying faculty load...');
                        }}
                      >
                        Retry Load Faculty
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Current Status: {faculty.length} faculties, {courses.length} courses loaded
                    </p>
                  </CardContent>
                </Card>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                        <div>
                          <p className="text-2xl font-bold">{dashboardStats.pendingReports}</p>
                          <p className="text-sm text-muted-foreground">Pending Reports</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{dashboardStats.unreadMessages}</p>
                          <p className="text-sm text-muted-foreground">Unread Messages</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-8 w-8 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">{dashboardStats.totalCourses}</p>
                          <p className="text-sm text-muted-foreground">Total Courses</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-8 w-8 text-purple-500" />
                        <div>
                          <p className="text-2xl font-bold">{dashboardStats.activeFaculty}</p>
                          <p className="text-sm text-muted-foreground">Active Faculty</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reportedContent.slice(0, 5).map((report) => (
                        <div key={report.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">New report: {report.reason}</p>
                            <p className="text-xs text-muted-foreground">
                              {report.content_type} reported by {report.reporter_name}
                            </p>
                          </div>
                          <Badge variant={report.priority === 'high' ? 'destructive' : 'secondary'}>
                            {report.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Reported Content */}
            <TabsContent value="reports" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Reported Content</h2>
                <Badge variant="destructive">
                  {reportedContent.filter(r => r.status === 'pending').length} Pending
                </Badge>
              </div>

              <div className="grid gap-4">
                {reportedContent.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{report.content_type}</Badge>
                            <Badge variant={
                              report.priority === 'critical' ? 'destructive' :
                              report.priority === 'high' ? 'destructive' :
                              report.priority === 'medium' ? 'secondary' : 'outline'
                            }>
                              {report.priority}
                            </Badge>
                            <Badge variant={
                              report.status === 'pending' ? 'destructive' :
                              report.status === 'resolved' ? 'default' : 'secondary'
                            }>
                              {report.status}
                            </Badge>
                          </div>
                          
                          <h3 className="font-semibold mb-2">Reason: {report.reason}</h3>
                          {report.description && (
                            <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                          )}
                          
                          <div className="text-xs text-muted-foreground">
                            Reported by: {report.reporter_name || report.reporter_email} • 
                            {new Date(report.created_at).toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedReport(report)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Course Management */}
            <TabsContent value="courses" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Course Management</h2>
                <Button onClick={() => setShowAddCourse(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </Button>
              </div>

              <div className="grid gap-4">
                {courses.map((course) => (
                  <Card key={course.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{course.course_code}</h3>
                          <p className="text-muted-foreground">{course.course_name}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Credits: {course.credits}</span>
                            <span>Department: {course.department}</span>
                          </div>
                          {/* Show assigned faculty */}
                          <div className="mt-2">
                            {courseFaculty[course.course_code] && courseFaculty[course.course_code].length > 0 ? (
                              <div className="text-sm">
                                <span className="font-medium text-blue-600">Faculty: </span>
                                <span className="text-muted-foreground">
                                  {(() => {
                                    const facultyList = courseFaculty[course.course_code];
                                    const displayList = facultyList.slice(0, 3); // Show only first 3
                                    const displayText = displayList
                                      .map(faculty => `${faculty.faculty_initial} (${faculty.full_name})`)
                                      .join(', ');
                                    
                                    if (facultyList.length > 3) {
                                      return `${displayText} and ${facultyList.length - 3} more...`;
                                    }
                                    return displayText;
                                  })()}
                                </span>
                              </div>
                            ) : (
                              <div className="text-sm text-amber-600">
                                <span className="font-medium">⚠️ No faculty assigned</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editCourse(course)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => AdminService.deleteCourse(course.id).then(() => { loadCourses(); toast.success('Course deleted'); }).catch(err => toast.error('Failed to delete course'))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Faculty Management */}
            <TabsContent value="faculty" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Faculty Management</h2>
                <Button onClick={() => setShowAddFaculty(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Faculty
                </Button>
              </div>

              <div className="grid gap-4">
                {faculty.map((fac) => (
                  <Card key={fac.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{fac.faculty_initial} - {fac.full_name}</h3>
                          <p className="text-muted-foreground">{fac.designation} • {fac.department}</p>
                          {fac.courses_taught && fac.courses_taught.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {fac.courses_taught.map(course => (
                                <Badge key={course} variant="outline">{course}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editFaculty(fac)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => AdminService.deleteFaculty(fac.id).then(() => { loadFaculty(); toast.success('Faculty deleted'); }).catch(err => toast.error('Failed to delete faculty'))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* User Management */}
            <TabsContent value="users" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">User Management</h2>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    View All Users
                  </Button>
                  <Button variant="destructive">
                    <Ban className="h-4 w-4 mr-2" />
                    Ban User
                  </Button>
                </div>
              </div>

              <div className="grid gap-6">
                {/* Banned Users Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ban className="h-5 w-5 text-red-500" />
                      Banned Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {bannedUsers.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                          <Ban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No banned users</p>
                        </div>
                      ) : (
                        bannedUsers.map((user) => (
                          <div key={user.id} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <Ban className="h-4 w-4 text-red-500" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{user.user_email}</p>
                              <p className="text-xs text-muted-foreground">
                                Reason: {user.reason} • Banned by: {user.banned_by} • Duration: {user.ban_duration || 'Not specified'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Banned on: {new Date(user.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => unbanUser(user)}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Unban
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* User Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent User Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Users className="h-4 w-4 text-blue-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">New user registration</p>
                          <p className="text-xs text-muted-foreground">
                            newstudent@g.bracu.ac.bd registered 2 hours ago
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Suspicious activity detected</p>
                          <p className="text-xs text-muted-foreground">
                            Multiple failed login attempts for admin account
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Student Messages */}
            <TabsContent value="messages" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Student Messages</h2>
                <Badge variant="secondary">
                  {messages.filter(m => m.status === 'unread').length} Unread
                </Badge>
              </div>

              <div className="grid gap-4">
                {messages.map((message) => (
                  <Card key={message.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={message.status === 'unread' ? 'destructive' : 'secondary'}>
                              {message.status}
                            </Badge>
                            <Badge variant="outline">{message.message_type}</Badge>
                            <Badge variant={
                              message.priority === 'high' ? 'destructive' :
                              message.priority === 'medium' ? 'secondary' :
                              'default'
                            }>
                              {message.priority}
                            </Badge>
                          </div>
                          
                          <h3 className="font-semibold mb-2">{message.subject}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{message.message_content}</p>
                          
                          <div className="text-xs text-muted-foreground">
                            From: {message.student_name} ({message.student_email}) • 
                            {new Date(message.created_at).toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleReplyToMessage(message)}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Reply
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => markMessageResolved(message)}
                            disabled={message.status === 'resolved'}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {message.status === 'resolved' ? 'Resolved' : 'Resolve'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Dialogs */}
      {/* Add Course Dialog */}
      <Dialog open={showAddCourse} onOpenChange={setShowAddCourse}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="course_code">Course Code</Label>
              <Input
                id="course_code"
                value={courseForm.course_code}
                onChange={(e) => setCourseForm(prev => ({ ...prev, course_code: e.target.value }))}
                placeholder="e.g., CSE110"
              />
            </div>
            <div>
              <Label htmlFor="course_name">Course Name</Label>
              <Input
                id="course_name"
                value={courseForm.course_name}
                onChange={(e) => setCourseForm(prev => ({ ...prev, course_name: e.target.value }))}
                placeholder="e.g., Programming Language I"
              />
            </div>
            <div>
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                step="0.5"
                value={courseForm.credits}
                onChange={(e) => setCourseForm(prev => ({ ...prev, credits: parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={courseForm.department}
                onChange={(e) => setCourseForm(prev => ({ ...prev, department: e.target.value }))}
                placeholder="CSE"
              />
            </div>
            <div>
              <Label>Assigned Faculty <span className="text-muted-foreground font-normal">(Optional - can be assigned later)</span></Label>
              {faculty.length === 0 ? (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    ℹ️ No faculty available yet. You can create the course first and assign faculty later.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {faculty.map((fac) => (
                    <div key={fac.faculty_initial} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`faculty-${fac.faculty_initial}`}
                        checked={courseForm.assigned_faculty.includes(fac.faculty_initial)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setCourseForm(prev => ({
                            ...prev,
                            assigned_faculty: isChecked 
                              ? [...prev.assigned_faculty, fac.faculty_initial]
                              : prev.assigned_faculty.filter(f => f !== fac.faculty_initial)
                          }));
                        }}
                      />
                      <label htmlFor={`faculty-${fac.faculty_initial}`} className="text-sm">
                        {fac.faculty_initial} - {fac.full_name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={addCourse} className="flex-1">Add Course</Button>
              <Button variant="outline" onClick={() => setShowAddCourse(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Faculty Dialog */}
      <Dialog open={showAddFaculty} onOpenChange={setShowAddFaculty}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Faculty</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="faculty_initial">Faculty Initial</Label>
              <Input
                id="faculty_initial"
                value={facultyForm.faculty_initial}
                onChange={(e) => setFacultyForm(prev => ({ ...prev, faculty_initial: e.target.value.toUpperCase() }))}
                placeholder="e.g., ABC"
              />
            </div>
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={facultyForm.full_name}
                onChange={(e) => setFacultyForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="e.g., Dr. John Doe"
              />
            </div>
            <div>
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={facultyForm.designation}
                onChange={(e) => setFacultyForm(prev => ({ ...prev, designation: e.target.value }))}
                placeholder="e.g., Professor"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={facultyForm.email}
                onChange={(e) => setFacultyForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="e.g., john.doe@bracu.ac.bd"
              />
            </div>
            
            {/* Course Assignment for Add Faculty */}
            <div>
              <Label>Assign Courses <span className="text-muted-foreground font-normal">(Optional - can be assigned later)</span></Label>
              {courses.length === 0 ? (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    ℹ️ No courses available yet. You can create the faculty first and assign courses later.
                  </p>
                </div>
              ) : (
                <div className="mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        id={`add-course-${course.id}`}
                        checked={facultyForm.assigned_courses.includes(course.course_code)}
                        onChange={(e) => {
                          const courseCode = course.course_code;
                          const isChecked = e.target.checked;
                          const currentCourses = facultyForm.assigned_courses;
                          
                          if (isChecked) {
                            setFacultyForm({
                              ...facultyForm,
                              assigned_courses: [...currentCourses, courseCode]
                            });
                          } else {
                            setFacultyForm({
                              ...facultyForm,
                              assigned_courses: currentCourses.filter(code => code !== courseCode)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor={`add-course-${course.id}`} className="text-sm cursor-pointer">
                        {course.course_code} - {course.course_name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={addFaculty} className="flex-1">Add Faculty</Button>
              <Button variant="outline" onClick={() => setShowAddFaculty(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog open={showEditCourse} onOpenChange={setShowEditCourse}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-course-code">Course Code</Label>
              <Input
                id="edit-course-code"
                value={courseForm.course_code}
                onChange={(e) => setCourseForm({...courseForm, course_code: e.target.value})}
                placeholder="CSE470"
              />
            </div>
            <div>
              <Label htmlFor="edit-course-name">Course Name</Label>
              <Input
                id="edit-course-name"
                value={courseForm.course_name}
                onChange={(e) => setCourseForm({...courseForm, course_name: e.target.value})}
                placeholder="Software Engineering"
              />
            </div>
            <div>
              <Label htmlFor="edit-credits">Credits</Label>
              <Input
                id="edit-credits"
                type="number"
                step="0.5"
                min="0"
                max="5"
                value={courseForm.credits}
                onChange={(e) => setCourseForm({...courseForm, credits: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={courseForm.department}
                onChange={(e) => setCourseForm({...courseForm, department: e.target.value})}
                placeholder="CSE"
              />
            </div>
            
            {/* Faculty Assignment for Edit Course */}
            <div>
              <Label>Assign Faculty</Label>
              {faculty.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">No faculty available. Add faculty first.</p>
              ) : (
                <div className="mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {faculty.map((fac) => (
                    <div key={fac.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        id={`edit-faculty-${fac.id}`}
                        checked={courseForm.assigned_faculty.includes(fac.id)}
                        onChange={(e) => {
                          const facultyId = fac.id;
                          const isChecked = e.target.checked;
                          const currentFaculty = courseForm.assigned_faculty;
                          
                          if (isChecked) {
                            setCourseForm({
                              ...courseForm,
                              assigned_faculty: [...currentFaculty, facultyId]
                            });
                          } else {
                            setCourseForm({
                              ...courseForm,
                              assigned_faculty: currentFaculty.filter(id => id !== facultyId)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor={`edit-faculty-${fac.id}`} className="text-sm cursor-pointer">
                        {fac.faculty_initial} - {fac.full_name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={updateCourse} className="flex-1">Update Course</Button>
              <Button variant="outline" onClick={() => setShowEditCourse(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Faculty Dialog */}
      <Dialog open={showEditFaculty} onOpenChange={setShowEditFaculty}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Faculty</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-faculty-initial">Faculty Initial</Label>
              <Input
                id="edit-faculty-initial"
                value={facultyForm.faculty_initial}
                onChange={(e) => setFacultyForm({...facultyForm, faculty_initial: e.target.value})}
                placeholder="ABC"
              />
            </div>
            <div>
              <Label htmlFor="edit-full-name">Full Name</Label>
              <Input
                id="edit-full-name"
                value={facultyForm.full_name}
                onChange={(e) => setFacultyForm({...facultyForm, full_name: e.target.value})}
                placeholder="Dr. John Doe"
              />
            </div>
            <div>
              <Label htmlFor="edit-faculty-department">Department</Label>
              <Input
                id="edit-faculty-department"
                value={facultyForm.department}
                onChange={(e) => setFacultyForm({...facultyForm, department: e.target.value})}
                placeholder="CSE"
              />
            </div>
            <div>
              <Label htmlFor="edit-designation">Designation</Label>
              <Input
                id="edit-designation"
                value={facultyForm.designation}
                onChange={(e) => setFacultyForm({...facultyForm, designation: e.target.value})}
                placeholder="Professor"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={facultyForm.email}
                onChange={(e) => setFacultyForm({...facultyForm, email: e.target.value})}
                placeholder="john.doe@university.edu"
              />
            </div>
            
            {/* Course Assignment for Edit Faculty */}
            <div>
              <Label>Assign Courses</Label>
              {courses.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">No courses available. Add courses first.</p>
              ) : (
                <div className="mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        id={`edit-course-${course.id}`}
                        checked={facultyForm.assigned_courses.includes(course.course_code)}
                        onChange={(e) => {
                          const courseCode = course.course_code;
                          const isChecked = e.target.checked;
                          const currentCourses = facultyForm.assigned_courses;
                          
                          if (isChecked) {
                            setFacultyForm({
                              ...facultyForm,
                              assigned_courses: [...currentCourses, courseCode]
                            });
                          } else {
                            setFacultyForm({
                              ...facultyForm,
                              assigned_courses: currentCourses.filter(code => code !== courseCode)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor={`edit-course-${course.id}`} className="text-sm cursor-pointer">
                        {course.course_code} - {course.course_name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={updateFaculty} className="flex-1">Update Faculty</Button>
              <Button variant="outline" onClick={() => setShowEditFaculty(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Review Dialog */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Reported Content</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Content Type</Label>
                  <p className="text-sm">{selectedReport.content_type}</p>
                </div>
                <div>
                  <Label>Reason</Label>
                  <p className="text-sm">{selectedReport.reason}</p>
                </div>
                <div>
                  <Label>Priority</Label>
                  <p className="text-sm">{selectedReport.priority}</p>
                </div>
                <div>
                  <Label>Reporter</Label>
                  <p className="text-sm">{selectedReport.reporter_name || selectedReport.reporter_email}</p>
                </div>
              </div>
              
              {selectedReport.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm bg-muted p-2 rounded">{selectedReport.description}</p>
                </div>
              )}
              
              <div>
                <Label>Reported Content (From Website)</Label>
                <div className="bg-muted p-3 rounded border-l-4 border-l-red-500">
                  {selectedReport.content_snapshot && typeof selectedReport.content_snapshot === 'object' ? (
                    <div className="space-y-3">
                      {/* Display the actual reported content */}
                      {selectedReport.content_snapshot.actual_content ? (
                        <div>
                          <span className="font-semibold text-red-600">⚠️ Reported Content:</span>
                          <div className="mt-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {selectedReport.content_snapshot.actual_content}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                          ⚠️ Content snapshot may be incomplete. The reported content was not captured properly.
                        </div>
                      )}

                      {/* Content metadata */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {selectedReport.content_snapshot.content_type && (
                          <div>
                            <span className="font-semibold">Content Type:</span> {selectedReport.content_snapshot.content_type}
                          </div>
                        )}
                        {/* Display author/uploader info - handle different naming conventions */}
                        {(selectedReport.content_snapshot.author_name || 
                          selectedReport.content_snapshot.uploaded_by_name || 
                          selectedReport.content_snapshot.uploader_name) && (
                          <div>
                            <span className="font-semibold">
                              {selectedReport.content_type === 'question_paper' || selectedReport.content_type === 'student_note' 
                                ? 'Uploader:' : 'Author:'}
                            </span> {
                              selectedReport.content_snapshot.author_name || 
                              selectedReport.content_snapshot.uploaded_by_name || 
                              selectedReport.content_snapshot.uploader_name
                            }
                          </div>
                        )}
                        {(selectedReport.content_snapshot.author_email || 
                          selectedReport.content_snapshot.uploaded_by_email || 
                          selectedReport.content_snapshot.uploader_email) && (
                          <div>
                            <span className="font-semibold">
                              {selectedReport.content_type === 'question_paper' || selectedReport.content_type === 'student_note' 
                                ? 'Uploader Email:' : 'Author Email:'}
                            </span> {
                              selectedReport.content_snapshot.author_email || 
                              selectedReport.content_snapshot.uploaded_by_email || 
                              selectedReport.content_snapshot.uploader_email
                            }
                          </div>
                        )}
                        {selectedReport.content_snapshot.faculty_initial && (
                          <div>
                            <span className="font-semibold">Faculty:</span> {selectedReport.content_snapshot.faculty_initial}
                          </div>
                        )}
                        {selectedReport.content_snapshot.course_code && (
                          <div>
                            <span className="font-semibold">Course:</span> {selectedReport.content_snapshot.course_code}
                          </div>
                        )}
                        {selectedReport.content_snapshot.rating && (
                          <div>
                            <span className="font-semibold">Rating:</span> {selectedReport.content_snapshot.rating}/5
                          </div>
                        )}
                        {selectedReport.content_snapshot.file_name && (
                          <div>
                            <span className="font-semibold">File Name:</span> {selectedReport.content_snapshot.file_name}
                          </div>
                        )}
                        {selectedReport.content_snapshot.file_url && (
                          <div>
                            <span className="font-semibold">File URL:</span> 
                            <a 
                              href={selectedReport.content_snapshot.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-2 text-blue-600 hover:text-blue-800 underline"
                            >
                              Download File
                            </a>
                          </div>
                        )}
                        
                        {/* Question Paper specific fields */}
                        {selectedReport.content_type === 'question_paper' && (
                          <>
                            {selectedReport.content_snapshot.year && (
                              <div>
                                <span className="font-semibold">Year:</span> {selectedReport.content_snapshot.year}
                              </div>
                            )}
                            {selectedReport.content_snapshot.semester && (
                              <div>
                                <span className="font-semibold">Semester:</span> {selectedReport.content_snapshot.semester}
                              </div>
                            )}
                            {selectedReport.content_snapshot.exam_type && (
                              <div>
                                <span className="font-semibold">Exam Type:</span> {selectedReport.content_snapshot.exam_type}
                              </div>
                            )}
                            {selectedReport.content_snapshot.uploaded_at && (
                              <div>
                                <span className="font-semibold">Uploaded:</span> {new Date(selectedReport.content_snapshot.uploaded_at).toLocaleDateString()}
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Student Note specific fields */}
                        {selectedReport.content_type === 'student_note' && (
                          <>
                            {selectedReport.content_snapshot.category && (
                              <div>
                                <span className="font-semibold">Category:</span> {selectedReport.content_snapshot.category}
                              </div>
                            )}
                            {selectedReport.content_snapshot.upload_type && (
                              <div>
                                <span className="font-semibold">Upload Type:</span> {
                                  selectedReport.content_snapshot.upload_type === 'file' ? 'File Upload' : 'Shared Link'
                                }
                              </div>
                            )}
                            {selectedReport.content_snapshot.link_url && (
                              <div>
                                <span className="font-semibold">Shared Link:</span> 
                                <a 
                                  href={selectedReport.content_snapshot.link_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                                >
                                  Visit Link
                                </a>
                              </div>
                            )}
                            {selectedReport.content_snapshot.link_type && (
                              <div>
                                <span className="font-semibold">Link Type:</span> {
                                  selectedReport.content_snapshot.link_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                                }
                              </div>
                            )}
                            {selectedReport.content_snapshot.file_size && (
                              <div>
                                <span className="font-semibold">File Size:</span> {(selectedReport.content_snapshot.file_size / (1024 * 1024)).toFixed(1)} MB
                              </div>
                            )}
                            {selectedReport.content_snapshot.created_at && (
                              <div>
                                <span className="font-semibold">Created:</span> {new Date(selectedReport.content_snapshot.created_at).toLocaleDateString()}
                              </div>
                            )}
                            {selectedReport.content_snapshot.description && (
                              <div className="col-span-2">
                                <span className="font-semibold">Description:</span>
                                <p className="mt-1 text-muted-foreground">{selectedReport.content_snapshot.description}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Debug information */}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                          🔍 Technical Details (Click to expand)
                        </summary>
                        <div className="mt-2 p-2 bg-background border rounded">
                          <div className="text-xs space-y-1">
                            <div><strong>Content ID:</strong> {selectedReport.content_id}</div>
                            <div><strong>Has Content:</strong> {selectedReport.content_snapshot.actual_content ? '✅ Yes' : '❌ No'}</div>
                            <div><strong>Snapshot Keys:</strong> {Object.keys(selectedReport.content_snapshot).join(', ')}</div>
                          </div>
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-muted-foreground">Raw Snapshot Data</summary>
                            <pre className="text-xs mt-1 bg-muted p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(selectedReport.content_snapshot, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </details>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-red-600 mb-2">❌ No content snapshot available</div>
                      <pre className="text-xs overflow-auto max-h-40 bg-background p-2 rounded">
                        {JSON.stringify(selectedReport.content_snapshot, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Special handling for question papers */}
              {selectedReport.content_type === 'question_paper' && (
                <div className="border-t pt-4 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <Label className="text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-2">
                    📄 Question Paper File Access
                  </Label>
                  
                  {selectedReport.content_snapshot?.file_url ? (
                    <div className="mt-3">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          if (selectedReport.content_snapshot?.file_url) {
                            window.open(selectedReport.content_snapshot.file_url, '_blank');
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download & Review File
                      </Button>
                      <div className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                        📁 <strong>File:</strong> {selectedReport.content_snapshot.file_name || 'Unknown filename'}
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">
                        💡 Click to download and review the reported question paper before taking action
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-orange-600 dark:text-orange-400">
                      ⚠️ File URL not available - may need to check database or file storage
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleReportAction(selectedReport.id, 'no_action', 'No violation found')}
                  variant="outline"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  No Action
                </Button>
                <Button 
                  onClick={() => handleReportAction(selectedReport.id, 'content_removed', 'Content removed due to violation')}
                  variant="destructive"
                  title={`This will permanently delete the actual ${selectedReport.content_type} from the website`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete from Website
                </Button>
                <Button 
                  onClick={() => handleReportAction(selectedReport.id, 'user_suspended', 'User suspended for violation')}
                  variant="destructive"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reply to Message Modal */}
      {showReplyModal && selectedMessage && (
        <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Reply to Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Original Message */}
              <div className="bg-muted p-4 rounded-lg border-l-4 border-l-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{selectedMessage.message_type}</Badge>
                  <Badge 
                    variant={
                      selectedMessage.priority === 'high' ? 'destructive' :
                      selectedMessage.priority === 'medium' ? 'secondary' : 'default'
                    }
                  >
                    {selectedMessage.priority}
                  </Badge>
                </div>
                <h4 className="font-semibold mb-2">{selectedMessage.subject}</h4>
                <p className="text-sm mb-2">{selectedMessage.message_content}</p>
                <div className="text-xs text-muted-foreground">
                  From: {selectedMessage.student_name} ({selectedMessage.student_email}) • 
                  {new Date(selectedMessage.created_at).toLocaleString()}
                  {selectedMessage.student_id && (
                    <> • Student ID: {selectedMessage.student_id}</>
                  )}
                </div>
                {selectedMessage.admin_response && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm font-medium text-green-700 dark:text-green-300">Previous Reply:</div>
                    <p className="text-sm mt-1 text-green-600 dark:text-green-400">{selectedMessage.admin_response}</p>
                  </div>
                )}
              </div>

              {/* Reply Input */}
              <div>
                <Label htmlFor="reply-content">Your Reply</Label>
                <Textarea
                  id="reply-content"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply to the student..."
                  className="min-h-32"
                  rows={6}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  This reply will be sent via email to {selectedMessage.student_email}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={sendReply}
                  disabled={!replyContent.trim()}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reply
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowReplyModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminDashboard;