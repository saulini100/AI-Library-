import { useToast } from './use-toast';

export function useStandardToasts() {
  const { toast } = useToast();

  return {
    success: {
      created: (itemType: string) => toast({
        title: `${itemType} created`,
        description: `Your new ${itemType.toLowerCase()} has been saved successfully.`,
      }),
      
      updated: (itemType: string) => toast({
        title: `${itemType} updated`,
        description: `Your ${itemType.toLowerCase()} has been successfully updated.`,
      }),
      
      deleted: (itemType: string) => toast({
        title: `${itemType} deleted`,
        description: `The ${itemType.toLowerCase()} has been removed from your collection.`,
      }),
      
      saved: (itemType: string) => toast({
        title: `${itemType} saved`,
        description: `Your ${itemType.toLowerCase()} has been saved successfully.`,
      })
    },
    
    error: {
      general: (action: string) => toast({
        title: "Error",
        description: `Failed to ${action}. Please try again.`,
        variant: "destructive",
      }),
      
      validation: (message: string) => toast({
        title: "Missing information",
        description: message,
        variant: "destructive",
      }),
      
      network: () => toast({
        title: "Connection Error",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      }),
      
      unauthorized: () => toast({
        title: "Access Denied",
        description: "You don't have permission to perform this action.",
        variant: "destructive",
      })
    },
    
    info: {
      loading: (action: string) => toast({
        title: "Loading...",
        description: `${action} in progress...`,
      }),
      
      noResults: (searchType: string) => toast({
        title: "No results found",
        description: `No ${searchType} match your search criteria.`,
      })
    },
    
    // Custom toast for specific scenarios
    custom: (title: string, description: string, variant?: "default" | "destructive") => 
      toast({ title, description, variant })
  };
} 