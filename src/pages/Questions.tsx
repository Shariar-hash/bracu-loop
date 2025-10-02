import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Archive, 
  BookOpen, 
  Calendar, 
  Download, 
  FileText, 
  Flag,
  Plus,
  Upload, 
  Users,
  Search,
  Trash2
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import AdminService from "@/lib/adminService";

interface Course {
  id: string;
  course_code: string;
  course_name: string;
  category_id: string;
}

interface QuestionPaper {
  id: string;
  title: string;
  course_code: string;
  course_name: string;
  semester: string;
  year: number;
  exam_type: 'midterm' | 'final' | 'quiz' | 'assignment';
  file_url: string;
  file_name: string;
  uploaded_at: string;
  uploaded_by_email: string;
  uploaded_by_name: string;
  is_approved: boolean;
  file_blob?: File; // For local blob storage
  storage_path?: string; // For Supabase storage path
}

const Questions = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [questionPapers, setQuestionPapers] = useState<QuestionPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedCourseForUpload, setSelectedCourseForUpload] = useState<string>("");
  const [isSpecificCourseUpload, setIsSpecificCourseUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const blobUrls = useRef<string[]>([]); // Track blob URLs for cleanup
  const [uploadData, setUploadData] = useState({
    title: "",
    semester: "",
    year: new Date().getFullYear(),
    exam_type: "midterm" as const,
    file: null as File | null
  });

  // Reporting state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [paperToReport, setPaperToReport] = useState<QuestionPaper | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  useEffect(() => {
    initializeData();
    
    // Cleanup function to revoke blob URLs on unmount
    return () => {
      blobUrls.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const initializeData = async () => {
    try {
      setLoading(true);
      
      // Load courses from database
      let coursesToUse = [];
      try {
        const { data: dbCourses, error } = await supabase
          .from('courses')
          .select('id, course_code, course_name')
          .eq('is_active', true)
          .order('course_code');

        if (error) {
          console.warn('Failed to load courses from database, using fallback:', error);
          // Fallback to sample courses if database fails
          coursesToUse = [
            { id: '1', course_code: 'CSE101', course_name: 'Introduction to Computer Science', category_id: '1' },
            { id: '2', course_code: 'CSE110', course_name: 'Programming Language I', category_id: '1' },
            { id: '3', course_code: 'CSE111', course_name: 'Programming Language II', category_id: '1' },
            { id: '4', course_code: 'CSE220', course_name: 'Data Structures', category_id: '1' },
            { id: '5', course_code: 'CSE221', course_name: 'Algorithms', category_id: '1' },
            { id: '6', course_code: 'CSE230', course_name: 'Discrete Mathematics', category_id: '1' },
            { id: '7', course_code: 'CSE250', course_name: 'Circuits and Electronics', category_id: '1' },
            { id: '8', course_code: 'CSE251', course_name: 'Electronic Devices and Circuits', category_id: '1' },
            { id: '9', course_code: 'CSE260', course_name: 'Digital Logic Design', category_id: '1' },
            { id: '10', course_code: 'CSE310', course_name: 'Object-Oriented Programming', category_id: '1' },
            { id: '11', course_code: 'CSE320', course_name: 'Data Communications', category_id: '1' },
            { id: '12', course_code: 'CSE321', course_name: 'Operating System', category_id: '1' },
            { id: '13', course_code: 'CSE330', course_name: 'Numerical Methods', category_id: '1' },
            { id: '14', course_code: 'CSE331', course_name: 'Automata and Computability', category_id: '1' },
            { id: '15', course_code: 'CSE340', course_name: 'Computer Architecture', category_id: '1' },
            { id: '16', course_code: 'CSE341', course_name: 'Microprocessors', category_id: '1' },
            { id: '17', course_code: 'CSE342', course_name: 'Computer Systems Engineering', category_id: '1' },
            { id: '18', course_code: 'CSE350', course_name: 'Digital Electronics and Pulse Techniques', category_id: '1' },
            { id: '19', course_code: 'CSE360', course_name: 'Computer Interfacing', category_id: '1' },
            { id: '20', course_code: 'CSE370', course_name: 'Database Systems', category_id: '1' },
            { id: '21', course_code: 'CSE371', course_name: 'Management Information Systems', category_id: '1' },
            { id: '22', course_code: 'CSE390', course_name: 'Technical Communication', category_id: '1' },
            { id: '23', course_code: 'CSE391', course_name: 'Programming for the Internet', category_id: '1' },
            { id: '24', course_code: 'CSE392', course_name: 'Signals and Systems', category_id: '1' },
            { id: '25', course_code: 'CSE410', course_name: 'Advance Programming In UNIX', category_id: '1' },
            { id: '26', course_code: 'CSE419', course_name: 'Programming Languages and Competitive Programming', category_id: '1' },
            { id: '27', course_code: 'CSE420', course_name: 'Compiler Design', category_id: '1' },
            { id: '28', course_code: 'CSE421', course_name: 'Computer Networks', category_id: '1' },
            { id: '29', course_code: 'CSE422', course_name: 'Artificial Intelligence', category_id: '1' },
            { id: '30', course_code: 'CSE423', course_name: 'Computer Graphics', category_id: '1' },
            { id: '31', course_code: 'CSE424', course_name: 'Pattern Recognition', category_id: '1' },
            { id: '32', course_code: 'CSE425', course_name: 'Neural Networks', category_id: '1' },
            { id: '33', course_code: 'CSE426', course_name: 'Advanced Algorithms', category_id: '1' },
            { id: '34', course_code: 'CSE427', course_name: 'Machine Learning', category_id: '1' },
            { id: '35', course_code: 'CSE428', course_name: 'Image Processing', category_id: '1' },
            { id: '36', course_code: 'CSE429', course_name: 'Basic Multimedia Theory', category_id: '1' },
            { id: '37', course_code: 'CSE430', course_name: 'Digital Signal Processing', category_id: '1' },
            { id: '38', course_code: 'CSE431', course_name: 'Natural Language Processing', category_id: '1' },
            { id: '39', course_code: 'CSE432', course_name: 'Speech Recognition and Synthesis', category_id: '1' },
            { id: '40', course_code: 'CSE460', course_name: 'VLSI Design', category_id: '1' },
            { id: '41', course_code: 'CSE461', course_name: 'Introduction to Robotics', category_id: '1' },
            { id: '42', course_code: 'CSE462', course_name: 'Fault-Tolerant Systems', category_id: '1' },
            { id: '43', course_code: 'CSE470', course_name: 'Software Engineering', category_id: '1' },
            { id: '44', course_code: 'CSE471', course_name: 'Systems Analysis and Design', category_id: '1' },
            { id: '45', course_code: 'CSE472', course_name: 'Human-Computer Interface', category_id: '1' },
            { id: '46', course_code: 'CSE473', course_name: 'Financial Engineering & Technology', category_id: '1' },
            { id: '47', course_code: 'CSE474', course_name: 'Simulation and Modeling', category_id: '1' },
            { id: '48', course_code: 'CSE490', course_name: 'Special Topics', category_id: '1' },
            { id: '49', course_code: 'CSE491', course_name: 'Independent Study', category_id: '1' }
          ];
        } else {
          // Use database courses with proper mapping
          coursesToUse = dbCourses.map(course => ({
            ...course,
            category_id: '1' // Add category_id for compatibility with existing interface
          }));
        }
      } catch (dbError) {
        console.error('Database error loading courses:', dbError);
        // Fallback courses if database completely fails
        coursesToUse = [
          { id: '1', course_code: 'CSE110', course_name: 'Programming Language I', category_id: '1' },
          { id: '2', course_code: 'CSE220', course_name: 'Data Structures', category_id: '1' },
          { id: '3', course_code: 'CSE370', course_name: 'Database Systems', category_id: '1' },
          { id: '4', course_code: 'CSE470', course_name: 'Software Engineering', category_id: '1' }
        ];
      }

      setCourses(coursesToUse);
      // Load existing papers from localStorage
      const savedPapers = localStorage.getItem('questionPapers');
      if (savedPapers) {
        const papers = JSON.parse(savedPapers);
        setQuestionPapers(papers);
      } else {
        setQuestionPapers([]);
      }
      
    } catch (error) {
      console.error('Error initializing data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Get papers for a specific course
  const getPapersForCourse = (courseCode: string) => {
    return questionPapers.filter(paper => paper.course_code === courseCode);
  };

  // Filter courses based on search
  const filteredCourses = courses.filter(course => 
    course.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.course_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle upload
  const handleUpload = async () => {
    if (!user) {
      toast.error('Please sign in to upload');
      return;
    }

    if (!uploadData.title || !selectedCourseForUpload || !uploadData.semester || !uploadData.file) {
      toast.error('Please fill in all required fields and select a course');
      return;
    }

    try {
      // Generate unique file name
      const fileExt = uploadData.file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `question-papers/${fileName}`;
      
      // Try to upload to Supabase Storage (if configured)
      let fileUrl = '';
      let isSupabaseUpload = false;
      
      try {
        const { data, error } = await supabase.storage
          .from('question-papers')
          .upload(filePath, uploadData.file);
          
        if (!error && data) {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('question-papers')
            .getPublicUrl(filePath);
          
          fileUrl = urlData.publicUrl;
          isSupabaseUpload = true;
          toast.success('File uploaded to cloud storage successfully!');
        } else {
          throw new Error(`Supabase upload failed: ${error?.message || 'Unknown error'}`);
        }
      } catch (supabaseError) {
        // Fallback to blob URL for local storage
        console.error('Supabase error details:', supabaseError);
        toast.error(`Supabase failed: ${supabaseError.message}`);
        fileUrl = URL.createObjectURL(uploadData.file);
        blobUrls.current.push(fileUrl);
        toast.success('File uploaded successfully!');
      }
      
      // Create new paper object
      const newPaper = {
        id: Date.now().toString(),
        title: uploadData.title,
        course_code: selectedCourseForUpload,
        course_name: courses.find(c => c.course_code === selectedCourseForUpload)?.course_name || '',
        semester: uploadData.semester,
        year: uploadData.year,
        exam_type: uploadData.exam_type,
        file_url: fileUrl,
        file_name: uploadData.file.name,
        uploaded_at: new Date().toISOString(),
        uploaded_by_email: user.email,
        uploaded_by_name: user.name || user.email,
        is_approved: true,
        file_blob: isSupabaseUpload ? undefined : uploadData.file, // Only store blob for local files
        storage_path: isSupabaseUpload ? filePath : undefined // Track Supabase path for deletion
      };

      // Add to local state AND save to localStorage for persistence
      setQuestionPapers(prev => {
        const updated = [newPaper, ...prev];
        // Save to localStorage so files survive page refresh
        localStorage.setItem('questionPapers', JSON.stringify(updated));
        return updated;
      });

      toast.success('Question paper uploaded successfully!');
      setUploadDialogOpen(false);
      setUploadData({
        title: "",
        semester: "",
        year: new Date().getFullYear(),
        exam_type: "midterm",
        file: null
      });
      setSelectedCourseForUpload("");
      setIsSpecificCourseUpload(false);
      
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Failed to upload paper');
    }
  };

  const handleDownload = (paper: QuestionPaper) => {
    try {
      // Open in new tab and trigger download
      window.open(paper.file_url, '_blank');
      
      toast.success(`Opening ${paper.file_name} in new tab...`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDelete = async (paper: QuestionPaper) => {
    if (!user) {
      toast.error('Please sign in to delete files');
      return;
    }

    // Check if user is the uploader
    if (paper.uploaded_by_email !== user.email) {
      toast.error('You can only delete files you uploaded');
      return;
    }

    // Confirm deletion
    if (window.confirm(`Are you sure you want to delete "${paper.title}"?`)) {
      try {
        // Delete from Supabase storage if it's stored there
        if (paper.storage_path) {
          const { error } = await supabase.storage
            .from('question-papers')
            .remove([paper.storage_path]);
          
          if (error) {
            console.error('Supabase delete error:', error);
            // Continue with local deletion even if cloud deletion fails
          }
        }
        
        // Revoke blob URL if it's a local blob
        if (paper.file_blob && paper.file_url.startsWith('blob:')) {
          URL.revokeObjectURL(paper.file_url);
          // Remove from tracked URLs
          blobUrls.current = blobUrls.current.filter(url => url !== paper.file_url);
        }
        
        // Remove from state AND localStorage
        setQuestionPapers(prev => {
          const newPapers = prev.filter(p => p.id !== paper.id);
          // Update localStorage after deletion
          localStorage.setItem('questionPapers', JSON.stringify(newPapers));
          return newPapers;
        });
        
        toast.success('File deleted successfully');
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete file');
      }
    }
  };

  const handleReportPaper = (paper: QuestionPaper) => {
    setPaperToReport(paper);
    setReportReason('');
    setReportDescription('');
    setReportModalOpen(true);
  };

  const submitPaperReport = async () => {
    if (!paperToReport || !user || !reportReason) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Use existing reporting system
      const reportResult = await supabase.rpc('report_content', {
        content_type_input: 'question_paper',
        content_id_input: paperToReport.id,
        reason_input: reportReason,
        description_input: reportDescription,
        reporter_email_input: user.email,
        reporter_name_input: user.name || user.email
      });

      if (reportResult.error) {
        throw reportResult.error;
      }

      setReportModalOpen(false);
      setPaperToReport(null);
      setReportReason('');
      setReportDescription('');
      
      toast.success('Question paper reported successfully', {
        description: 'Moderators will review this content shortly.'
      });
    } catch (err) {
      console.error('Report error:', err);
      toast.error('Failed to report question paper. Please try again.');
    }
  };

  const getExamTypeBadgeColor = (examType: string) => {
    switch (examType) {
      case 'midterm': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'final': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'quiz': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'assignment': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      years.push(i);
    }
    return years;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-48 bg-gray-300 rounded-lg"></div>
                ))}
              </div>
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
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                  <Archive className="h-10 w-10 text-primary" />
                  Previous Questions
                </h1>
                <p className="text-xl text-muted-foreground">
                  Access previous exam papers, quizzes, and assignments organized by course
                </p>
              </div>
              
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="flex items-center gap-2" onClick={() => {
                    setIsSpecificCourseUpload(false);
                    setSelectedCourseForUpload("");
                  }}>
                    <Upload className="h-5 w-5" />
                    Upload Paper
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Upload Question Paper</DialogTitle>
                    <DialogDescription>
                      Share a previous question paper with other students
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="course_select">Course</Label>
                      {isSpecificCourseUpload ? (
                        <div className="flex items-center p-2 border rounded-md bg-muted">
                          <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="font-medium">
                            {selectedCourseForUpload} - {courses.find(c => c.course_code === selectedCourseForUpload)?.course_name}
                          </span>
                        </div>
                      ) : (
                        <Select value={selectedCourseForUpload} onValueChange={setSelectedCourseForUpload}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses.map(course => (
                              <SelectItem key={course.id} value={course.course_code}>
                                {course.course_code} - {course.course_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Midterm Fall 2024"
                        value={uploadData.title}
                        onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="semester">Semester</Label>
                        <Select value={uploadData.semester} onValueChange={(value) => setUploadData({ ...uploadData, semester: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Spring">Spring</SelectItem>
                            <SelectItem value="Summer">Summer</SelectItem>
                            <SelectItem value="Fall">Fall</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="year">Year</Label>
                        <Select value={uploadData.year.toString()} onValueChange={(value) => setUploadData({ ...uploadData, year: parseInt(value) })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getYearOptions().map(year => (
                              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="exam_type">Exam Type</Label>
                      <Select value={uploadData.exam_type} onValueChange={(value: any) => setUploadData({ ...uploadData, exam_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="midterm">Midterm</SelectItem>
                          <SelectItem value="final">Final</SelectItem>
                          <SelectItem value="quiz">Quiz</SelectItem>
                          <SelectItem value="assignment">Assignment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="file">File (PDF, Image)</Label>
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpload}>
                        Upload
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Course Boxes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const coursePapers = getPapersForCourse(course.course_code);
              return (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {coursePapers.length} papers
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{course.course_code}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {course.course_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {coursePapers.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No papers uploaded yet</p>
                          <p className="text-xs">Be the first to contribute!</p>
                        </div>
                      ) : (
                        <>
                          {coursePapers.slice(0, 3).map((paper) => (
                            <div key={paper.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{paper.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={getExamTypeBadgeColor(paper.exam_type)} variant="secondary">
                                    {paper.exam_type}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {paper.year}
                                  </Badge>
                                  <Badge variant="outline" className={`text-xs ${paper.semester === 'Summer' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                    {paper.semester}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2 flex-shrink-0 sm:gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="p-1 sm:p-2"
                                  onClick={() => handleDownload(paper)}
                                  title="Download paper"
                                >
                                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                {user && paper.uploaded_by_email !== user.email && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 p-1 sm:p-2"
                                    onClick={() => handleReportPaper(paper)}
                                    title="Report inappropriate content"
                                  >
                                    <Flag className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                )}
                                {user && paper.uploaded_by_email === user.email && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 sm:p-2"
                                    onClick={() => handleDelete(paper)}
                                    title="Delete your paper"
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          {coursePapers.length > 3 && (
                            <div className="text-center py-2">
                              <Button variant="ghost" size="sm" className="text-muted-foreground">
                                +{coursePapers.length - 3} more papers
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full" 
                        onClick={() => {
                          setSelectedCourseForUpload(course.course_code);
                          setIsSpecificCourseUpload(true);
                          setUploadDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Paper
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredCourses.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <Archive className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold mb-2">No courses found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search term or browse all available courses.
              </p>
              <Button onClick={() => setSearchQuery("")} variant="outline">
                Clear Search
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Report Question Paper Dialog */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-500" />
              Report Question Paper
            </DialogTitle>
            <DialogDescription>
              Help us maintain quality by reporting inappropriate or problematic content.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Content Preview */}
            {paperToReport && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border-l-4 border-red-500">
                <div className="text-sm font-medium mb-1">Paper being reported:</div>
                <div className="text-sm font-semibold">{paperToReport.title}</div>
                <div className="text-xs text-slate-500 mt-1 space-x-2">
                  <span>Course: {paperToReport.course_code}</span>
                  <span>•</span>
                  <span>Year: {paperToReport.year}</span>
                  <span>•</span>
                  <span>Semester: {paperToReport.semester}</span>
                  <span>•</span>
                  <span>Type: {paperToReport.exam_type}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Uploaded by {paperToReport.uploaded_by_name} • {new Date(paperToReport.uploaded_at).toLocaleDateString()}
                </div>
              </div>
            )}

            {/* Report Reason */}
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason for reporting *</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="copyright">Copyright violation</SelectItem>
                  <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                  <SelectItem value="wrong_course">Wrong course material</SelectItem>
                  <SelectItem value="poor_quality">Poor quality/unreadable</SelectItem>
                  <SelectItem value="spam">Spam or irrelevant content</SelectItem>
                  <SelectItem value="duplicate">Duplicate submission</SelectItem>
                  <SelectItem value="malicious">Malicious file</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional Details */}
            <div className="space-y-2">
              <Label htmlFor="report-description">Additional details (optional)</Label>
              <Textarea
                id="report-description"
                placeholder="Please provide any additional context that would help our moderators..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setReportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitPaperReport}
              disabled={!reportReason}
              className="bg-red-600 hover:bg-red-700"
            >
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Questions;
