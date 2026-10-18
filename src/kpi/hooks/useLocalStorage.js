/**
 * Custom Hook for persistent state management using localStorage
 */
import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      window.dispatchEvent(
        new CustomEvent('local-storage-update', {
          detail: { key, value: valueToStore },
        })
      );
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  useEffect(() => {
    const handleStorageUpdate = (e) => {
      if (e.detail && e.detail.key === key) {
        setStoredValue(e.detail.value);
      }
    };
    window.addEventListener('local-storage-update', handleStorageUpdate);
    return () => {
      window.removeEventListener('local-storage-update', handleStorageUpdate);
    };
  }, [key]);

  return [storedValue, setValue];
}
