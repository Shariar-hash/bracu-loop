import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Review from "./pages/Review";
import FacultyReview from "./pages/FacultyReviewIndex";
import FacultyDetail from "./pages/FacultyDetail";
import Notes from "./pages/Notes";
import Questions from "./pages/Questions";
import Suggestions from "./pages/Suggestions";
import RoomFinder from "./pages/RoomFinder";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <Routes>
              <Route path="/" element={<Index />} />
              
              {/* Protected routes - require authentication */}
              <Route path="/review" element={
                <ProtectedRoute>
                  <FacultyReview />
                </ProtectedRoute>
              } />
              {/* Faculty detail page (public for now, can be protected if needed) */}
              <Route path="/faculty/:facultyId" element={<FacultyDetail />} />
              <Route path="/notes" element={
                <ProtectedRoute>
                  <Notes />
                </ProtectedRoute>
              } />
              <Route path="/questions" element={
                <ProtectedRoute>
                  <Questions />
                </ProtectedRoute>
              } />
              <Route path="/suggestions" element={
                <ProtectedRoute>
                  <Suggestions />
                </ProtectedRoute>
              } />
              
              {/* Public route - no authentication required */}
              <Route path="/roomfinder" element={<RoomFinder />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
