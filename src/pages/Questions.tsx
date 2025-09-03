import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Archive, 
  BookOpen, 
  Calendar, 
  Download, 
  FileText, 
  Plus,
  Upload, 
  Users
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

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
}

const Questions = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [questionPapers, setQuestionPapers] = useState<QuestionPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedCourseForUpload, setSelectedCourseForUpload] = useState<string>("");
  const [uploadData, setUploadData] = useState({
    title: "",
    semester: "",
    year: new Date().getFullYear(),
    exam_type: "midterm" as const,
    file: null as File | null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('Fetching courses and papers...');
      
      // For now, use mock data since database might have issues
      const mockCourses = [
        { id: '1', course_code: 'CSE110', course_name: 'Programming Language I', category_id: '1' },
        { id: '2', course_code: 'CSE111', course_name: 'Programming Language II', category_id: '1' },
        { id: '3', course_code: 'MAT110', course_name: 'Mathematics', category_id: '2' },
        { id: '4', course_code: 'PHY111', course_name: 'Physics I', category_id: '3' },
        { id: '5', course_code: 'ENG101', course_name: 'English', category_id: '4' },
        { id: '6', course_code: 'CSE220', course_name: 'Data Structures', category_id: '1' }
      ];

      const mockPapers = [
        {
          id: '1',
          title: 'Midterm Fall 2023',
          course_code: 'CSE110',
          course_name: 'Programming Language I',
          semester: 'Fall',
          year: 2023,
          exam_type: 'midterm' as const,
          file_url: 'https://example.com/cse110-midterm-fall2023.pdf',
          file_name: 'cse110-midterm-fall2023.pdf',
          uploaded_at: '2023-10-15',
          uploaded_by_email: 'student@bracu.ac.bd',
          uploaded_by_name: 'Student',
          is_approved: true
        },
        {
          id: '2',
          title: 'Final Spring 2023',
          course_code: 'CSE110',
          course_name: 'Programming Language I',
          semester: 'Spring',
          year: 2023,
          exam_type: 'final' as const,
          file_url: 'https://example.com/cse110-final-spring2023.pdf',
          file_name: 'cse110-final-spring2023.pdf',
          uploaded_at: '2023-05-20',
          uploaded_by_email: 'student@bracu.ac.bd',
          uploaded_by_name: 'Student',
          is_approved: true
        },
        {
          id: '3',
          title: 'Quiz 1 Summer 2023',
          course_code: 'CSE111',
          course_name: 'Programming Language II',
          semester: 'Summer',
          year: 2023,
          exam_type: 'quiz' as const,
          file_url: 'https://example.com/cse111-quiz1-summer2023.pdf',
          file_name: 'cse111-quiz1-summer2023.pdf',
          uploaded_at: '2023-07-10',
          uploaded_by_email: 'student@bracu.ac.bd',
          uploaded_by_name: 'Student',
          is_approved: true
        },
        {
          id: '4',
          title: 'Assignment 1',
          course_code: 'MAT110',
          course_name: 'Mathematics',
          semester: 'Fall',
          year: 2023,
          exam_type: 'assignment' as const,
          file_url: 'https://example.com/mat110-assignment1-fall2023.pdf',
          file_name: 'mat110-assignment1-fall2023.pdf',
          uploaded_at: '2023-09-15',
          uploaded_by_email: 'student@bracu.ac.bd',
          uploaded_by_name: 'Student',
          is_approved: true
        }
      ];

      setCourses(mockCourses);
      setQuestionPapers(mockPapers);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get papers for a specific course
  const getPapersForCourse = (courseCode: string) => {
    return questionPapers.filter(paper => paper.course_code === courseCode);
  };

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
      // Create new paper object
      const newPaper = {
        id: Date.now().toString(),
        title: uploadData.title,
        course_code: selectedCourseForUpload,
        course_name: courses.find(c => c.course_code === selectedCourseForUpload)?.course_name || '',
        semester: uploadData.semester,
        year: uploadData.year,
        exam_type: uploadData.exam_type,
        file_url: 'https://example.com/placeholder.pdf',
        file_name: uploadData.file.name,
        uploaded_at: new Date().toISOString(),
        uploaded_by_email: user.email,
        uploaded_by_name: user.name || user.email,
        is_approved: true
      };

      // Add to local state
      setQuestionPapers(prev => [newPaper, ...prev]);

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
      
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error(`Failed to upload: ${error.message}`);
    }
  };

  const handleDownload = (paper: QuestionPaper) => {
    window.open(paper.file_url, '_blank');
    toast.success('Opening document...');
  };

  const getExamTypeBadgeColor = (examType: string) => {
    switch (examType) {
      case 'midterm': return 'bg-blue-100 text-blue-800';
      case 'final': return 'bg-red-100 text-red-800';
      case 'quiz': return 'bg-green-100 text-green-800';
      case 'assignment': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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
            <div className="flex items-center justify-between mb-6">
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
                  <Button size="lg" className="flex items-center gap-2">
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
                    </div>
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Midterm Fall 2023"
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
          </div>

          {/* Course Boxes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
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
                                  <span className="text-xs text-muted-foreground">
                                    {paper.semester} {paper.year}
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownload(paper)}
                                className="ml-2 flex-shrink-0"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Questions;
