import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("UI error boundary caught:", error);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen grid place-items-center p-6 bg-background">
        <Card className="max-w-md w-full p-6 rounded-xl text-center space-y-4">
          <div className="mx-auto grid place-items-center w-12 h-12 rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-display font-semibold">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              The admin panel recovered safely. Refresh this view and try again.
            </p>
          </div>
          <Button onClick={this.reset}>
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
        </Card>
      </div>
    );
  }
}
