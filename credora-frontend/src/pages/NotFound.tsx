import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, TrendingUp } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 p-6">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
          <TrendingUp className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-6xl font-bold gradient-text">404</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Button
          onClick={() => window.location.href = '/'}
          size="lg"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <Home className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
