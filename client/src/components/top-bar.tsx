import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { User, MessageSquare, Brain, Zap, Bot, FileText, Target, GraduationCap } from "lucide-react";

interface TopBarProps {
  book: string;
  chapter: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleAiChat?: () => void;
  onToggleAutoLearning?: () => void;
  onToggleChapterNotes?: () => void;
  onToggleDiscussionAgent?: () => void;
  onTogglePowerSummaries?: () => void;
  onToggleQuizAgent?: () => void;
  onToggleTeacherAgent?: () => void;
  aiChatOpen?: boolean;
  autoLearningOpen?: boolean;
  chapterNotesOpen?: boolean;
  discussionAgentOpen?: boolean;
  powerSummariesOpen?: boolean;
  quizAgentOpen?: boolean;
  teacherAgentOpen?: boolean;
}

export default function TopBar({
  book,
  chapter,
  darkMode,
  onToggleDarkMode,
  onToggleAiChat,
  onToggleAutoLearning,
  onToggleChapterNotes,
  onToggleDiscussionAgent,
  onTogglePowerSummaries,
  onToggleQuizAgent,
  onToggleTeacherAgent,
  aiChatOpen = false,
  autoLearningOpen = false,
  chapterNotesOpen = false,
  discussionAgentOpen = false,
  powerSummariesOpen = false,
  quizAgentOpen = false,
  teacherAgentOpen = false,
}: TopBarProps) {


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-xl shadow-sm supports-[backdrop-filter]:bg-background/80 h-16 flex items-center">
      <div className="container flex h-full items-center px-4 lg:px-6">
        


        {/* Center Section - Title and Progress */}
        <div className="flex-1 flex flex-col items-center justify-center px-2 sm:px-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <h1 className="text-sm sm:text-base lg:text-lg font-semibold tracking-tight text-foreground truncate max-w-[200px] sm:max-w-[300px] lg:max-w-none">
              {book}
            </h1>
            <div className="flex items-center space-x-1 px-1.5 sm:px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
              <span className="text-xs font-medium text-primary hidden sm:inline">Chapter</span>
              <span className="text-xs font-bold text-primary">Ch. {chapter}</span>
            </div>
          </div>
        </div>

        {/* Right Section - Tools and Settings */}
        <div className="flex items-center space-x-2 lg:space-x-3">
          {/* AI Tools Section */}
          <div className="hidden md:flex lg:flex items-center space-x-1">
            {/* Study Tools Group */}
            <div className="hidden lg:flex items-center space-x-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleChapterNotes}
                className={`h-8 px-2.5 transition-all duration-200 ${
                  chapterNotesOpen 
                    ? 'bg-green-500/10 text-green-700 border border-green-200/50' 
                    : 'hover:bg-muted/60'
                }`}
                title="Chapter Notes"
              >
                <FileText className="h-4 w-4 mr-1.5" />
                <span className="text-xs font-medium">Notes</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleAutoLearning}
                className={`h-8 px-2.5 transition-all duration-200 ${
                  autoLearningOpen 
                    ? 'bg-purple-500/10 text-purple-700 border border-purple-200/50' 
                    : 'hover:bg-muted/60'
                }`}
                title="Auto Learning"
              >
                <Brain className="h-4 w-4 mr-1.5" />
                <span className="text-xs font-medium">Learn</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onTogglePowerSummaries}
                className={`h-8 px-2.5 transition-all duration-200 ${
                  powerSummariesOpen 
                    ? 'bg-yellow-500/10 text-yellow-700 border border-yellow-200/50' 
                    : 'hover:bg-muted/60'
                }`}
                title="Power Summaries"
              >
                <Zap className="h-4 w-4 mr-1.5" />
                <span className="text-xs font-medium">Summary</span>
              </Button>
            </div>

            {/* Interactive Tools Group */}
            <div className="hidden lg:flex items-center space-x-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleAiChat}
                className={`h-8 px-2.5 transition-all duration-200 ${
                  aiChatOpen 
                    ? 'bg-blue-500/10 text-blue-700 border border-blue-200/50' 
                    : 'hover:bg-muted/60'
                }`}
                title="AI Chat Assistant"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                <span className="text-xs font-medium">Chat</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleDiscussionAgent}
                className={`h-8 px-2.5 transition-all duration-200 ${
                  discussionAgentOpen 
                    ? 'bg-indigo-500/10 text-indigo-700 border border-indigo-200/50' 
                    : 'hover:bg-muted/60'
                }`}
                title="Discussion Agent"
              >
                <Bot className="h-4 w-4 mr-1.5" />
                <span className="text-xs font-medium">Discuss</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleQuizAgent}
                className={`h-8 px-2.5 transition-all duration-200 ${
                  quizAgentOpen 
                    ? 'bg-red-500/10 text-red-700 border border-red-200/50' 
                    : 'hover:bg-muted/60'
                }`}
                title="Quiz Agent"
              >
                <Target className="h-4 w-4 mr-1.5" />
                <span className="text-xs font-medium">Quiz</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleTeacherAgent}
                className={`h-8 px-2.5 transition-all duration-200 ${
                  teacherAgentOpen 
                    ? 'bg-orange-500/10 text-orange-700 border border-orange-200/50' 
                    : 'hover:bg-muted/60'
                }`}
                title="Teacher Agent"
              >
                <GraduationCap className="h-4 w-4 mr-1.5" />
                <span className="text-xs font-medium">Teacher</span>
              </Button>
            </div>

            {/* Medium Screen Tools - Compact */}
            <div className="hidden md:flex lg:hidden items-center space-x-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleAiChat}
                className={`h-8 px-2 transition-all duration-200 ${
                  aiChatOpen 
                    ? 'bg-blue-500/10 text-blue-700 border border-blue-200/50' 
                    : 'hover:bg-muted/60'
                }`}
                title="AI Chat"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleChapterNotes}
                className={`h-8 px-2 transition-all duration-200 ${
                  chapterNotesOpen 
                    ? 'bg-green-500/10 text-green-700 border border-green-200/50' 
                    : 'hover:bg-muted/60'
                }`}
                title="Notes"
              >
                <FileText className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onTogglePowerSummaries}
                className={`h-8 px-2 transition-all duration-200 ${
                  powerSummariesOpen 
                    ? 'bg-yellow-500/10 text-yellow-700 border border-yellow-200/50' 
                    : 'hover:bg-muted/60'
                }`}
                title="Summary"
              >
                <Zap className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleTeacherAgent}
                className={`h-8 px-2 transition-all duration-200 ${
                  teacherAgentOpen 
                    ? 'bg-orange-500/10 text-orange-700 border border-orange-200/50' 
                    : 'hover:bg-muted/60'
                }`}
                title="Teacher"
              >
                <GraduationCap className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile AI Tools - Minimal */}
          <div className="md:hidden flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAiChat}
              className={`h-8 w-8 p-0 transition-all duration-200 ${
                aiChatOpen 
                  ? 'bg-blue-500/10 text-blue-700 border border-blue-200/50' 
                  : 'hover:bg-muted/60'
              }`}
              title="AI Chat"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleChapterNotes}
              className={`h-8 w-8 p-0 transition-all duration-200 ${
                chapterNotesOpen 
                  ? 'bg-green-500/10 text-green-700 border border-green-200/50' 
                  : 'hover:bg-muted/60'
              }`}
              title="Notes"
            >
              <FileText className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTeacherAgent}
              className={`h-8 w-8 p-0 transition-all duration-200 ${
                teacherAgentOpen 
                  ? 'bg-orange-500/10 text-orange-700 border border-orange-200/50' 
                  : 'hover:bg-muted/60'
              }`}
              title="Teacher"
            >
              <GraduationCap className="h-4 w-4" />
            </Button>
          </div>



          {/* Settings Section */}
          <div className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/50">
            <LanguageSelector />
            <ThemeToggle />
          </div>

          {/* Mobile Settings */}
          <div className="sm:hidden flex items-center space-x-1">
            <ThemeToggle />
          </div>

          {/* User Profile */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-lg hover:bg-muted/60 transition-all duration-200"
          >
            <User className="h-4 w-4" />
            <span className="sr-only">User profile</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
