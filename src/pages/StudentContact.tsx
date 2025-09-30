import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import AdminService from '@/lib/adminService';
import { MessageSquare, Send, GraduationCap, Phone, Mail, MapPin } from 'lucide-react';

interface ContactFormData {
  student_name: string;
  student_email: string;
  student_id: string;
  subject: string;
  message_type: string;
  message_content: string;
  priority: string;
}

export function StudentContact() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    student_name: user?.name || '',
    student_email: user?.email || '',
    student_id: '',
    subject: '',
    message_type: 'general',
    message_content: '',
    priority: 'medium'
  });

  const messageTypes = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'academic', label: 'Academic Issue' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ];

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_name || !formData.student_email || !formData.subject || !formData.message_content) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      await AdminService.submitStudentMessage({
        student_name: formData.student_name,
        student_email: formData.student_email,
        student_id: formData.student_id,
        subject: formData.subject,
        message_type: formData.message_type,
        message_content: formData.message_content,
        priority: formData.priority
      });

      toast.success('Message sent successfully! We will get back to you soon.');
      
      // Reset form
      setFormData({
        student_name: user?.name || '',
        student_email: user?.email || '',
        student_id: '',
        subject: '',
        message_type: 'general',
        message_content: '',
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error submitting message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-primary mr-2" />
              <h1 className="text-3xl font-bold">Contact Administration</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Need help or have questions? Send us a message and our team will get back to you as soon as possible.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Phone className="h-5 w-5 mr-2" />
                    Contact Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">admin@bracu-loop.edu</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">+880-2-5566-4444</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">
                        BRAC University<br />
                        66 Mohakhali, Dhaka 1212<br />
                        Bangladesh
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2" />
                    Response Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm"><strong>General:</strong> 1-2 business days</p>
                    <p className="text-sm"><strong>Academic:</strong> Same day</p>
                    <p className="text-sm"><strong>Technical:</strong> 4-6 hours</p>
                    <p className="text-sm"><strong>Urgent:</strong> Within 1 hour</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Send us a Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="student_name">Full Name *</Label>
                        <Input
                          id="student_name"
                          value={formData.student_name}
                          onChange={(e) => handleInputChange('student_name', e.target.value)}
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="student_email">Email *</Label>
                        <Input
                          id="student_email"
                          type="email"
                          value={formData.student_email}
                          onChange={(e) => handleInputChange('student_email', e.target.value)}
                          placeholder="your.email@g.bracu.ac.bd"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="student_id">Student ID (Optional)</Label>
                      <Input
                        id="student_id"
                        value={formData.student_id}
                        onChange={(e) => handleInputChange('student_id', e.target.value)}
                        placeholder="e.g., 21101234"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        placeholder="Brief description of your inquiry"
                        required
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="message_type">Message Type</Label>
                        <Select
                          value={formData.message_type}
                          onValueChange={(value) => handleInputChange('message_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {messageTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value) => handleInputChange('priority', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {priorities.map(priority => (
                              <SelectItem key={priority.value} value={priority.value}>
                                {priority.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message_content">Message *</Label>
                      <Textarea
                        id="message_content"
                        value={formData.message_content}
                        onChange={(e) => handleInputChange('message_content', e.target.value)}
                        placeholder="Please provide details about your inquiry..."
                        rows={6}
                        required
                      />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? (
                        <>Sending...</>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}