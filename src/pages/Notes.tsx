import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  Download,
  FileText,
  Search,
  Filter,
  Trash2,
  Flag,
  X,
  BookOpen,
  Calendar,
  User,
  FileUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import NotesService, { StudentNote, NoteUploadData } from '@/lib/notesService';
import AdminService from '@/lib/adminService';

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Upload Dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLink, setUploadLink] = useState('');
  const [linkType, setLinkType] = useState<'google_drive' | 'onedrive' | 'dropbox' | 'other'>('google_drive');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCourse, setUploadCourse] = useState('');
  const [uploadCategory, setUploadCategory] = useState<any>('lecture_notes');

  // Report Dialog
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [noteToReport, setNoteToReport] = useState<StudentNote | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  const courses = [
    'CSE110', 'CSE111', 'CSE220', 'CSE221', 'CSE230', 'CSE250', 'CSE251', 'CSE260',
    'CSE330', 'CSE331', 'CSE340', 'CSE341', 'CSE350', 'CSE360','CSE370', 'CSE420', 'CSE421', 'CSE422',
    'CSE423','CSE425','CSE428','CSE437', 'CSE470', 'CSE471', 'CSE490', 'MAT110', 'MAT120', 'MAT215',
    'MAT216', 'PHY111', 'PHY112', 'ENG101', 'ENG102', 'BUS101', 'ECO101'
  ];

  const categories = [
    { value: 'lecture_notes', label: 'Lecture Notes' },
    { value: 'assignments', label: 'Assignments' },
    { value: 'lab_materials', label: 'Lab Materials' },
    { value: 'books', label: 'Books' },
    { value: 'reference', label: 'Reference' },
    { value: 'other', label: 'Other' },
  ];

  const reportReasons = [
    'Inappropriate Content',
    'Copyright Violation',
    'Incorrect Information',
    'Spam',
    'Poor Quality',
    'Other'
  ];

  useEffect(() => {
    loadNotes();
  }, [selectedCourse, selectedCategory]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const result = await NotesService.getNotes({
        courseCode: selectedCourse !== 'all' ? selectedCourse : undefined,
        category: selectedCategory !== 'all' ? selectedCategory as any : undefined,
        search: searchQuery || undefined,
        limit: 100,
        offset: 0,
      });
      setNotes(result.notes);
    } catch (error: any) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadNotes();
  };

  const handleUpload = async () => {
    if (!user) {
      toast.error('Please sign in to upload notes');
      return;
    }

    // Validate based on upload type
    if (uploadType === 'file' && (!uploadFile || !uploadTitle || !uploadCourse)) {
      toast.error('Please fill in all required fields and select a file');
      return;
    }

    if (uploadType === 'link' && (!uploadLink || !uploadTitle || !uploadCourse)) {
      toast.error('Please fill in all required fields and provide a link');
      return;
    }

    try {
      setUploading(true);

      const baseData: NoteUploadData = {
        title: uploadTitle,
        description: uploadDescription,
        course_code: uploadCourse,
        category: uploadCategory,
        uploader_name: user.name || user.email,
        uploader_email: user.email,
      };

      let result;

      if (uploadType === 'file' && uploadFile) {
        result = await NotesService.uploadFile(uploadFile, baseData);
      } else if (uploadType === 'link') {
        const linkData = {
          ...baseData,
          link_url: uploadLink,
          link_type: linkType,
        };
        result = await NotesService.saveLink(linkData);
      }

      if (result?.success) {
        toast.success('Note uploaded successfully!');
        setUploadDialogOpen(false);
        resetUploadForm();
        await loadNotes();
      } else {
        toast.error(result?.error || 'Failed to upload note');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload note');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (note: StudentNote) => {
    if (!user) {
      toast.error('Please sign in to download notes');
      return;
    }

    try {
      const result = await NotesService.accessNote(note.id);
      const downloadUrl = result.success ? result.url : null;

      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
        toast.success('Download started');
        await loadNotes(); // Reload to update download count
      } else {
        toast.error('Failed to get download link');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download note');
    }
  };

  const handleDelete = async (note: StudentNote) => {
    if (!user) {
      toast.error('Please sign in to delete notes');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${note.title}"?`)) {
      try {
        const success = await NotesService.deleteNote(note.id, user.email);

        if (success) {
          toast.success('Note deleted successfully');
          await loadNotes();
        } else {
          toast.error('Failed to delete note');
        }
      } catch (error: any) {
        console.error('Delete error:', error);
        toast.error(error.message || 'Failed to delete note');
      }
    }
  };

  const handleReport = (note: StudentNote) => {
    if (!user) {
      toast.error('Please sign in to report notes');
      return;
    }

    setNoteToReport(note);
    setReportDialogOpen(true);
  };

  const submitReport = async () => {
    if (!noteToReport || !reportReason || !user) return;

    try {
      await AdminService.createReport({
        content_type: 'student_note' as any,
        content_id: noteToReport.id,
        reason: reportReason,
        description: reportDescription,
        reporter_email: user.email,
        reporter_name: user.name || user.email,
        content_snapshot: {
          title: noteToReport.title,
          course_code: noteToReport.course_code,
          file_name: noteToReport.file_name,
          uploader_name: noteToReport.uploader_name,
          category: noteToReport.category,
        },
      });

      toast.success('Note reported successfully');
      setReportDialogOpen(false);
      setNoteToReport(null);
      setReportReason('');
      setReportDescription('');
    } catch (error: any) {
      console.error('Report error:', error);
      toast.error(error.message || 'Failed to report note');
    }
  };

  const resetUploadForm = () => {
    setUploadType('file');
    setUploadFile(null);
    setUploadLink('');
    setLinkType('google_drive');
    setUploadTitle('');
    setUploadDescription('');
    setUploadCourse('');
    setUploadCategory('lecture_notes');
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      searchQuery === '' ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCategoryLabel = (value: string) => {
    const category = categories.find((c) => c.value === value);
    return category?.label || value;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Study Notes
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Share and access course materials
              </p>
            </div>
            {user && (
              <Button
                onClick={() => setUploadDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <FileUp className="h-4 w-4 mr-2" />
                Upload Note
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search notes by title, course..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Course Filter */}
              <div>
                <Label htmlFor="course-filter">Course</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger id="course-filter">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course} value={course}>
                        {course}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div>
                <Label htmlFor="category-filter">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading notes...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <Card className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No notes found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {user
                ? 'Be the first to share notes for this course!'
                : 'Sign in to upload and access notes'}
            </p>
            {user && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                <FileUp className="h-4 w-4 mr-2" />
                Upload Note
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <Card
                key={note.id}
                className="hover:shadow-xl transition-shadow duration-300 border-2"
              >
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                        {note.title}
                      </h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">{note.course_code}</Badge>
                        <Badge variant="outline">{getCategoryLabel(note.category)}</Badge>
                      </div>
                    </div>
                    <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 ml-2" />
                  </div>

                  {/* Description */}
                  {note.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {note.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="space-y-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="truncate">{note.uploader_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(note.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      <span>{note.download_count} downloads</span>
                      <span className="mx-2">•</span>
                      <span>{formatFileSize(note.file_size)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload(note)}
                      disabled={!user}
                      className="flex-1"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    {user && (
                      <Button
                        onClick={() => handleReport(note)}
                        variant="ghost"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        title="Report content (Testing enabled for own notes)"
                      >
                        <Flag className="h-4 w-4" />
                      </Button>
                    )}
                    {user && note.uploader_email === user.email && (
                      <Button
                        onClick={() => handleDelete(note)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete your note"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[95vh] overflow-hidden flex flex-col touch-pan-y">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Upload Note</DialogTitle>
            <DialogDescription>
              Upload ZIP files or share links to Google Drive, OneDrive, or Dropbox
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-4 py-4">
            {/* Upload Type Selection */}
            <div>
              <Label className="text-sm font-medium mb-3 block">How do you want to share?</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="upload-file"
                    name="uploadType"
                    value="file"
                    checked={uploadType === 'file'}
                    onChange={() => setUploadType('file')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <Label htmlFor="upload-file" className="text-sm cursor-pointer">
                    Upload ZIP file (max 18MB)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="upload-link"
                    name="uploadType"
                    value="link"
                    checked={uploadType === 'link'}
                    onChange={() => setUploadType('link')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <Label htmlFor="upload-link" className="text-sm cursor-pointer">
                    Share external link
                  </Label>
                </div>
              </div>
            </div>

            {/* Conditional Upload Content */}
            {uploadType === 'file' ? (
              <div>
                <Label className="text-sm font-medium mb-2 block">Select ZIP file</Label>
                <div className="border-2 border-dashed border-purple-300 rounded-lg p-4">
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    accept=".zip,.rar,.7z"
                    className="border-0 p-0 h-auto"
                  />
                  {uploadFile && (
                    <p className="text-sm text-gray-600 mt-2">
                      Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="link-url" className="text-sm font-medium mb-2 block">External Link</Label>
                <Input
                  id="link-url"
                  type="url"
                  placeholder="https://drive.google.com/... or https://onedrive.live.com/..."
                  value={uploadLink}
                  onChange={(e) => setUploadLink(e.target.value)}
                />
                <div className="mt-3">
                  <Label htmlFor="link-type" className="text-sm font-medium mb-2 block">Link Type</Label>
                  <Select value={linkType} onValueChange={(value) => setLinkType(value as 'google_drive' | 'onedrive' | 'dropbox' | 'other')}>
                    <SelectTrigger id="link-type">
                      <SelectValue placeholder="Select link type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google_drive">Google Drive</SelectItem>
                      <SelectItem value="onedrive">OneDrive</SelectItem>
                      <SelectItem value="dropbox">Dropbox</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <Label htmlFor="upload-title">Title *</Label>
              <Input
                id="upload-title"
                placeholder="e.g., Chapter 3 - Data Structures"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
            </div>

            {/* Course */}
            <div>
              <Label htmlFor="upload-course">Course *</Label>
              <Select value={uploadCourse} onValueChange={setUploadCourse}>
                <SelectTrigger id="upload-course">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="upload-category">Category *</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger id="upload-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="upload-description">Description (Optional)</Label>
              <Textarea
                id="upload-description"
                placeholder="Add any additional information about this note..."
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading} className="bg-purple-600 hover:bg-purple-700">
              {uploading ? 'Uploading...' : 'Share'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Note</DialogTitle>
            <DialogDescription>
              Help us maintain quality by reporting inappropriate content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="report-reason">Reason *</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger id="report-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {reportReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="report-description">Additional Details (Optional)</Label>
              <Textarea
                id="report-description"
                placeholder="Provide more information about the issue..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReport} disabled={!reportReason}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
