'use client';

import { useState, useRef, useEffect } from 'react';
import { MPA } from '@/types';

interface MPASearchSelectProps {
  mpas: MPA[];
  value?: string;
  onChange: (mpaId: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export function MPASearchSelect({
  mpas,
  value,
  onChange,
  error = false,
  disabled = false,
}: MPASearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Find selected MPA
  const selectedMPA = mpas.find(m => m.id === value);

  // Sync input value with selected MPA when not focused
  useEffect(() => {
    if (!isOpen && selectedMPA) {
      setInputValue(`${selectedMPA.name} - ${selectedMPA.country}`);
    } else if (!isOpen && !selectedMPA) {
      setInputValue('');
    }
  }, [isOpen, selectedMPA]);

  // Filter MPAs based on input (only filter if 2+ characters and dropdown is open)
  const isSearching = isOpen && inputValue.length >= 2;
  const displayedMPAs = isSearching
    ? mpas.filter(mpa =>
        mpa.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        mpa.country.toLowerCase().includes(inputValue.toLowerCase())
      )
    : mpas;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [displayedMPAs.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && listRef.current.children[highlightedIndex]) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      highlightedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (mpa: MPA) => {
    onChange(mpa.id);
    setInputValue(`${mpa.name} - ${mpa.country}`);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    // Clear input to allow searching
    setInputValue('');
  };

  const handleInputBlur = () => {
    // Delay to allow click on dropdown item to register
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < displayedMPAs.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (displayedMPAs[highlightedIndex]) {
          handleSelect(displayedMPAs[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        // Restore selected value
        if (selectedMPA) {
          setInputValue(`${selectedMPA.name} - ${selectedMPA.country}`);
        } else {
          setInputValue('');
        }
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search for a Marine Protected Area..."
          disabled={disabled}
          autoComplete="off"
          className={`w-full px-4 py-3 pr-10 border rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white transition-colors ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        {/* Dropdown arrow */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (!disabled) {
              if (isOpen) {
                setIsOpen(false);
              } else {
                setIsOpen(true);
                setInputValue('');
                inputRef.current?.focus();
              }
            }
          }}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg"
        >
          {inputValue.length > 0 && inputValue.length < 2 && (
            <li className="px-4 py-3 text-sm text-gray-500">
              Type at least 2 characters to search...
            </li>
          )}

          {isSearching && displayedMPAs.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">
              No MPAs found matching &ldquo;{inputValue}&rdquo;
            </li>
          )}

          {displayedMPAs.map((mpa, index) => (
            <li key={mpa.id}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur before click registers
                  handleSelect(mpa);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  highlightedIndex === index
                    ? 'bg-cyan-50'
                    : 'hover:bg-gray-50'
                } ${value === mpa.id ? 'bg-cyan-100' : ''}`}
              >
                <div className="font-medium text-gray-900">{mpa.name}</div>
                <div className="text-sm text-gray-500">{mpa.country}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
