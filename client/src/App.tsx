import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./components/theme-provider";
import { AgentSocketProvider } from "./contexts/AgentSocketContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import DocumentReader from "@/pages/document-reader";
import PerformanceDashboard from "@/pages/performance-dashboard";
import AgentDashboard from "@/pages/agent-dashboard";
import SearchPage from "@/pages/search";
import BookmarksPage from "@/pages/bookmarks";
import NotesPage from "@/pages/notes";
import HighlightsPage from "@/pages/highlights";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";
import DocumentLibrary from "@/components/document-library";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

function Router() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Show welcome message on first load
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      toast({
        title: "Welcome to Bible Companion",
        description: "Start by uploading a document or exploring the library.",
      });
      localStorage.setItem('hasVisited', 'true');
    }
  }, [toast]);

  const handleSelectDocument = (document: any, chapter = 1) => {
    setLocation(`/reader/${document.id}/${chapter}`);
  };

  return (
    <Switch>
      <Route path="/" component={() => <DocumentLibrary onSelectDocument={handleSelectDocument} />} />
      <Route path="/library" component={() => <DocumentLibrary onSelectDocument={handleSelectDocument} />} />
      <Route path="/reader/:documentId/:chapter" component={DocumentReader} />
      <Route path="/search" component={SearchPage} />
      <Route path="/bookmarks" component={BookmarksPage} />
      <Route path="/notes" component={NotesPage} />
      <Route path="/highlights" component={HighlightsPage} />
      <Route path="/performance" component={PerformanceDashboard} />
      <Route path="/agents" component={AgentDashboard} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider defaultTheme="system" storageKey="document-companion-theme">
          <AgentSocketProvider>
            <TooltipProvider>
              <div className="min-h-screen bg-background font-sans antialiased">
                <Router />
                <Toaster />
              </div>
            </TooltipProvider>
          </AgentSocketProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
