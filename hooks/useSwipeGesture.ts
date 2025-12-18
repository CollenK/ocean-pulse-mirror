'use client';

import { useRef, useEffect, useCallback } from 'react';

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
  velocity: number;
  duration: number;
}

export interface SwipeHandlers {
  onSwipeLeft?: (data: SwipeDirection) => void;
  onSwipeRight?: (data: SwipeDirection) => void;
  onSwipeUp?: (data: SwipeDirection) => void;
  onSwipeDown?: (data: SwipeDirection) => void;
  onSwipe?: (data: SwipeDirection) => void;
}

export interface UseSwipeGestureOptions extends SwipeHandlers {
  threshold?: number; // Minimum distance for swipe (default: 50px)
  velocityThreshold?: number; // Minimum velocity (default: 0.3px/ms)
  preventDefaultTouchMove?: boolean; // Prevent default touch behavior
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  currentTime: number;
}

export function useSwipeGesture<T extends HTMLElement>(
  options: UseSwipeGestureOptions = {}
) {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    preventDefaultTouchMove = false,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipe,
  } = options;

  const elementRef = useRef<T>(null);
  const touchDataRef = useRef<TouchData | null>(null);

  const calculateSwipe = useCallback((touchData: TouchData): SwipeDirection => {
    const deltaX = touchData.currentX - touchData.startX;
    const deltaY = touchData.currentY - touchData.startY;
    const duration = touchData.currentTime - touchData.startTime;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    // Determine primary direction
    let direction: SwipeDirection['direction'] = null;

    if (absX > absY) {
      // Horizontal swipe
      if (absX > threshold) {
        direction = deltaX > 0 ? 'right' : 'left';
      }
    } else {
      // Vertical swipe
      if (absY > threshold) {
        direction = deltaY > 0 ? 'down' : 'up';
      }
    }

    return {
      direction,
      distance,
      velocity,
      duration,
    };
  }, [threshold]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchDataRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      currentY: touch.clientY,
      currentTime: Date.now(),
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchDataRef.current) return;

    const touch = e.touches[0];
    touchDataRef.current.currentX = touch.clientX;
    touchDataRef.current.currentY = touch.clientY;
    touchDataRef.current.currentTime = Date.now();

    if (preventDefaultTouchMove) {
      e.preventDefault();
    }
  }, [preventDefaultTouchMove]);

  const handleTouchEnd = useCallback(() => {
    if (!touchDataRef.current) return;

    const swipeData = calculateSwipe(touchDataRef.current);

    // Check velocity threshold
    if (swipeData.velocity < velocityThreshold) {
      touchDataRef.current = null;
      return;
    }

    // Call appropriate handler
    if (swipeData.direction) {
      onSwipe?.(swipeData);

      switch (swipeData.direction) {
        case 'left':
          onSwipeLeft?.(swipeData);
          break;
        case 'right':
          onSwipeRight?.(swipeData);
          break;
        case 'up':
          onSwipeUp?.(swipeData);
          break;
        case 'down':
          onSwipeDown?.(swipeData);
          break;
      }
    }

    touchDataRef.current = null;
  }, [calculateSwipe, velocityThreshold, onSwipe, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouchMove });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefaultTouchMove]);

  return elementRef;
}

// Hook for long press detection
export interface UseLongPressOptions {
  onLongPress: (e: TouchEvent | MouseEvent) => void;
  delay?: number; // Delay in ms (default: 500)
  onStart?: () => void;
  onCancel?: () => void;
}

export function useLongPress<T extends HTMLElement>(
  options: UseLongPressOptions
) {
  const {
    onLongPress,
    delay = 500,
    onStart,
    onCancel,
  } = options;

  const elementRef = useRef<T>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const startPressTimer = useCallback((e: TouchEvent | MouseEvent) => {
    isLongPressRef.current = false;
    onStart?.();

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress(e);
    }, delay);
  }, [onLongPress, delay, onStart]);

  const cancelPressTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isLongPressRef.current) {
      onCancel?.();
    }

    isLongPressRef.current = false;
  }, [onCancel]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Touch events
    const handleTouchStart = (e: TouchEvent) => startPressTimer(e);
    const handleTouchEnd = () => cancelPressTimer();
    const handleTouchMove = () => cancelPressTimer();

    // Mouse events (for testing on desktop)
    const handleMouseDown = (e: MouseEvent) => startPressTimer(e);
    const handleMouseUp = () => cancelPressTimer();
    const handleMouseLeave = () => cancelPressTimer();

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseLeave);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [startPressTimer, cancelPressTimer]);

  return elementRef;
}
