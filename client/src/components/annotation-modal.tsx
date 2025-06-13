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
          <DialogTitle className="text-xl font-semibold text-gray-900">Add Note</DialogTitle>
          <p className="text-sm text-gray-500">
            Add your personal notes and insights to this verse
          </p>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          <div>
            <Label className="text-sm font-medium text-gray-900 mb-3 block">Selected Text</Label>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 leading-relaxed">
              <span className="font-medium">"{selectedText}"</span>
            </div>
          </div>

          <div>
            <Label htmlFor="note" className="text-sm font-medium text-gray-900 mb-3 block">
              Your Note
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Share your thoughts, insights, or reflections on this verse..."
              rows={5}
              className="resize-none border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={createAnnotationMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-11 bg-black hover:bg-gray-800 text-white font-medium"
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
