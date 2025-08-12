import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  blurb: string;
  modalTitle: string;
  modalText: string;
  ctaText: string;
  ctaLink: string;
}

export const FeatureCard = ({
  icon: Icon,
  title,
  blurb,
  modalTitle,
  modalText,
  ctaText,
  ctaLink,
}: FeatureCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const protectedRoutes = ['/review', '/notes', '/questions', '/suggestions'];
  
  const handleNavigation = () => {
    const isProtected = protectedRoutes.includes(ctaLink);
    
    if (isProtected && !user) {
      toast.error('Please sign in to access this feature');
      setIsOpen(false);
      return;
    }
    
    navigate(ctaLink);
    setIsOpen(false);
  };

  return (
    <>
      <Card 
        className="feature-card cursor-pointer group h-full"
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        aria-label={`Learn more about ${title}`}
      >
        <CardContent className="p-6 flex flex-col items-center text-center h-full">
          <div className="mb-4 p-3 rounded-lg bg-secondary group-hover:bg-accent transition-colors duration-200">
            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <h3 className="font-semibold text-lg mb-2 text-card-foreground">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{blurb}</p>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <DialogTitle className="text-xl font-semibold">{modalTitle}</DialogTitle>
            </div>
            <DialogDescription className="text-left leading-relaxed">
              {modalText}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <Button 
              onClick={handleNavigation}
              className="w-full"
            >
              {ctaText}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};