import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Mail, Send, MessageSquare, AlertCircle, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SecureAdminService from '@/lib/secureAdminService';

interface ContactFormData {
  student_name: string;
  student_email: string;
  subject: string;
  message: string;
}

const ContactForm = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ContactFormData>({
    student_name: '',
    student_email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auto-fill user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        student_name: user.name || '',
        student_email: user.email || ''
      }));
    }
  }, [user]);

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.student_name.trim() || !formData.student_email.trim() || 
        !formData.subject.trim() || !formData.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.student_email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      // Use the basic contact form without message_type for now
      const submissionId = await SecureAdminService.submitContactForm({
        student_name: formData.student_name,
        student_email: formData.student_email,
        subject: formData.subject,
        message: formData.message
      });
      
      toast.success('Your message has been sent successfully!', {
        description: 'Admin team will reply to your email within 24 hours.'
      });
      
      setSubmitted(true);
      
      // Reset form after short delay
      setTimeout(() => {
        setFormData({
          student_name: user?.name || '',
          student_email: user?.email || '',
          subject: '',
          message: ''
        });
        setSubmitted(false);
      }, 3000);
      
    } catch (error: any) {
      console.error('Contact form submission failed:', error);
      
      // Show detailed error information for debugging
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      if (error?.details) {
        console.error('Error details:', error.details);
        errorMessage += ` Details: ${error.details}`;
      }
      
      if (error?.hint) {
        console.error('Error hint:', error.hint);
        errorMessage += ` Hint: ${error.hint}`;
      }
      
      // Show the detailed error
      toast.error(errorMessage);
      
      // Also show a user-friendly notification
      toast.error('Debug info logged to console. Please check browser console for details.');
      
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-800 mb-2">Message Sent Successfully!</h3>
            <p className="text-green-700 mb-4">
              Thank you for reaching out. Our admin team has received your message and will respond to your email within 24 hours.
            </p>
            <p className="text-sm text-green-600">
              You can check your email for our reply, or submit another message if needed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Contact Admin Team</CardTitle>
          <p className="text-gray-600 mt-2">
            Send us a message and get a direct email reply from our admin team
          </p>
          {user && (
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-blue-600">
              <User className="w-4 h-4" />
              <span>Signed in as: {user.name} ({user.email})</span>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="student_name">Your Name *</Label>
                <Input
                  id="student_name"
                  type="text"
                  value={formData.student_name}
                  onChange={(e) => handleInputChange('student_name', e.target.value)}
                  placeholder={user ? "Auto-filled from your account" : "Enter your full name"}
                  maxLength={100}
                  disabled={loading || !!user}
                  required
                />
                {user && (
                  <p className="text-xs text-green-600 mt-1">✓ Auto-filled from your Google account</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="student_email">Email Address *</Label>
                <Input
                  id="student_email"
                  type="email"
                  value={formData.student_email}
                  onChange={(e) => handleInputChange('student_email', e.target.value)}
                  placeholder={user ? "Auto-filled from your account" : "your.email@g.bracu.ac.bd"}
                  maxLength={100}
                  disabled={loading || !!user}
                  required
                />
                {user && (
                  <p className="text-xs text-green-600 mt-1">✓ Auto-filled from your Google account</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => handleInputChange('subject', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject or type custom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                  <SelectItem value="Technical Support">Technical Support</SelectItem>
                  <SelectItem value="Account Issues">Account Issues</SelectItem>
                  <SelectItem value="Content Issues">Content Issues</SelectItem>
                  <SelectItem value="Faculty Information">Faculty Information</SelectItem>
                  <SelectItem value="Course Information">Course Information</SelectItem>
                  <SelectItem value="Bug Report">Bug Report</SelectItem>
                  <SelectItem value="Feature Request">Feature Request</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Allow custom subject if "Other" is selected or for direct typing */}
              {(formData.subject === 'Other' || !formData.subject) && (
                <Input
                  className="mt-2"
                  placeholder="Or type your own subject"
                  value={formData.subject === 'Other' ? '' : formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  maxLength={200}
                />
              )}
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Please describe your question or issue in detail..."
                rows={6}
                maxLength={2000}
                required
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {formData.message.length}/2000 characters
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">How it works:</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>• Your message goes directly to our admin dashboard</li>
                    <li>• Admin team will review and reply via email within 24 hours</li>
                    <li>• You'll receive the response at the email address you provided</li>
                    <li>• For urgent matters, include "URGENT" in your subject</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Debug section - remove in production */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-2">🔧 Debug Tools:</p>
                <button 
                  type="button"
                  onClick={() => {
                    // Load and run database test
                    const script = document.createElement('script');
                    script.src = '/test-db.js';
                    script.onload = () => {
                      // @ts-ignore
                      window.testDB();
                    };
                    document.head.appendChild(script);
                  }}
                  className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-xs hover:bg-yellow-300"
                >
                  Test Database Connection
                </button>
                <p className="text-xs mt-2 text-yellow-600">
                  Click to test database connection and permissions. Check browser console for results.
                </p>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending Message...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message to Admin Team
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Card className="mt-6 bg-gray-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-gray-900 mb-2">Alternative Contact Methods:</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Primary: admin@gmail.com</p>
            <p>• Support: your-email@company.com</p>
            <p>• Help Desk: team@yourdomain.com</p>
            <p className="text-xs italic mt-2 text-blue-600">* Admin emails can use any domain (Gmail, Yahoo, Outlook, etc.)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactForm;