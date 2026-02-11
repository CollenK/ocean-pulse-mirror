'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface InfoTipProps {
  text: string;
  className?: string;
  iconClassName?: string;
}

export function InfoTip({ text, className = '', iconClassName = '' }: InfoTipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [showBelow, setShowBelow] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Track mount state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Position tooltip and handle outside clicks
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    // Calculate position
    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipHeight = 100; // Approximate height
    const spaceAbove = rect.top;
    const shouldShowBelow = spaceAbove < tooltipHeight + 20;

    setShowBelow(shouldShowBelow);
    setTooltipStyle({
      position: 'fixed',
      top: shouldShowBelow ? rect.bottom + 8 : rect.top - 8,
      left: rect.left + rect.width / 2,
      transform: shouldShowBelow ? 'translateX(-50%)' : 'translate(-50%, -100%)',
    });

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        tooltipRef.current && !tooltipRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    // Delay listener to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(prev => !prev);
  };

  const tooltip = isOpen && (
    <div
      ref={tooltipRef}
      role="tooltip"
      className="z-[9999] w-64 p-3 bg-gray-900 text-white text-xs leading-relaxed rounded-lg shadow-xl"
      style={tooltipStyle}
    >
      {text}
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-transparent ${
          showBelow
            ? 'bottom-full border-b-4 border-b-gray-900'
            : 'top-full border-t-4 border-t-gray-900'
        }`}
      />
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-balean-cyan focus:ring-offset-1 rounded-full ${iconClassName} ${className}`}
        aria-label="More information"
        aria-expanded={isOpen}
      >
        <i className="fi fi-rr-info text-sm" />
      </button>

      {mounted && tooltip && createPortal(tooltip, document.body)}
    </>
  );
}
