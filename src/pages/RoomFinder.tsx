import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MapPin } from "lucide-react";

const RoomFinder = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <MapPin className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold mb-4">Empty Rooms & Labs Finder</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Check real-time or schedule-based availability of classrooms and labs. 
              Filter by building, time range, and capacity to quickly find a study spot.
            </p>
          </div>
          
          <div className="bg-card border rounded-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
            <p className="text-muted-foreground">
              This feature is under development. Soon you'll be able to find available 
              rooms and labs across campus in real-time, making it easier to find study spaces.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RoomFinder;
