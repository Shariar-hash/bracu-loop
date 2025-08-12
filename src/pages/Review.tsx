import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GraduationCap } from "lucide-react";

const Review = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <GraduationCap className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold mb-4">Faculty Review</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Browse instructors, read reviews, leave ratings, and upvote helpful comments. 
              Find honest feedback from your fellow students.
            </p>
          </div>
          
          <div className="bg-card border rounded-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
            <p className="text-muted-foreground">
              This feature is under development. Soon you'll be able to browse and review faculty members, 
              helping your fellow students make informed decisions about their courses.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Review;
