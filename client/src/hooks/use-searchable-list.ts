import { useState, useMemo } from 'react';

interface SearchableItem {
  id: string;
  [key: string]: any;
}

interface UseSearchableListProps<T extends SearchableItem> {
  items: T[];
  searchFields?: (keyof T)[];
  filters?: {
    [key: string]: {
      value: string;
      condition: (item: T, value: string) => boolean;
    };
  };
}

export function useSearchableList<T extends SearchableItem>({
  items,
  searchFields = [],
  filters = {}
}: UseSearchableListProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    Object.keys(filters).reduce((acc, key) => ({ ...acc, [key]: 'all' }), {})
  );

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search filter
      const matchesSearch = searchQuery.trim() === '' || 
        searchFields.some(field => 
          String(item[field]).toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Additional filters
      const matchesFilters = Object.entries(filters).every(([filterKey, filter]) => {
        const filterValue = filterValues[filterKey];
        return filterValue === 'all' || filter.condition(item, filterValue);
      });

      return matchesSearch && matchesFilters;
    });
  }, [items, searchQuery, filterValues, searchFields, filters]);

  const updateFilter = (filterKey: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [filterKey]: value }));
  };

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
    filterValues,
    updateFilter,
    totalItems: items.length,
    filteredCount: filteredItems.length
  };
} 