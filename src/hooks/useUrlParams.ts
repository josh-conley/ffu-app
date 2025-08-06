import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useUrlParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(() => {
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [searchParams]);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      return newParams;
    });
  }, [setSearchParams]);

  const getParam = useCallback((key: string, defaultValue: string = ''): string => {
    return searchParams.get(key) ?? defaultValue;
  }, [searchParams]);

  const getBooleanParam = useCallback((key: string, defaultValue: boolean = false): boolean => {
    const value = searchParams.get(key);
    if (value === null) return defaultValue;
    return value === 'true';
  }, [searchParams]);

  return {
    params,
    updateParams,
    getParam,
    getBooleanParam
  };
}