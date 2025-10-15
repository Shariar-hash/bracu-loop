import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function GoogleSignInButton() {
  const { user, signOut, isLoading, handleCredentialResponse } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);

  // Initialize Google Sign-in button with better mobile support
  useEffect(() => {
    if (window.google && buttonRef.current && !user) {
      // Clear any existing content
      buttonRef.current.innerHTML = '';
      
      try {
        // Initialize with domain hint
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: 'popup',
          hd: 'g.bracu.ac.bd', // Only show BRACU emails
        });

        // Responsive button sizing
        const isMobile = window.innerWidth < 768;
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: isMobile ? "medium" : "large",
          type: "standard",
          text: isMobile ? "signin" : "signin_with",
          width: isMobile ? 150 : 200,
          locale: "en",
        });
        
        // Hide fallback button since Google button loaded
        const fallback = buttonRef.current?.parentElement?.querySelector('.google-signin-fallback') as HTMLElement;
        if (fallback) {
          fallback.style.display = 'none';
        }
      } catch (error) {
        console.warn('Google Sign-In button error:', error);
        // Show fallback button if Google button fails
        const fallback = buttonRef.current?.parentElement?.querySelector('.google-signin-fallback') as HTMLElement;
        if (fallback) {
          fallback.style.display = 'inline-flex';
        }
      }
    }
    
    // Show fallback after timeout if Google button doesn't load
    const timeout = setTimeout(() => {
      if (buttonRef.current && !user) {
        const hasGoogleButton = buttonRef.current.querySelector('iframe');
        if (!hasGoogleButton) {
          const fallback = buttonRef.current?.parentElement?.querySelector('.google-signin-fallback') as HTMLElement;
          if (fallback) {
            fallback.style.display = 'inline-flex';
          }
        }
      }
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, [user, handleCredentialResponse]);

  const handleMobileSignIn = () => {
    if (window.google) {
      // Initialize with domain hint before prompting
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
        hd: 'g.bracu.ac.bd', // Only show BRACU emails
      });
      
      window.google.accounts.id.prompt();
    }
  };

  if (isLoading) {
    return (
      <>
        <Button variant="ghost" disabled className="hidden sm:inline-flex">
          Loading...
        </Button>
        <Button variant="ghost" size="icon" disabled className="sm:hidden">
          <User className="h-5 w-5" />
        </Button>
      </>
    );
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 p-2 hover:bg-accent">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.picture} alt={user.name} />
              <AvatarFallback className="bg-primary/10">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline-block font-medium">
              {user.name.split(' ')[0]}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="flex items-center space-x-3 p-3 border-b">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.picture} alt={user.name} />
              <AvatarFallback className="bg-primary/10">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground leading-none">{user.email}</p>
            </div>
          </div>
          <DropdownMenuItem onClick={signOut} className="cursor-pointer p-3">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      {/* Desktop Google Sign-in Button with Fallback */}
      <div className="hidden sm:flex items-center gap-2">
        <div className="google-signin-container" ref={buttonRef}></div>
        {/* Fallback button if Google doesn't load */}
        <Button 
          variant="outline" 
          onClick={handleMobileSignIn}
          className="google-signin-fallback"
          style={{ display: 'none' }}
        >
          Sign in with Google
        </Button>
      </div>
      
      {/* Mobile Sign-in Button */}
      <Button 
        variant="ghost" 
        size="sm"
        className="sm:hidden text-xs px-2"
        onClick={handleMobileSignIn}
      >
        Sign in
      </Button>
    </>
  );
}
