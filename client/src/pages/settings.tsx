import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Database,
  Settings,
  Shield,
  RefreshCw,
  FileText,
  Bookmark as BookmarkIcon,
  Star,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getBookmarks, 
  getNotes, 
  getHighlights,
  type Bookmark,
  type Note,
  type Highlight
} from '@/lib/storage';

interface BackupData {
  bookmarks: Bookmark[];
  notes: Note[];
  highlights: Highlight[];
  metadata: {
    version: string;
    timestamp: number;
    totalItems: number;
  };
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [backupStats, setBackupStats] = useState({
    bookmarks: 0,
    notes: 0,
    highlights: 0
  });

  // Load current data stats
  useEffect(() => {
    try {
      const bookmarks = getBookmarks();
      const notes = getNotes();
      const highlights = getHighlights();
      
      setBackupStats({
        bookmarks: bookmarks.length,
        notes: notes.length,
        highlights: highlights.length
      });
    } catch (error) {
      console.error('Failed to load data stats:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load data statistics. Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const createBackup = async () => {
    setIsCreatingBackup(true);
    try {
      // Check if localStorage is available
      if (typeof localStorage === 'undefined') {
        throw new Error('Local storage is not available');
      }

      const bookmarks = getBookmarks();
      const notes = getNotes();
      const highlights = getHighlights();
      
      const totalItems = bookmarks.length + notes.length + highlights.length;
      
      if (totalItems === 0) {
        toast({
          title: "No data to backup",
          description: "There is no data to create a backup from.",
          variant: "destructive",
        });
        return;
      }
      
      const backupData: BackupData = {
        bookmarks,
        notes,
        highlights,
        metadata: {
          version: '1.0.0',
          timestamp: Date.now(),
          totalItems
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bible-companion-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup created successfully",
        description: `Exported ${backupData.metadata.totalItems} items to backup file.`,
      });
    } catch (error) {
      console.error('Backup creation failed:', error);
      toast({
        title: "Backup failed",
        description: "Failed to create backup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const restoreBackup = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        setIsRestoring(false);
        return;
      }

      setIsRestoring(true);
      try {
        // Check if localStorage is available
        if (typeof localStorage === 'undefined') {
          throw new Error('Local storage is not available');
        }

        const text = await file.text();
        const backupData: BackupData = JSON.parse(text);
        
        // Validate backup data
        if (!backupData.metadata || !backupData.bookmarks || !backupData.notes || !backupData.highlights) {
          throw new Error('Invalid backup file format');
        }

        // Clear existing data
        localStorage.removeItem('bible-companion-bookmarks');
        localStorage.removeItem('bible-companion-notes');
        localStorage.removeItem('bible-companion-highlights');

        // Restore data
        localStorage.setItem('bible-companion-bookmarks', JSON.stringify(backupData.bookmarks));
        localStorage.setItem('bible-companion-notes', JSON.stringify(backupData.notes));
        localStorage.setItem('bible-companion-highlights', JSON.stringify(backupData.highlights));

        // Update stats
        setBackupStats({
          bookmarks: backupData.bookmarks.length,
          notes: backupData.notes.length,
          highlights: backupData.highlights.length
        });

        toast({
          title: "Backup restored successfully",
          description: `Restored ${backupData.metadata.totalItems} items from backup.`,
        });

        // Reload page to reflect changes
        setTimeout(() => {
          window.location.reload();
        }, 1000);

      } catch (error) {
        console.error('Backup restoration failed:', error);
        toast({
          title: "Restore failed",
          description: "Failed to restore backup. Please check the file format.",
          variant: "destructive",
        });
      } finally {
        setIsRestoring(false);
        // Clean up the input
        input.value = '';
      }
    };

    input.click();
  };

  const resetAllData = async () => {
    if (!confirm('Are you sure you want to reset all data? This action cannot be undone and will permanently delete all your bookmarks, notes, highlights, and other app data.')) {
      return;
    }

    if (!confirm('This will permanently delete ALL your data. Are you absolutely sure?')) {
      return;
    }

    setIsResetting(true);
    try {
      // Check if localStorage is available
      if (typeof localStorage === 'undefined') {
        throw new Error('Local storage is not available');
      }

      // Clear only app-specific localStorage data
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('bible-companion-') || 
            key.startsWith('document-companion-') ||
            key === 'hasVisited') {
          localStorage.removeItem(key);
        }
      });

      toast({
        title: "Data reset successfully",
        description: "All app data has been cleared. The page will reload.",
      });

      // Update stats
      setBackupStats({
        bookmarks: 0,
        notes: 0,
        highlights: 0
      });

      // Reload page
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Data reset failed:', error);
      toast({
        title: "Reset failed",
        description: "Failed to reset data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
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
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your app data, backups, and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Data Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Overview
            </CardTitle>
            <CardDescription>
              Current data statistics and storage information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                 <BookmarkIcon className="h-5 w-5 text-blue-600" />
                 <div>
                   <p className="text-sm font-medium">Bookmarks</p>
                   <p className="text-2xl font-bold text-blue-600">{backupStats.bookmarks}</p>
                 </div>
               </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <FileText className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-2xl font-bold text-green-600">{backupStats.notes}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Star className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">Highlights</p>
                  <p className="text-2xl font-bold text-yellow-600">{backupStats.highlights}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backup & Restore */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Backup & Restore
            </CardTitle>
            <CardDescription>
              Create backups of your data or restore from previous backups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={createBackup}
                disabled={isCreatingBackup || (backupStats.bookmarks + backupStats.notes + backupStats.highlights) === 0}
                className="flex items-center gap-2"
              >
                {isCreatingBackup ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isCreatingBackup ? 'Creating Backup...' : 'Create Backup'}
              </Button>
              
              <Button
                variant="outline"
                onClick={restoreBackup}
                disabled={isRestoring}
                className="flex items-center gap-2"
              >
                {isRestoring ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isRestoring ? 'Restoring...' : 'Restore Backup'}
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>• Backups include all your bookmarks, notes, and highlights</p>
              <p>• Backup files are saved as JSON and can be imported later</p>
              <p>• Restoring will replace all current data with backup data</p>
            </div>
          </CardContent>
        </Card>

        {/* Reset Data */}
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Reset All Data
            </CardTitle>
            <CardDescription className="text-red-600/80">
              Permanently delete all app data. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800 dark:text-red-200 mb-1">
                    Warning: This action is irreversible
                  </p>
                  <p className="text-red-700 dark:text-red-300">
                    This will permanently delete all your bookmarks, notes, highlights, 
                    and any other data stored in the app. Make sure you have a backup 
                    before proceeding.
                  </p>
                </div>
              </div>
            </div>
            
            <Button
              variant="destructive"
              onClick={resetAllData}
              disabled={isResetting || (backupStats.bookmarks + backupStats.notes + backupStats.highlights) === 0}
              className="flex items-center gap-2"
            >
              {isResetting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {isResetting ? 'Resetting...' : 'Reset All Data'}
            </Button>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              App Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Version</span>
                <Badge variant="secondary">1.0.0</Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Storage</span>
                <span className="text-sm text-muted-foreground">Local Browser Storage</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Data Location</span>
                <span className="text-sm text-muted-foreground">Your device only</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 