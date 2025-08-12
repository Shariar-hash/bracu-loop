import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MessageSquare } from "lucide-react";

const Suggestions = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold mb-4">Senior Suggestions</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Practical advice from seniors—how to prepare, which topics matter, 
              recommended books and tools. Search by course to see focused tips.
            </p>
          </div>
          
          <div className="bg-card border rounded-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
            <p className="text-muted-foreground">
              This feature is under development. Soon you'll be able to access valuable advice 
              and suggestions from senior students who have already taken these courses.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Suggestions;
