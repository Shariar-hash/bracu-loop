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
import SecureAdminService, { 
  type AdminUser, 
  type ReportedContent,
  type ContactSubmission
} from "@/lib/secureAdminService";
import {
  Shield,
  Users,
  AlertTriangle,
  MessageSquare,
  BookOpen,
  Eye,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Reply,
  Send
} from "lucide-react";

const SecureAdminDashboard = () => {
  // Auth State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [reportedContent, setReportedContent] = useState<ReportedContent[]>([]);
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([]);
  
  // Modal States
  const [selectedReport, setSelectedReport] = useState<ReportedContent | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactSubmission | null>(null);
  const [replyText, setReplyText] = useState('');
  const [banReason, setBanReason] = useState('');

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
      toast.error('Authentication failed'); // Generic message for security
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
      const reports = await SecureAdminService.getReportedContent();
      setReportedContent(reports);
    } catch (error) {
      console.error('Failed to load reported content');
      toast.error('Failed to load reported content');
    }
  };

  const loadContactSubmissions = async () => {
    try {
      const submissions = await SecureAdminService.getContactSubmissions();
      setContactSubmissions(submissions);
    } catch (error) {
      console.error('Failed to load contact submissions');
      toast.error('Failed to load contact submissions');
    }
  };

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadReportedContent();
      loadContactSubmissions();
    }
  }, [isAuthenticated]);

  // Report Management Functions
  const handleViewReport = (report: ReportedContent) => {
    setSelectedReport(report);
    setReportModalOpen(true);
  };

  const handleReportAction = async (reportId: string, action: string, notes?: string) => {
    try {
      await SecureAdminService.updateReportStatus(reportId, action, notes);
      
      if (action === 'resolved' && selectedReport) {
        // If resolving with deletion
        const deleted = await SecureAdminService.deleteActualContent(
          selectedReport.content_type,
          selectedReport.content_id
        );
        
        if (deleted) {
          toast.success('Content deleted and report resolved');
        } else {
          toast.warning('Report resolved but content deletion failed');
        }
      } else {
        toast.success(`Report ${action}`);
      }
      
      setReportModalOpen(false);
      loadReportedContent();
    } catch (error) {
      console.error('Report action failed');
      toast.error('Failed to update report');
    }
  };

  const handleBanUser = async (reportId: string, userEmail: string) => {
    if (!banReason.trim()) {
      toast.error('Please provide a reason for banning');
      return;
    }

    try {
      await SecureAdminService.banUser(userEmail, banReason, adminUser?.full_name || 'Admin');
      await SecureAdminService.updateReportStatus(reportId, 'resolved', `User banned: ${banReason}`);
      
      toast.success('User banned successfully');
      setReportModalOpen(false);
      setBanReason('');
      loadReportedContent();
    } catch (error) {
      console.error('Ban user failed');
      toast.error('Failed to ban user');
    }
  };

  // Contact Form Management Functions
  const handleViewContact = (contact: ContactSubmission) => {
    setSelectedContact(contact);
    setContactModalOpen(true);
    setReplyText('');
  };

  const handleReplyToContact = async () => {
    if (!selectedContact || !replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    try {
      await SecureAdminService.replyToContact(
        selectedContact.id,
        replyText,
        adminUser?.full_name || 'Admin'
      );

      toast.success('Reply sent successfully');
      setContactModalOpen(false);
      setReplyText('');
      loadContactSubmissions();
    } catch (error) {
      console.error('Reply failed');
      toast.error('Failed to send reply');
    }
  };

  // Statistics
  const stats = {
    totalReports: reportedContent.length,
    pendingReports: reportedContent.filter(r => r.status === 'pending').length,
    totalContacts: contactSubmissions.length,
    unreadContacts: contactSubmissions.filter(c => c.status === 'pending').length
  };

  // LOGIN SCREEN - SECURE, NO PASSWORD EXPOSURE
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Admin Portal</CardTitle>
            <p className="text-gray-600">Secure authentication required</p>
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
                  autoComplete="username"
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
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome, {adminUser?.full_name}</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalReports}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Reports</p>
                  <p className="text-2xl font-bold text-red-600">{stats.pendingReports}</p>
                </div>
                <Clock className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Contact Forms</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalContacts}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unread Messages</p>
                  <p className="text-2xl font-bold text-green-600">{stats.unreadContacts}</p>
                </div>
                <Mail className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Reported Content
              {stats.pendingReports > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.pendingReports}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Contact Forms
              {stats.unreadContacts > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.unreadContacts}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Reported Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportedContent.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={report.priority === 'high' ? 'destructive' : 
                                          report.priority === 'medium' ? 'default' : 'secondary'}>
                              {report.priority} priority
                            </Badge>
                            <Badge variant="outline">{report.content_type}</Badge>
                            <Badge variant={report.status === 'pending' ? 'destructive' : 'secondary'}>
                              {report.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Reported by: {report.reporter_name || report.reporter_email}
                          </p>
                          <p className="text-sm text-gray-800">
                            Reason: {report.reason} - {report.description}
                          </p>
                          
                          {/* Show actual content preview */}
                          {report.content_snapshot?.actual_content && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                              <p className="text-sm font-medium text-red-800 mb-1">Reported Content:</p>
                              <p className="text-sm text-red-700 bg-red-100 p-2 rounded">
                                {report.content_snapshot.actual_content.substring(0, 100)}
                                {report.content_snapshot.actual_content.length > 100 && '...'}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewReport(report)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {reportedContent.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No reported content found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Forms Tab */}
          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <CardTitle>Contact Form Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contactSubmissions.map((contact) => (
                    <div key={contact.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={contact.status === 'pending' ? 'destructive' : 
                                          contact.status === 'replied' ? 'default' : 'secondary'}>
                              {contact.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(contact.submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1">{contact.subject}</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            From: {contact.student_name} ({contact.student_email})
                          </p>
                          <p className="text-sm text-gray-800">
                            {contact.message.substring(0, 150)}
                            {contact.message.length > 150 && '...'}
                          </p>
                          
                          {contact.admin_reply && (
                            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                              <p className="text-sm font-medium text-green-800 mb-1">
                                Replied by {contact.replied_by} on {new Date(contact.replied_at!).toLocaleDateString()}:
                              </p>
                              <p className="text-sm text-green-700">{contact.admin_reply}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewContact(contact)}
                          >
                            <Reply className="w-4 h-4 mr-1" />
                            {contact.status === 'pending' ? 'Reply' : 'View'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {contactSubmissions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No contact form submissions found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Report Details Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Content Type</Label>
                  <p className="text-sm">{selectedReport.content_type}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <p className="text-sm">{selectedReport.status}</p>
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
              
              <div>
                <Label>Reason & Description</Label>
                <p className="text-sm">{selectedReport.reason}</p>
                {selectedReport.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedReport.description}</p>
                )}
              </div>

              {selectedReport.content_snapshot?.actual_content && (
                <div>
                  <Label>Reported Content</Label>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-700">{selectedReport.content_snapshot.actual_content}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label>Actions</Label>
                <div className="flex gap-2">
                  <Button 
                    variant="destructive"
                    onClick={() => handleReportAction(selectedReport.id, 'resolved', 'Content deleted')}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Content
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => handleReportAction(selectedReport.id, 'dismissed', 'No action needed')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Dismiss Report
                  </Button>
                </div>

                {selectedReport.content_snapshot?.author_email && (
                  <div>
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Reason for banning user"
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                      />
                      <Button 
                        variant="destructive"
                        onClick={() => handleBanUser(selectedReport.id, selectedReport.content_snapshot.author_email)}
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Ban User
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Reply Modal */}
      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contact Form Details</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Student Name</Label>
                  <p className="text-sm">{selectedContact.student_name}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm">{selectedContact.student_email}</p>
                </div>
                <div>
                  <Label>Subject</Label>
                  <p className="text-sm">{selectedContact.subject}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <p className="text-sm">{selectedContact.status}</p>
                </div>
              </div>
              
              <div>
                <Label>Message</Label>
                <div className="mt-2 p-3 bg-gray-50 border rounded">
                  <p className="text-sm">{selectedContact.message}</p>
                </div>
              </div>

              {selectedContact.admin_reply && (
                <div>
                  <Label>Previous Reply</Label>
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm">{selectedContact.admin_reply}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Replied by {selectedContact.replied_by} on {new Date(selectedContact.replied_at!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {selectedContact.status === 'pending' && (
                <div>
                  <Label>Reply to Student</Label>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply here..."
                    rows={4}
                    className="mt-2"
                  />
                  <Button 
                    onClick={handleReplyToContact}
                    className="mt-2"
                    disabled={!replyText.trim()}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SecureAdminDashboard;