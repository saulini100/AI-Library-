import { useState, useEffect } from 'react';

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  options: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  } = {}
): [T, (value: T | ((prev: T) => T)) => void] {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse
  } = options;

  // Get initial value from localStorage or use default
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultValue;
      return deserialize(stored);
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Update localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(state));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, state, serialize]);

  return [state, setState];
}

// Specialized hooks for common use cases
export function useLocalStorageBoolean(key: string, defaultValue: boolean = false) {
  return useLocalStorageState(key, defaultValue, {
    serialize: (value) => value ? 'true' : 'false',
    deserialize: (value) => value === 'true'
  });
}

export function useLocalStorageNumber(key: string, defaultValue: number = 0) {
  return useLocalStorageState(key, defaultValue, {
    serialize: String,
    deserialize: Number
  });
}

export function useLocalStorageObject<T extends object>(key: string, defaultValue: T) {
  return useLocalStorageState(key, defaultValue);
}

// Hook for managing multiple localStorage keys with a common prefix
export function useLocalStorageGroup(prefix: string) {
  const setItem = (key: string, value: any) => {
    try {
      localStorage.setItem(`${prefix}_${key}`, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key "${prefix}_${key}":`, error);
    }
  };

  const getItem = <T>(key: string, defaultValue: T): T => {
    try {
      const stored = localStorage.getItem(`${prefix}_${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${prefix}_${key}":`, error);
      return defaultValue;
    }
  };

  const removeItem = (key: string) => {
    localStorage.removeItem(`${prefix}_${key}`);
  };

  const clear = () => {
    Object.keys(localStorage)
      .filter(key => key.startsWith(`${prefix}_`))
      .forEach(key => localStorage.removeItem(key));
  };

  return { setItem, getItem, removeItem, clear };
} 