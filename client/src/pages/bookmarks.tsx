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
  Bookmark, 
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
import { useToast } from '@/hooks/use-toast';
import { 
  getBookmarks, 
  saveBookmark, 
  updateBookmark, 
  deleteBookmark, 
  getBookmarkFolders, 
  getAllTags,
  type Bookmark as BookmarkType 
} from '@/lib/storage';

export default function BookmarksPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Partial<BookmarkType>>({});
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Load bookmarks and metadata
  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = () => {
    const allBookmarks = getBookmarks();
    setBookmarks(allBookmarks);
    setFolders(['all', ...getBookmarkFolders()]);
    setTags(['all', ...getAllTags()]);
  };

  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === 'all' || bookmark.folder === selectedFolder;
    const matchesTag = selectedTag === 'all' || bookmark.tags.includes(selectedTag);
    return matchesSearch && matchesFolder && matchesTag;
  });

  const handleBookmarkClick = (bookmark: BookmarkType) => {
    setLocation(`/reader/${bookmark.documentId}/${bookmark.chapter}`);
  };

  const handleDeleteBookmark = (id: string) => {
    if (deleteBookmark(id)) {
      loadBookmarks();
      toast({
        title: "Bookmark deleted",
        description: "The bookmark has been removed from your collection.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete bookmark.",
        variant: "destructive",
      });
    }
  };

  const handleEditBookmark = (bookmark: BookmarkType) => {
    setIsEditing(bookmark.id);
    setEditingBookmark(bookmark);
    setIsDialogOpen(true);
  };

  const handleSaveBookmark = () => {
    if (!editingBookmark.title || !editingBookmark.content) {
      toast({
        title: "Missing information",
        description: "Please provide a title and content for the bookmark.",
        variant: "destructive",
      });
      return;
    }

    if (isEditing) {
      // Update existing bookmark
      const updated = updateBookmark(isEditing, editingBookmark);
      if (updated) {
        loadBookmarks();
        toast({
          title: "Bookmark updated",
          description: "Your bookmark has been successfully updated.",
        });
      }
    } else {
      // Create new bookmark
      const newBookmark = saveBookmark({
        title: editingBookmark.title,
        content: editingBookmark.content,
        documentId: editingBookmark.documentId || '',
        documentTitle: editingBookmark.documentTitle || '',
        chapter: editingBookmark.chapter || 1,
        paragraph: editingBookmark.paragraph,
        folder: editingBookmark.folder || 'General',
        tags: editingBookmark.tags || [],
        notes: editingBookmark.notes,
      });
      
      if (newBookmark) {
        loadBookmarks();
        toast({
          title: "Bookmark created",
          description: "Your new bookmark has been saved.",
        });
      }
    }

    setEditingBookmark({});
    setIsEditing(null);
    setIsDialogOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingBookmark({});
    setIsEditing(null);
    setIsDialogOpen(false);
  };

  const handleAddTag = (tag: string) => {
    if (tag && !editingBookmark.tags?.includes(tag)) {
      setEditingBookmark({
        ...editingBookmark,
        tags: [...(editingBookmark.tags || []), tag]
      });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditingBookmark({
      ...editingBookmark,
      tags: editingBookmark.tags?.filter(tag => tag !== tagToRemove) || []
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
        <h1 className="text-3xl font-bold mb-2">Bookmarks</h1>
        <p className="text-muted-foreground">
          Your saved passages and important references
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              {folders.map(folder => (
                <SelectItem key={folder} value={folder}>
                  {folder === 'all' ? 'All Folders' : folder}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              {tags.map(tag => (
                <SelectItem key={tag} value={tag}>
                  {tag === 'all' ? 'All Tags' : tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingBookmark({});
                setIsEditing(null);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Bookmark
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? 'Edit Bookmark' : 'Add New Bookmark'}
                </DialogTitle>
                <DialogDescription>
                  Create a new bookmark to save important passages for later reference.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Bookmark title..."
                    value={editingBookmark.title || ''}
                    onChange={(e) => setEditingBookmark({...editingBookmark, title: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    placeholder="Selected text or your notes..."
                    value={editingBookmark.content || ''}
                    onChange={(e) => setEditingBookmark({...editingBookmark, content: e.target.value})}
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="documentTitle">Document</Label>
                    <Input
                      id="documentTitle"
                      placeholder="Document title..."
                      value={editingBookmark.documentTitle || ''}
                      onChange={(e) => setEditingBookmark({...editingBookmark, documentTitle: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="chapter">Chapter</Label>
                    <Input
                      id="chapter"
                      type="number"
                      placeholder="Chapter number..."
                      value={editingBookmark.chapter || ''}
                      onChange={(e) => setEditingBookmark({...editingBookmark, chapter: parseInt(e.target.value) || 1})}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="folder">Folder</Label>
                  <Input
                    id="folder"
                    placeholder="Folder name..."
                    value={editingBookmark.folder || ''}
                    onChange={(e) => setEditingBookmark({...editingBookmark, folder: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    value={editingBookmark.notes || ''}
                    onChange={(e) => setEditingBookmark({...editingBookmark, notes: e.target.value})}
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editingBookmark.tags?.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
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
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.target as HTMLInputElement;
                          handleAddTag(input.value.trim());
                          input.value = '';
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="Add tag..."]') as HTMLInputElement;
                        if (input) {
                          handleAddTag(input.value.trim());
                          input.value = '';
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveBookmark}>
                  {isEditing ? 'Update' : 'Save'} Bookmark
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bookmarks Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredBookmarks.map((bookmark) => (
          <Card 
            key={bookmark.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 group"
            onClick={() => handleBookmarkClick(bookmark)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {bookmark.title}
                  </CardTitle>
                  {bookmark.documentTitle && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <FileText className="w-3 h-3" />
                      <span>{bookmark.documentTitle}</span>
                      {bookmark.chapter && (
                        <span>Chapter {bookmark.chapter}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditBookmark(bookmark);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBookmark(bookmark.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                {bookmark.content}
              </p>
              
              {bookmark.notes && (
                <div className="mb-3 p-2 bg-muted/50 rounded text-xs">
                  <p className="text-muted-foreground">{bookmark.notes}</p>
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3 h-3" />
                  {bookmark.folder}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(bookmark.timestamp).toLocaleDateString()}
                </div>
              </div>
              
              {bookmark.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {bookmark.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      <Tag className="w-2 h-2 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredBookmarks.length === 0 && (
        <div className="text-center py-12">
          <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchQuery || selectedFolder !== 'all' || selectedTag !== 'all'
              ? 'No bookmarks found'
              : 'No bookmarks yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || selectedFolder !== 'all' || selectedTag !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start reading and bookmark important passages'}
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            Add Your First Bookmark
          </Button>
        </div>
      )}

      {/* Results Count */}
      {filteredBookmarks.length > 0 && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <span>{filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? 's' : ''} found</span>
        </div>
      )}
    </div>
  );
} 