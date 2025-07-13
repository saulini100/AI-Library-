import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StickyNote, Bookmark, Edit3, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  documentId: number;
  documentTitle: string;
  chapter: number;
  paragraph: number | null;
  onAnnotationSaved?: (annotation: any) => void;
}

export default function AnnotationModal({
  isOpen,
  onClose,
  selectedText,
  documentId,
  documentTitle,
  chapter,
  paragraph,
  onAnnotationSaved,
}: AnnotationModalProps) {
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();



  const createAnnotationMutation = useMutation({
    mutationFn: async (data: {
      documentId: number;
      chapter: number;
      paragraph: number | null;
      selectedText: string;
      note: string;
    }) => {
      return await apiRequest("/api/annotations", { method: "POST", body: data });
    },
    onSuccess: (data) => {
      // queryClient.invalidateQueries({ queryKey: ["/api/annotations"] });
      // queryClient.invalidateQueries({ queryKey: [`/api/annotations/${documentId}/${chapter}`] });
      
      // Call the callback with the saved annotation (this will apply highlighting)
      onAnnotationSaved?.({ ...data, note });
      
      setNote("");
      onClose();
      
      toast({
        title: "Note saved successfully",
        description: "Your note has been saved and the text has been highlighted.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save note",
        description: "There was a problem saving your note. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    if (!note.trim()) return;

    createAnnotationMutation.mutate({
      documentId,
      chapter,
      paragraph,
      selectedText,
      note: note.trim(),
    });
  };

  const handleClose = () => {
    setNote("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg border-border">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-amber-500" />
            Add Study Note
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add your personal notes and insights to this text
          </p>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          <div>
            <Label className="text-sm font-medium mb-3 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-blue-500" />
              Selected Text
            </Label>
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-700 rounded-lg text-sm leading-relaxed">
              <span className="font-bold text-black dark:text-white">"{selectedText}"</span>
            </div>
          </div>

          <div>
            <Label htmlFor="note" className="text-sm font-medium mb-3 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-green-500" />
              Your Note
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Share your thoughts, insights, or reflections on this text..."
              rows={5}
              className="resize-none"
            />
            
            {/* Character counter */}
            <div className="mt-2 text-xs text-muted-foreground text-right">
              {note.length} characters
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={createAnnotationMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={!note.trim() || createAnnotationMutation.isPending}
            >
              {createAnnotationMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving Note...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Save Note
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
