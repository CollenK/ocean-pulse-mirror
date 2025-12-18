'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // Distance to trigger refresh (default: 80px)
  maxPull?: number; // Maximum pull distance (default: 150px)
  resistance?: number; // Pull resistance factor 0-1 (default: 0.5)
  enabled?: boolean; // Enable/disable pull to refresh (default: true)
}

export interface PullToRefreshState {
  pulling: boolean;
  refreshing: boolean;
  pullDistance: number;
  canRefresh: boolean;
}

export function usePullToRefresh(options: PullToRefreshOptions) {
  const {
    onRefresh,
    threshold = 80,
    maxPull = 150,
    resistance = 0.5,
    enabled = true,
  } = options;

  const [state, setState] = useState<PullToRefreshState>({
    pulling: false,
    refreshing: false,
    pullDistance: 0,
    canRefresh: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const scrollTopRef = useRef<number>(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || state.refreshing) return;

    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    scrollTopRef.current = window.scrollY || document.documentElement.scrollTop;
  }, [enabled, state.refreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || state.refreshing) return;

    const touch = e.touches[0];
    currentYRef.current = touch.clientY;

    // Only trigger pull-to-refresh if at the top of the page
    if (scrollTopRef.current <= 0) {
      const deltaY = currentYRef.current - startYRef.current;

      if (deltaY > 0) {
        // Apply resistance to pull distance
        const adjustedDistance = Math.min(
          deltaY * resistance,
          maxPull
        );

        setState({
          pulling: true,
          refreshing: false,
          pullDistance: adjustedDistance,
          canRefresh: adjustedDistance >= threshold,
        });

        // Prevent default scroll behavior when pulling
        if (deltaY > 10) {
          e.preventDefault();
        }
      }
    }
  }, [enabled, state.refreshing, threshold, maxPull, resistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || state.refreshing || !state.pulling) return;

    if (state.canRefresh) {
      // Trigger refresh
      setState(prev => ({
        ...prev,
        refreshing: true,
        pulling: false,
      }));

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setState({
          pulling: false,
          refreshing: false,
          pullDistance: 0,
          canRefresh: false,
        });
      }
    } else {
      // Reset state
      setState({
        pulling: false,
        refreshing: false,
        pullDistance: 0,
        canRefresh: false,
      });
    }
  }, [enabled, state.refreshing, state.pulling, state.canRefresh, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enabled]);

  return {
    containerRef,
    ...state,
  };
}

// Pull-to-refresh indicator component
export interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  canRefresh: boolean;
}

export function PullToRefreshIndicator({
  pullDistance,
  refreshing,
  canRefresh,
}: PullToRefreshIndicatorProps) {
  const opacity = Math.min(pullDistance / 60, 1);
  const rotation = pullDistance * 2;

  return (
    <div
      className="fixed top-0 left-0 right-0 flex justify-center items-center z-50 pointer-events-none"
      style={{
        height: `${pullDistance}px`,
        opacity,
        transition: refreshing ? 'height 0.3s ease-out' : 'none',
      }}
    >
      <div className="bg-white rounded-full shadow-lg p-3">
        {refreshing ? (
          <div className="w-6 h-6 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            className="w-6 h-6"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.1s ease-out',
            }}
            fill="none"
            stroke={canRefresh ? '#06b6d4' : '#9ca3af'}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
