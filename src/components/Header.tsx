import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { useAuth } from "@/contexts/AuthContext";

export const Header = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="text-2xl font-bold campus-gradient bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            >
              BRACU Loop
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            {user ? (
              // Navigation for authenticated users
              <>
                <Link
                  to="/review"
                  className={`transition-colors hover:text-foreground/80 ${
                    isActive('/review') ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  Reviews
                </Link>
                <Link
                  to="/notes"
                  className={`transition-colors hover:text-foreground/80 ${
                    isActive('/notes') ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  Notes
                </Link>
                <Link
                  to="/questions"
                  className={`transition-colors hover:text-foreground/80 ${
                    isActive('/questions') ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  Questions
                </Link>
                <Link
                  to="/suggestions"
                  className={`transition-colors hover:text-foreground/80 ${
                    isActive('/suggestions') ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  Suggestions
                </Link>
                <Link
                  to="/roomfinder"
                  className={`transition-colors hover:text-foreground/80 ${
                    isActive('/roomfinder') ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  Room Finder
                </Link>
              </>
            ) : (
              // Public navigation for non-authenticated users
              <Link
                to="/roomfinder"
                className={`transition-colors hover:text-foreground/80 ${
                  isActive('/roomfinder') ? 'text-foreground' : 'text-foreground/60'
                }`}
              >
                Room Finder
              </Link>
            )}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <GoogleSignInButton />
          </div>
        </div>
      </div>
    </header>
  );
};