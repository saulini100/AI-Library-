import React from 'react';
import { Globe, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useLanguage, SupportedLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';

export function LanguageSelector() {
  const { 
    currentLanguage, 
    setLanguage, 
    supportedLanguages, 
    getLanguageConfig,
    isTranslating 
  } = useLanguage();

  const currentConfig = getLanguageConfig(currentLanguage);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted/60 transition-all duration-200">
          {isTranslating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-sm">{currentConfig?.flag || '🌐'}</span>
          )}
          <span className="sr-only">Select language</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Choose Language
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{lang.flag}</span>
              <div className="flex flex-col">
                <span className="font-medium">{lang.name}</span>
                <span className="text-xs text-muted-foreground">
                  {lang.nativeName}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {lang.gemmaSupported && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  AI
                </Badge>
              )}
              {currentLanguage === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          ✨ Powered by Gemma 3n AI
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSelectorWithLabel() {
  const { 
    currentLanguage, 
    setLanguage, 
    supportedLanguages, 
    getLanguageConfig,
    isTranslating 
  } = useLanguage();

  const currentConfig = getLanguageConfig(currentLanguage);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          {isTranslating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span className="text-base">{currentConfig?.flag || '🌐'}</span>
              <span className="hidden sm:inline">{currentConfig?.name}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Language Settings
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="flex items-center justify-between gap-2 cursor-pointer p-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{lang.flag}</span>
              <div className="flex flex-col">
                <span className="font-medium">{lang.name}</span>
                <span className="text-sm text-muted-foreground">
                  {lang.nativeName}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {lang.gemmaSupported && (
                <Badge variant="default" className="text-xs">
                  Gemma 3n
                </Badge>
              )}
              {currentLanguage === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <div className="px-3 py-2 text-xs text-muted-foreground text-center">
          🤖 AI-powered translation • Works offline
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 