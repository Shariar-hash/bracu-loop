import { ThemeToggle } from "@/components/ThemeToggle";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold campus-gradient bg-clip-text text-transparent">
              BRACU Loop
            </h1>
          </div>

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