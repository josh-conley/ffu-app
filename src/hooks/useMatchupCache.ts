import { useState, useEffect } from 'react';
import { leagueApi } from '../services/api';
import { createHeadToHeadIndex, type HeadToHeadIndex } from '../utils/matchup-indexer';

interface MatchupCacheState {
  index: HeadToHeadIndex | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Global cache instance (singleton pattern)
let globalCache: MatchupCacheState = {
  index: null,
  isLoading: false,
  error: null,
  lastUpdated: null
};

// Subscribers for cache updates
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach(callback => callback());
}

async function loadMatchupCache(): Promise<void> {
  if (globalCache.isLoading) return; // Already loading
  
  // If cache is recent (less than 5 minutes old), don't reload
  if (globalCache.index && globalCache.lastUpdated && 
      Date.now() - globalCache.lastUpdated.getTime() < 5 * 60 * 1000) {
    return;
  }
  
  globalCache.isLoading = true;
  globalCache.error = null;
  notifySubscribers();
  
  try {
    console.log('Loading matchup data for head-to-head comparisons...');
    const allMatchupData = await leagueApi.getAllMatchupsForComparison();
    
    console.log('Creating head-to-head index...');
    const index = createHeadToHeadIndex(allMatchupData);
    
    globalCache.index = index;
    globalCache.lastUpdated = new Date();
    globalCache.error = null;
    
    console.log('Head-to-head matchup cache loaded successfully');
  } catch (error) {
    globalCache.error = error instanceof Error ? error.message : 'Failed to load matchup data';
    console.error('Failed to load matchup cache:', error);
  } finally {
    globalCache.isLoading = false;
    notifySubscribers();
  }
}

/**
 * Hook to access the global matchup cache for head-to-head comparisons
 */
export function useMatchupCache() {
  const [, forceUpdate] = useState({});
  const rerender = () => forceUpdate({});
  
  useEffect(() => {
    // Subscribe to cache updates
    subscribers.add(rerender);
    
    // Load cache if not already loaded or loading
    if (!globalCache.index && !globalCache.isLoading) {
      loadMatchupCache();
    }
    
    return () => {
      subscribers.delete(rerender);
    };
  }, []);
  
  return {
    index: globalCache.index,
    isLoading: globalCache.isLoading,
    error: globalCache.error,
    lastUpdated: globalCache.lastUpdated,
    reload: loadMatchupCache
  };
}