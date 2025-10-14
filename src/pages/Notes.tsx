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
  ExternalLink,
  Calendar,
  Flag,
  Trash2,
  Plus,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import NotesService, { StudentNote, NoteUploadData, LinkData } from '@/lib/notesService';
import AdminService from '@/lib/adminService';
import { useAuth } from '@/contexts/AuthContext';

const Notes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Upload Dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Link Upload
  const [uploadLink, setUploadLink] = useState('');
  const [uploadLinkType, setUploadLinkType] = useState<'google_drive' | 'onedrive' | 'dropbox' | 'other'>('google_drive');
  
  // Form Data
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    course_code: '',
    course_name: '',
    category: 'Notes'
  });
  
  // Report Dialog
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [noteToReport, setNoteToReport] = useState<StudentNote | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  
  // Categories and courses
  const categories = ['Notes', 'Slides', 'Lab Manual', 'Assignment', 'Project', 'Study Guide', 'Other'];
  const courses = ['CSE110', 'CSE111', 'CSE220', 'CSE221', 'CSE230', 'CSE260', 'CSE321', 'CSE340', 'CSE350', 'CSE423', 'CSE470'];
  
  const reportReasons = [
    'Inappropriate content',
    'Copyright violation', 
    'Wrong course material',
    'Spam or irrelevant',
    'Malicious file',
    'Other'
  ];

  useEffect(() => {
    console.log('🎉 NEW NOTES PAGE LOADED - Supabase Storage Active');
    loadNotes();
  }, [selectedCourse, selectedCategory, searchTerm]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const result = await NotesService.getNotes({
        courseCode: selectedCourse !== 'all' ? selectedCourse : undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchTerm || undefined,
        limit: 20
      });
      setNotes(result.notes);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const resetUploadForm = () => {
    setUploadData({
      title: '',
      description: '',
      course_code: '',
      course_name: '',
      category: 'Notes'
    });
    setSelectedFile(null);
    setUploadLink('');
    setUploadType('file');
  };

  const handleUpload = async () => {
    if (!user) {
      toast.error('Please sign in to upload notes');
      return;
    }

    if (!uploadData.title || !uploadData.course_code || !uploadData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (uploadType === 'file' && !selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (uploadType === 'link' && !uploadLink) {
      toast.error('Please enter a link to share');
      return;
    }

    setUploading(true);

    try {
      const noteData: NoteUploadData = {
        ...uploadData,
        uploader_name: user.name || user.email,
        uploader_email: user.email
      };

      let result;

      if (uploadType === 'file' && selectedFile) {
        result = await NotesService.uploadFile(selectedFile, noteData);
      } else {
        const linkData: LinkData = {
          ...noteData,
          link_url: uploadLink,
          link_type: uploadLinkType
        };
        result = await NotesService.saveLink(linkData);
      }

      if (result.success) {
        toast.success(result.type === 'link' ? 'Link shared successfully!' : 'File uploaded successfully!');
        setUploadDialogOpen(false);
        resetUploadForm();
        await loadNotes();
      } else {
        toast.error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (note: StudentNote) => {
    if (!user) {
      toast.error('Please sign in to access notes');
      return;
    }

    try {
      const result = await NotesService.accessNote(note.id);
      
      if (result.success && result.url) {
        if (result.type === 'link') {
          window.open(result.url, '_blank');
        } else {
          window.open(result.url, '_blank');
        }
        toast.success(result.type === 'link' ? 'Opening link...' : 'Download started');
        await loadNotes(); // Reload to update download count
      } else {
        toast.error(result.error || 'Access failed');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Failed to access note');
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
          description: noteToReport.description,
          course_code: noteToReport.course_code,
          course_name: noteToReport.course_name,
          category: noteToReport.category,
          upload_type: noteToReport.upload_type,
          file_name: noteToReport.file_name,
          file_size: noteToReport.file_size,
          link_url: noteToReport.link_url,
          link_type: noteToReport.link_type,
          uploader_name: noteToReport.uploader_name,
          uploader_email: noteToReport.uploader_email,
          created_at: noteToReport.created_at,
        },
      });

      toast.success('Note reported successfully');
      setReportDialogOpen(false);
      setNoteToReport(null);
      setReportReason('');
      setReportDescription('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit report');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    
    if (bytes < 1024) {
      return `${bytes} bytes`;
    } else if (bytes < 1024 * 1024) {
      const kb = bytes / 1024;
      return `${kb.toFixed(1)} KB`;
    } else {
      const mb = bytes / (1024 * 1024);
      return `${mb.toFixed(1)} MB`;
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchTerm || 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.course_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = selectedCourse === 'all' || note.course_code === selectedCourse;
    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
    
    return matchesSearch && matchesCourse && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Student Notes</h1>
              <p className="text-muted-foreground">Share and access course materials</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map(course => (
                  <SelectItem key={course} value={course}>{course}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Notes
            </Button>
          </div>
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div className="text-center py-8">Loading notes...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No notes found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedCourse !== 'all' || selectedCategory !== 'all' 
                ? 'Try adjusting your search filters' 
                : 'Be the first to share notes!'}
            </p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload First Note
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2 line-clamp-2">{note.title}</h3>
                      <div className="flex gap-2 mb-2">
                        <Badge variant="secondary">{note.course_code}</Badge>
                        <Badge variant="outline">{note.category}</Badge>
                        {note.upload_type === 'link' && (
                          <Badge variant="outline" className="text-blue-600">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Link
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {note.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {note.description}
                    </p>
                  )}
                  
                  <div className="text-xs text-muted-foreground mb-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span>By {note.uploader_name}</span>
                      <span className="mx-2">•</span>
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(note.created_at).toLocaleDateString()}</span>
                    </div>
                    {note.upload_type === 'file' && note.file_size && note.file_size > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{formatFileSize(note.file_size)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload(note)}
                      disabled={!user}
                      className="flex-1"
                      size="sm"
                    >
                      {note.upload_type === 'link' ? (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit Link
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </>
                      )}
                    </Button>
                    {user && (
                      <Button
                        onClick={() => handleReport(note)}
                        variant="ghost"
                        size="sm"
                        title="Report note"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Notes</DialogTitle>
            <DialogDescription>
              Upload ZIP files or share links to Google Drive, OneDrive, or Dropbox
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Upload Type Selection */}
            <div>
              <Label>How do you want to share?</Label>
              <RadioGroup value={uploadType} onValueChange={(value: 'file' | 'link') => setUploadType(value)} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="file" id="file" />
                  <Label htmlFor="file">Upload ZIP file (max 18MB)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="link" id="link" />
                  <Label htmlFor="link">Share external link</Label>
                </div>
              </RadioGroup>
            </div>

            {/* File Upload */}
            {uploadType === 'file' && (
              <div>
                <Label htmlFor="file-upload">Select ZIP file</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".zip,.rar,.7z"
                  onChange={handleFileChange}
                  className="mt-1"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>
            )}

            {/* Link Upload */}
            {uploadType === 'link' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="link-type">Link Type</Label>
                  <Select value={uploadLinkType} onValueChange={(value: any) => setUploadLinkType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google_drive">Google Drive</SelectItem>
                      <SelectItem value="onedrive">OneDrive</SelectItem>
                      <SelectItem value="dropbox">Dropbox</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="link-url">Share Link</Label>
                  <Input
                    id="link-url"
                    placeholder="https://drive.google.com/..."
                    value={uploadLink}
                    onChange={(e) => setUploadLink(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Common Fields */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., CSE220 Data Structures Notes"
                value={uploadData.title}
                onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="course">Course Code *</Label>
              <Select value={uploadData.course_code} onValueChange={(value) => setUploadData({...uploadData, course_code: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={uploadData.category} onValueChange={(value) => setUploadData({...uploadData, category: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the content..."
                value={uploadData.description}
                onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Share'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Student Note</DialogTitle>
            <DialogDescription>
              Help us maintain quality by reporting inappropriate or problematic content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Content Preview */}
            {noteToReport && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border-l-4 border-red-500">
                <div className="text-sm font-medium mb-1">Note being reported:</div>
                <div className="text-sm font-semibold">{noteToReport.title}</div>
                <div className="text-xs text-slate-500 mt-1 space-x-2">
                  <span>Course: {noteToReport.course_code}</span>
                  <span>•</span>
                  <span>Category: {noteToReport.category}</span>
                  <span>•</span>
                  <span>Type: {noteToReport.upload_type === 'link' ? 'Shared Link' : 'File Upload'}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Uploaded by {noteToReport.uploader_name} • {new Date(noteToReport.created_at).toLocaleDateString()}
                </div>
              </div>
            )}

            {/* Report Reason */}
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason for reporting *</Label>
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
              <Label htmlFor="report-description">Additional details (optional)</Label>
              <Textarea
                id="report-description"
                placeholder="Please provide any additional context that would help our moderators..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
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
};

export default Notes;
