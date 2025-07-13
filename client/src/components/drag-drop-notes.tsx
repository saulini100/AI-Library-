import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  StickyNote,
  GripVertical,
  Trash2,
  Plus,
  Calendar,
  Tag,
  Edit3,
  BookOpen,
  Star
} from 'lucide-react';

interface StudyNote {
  id: string;
  title: string;
  content: string;
  category: 'verse' | 'reflection' | 'prayer' | 'question' | 'insight';
  tags: string[];
  date: string;
  chapter?: string;
  priority: 'low' | 'medium' | 'high';
}

interface SortableNoteItemProps {
  note: StudyNote;
  onDelete: (noteId: string) => void;
}

function SortableNoteItem({ note, onDelete }: SortableNoteItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  const getCategoryColor = (category: StudyNote['category']) => {
    switch (category) {
      case 'verse': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'reflection': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'prayer': return 'bg-green-100 text-green-800 border-green-200';
      case 'question': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'insight': return 'bg-pink-100 text-pink-800 border-pink-200';
    }
  };
  
  const getPriorityIcon = (priority: StudyNote['priority']) => {
    switch (priority) {
      case 'high': return <Star className="w-3 h-3 text-yellow-500 fill-current" />;
      case 'medium': return <Star className="w-3 h-3 text-gray-400" />;
      case 'low': return null;
    }
  };

  const getCategoryIcon = (category: StudyNote['category']) => {
    switch (category) {
      case 'verse': return <BookOpen className="w-3 h-3" />;
      case 'reflection': return <Edit3 className="w-3 h-3" />;
      case 'prayer': return <StickyNote className="w-3 h-3" />;
      case 'question': return <Tag className="w-3 h-3" />;
      case 'insight': return <Star className="w-3 h-3" />;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <Card className="mb-4 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" {...attributes} {...listeners} className="cursor-grab p-1 h-auto">
                <GripVertical className="w-5 h-5 text-gray-400" />
              </Button>
              <Badge className={`text-xs ${getCategoryColor(note.category)}`}>
                {getCategoryIcon(note.category)}
                <span className="ml-1">{note.category}</span>
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {getPriorityIcon(note.priority)}
              <Button onClick={() => onDelete(note.id)} variant="ghost" size="sm" className="h-auto p-1 text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <h3 className="font-semibold text-sm mb-1">{note.title}</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{note.content}</p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              {note.chapter && <Badge variant="outline" className="text-xs py-0"><BookOpen className="w-3 h-3 mr-1" />{note.chapter}</Badge>}
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{note.date}</span>
              </div>
            </div>
            <div className="flex gap-1">
              {note.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs py-0"># {tag}</Badge>)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DragDropNotesProps {
  className?: string;
}

export default function DragDropNotes({ className = '' }: DragDropNotesProps) {
  const [notes, setNotes] = useState<StudyNote[]>([
    {
      id: '1',
      title: 'Faith and Works',
      content: 'James 2:17 - Faith without works is dead. This verse challenges me to put my faith into action.',
      category: 'reflection',
      tags: ['faith', 'works', 'action'],
      date: '2024-01-15',
      chapter: 'James 2',
      priority: 'high'
    },
    {
      id: '2',
      title: 'God\'s Love',
      content: 'John 3:16 meditation - The depth of God\'s love for humanity is incomprehensible.',
      category: 'verse',
      tags: ['love', 'salvation', 'grace'],
      date: '2024-01-14',
      chapter: 'John 3',
      priority: 'medium'
    },
    {
      id: '3',
      title: 'Morning Prayer',
      content: 'Lord, help me to walk in your truth today and show your love to others.',
      category: 'prayer',
      tags: ['prayer', 'truth', 'love'],
      date: '2024-01-13',
      priority: 'medium'
    }
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setNotes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);
  
  const handleDeleteNote = useCallback((noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  }, []);

  const addNewNote = useCallback(() => {
    const newNote: StudyNote = {
      id: Date.now().toString(),
      title: 'New Study Note',
      content: 'Click to edit this note...',
      category: 'reflection',
      tags: [],
      date: new Date().toISOString().split('T')[0],
      priority: 'medium'
    };
    
    setNotes(prev => [newNote, ...prev]);
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-500" />
              Study Notes ({notes.length})
            </CardTitle>
            <Button onClick={addNewNote} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </div>
        </CardHeader>
      </Card>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={notes} strategy={verticalListSortingStrategy}>
          <div className="space-y-0">
            {notes.map(note => (
              <SortableNoteItem key={note.id} note={note} onDelete={handleDeleteNote} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
} 