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
import { apiRequest } from "@/lib/queryClient";

interface AnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  book: string;
  chapter: number;
  verse: number | null;
}

export default function AnnotationModal({
  isOpen,
  onClose,
  selectedText,
  book,
  chapter,
  verse,
}: AnnotationModalProps) {
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const createAnnotationMutation = useMutation({
    mutationFn: async (data: {
      book: string;
      chapter: number;
      verse: number;
      selectedText: string;
      note: string;
    }) => {
      await apiRequest("POST", "/api/annotations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/annotations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/annotations", book, chapter] });
      setNote("");
      onClose();
    },
  });

  const handleSave = () => {
    if (!note.trim() || !verse) return;

    createAnnotationMutation.mutate({
      book,
      chapter,
      verse,
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
          <DialogTitle className="text-xl font-semibold text-foreground">Create Annotation</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add your personal notes and insights to this verse
          </p>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          <div>
            <Label className="text-sm font-medium text-foreground mb-3 block">Selected Text</Label>
            <div className="p-4 bg-muted/50 border border-border rounded-xl text-sm text-foreground leading-relaxed">
              <span className="text-primary font-medium">"{selectedText}"</span>
            </div>
          </div>

          <div>
            <Label htmlFor="note" className="text-sm font-medium text-foreground mb-3 block">
              Your Annotation
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Share your thoughts, insights, or reflections on this verse..."
              rows={5}
              className="resize-none border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-11 border-border text-foreground hover:bg-muted"
              disabled={createAnnotationMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={!note.trim() || !verse || createAnnotationMutation.isPending}
            >
              {createAnnotationMutation.isPending ? "Saving..." : "Save Annotation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
