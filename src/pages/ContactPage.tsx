import { Header } from '@/components/Header';
import ContactForm from '@/components/ContactForm';

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Contact & Support
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Need help or have questions? Send us a message and our admin team will get back to you promptly.
          </p>
        </div>
        
        <ContactForm />
      </div>
    </div>
  );
};

export default ContactPage;