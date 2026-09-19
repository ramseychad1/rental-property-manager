import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-8">
      <div className="text-center space-y-5 max-w-md">
        <div className="grid place-items-center w-14 h-14 rounded-2xl bg-secondary mx-auto">
          <Compass className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="font-display text-7xl font-extrabold tracking-tight">404</div>
        <h1 className="font-display text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild>
          <Link to="/"><Home className="w-4 h-4" /> Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
