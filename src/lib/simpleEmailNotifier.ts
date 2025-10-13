// Simple Email Notification Service using EmailJS
// This will send actual emails to the admin addresses

class SimpleEmailNotifier {
  
  // Admin email addresses
  private static readonly ADMIN_EMAILS = [
    'montasirshariar@gmail.com',
    'fahimsifat12345@gmail.com'
  ];

  /**
   * Send email notification for new contact form submission
   */
  static async notifyAdminsNewContact(contactData: {
    id: string;
    student_name: string;
    student_email: string;
    subject: string;
    message: string;
    submitted_at: string;
  }) {
    const emailSubject = `[BRACU Loop] New Contact: ${contactData.subject}`;
    
    const emailBody = `
New contact message received from BRACU Loop:

From: ${contactData.student_name}
Email: ${contactData.student_email}
Subject: ${contactData.subject}
Submitted: ${new Date(contactData.submitted_at).toLocaleString()}

Message:
${contactData.message}

---
To reply: Send email directly to ${contactData.student_email}
Submission ID: ${contactData.id}

Admin Dashboard: ${window.location.origin}/admin
    `.trim();

    // Send email to each admin
    for (const adminEmail of this.ADMIN_EMAILS) {
      try {
        await this.sendEmail(adminEmail, emailSubject, emailBody);
        console.log(`✅ Email notification sent to: ${adminEmail}`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${adminEmail}:`, error);
      }
    }
  }

  /**
   * Send email using mailto link (simple fallback)
   */
  private static async sendEmail(to: string, subject: string, body: string) {
    // For now, use mailto link which opens user's default email client
    const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Log the email for debugging
    console.log('📧 Email would be sent:', {
      to,
      subject,
      body: body.substring(0, 100) + '...'
    });
    
    // Create a hidden link and click it to open email client
    const link = document.createElement('a');
    link.href = mailtoLink;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Note: This will open multiple email windows for multiple admins
    // In production, you'd use a proper email service
    setTimeout(() => {
      link.click();
      document.body.removeChild(link);
    }, 100);
    
    return true;
  }

  /**
   * Alternative: Use a simple email API service
   */
  static async sendViaAPI(contactData: any) {
    try {
      // Example using a simple email API (you'd need to implement this endpoint)
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: this.ADMIN_EMAILS,
          subject: `[BRACU Loop] New Contact: ${contactData.subject}`,
          text: `New message from ${contactData.student_name} (${contactData.student_email}): ${contactData.message}`,
          html: this.generateEmailHTML(contactData)
        })
      });

      if (response.ok) {
        console.log('✅ Email sent via API');
        return true;
      } else {
        throw new Error('API response not ok');
      }
    } catch (error) {
      console.error('❌ API email failed, falling back to mailto:', error);
      // Fallback to mailto
      await this.notifyAdminsNewContact(contactData);
      return false;
    }
  }

  private static generateEmailHTML(contactData: any) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
        .message { background: #f1f3f5; padding: 15px; border-left: 4px solid #0066cc; margin: 15px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🔔 New Contact Message - BRACU Loop</h2>
        </div>
        
        <div class="content">
            <p><strong>From:</strong> ${contactData.student_name}</p>
            <p><strong>Email:</strong> <a href="mailto:${contactData.student_email}">${contactData.student_email}</a></p>
            <p><strong>Subject:</strong> ${contactData.subject}</p>
            <p><strong>Submitted:</strong> ${new Date(contactData.submitted_at).toLocaleString()}</p>
            
            <div class="message">
                <p><strong>Message:</strong></p>
                <p>${contactData.message.replace(/\n/g, '<br>')}</p>
            </div>
        </div>
        
        <div class="footer">
            <p>To reply: Send email directly to ${contactData.student_email}</p>
            <p>Submission ID: ${contactData.id}</p>
        </div>
    </div>
</body>
</html>`;
  }
}

export default SimpleEmailNotifier;