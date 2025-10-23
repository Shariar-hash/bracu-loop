import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";

export function GoogleSignIn() {
  const { handleCredentialResponse } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.google && buttonRef.current) {
      // Clear any existing content
      buttonRef.current.innerHTML = '';
      
      try {
        // Initialize Google Sign-In
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: 'popup',
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          text: "signin_with",
          width: 250,
          locale: "en",
        });
      } catch (error) {
        // Silently handle error
      }
    }
  }, [handleCredentialResponse]);

  const handleManualSignIn = () => {
    if (window.google) {
      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
      });
      
      window.google.accounts.id.prompt();
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">Alternative Sign-In Methods:</h3>
      
      {/* Google's rendered button */}
      <div>
        <p className="text-sm mb-2">Google Rendered Button (All Emails):</p>
        <div className="google-signin-container" ref={buttonRef}></div>
      </div>

      {/* Manual prompt trigger */}
      <div>
        <p className="text-sm mb-2">Manual Prompt (All Emails):</p>
        <Button onClick={handleManualSignIn} variant="outline">
          Trigger Google Prompt (All Emails)
        </Button>
      </div>
    </div>
  );
}
