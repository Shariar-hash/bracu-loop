export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} BRACU Loop. All rights reserved.
          </p>
          <div className="flex gap-6">
            <button 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => console.log('Navigate to: /terms')}
            >
              Terms
            </button>
            <button 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => console.log('Navigate to: /privacy')}
            >
              Privacy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};