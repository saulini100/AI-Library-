import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  FileText, 
  File, 
  Calendar, 
  Trash2, 
  Search,
  Plus,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Document } from "@shared/schema";
import DocumentUpload from "./document-upload";
import { Input } from "@/components/ui/input";

interface DocumentLibraryProps {
  onSelectDocument: (document: Document, chapter?: number) => void;
}

export default function DocumentLibrary({ onSelectDocument }: DocumentLibraryProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: () => apiRequest('/api/documents')
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

  const getFileIcon = (fileType: string) => {
    if (fileType === 'pdf') return <File className="h-5 w-5 text-red-500" />;
    return <FileText className="h-5 w-5 text-blue-500" />;
  };

  const filteredDocuments = documents.filter((doc: Document) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showUpload) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => setShowUpload(false)}
            className="mb-4"
          >
            ← Back to Library
          </Button>
        </div>
        <DocumentUpload onUploadSuccess={handleUploadSuccess} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Library</h1>
          <p className="text-muted-foreground">
            Upload and read PDF and TXT documents with automatic chapter detection
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm ? "No documents found" : "No documents yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? "Try adjusting your search terms" 
              : "Upload your first PDF or TXT document to get started"
            }
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowUpload(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((document: Document) => (
            <Card 
              key={document.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelectDocument(document)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getFileIcon(document.fileType)}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-2">
                        {document.title}
                      </CardTitle>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDelete(e, document.id)}
                    disabled={deleteMutation.isPending}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="text-sm">
                  {document.filename}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {document.totalChapters} chapter{document.totalChapters !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="outline">
                      {document.fileType.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="text-xs">
                      {new Date(document.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}