import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold campus-gradient bg-clip-text text-transparent">
              CampusHub
            </h1>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Search by course or faculty"
                className="search-input pl-10 w-full"
                aria-label="Search by course or faculty"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              className="hidden sm:inline-flex"
              onClick={() => console.log('Navigate to: /signin')}
            >
              Sign in
            </Button>
            <Button 
              className="campus-gradient text-white font-medium"
              onClick={() => console.log('Navigate to: /submit')}
            >
              Submit content
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              placeholder="Search by course or faculty"
              className="search-input pl-10 w-full"
              aria-label="Search by course or faculty"
            />
          </div>
        </div>
      </div>
    </header>
  );
};