// Electron API types
declare global {
  interface Window {
    electronAPI?: {
      // App information
      getAppVersion: () => Promise<string>;
      
      // File dialogs
      showSaveDialog: (options: any) => Promise<any>;
      showOpenDialog: (options: any) => Promise<any>;
      
      // Window controls
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      isWindowMaximized: () => Promise<boolean>;
      
      // Window event listeners
      onWindowMaximized: (callback: () => void) => void;
      onWindowUnmaximized: (callback: () => void) => void;
      
      // Menu event listeners
      onMenuNewDocument: (callback: () => void) => void;
      onMenuOpenDocument: (callback: (filePath: string) => void) => void;
      onMenuPreferences: (callback: () => void) => void;
      onMenuToggleAI: (callback: () => void) => void;
      onMenuVoiceReader: (callback: () => void) => void;
      onMenuBookmark: (callback: () => void) => void;
      onMenuSearch: (callback: () => void) => void;
      
      // Remove listeners
      removeAllListeners: (channel: string) => void;
      
      // Platform detection
      platform: string;
      
      // Environment detection
      isElectron: boolean;
      
      // Voice utilities
      checkSpeechSynthesis: () => {
        available: boolean;
        voiceCount: number;
        voices: string[];
      };
      testSpeech: (text?: string) => boolean;
    };
  }
}

export {}; 