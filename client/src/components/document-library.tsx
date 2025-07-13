import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  FileText, 
  File, 
  Calendar, 
  Trash2, 
  Search,
  Plus,
  Loader2,
  Eye,
  BookMarked,
  Zap,
  Star,
  Download,
  Upload,
  Library,
  Settings,
  Play,
  LayoutGrid,
  List,
  Filter,
  MoreHorizontal,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Document } from "@shared/schema";
import DocumentUpload from "./document-upload";
import { Input } from "@/components/ui/input";

interface DocumentLibraryProps {
  onSelectDocument: (document: Document, chapter?: number) => void;
}

// Enhanced loading skeleton component with animations
function DocumentCardSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-gradient-to-br from-muted to-muted/60 rounded-lg skeleton-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gradient-to-r from-muted to-muted/60 rounded skeleton-shimmer" />
              <div className="h-3 bg-gradient-to-r from-muted to-muted/60 rounded w-2/3 skeleton-shimmer" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-16 h-6 bg-gradient-to-r from-muted to-muted/60 rounded skeleton-shimmer" />
            <div className="w-12 h-6 bg-gradient-to-r from-muted to-muted/60 rounded skeleton-shimmer" />
          </div>
          <div className="w-20 h-4 bg-gradient-to-r from-muted to-muted/60 rounded skeleton-shimmer" />
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced document preview modal with animations
function DocumentPreviewModal({ document, isOpen, onClose, onSelect }: {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (doc: Document) => void;
}) {
  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 animate-in slide-in-from-left-3 duration-300 delay-100">
            <BookMarked className="h-5 w-5 text-primary animate-pulse" />
            {document.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center gap-4 animate-in slide-in-from-left-3 duration-300 delay-200">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <File className="h-4 w-4" />
              {document.filename}
            </div>
            <Badge variant="secondary" className="animate-in scale-in-50 duration-300 delay-300">
              <BookOpen className="h-3 w-3 mr-1" />
              {document.totalChapters} chapters
            </Badge>
            <Badge variant="outline" className="animate-in scale-in-50 duration-300 delay-400">
              {document.fileType.toUpperCase()}
            </Badge>
          </div>
          
          <Card className="animate-in slide-in-from-bottom-3 duration-300 delay-300">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="h-5 w-5 text-primary animate-pulse" />
                <h3 className="font-semibold">Document Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="animate-in slide-in-from-left-2 duration-300 delay-500">
                  <span className="text-muted-foreground">Added on:</span>
                  <p className="font-medium">{new Date(document.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
                <div className="animate-in slide-in-from-right-2 duration-300 delay-600">
                  <span className="text-muted-foreground">File type:</span>
                  <p className="font-medium">{document.fileType.toUpperCase()} Document</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 animate-in slide-in-from-bottom-3 duration-300 delay-400">
            <Button 
              onClick={() => onSelect(document)}
              className="flex-1 group hover:scale-105 transition-all duration-200 hover:shadow-lg"
            >
              <Eye className="mr-2 h-4 w-4 group-hover:animate-pulse" />
              Open Document
            </Button>
            <Button variant="outline" className="hover:scale-105 transition-all duration-200 hover:shadow-lg">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentLibrary({ onSelectDocument }: DocumentLibraryProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: () => apiRequest('/api/documents')
  });

  const { data: readingProgress = [] } = useQuery({
    queryKey: ['/api/reading-progress'],
    queryFn: () => apiRequest('/api/reading-progress')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document deleted",
        description: "The document has been removed from your library",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete the document. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    setShowUpload(false);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate(id);
    }
  };

  const handlePreview = (e: React.MouseEvent, document: Document) => {
    e.stopPropagation();
    setPreviewDocument(document);
    setPreviewOpen(true);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'pdf') return <BookOpen className="h-10 w-10 text-slate-700 dark:text-slate-300 group-hover:scale-110 transition-transform duration-200" />;
    return <BookOpen className="h-10 w-10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200" />;
  };

  const filteredDocuments = documents.filter((doc: Document) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get last reading position for a document
  const getLastReadingPosition = (documentId: number) => {
    // First check localStorage for document-specific position
    const savedPositions = JSON.parse(localStorage.getItem('readingPositions') || '{}');
    if (savedPositions[documentId]) {
      return savedPositions[documentId].chapter;
    }
    // Fall back to database progress
    const progress = readingProgress.filter((p: any) => p.documentId === documentId);
    if (progress.length > 0) {
      const lastChapter = Math.max(...progress.map((p: any) => p.chapter));
      return lastChapter;
    }
    return 1;
  };

  // Get reading progress percentage for a document
  const getReadingProgressPercentage = (document: Document) => {
    // Try localStorage first
    const savedPositions = JSON.parse(localStorage.getItem('readingPositions') || '{}');
    let lastChapter = 1;
    if (savedPositions[document.id]) {
      lastChapter = savedPositions[document.id].chapter;
    } else {
      const progress = readingProgress.filter((p: any) => p.documentId === document.id);
      if (progress.length > 0) {
        lastChapter = Math.max(...progress.map((p: any) => p.chapter));
      }
    }
    if (!document.totalChapters || document.totalChapters === 0) return 0;
    return Math.round((lastChapter / document.totalChapters) * 100);
  };

  // Show chapter summary modal or handle action
  const handleShowChapterSummary = (document: Document) => {
    // This is a stub. Implement your modal or summary logic here.
    alert(`Show chapter summary for: ${document.title}`);
  };

  if (showUpload) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 animate-in fade-in-0 duration-500">
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setShowUpload(false)}
              className="mb-4 hover:scale-105 transition-all duration-200 hover:shadow-md"
            >
              ← Back to Library
            </Button>
          </div>
          <DocumentUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section with staggered animations */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm rounded-b-2xl px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-400/20 to-purple-400/10 rounded-xl shadow-md">
              <Library className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">Document Library</h1>
              <p className="text-base text-slate-500 dark:text-slate-300">All your study documents in one place</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-full px-4 py-2 shadow-md hover:shadow-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-md"
              onClick={() => setShowUpload(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Document
            </Button>
          </div>
        </div>

        {/* Search and Controls Section with animations */}
        <div className="flex items-center gap-4 mt-8 mb-6">
          <div className="relative flex-1">
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-10 py-3 rounded-full shadow focus:shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-lg transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
            {searchTerm && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            className="rounded-full shadow-md hover:shadow-lg"
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            className="rounded-full shadow-md hover:shadow-lg"
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List className="h-5 w-5" />
          </Button>
        </div>

        {/* Content Section with staggered animations */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div 
                key={i} 
                className="animate-in slide-in-from-bottom-3 duration-500"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <DocumentCardSkeleton />
              </div>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in-0 zoom-in-95 duration-500">
            <div className="p-6 bg-muted/50 rounded-full mb-6 animate-pulse">
              <BookOpen className="h-16 w-16 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-3 animate-in slide-in-from-bottom-3 duration-500 delay-200">
              {searchTerm ? "No documents found" : "Your library is empty"}
            </h3>
            <p className="text-muted-foreground text-lg mb-8 text-center max-w-md animate-in slide-in-from-bottom-3 duration-500 delay-300">
              {searchTerm 
                ? "Try adjusting your search terms or browse all documents" 
                : "Start building your digital library by uploading your first document"
              }
            </p>
            {!searchTerm && (
              <Button 
                onClick={() => setShowUpload(true)}
                size="lg"
                className="animate-in slide-in-from-bottom-3 duration-500 delay-400 hover:scale-105 transition-all hover:shadow-xl group"
              >
                <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
                Upload Your First Document
              </Button>
            )}
          </div>
        ) : (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'grid-cols-1 max-w-6xl'}`}>
            {filteredDocuments.map((document: Document) => (
              <div
                key={document.id}
                className="group relative rounded-3xl bg-white/90 dark:bg-slate-900/90 shadow-xl hover:shadow-2xl border border-slate-200/50 dark:border-slate-700/50 transition-all duration-500 cursor-pointer hover:scale-[1.03] hover:-translate-y-1 overflow-hidden backdrop-blur-lg"
                onClick={() => onSelectDocument(document, getLastReadingPosition(document.id))}
              >
                {/* Gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-slate-800/50 pointer-events-none"></div>
                
                <div className="relative p-8">
                  {/* Header with icon and actions */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        {getFileIcon(document.fileType)}
                        {/* Status indicator */}
                        {getReadingProgressPercentage(document) > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                          {document.title}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {document.filename}
                        </p>
                      </div>
                    </div>
                    
                    {/* Action buttons - always visible on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 flex-shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handlePreview(e, document)}
                        className="rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 h-8 w-8 shadow-sm"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowChapterSummary(document);
                        }}
                        className="rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 h-8 w-8 shadow-sm"
                        title="Show summary"
                      >
                        <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(e, document.id)}
                        className="rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 h-8 w-8 shadow-sm"
                        disabled={deleteMutation.isPending}
                        title="Delete"
                      >
                        {deleteMutation.isPending ?
                          <Loader2 className="h-4 w-4 animate-spin text-red-600 dark:text-red-400" /> :
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        }
                      </Button>
                    </div>
                  </div>

                  {/* Info badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <BookOpen className="h-3 w-3 mr-1.5" />
                      {document.totalChapters} chapters
                    </span>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <File className="h-3 w-3 mr-1.5" />
                      {document.fileType.toUpperCase()}
                    </span>
                    {getReadingProgressPercentage(document) > 0 && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Play className="h-3 w-3 mr-1.5" />
                        In Progress
                      </span>
                    )}
                  </div>

                  {/* Progress section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {getReadingProgressPercentage(document) > 0 ? 'Reading Progress' : 'Ready to start'}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono">
                        {getReadingProgressPercentage(document)}%
                      </span>
                    </div>
                    
                    {/* Enhanced progress bar */}
                    <div className="relative w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${getReadingProgressPercentage(document)}%` }}
                      >
                        {getReadingProgressPercentage(document) > 0 && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                        )}
                      </div>
                    </div>
                    
                    {/* Status footer */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        {getReadingProgressPercentage(document) > 0 ? (
                          <>
                            <Clock className="h-3 w-3" />
                            <span>Chapter {getLastReadingPosition(document.id)}</span>
                          </>
                        ) : (
                          <>
                            <Star className="h-3 w-3" />
                            <span>New document</span>
                          </>
                        )}
                      </div>
                      <div className="text-slate-400 dark:text-slate-500">
                        {getReadingProgressPercentage(document) > 0 ? 'Continue reading' : 'Start reading'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Document Preview Modal */}
        <DocumentPreviewModal
          document={previewDocument}
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          onSelect={(doc) => onSelectDocument(doc, getLastReadingPosition(doc.id))}
        />
      </div>
    </div>
  );
}