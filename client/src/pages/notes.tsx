import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  StickyNote, 
  Search, 
  Plus, 
  FolderOpen, 
  Tag, 
  Calendar, 
  FileText, 
  Edit, 
  Trash2,
  X,
  ArrowLeft
} from 'lucide-react';

// Import our new utilities
import { useSearchableList } from '@/hooks/use-searchable-list';
import { useStandardToasts } from '@/hooks/use-standard-toasts';
import { useLocalStorageBoolean } from '@/hooks/use-local-storage-state';
import { STORAGE_KEYS, ROUTES, DEFAULTS } from '@/lib/constants';
import { formatTimestamp, buildDocumentUrl } from '@/lib/data-utils';

import { 
  getNotes, 
  saveNote, 
  updateNote, 
  deleteNote, 
  getNoteCategories, 
  getAllTags,
  type Note as NoteType 
} from '@/lib/storage';

export default function NotesPage() {
  const [location, setLocation] = useLocation();
  const toasts = useStandardToasts();
  
  // Use our new localStorage hook for dialog state
  const [isDialogOpen, setIsDialogOpen] = useLocalStorageBoolean('notesDialogOpen', false);
  
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [editingNote, setEditingNote] = useState<Partial<NoteType>>({});
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Use our new searchable list hook
  const {
    searchQuery,
    setSearchQuery,
    filteredItems: filteredNotes,
    filterValues,
    updateFilter,
    totalItems,
    filteredCount
  } = useSearchableList({
    items: notes,
    searchFields: ['title', 'content'],
    filters: {
      category: {
        value: 'all',
        condition: (note, value) => value === 'all' || note.category === value
      }
    }
  });

  // Load notes and metadata
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = () => {
    const allNotes = getNotes();
    setNotes(allNotes);
    setCategories(['all', ...getNoteCategories()]);
    setTags(['all', ...getAllTags()]);
  };

  const handleNoteClick = (note: NoteType) => {
    if (note.documentId && note.chapter) {
      setLocation(buildDocumentUrl(note.documentId, note.chapter));
    }
  };

  const handleDeleteNote = (id: string) => {
    if (deleteNote(id)) {
      loadNotes();
      toasts.success.deleted('Note');
    } else {
      toasts.error.general('delete note');
    }
  };

  const handleEditNote = (note: NoteType) => {
    setIsEditing(note.id);
    setEditingNote(note);
    setIsDialogOpen(true);
  };

  const handleSaveNote = () => {
    if (!editingNote.title || !editingNote.content) {
      toasts.error.validation('Please provide a title and content for the note.');
      return;
    }

    if (isEditing) {
      // Update existing note
      const updated = updateNote(isEditing, editingNote);
      if (updated) {
        loadNotes();
        toasts.success.updated('Note');
      }
    } else {
      // Create new note
      const newNote = saveNote({
        title: editingNote.title,
        content: editingNote.content,
        category: editingNote.category || DEFAULTS.CATEGORY.NOTE,
        tags: editingNote.tags || [],
        documentId: editingNote.documentId,
        documentTitle: editingNote.documentTitle,
        chapter: editingNote.chapter,
        paragraph: editingNote.paragraph,
      });
      
      if (newNote) {
        loadNotes();
        toasts.success.created('Note');
      }
    }

    setEditingNote({});
    setIsEditing(null);
    setIsDialogOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingNote({});
    setIsEditing(null);
    setIsDialogOpen(false);
  };

  const handleAddTag = (tag: string) => {
    if (tag && !editingNote.tags?.includes(tag)) {
      setEditingNote({
        ...editingNote,
        tags: [...(editingNote.tags || []), tag]
      });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditingNote({
      ...editingNote,
      tags: editingNote.tags?.filter(tag => tag !== tagToRemove) || []
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center gap-2 hover:bg-muted/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-2">Notes</h1>
        <p className="text-muted-foreground">
          Your study notes and personal reflections ({filteredCount} of {totalItems})
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select 
            value={filterValues.category || 'all'} 
            onValueChange={(value) => updateFilter('category', value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setIsEditing(null);
                setEditingNote({});
              }}>
                <Plus className="w-4 h-4 mr-2" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? 'Edit Note' : 'Create New Note'}
                </DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Modify your note details below.' : 'Add a new note to your collection.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Note title..."
                    value={editingNote.title || ''}
                    onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Write your note content here..."
                    value={editingNote.content || ''}
                    onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                    rows={8}
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="Category (optional)"
                    value={editingNote.category || ''}
                    onChange={(e) => setEditingNote({ ...editingNote, category: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editingNote.tags?.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Add tag and press Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          handleAddTag(input.value.trim());
                          input.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveNote}>
                  {isEditing ? 'Update Note' : 'Save Note'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredNotes.map((note) => (
          <Card 
            key={note.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 group"
            onClick={() => handleNoteClick(note)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditNote(note);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {note.documentTitle && (
                  <>
                    <FileText className="w-3 h-3" />
                    <span>{note.documentTitle}</span>
                    {note.chapter && <span>Chapter {note.chapter}</span>}
                  </>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground line-clamp-4 mb-4">
                {note.content}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {note.category && (
                    <Badge variant="outline" className="text-xs">
                      <FolderOpen className="w-3 h-3 mr-1" />
                      {note.category}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {formatTimestamp(note.timestamp)}
                </div>
              </div>
              
              {note.tags && note.tags.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <Tag className="w-2 h-2 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-12">
          <StickyNote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchQuery || filterValues.category !== 'all' ? 'No notes found' : 'No notes yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || filterValues.category !== 'all' 
              ? 'Try adjusting your search or filters.' 
              : 'Create your first note to get started.'}
          </p>
          {!searchQuery && filterValues.category === 'all' && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Note
            </Button>
          )}
        </div>
      )}
    </div>
  );
} 