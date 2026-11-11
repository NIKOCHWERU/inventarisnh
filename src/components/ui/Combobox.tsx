'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, X } from 'lucide-react';

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  allowCreate?: boolean;
  onCreateNew?: (value: string) => Promise<void>;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  className?: string;
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Ketik atau pilih...',
  allowCreate = false,
  onCreateNew,
  disabled = false,
  className = '',
}: ComboboxProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state when value prop changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If user typed something not in options and no create, revert to last valid value
        const isInOptions = options.some((opt) => opt.toLowerCase() === inputValue.toLowerCase());
        if (!isInOptions && !allowCreate) {
          setInputValue(value);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value, allowCreate, options]);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showCreateOption =
    allowCreate &&
    inputValue.trim().length > 0 &&
    !options.some((opt) => opt.toLowerCase() === inputValue.trim().toLowerCase());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    if (allowCreate) {
      onChange(e.target.value);
    }
  };

  const handleSelect = (opt: string) => {
    setInputValue(opt);
    onChange(opt);
    setIsOpen(false);
  };

  const handleCreateNew = async () => {
    if (!inputValue.trim() || isCreating) return;
    if (onCreateNew) {
      setIsCreating(true);
      try {
        await onCreateNew(inputValue.trim());
      } finally {
        setIsCreating(false);
      }
    }
    onChange(inputValue.trim());
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full pl-3.5 pr-16 py-2.5 rounded-lg border border-[#EAE4D9] bg-white text-sm text-[#231F1A] placeholder-[#C5A059]/60 focus:outline-none focus:ring-2 focus:ring-[#B8860B] focus:border-transparent transition disabled:opacity-50 disabled:bg-[#FAF9F5]"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-[#70685C] hover:text-[#231F1A] transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen((v) => !v)}
            className="p-1 text-[#70685C] hover:text-[#B8860B] transition"
            tabIndex={-1}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#EAE4D9] rounded-lg shadow-lg overflow-hidden">
          <ul className="max-h-52 overflow-y-auto py-1">
            {filteredOptions.length === 0 && !showCreateOption && (
              <li className="px-3.5 py-2 text-xs text-[#70685C]">
                Tidak ada pilihan yang sesuai.
              </li>
            )}
            {filteredOptions.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className="w-full text-left px-3.5 py-2 text-sm text-[#231F1A] hover:bg-[#FAF9F5] flex items-center justify-between gap-2 transition"
                >
                  <span>{opt}</span>
                  {opt.toLowerCase() === inputValue.toLowerCase() && (
                    <Check className="w-3.5 h-3.5 text-[#B8860B] flex-shrink-0" />
                  )}
                </button>
              </li>
            ))}
            {showCreateOption && (
              <li className="border-t border-[#EAE4D9]">
                <button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={isCreating}
                  className="w-full text-left px-3.5 py-2 text-sm text-[#B8860B] hover:bg-[#FAF9F5] flex items-center gap-2 font-medium transition disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                  {isCreating ? 'Menyimpan...' : `Tambah "${inputValue.trim()}"`}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
