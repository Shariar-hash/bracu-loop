import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
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

  // Skip the Google Identity Services entirely - use Supabase for all sign-ins
  useEffect(() => {
    // Don't initialize Google Identity Services anymore
    // All sign-ins will go through Supabase OAuth redirect
  }, [user, handleCredentialResponse]);

  const handleMobileSignIn = async () => {
    try {
      // Use redirect instead of popup to avoid COOP issues
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
            // Don't use hd parameter - let any Google account show up, 
            // but we'll filter in the callback
          }
        }
      });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      toast.error('Sign-in failed. Please try again.');
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
      {/* Desktop Google Sign-in Button */}
      <Button
        variant="outline"
        onClick={handleMobileSignIn}
        className="hidden sm:inline-flex"
      >
        Sign in with Google
      </Button>

      {/* Mobile Sign-in Button */}
      <Button
        variant="ghost"
        size="sm"
        className="sm:hidden text-xs px-3 py-2 z-50"
        onClick={handleMobileSignIn}
        onTouchStart={handleMobileSignIn}
        aria-label="Sign in with Google"
      >
        Sign in
      </Button>
    </>
  );
}
