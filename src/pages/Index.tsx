import { 
  GraduationCap, 
  FileText, 
  Archive, 
  MessageSquare, 
  MapPin 
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FeatureCard } from "@/components/FeatureCard";

const features = [
  {
    icon: GraduationCap,
    title: "Faculty Review",
    blurb: "Ratings & honest feedback.",
    modalTitle: "Faculty Review",
    modalText: "Browse instructors, read reviews, leave a rating, and upvote helpful comments. Simple replies (no long threads) and a 'report' option keep things clean.",
    ctaText: "Go to Reviews",
    ctaLink: "/reviews"
  },
  {
    icon: FileText,
    title: "Notes & Resources",
    blurb: "Share notes, slides, labs.",
    modalTitle: "Notes & Resources",
    modalText: "Find and share course notes, slides, lab manuals, and study guides. Tag by course code and semester; quick preview for PDFs.",
    ctaText: "Explore Resources",
    ctaLink: "/notes"
  },
  {
    icon: Archive,
    title: "Previous Semester Questions",
    blurb: "Past papers by course.",
    modalTitle: "Previous Semester Questions",
    modalText: "Search past exam and quiz papers by course and semester. Filter by year; upload missing papers to help others.",
    ctaText: "View Questions",
    ctaLink: "/questions"
  },
  {
    icon: MessageSquare,
    title: "Senior Suggestions",
    blurb: "Tips from seniors.",
    modalTitle: "Suggestions by Seniors",
    modalText: "Practical advice from seniors—how to prepare, which topics matter, recommended books/tools. Search by course to see focused tips.",
    ctaText: "See Suggestions",
    ctaLink: "/suggestions"
  },
  {
    icon: MapPin,
    title: "Empty Rooms & Labs Finder",
    blurb: "Find a free room now.",
    modalTitle: "Empty Rooms & Labs Finder",
    modalText: "Check real-time or schedule-based availability of classrooms and labs. Filter by building, time range, and capacity to quickly find a study spot.",
    ctaText: "Find a Room",
    ctaLink: "/rooms"
  }
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in">
              Everything for your courses—
              <span className="campus-gradient bg-clip-text text-transparent">one place</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Access faculty reviews, course materials, past papers, senior advice, and find study spaces—all in one streamlined platform.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <FeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  blurb={feature.blurb}
                  modalTitle={feature.modalTitle}
                  modalText={feature.modalText}
                  ctaText={feature.ctaText}
                  ctaLink={feature.ctaLink}
                />
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
