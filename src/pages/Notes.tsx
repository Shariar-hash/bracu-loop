import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FileText } from "lucide-react";

const Notes = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <FileText className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold mb-4">Notes & Resources</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find and share course notes, slides, lab manuals, and study guides. 
              Tag by course code and semester with quick preview for PDFs.
            </p>
          </div>
          
          <div className="bg-card border rounded-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
            <p className="text-muted-foreground">
              This feature is under development. Soon you'll be able to upload, share, and access 
              course materials including notes, slides, and lab resources from your peers.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Notes;
