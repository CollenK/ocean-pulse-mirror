'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface InfoTipProps {
  text: string;
  className?: string;
  iconClassName?: string;
}

export function InfoTip({ text, className = '', iconClassName = '' }: InfoTipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({
      top: rect.top + window.scrollY,
      left: rect.left + rect.width / 2 + window.scrollX,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        tooltipRef.current && !tooltipRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleScroll() {
      setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex text-gray-400 hover:text-gray-600 transition-colors focus:outline-none ${iconClassName} ${className}`}
        aria-label="More information"
      >
        <i className="fi fi-rr-info text-xs" />
      </button>

      {isOpen && position && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] w-56 p-2.5 bg-gray-900 text-white text-xs leading-relaxed rounded-lg shadow-lg"
          style={{
            top: position.top - 8,
            left: position.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>,
        document.body
      )}
    </>
  );
}
