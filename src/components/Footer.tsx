import { Link } from "react-router-dom";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Large Screen Layout - Single Line */}
        <div className="hidden lg:flex items-center justify-between">
          <div className="flex items-center gap-8">
            <p className="text-sm text-muted-foreground">
              © {currentYear} BRACU Loop. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Created by <a href="https://montasir-mogumder-shariar.vercel.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Montasir Shariar</a> & <a href="https://www.sifatullahfahim.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Sifatullah Fahim</a> • BRAC University Student Platform
            </p>
          </div>
          <div className="flex items-center gap-6">
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
            <a
              href="https://montasir-mogumder-shariar.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              title="View Developer Portfolio"
            >
              <span>👨‍💻</span>
              Portfolio
            </a>
          </div>
        </div>

        {/* Small/Medium Screen Layout - Stacked */}
        <div className="flex flex-col gap-4 lg:hidden">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © {currentYear} BRACU Loop. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Created by <a href="https://montasir-mogumder-shariar.vercel.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Montasir Shariar</a> & <a href="https://www.sifatullahfahim.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Sifatullah Fahim</a>
            </p>
            <p className="text-xs text-muted-foreground">
              BRAC University Student Platform
            </p>
          </div>
          
          {/* Navigation Links - Two rows for better mobile spacing */}
          <div className="flex flex-col gap-2 items-center">
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
            
            {/* Portfolio link on separate line for mobile */}
            <a
              href="https://montasir-mogumder-shariar.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              title="View Developer Portfolio"
            >
              <span>👨‍💻</span>
              View Developer Portfolio
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};