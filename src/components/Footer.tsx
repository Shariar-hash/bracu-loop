import { Link } from "react-router-dom";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground">
              © {currentYear} BRACU Loop. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Created by Shariar Rahman • BRAC University Student Platform
            </p>
          </div>
          <div className="flex gap-6">
            <button 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {/* Navigate to: /terms */}}
            >
              Terms
            </button>
            <button 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {/* Navigate to: /privacy */}}
            >
              Privacy
            </button>
            <Link
              to="/contact"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              title="Contact Administration"
            >
              Contact
            </Link>

            <Link
              to="/admin"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              title="Admin Dashboard"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};