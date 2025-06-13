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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Annotation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Selected Text</Label>
            <div className="mt-1 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-sm">
              "{selectedText}"
            </div>
          </div>

          <div>
            <Label htmlFor="note" className="text-sm font-medium">
              Your Note
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your thoughts about this verse..."
              rows={4}
              className="mt-1 resize-none"
            />
          </div>

          <div className="flex space-x-3">
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
              disabled={!note.trim() || !verse || createAnnotationMutation.isPending}
            >
              {createAnnotationMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
