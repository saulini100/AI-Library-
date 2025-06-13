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
  documentId: number;
  documentTitle: string;
  chapter: number;
  paragraph: number | null;
}

export default function AnnotationModal({
  isOpen,
  onClose,
  selectedText,
  documentId,
  documentTitle,
  chapter,
  paragraph,
}: AnnotationModalProps) {
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/annotations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/annotations/${documentId}/${chapter}`] });
      setNote("");
      onClose();
    },
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
          <DialogTitle className="text-xl font-semibold">Add Note</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add your personal notes and insights to this text
          </p>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          <div>
            <Label className="text-sm font-medium mb-3 block">Selected Text</Label>
            <div className="p-4 bg-muted border rounded-lg text-sm leading-relaxed">
              <span className="font-medium">"{selectedText}"</span>
            </div>
          </div>

          <div>
            <Label htmlFor="note" className="text-sm font-medium mb-3 block">
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
              {createAnnotationMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
