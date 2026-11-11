'use client';

import React, { useState, useEffect } from 'react';
import {
  Folder,
  HardDrive,
  Home,
  ChevronRight,
  ArrowUp,
  Check,
  X,
  RefreshCw,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface FolderPickerModalProps {
  isOpen: boolean;
  currentPath: string;
  onSelect: (selectedPath: string) => void;
  onClose: () => void;
}

export function FolderPickerModal({
  isOpen,
  currentPath: initialPath,
  onSelect,
  onClose,
}: FolderPickerModalProps) {
  const [navPath, setNavPath] = useState(initialPath || '');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<{ name: string; fullPath: string }[]>([]);
  const [shortcuts, setShortcuts] = useState<{ name: string; path: string; icon: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpeningNative, setIsOpeningNative] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDirectory(initialPath || '');
    }
  }, [isOpen]);

  async function loadDirectory(targetPath: string) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/settings/browse-folder?path=${encodeURIComponent(targetPath)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal memuat folder.');
      }
      setNavPath(data.currentPath || '');
      setParentPath(data.parentPath);
      setDirectories(data.directories || []);
      if (data.shortcuts) {
        setShortcuts(data.shortcuts);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOpenNative() {
    setIsOpeningNative(true);
    try {
      const res = await fetch('/api/settings/browse-folder', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.selectedPath) {
        onSelect(data.selectedPath);
        onClose();
      }
    } catch (err: any) {
      console.warn('Native folder browse error:', err);
    } finally {
      setIsOpeningNative(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-[#EAE4D9] flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EAE4D9] flex items-center justify-between bg-[#FAF9F5]">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#B8860B]" />
            <h3 className="text-sm font-bold text-[#231F1A]">Pilih Folder Penyimpanan Foto</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#70685C] hover:text-[#231F1A] hover:bg-[#EAE4D9] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Bar */}
        <div className="px-5 py-2.5 bg-[#FAF6EC] border-b border-[#EAE4D9] flex flex-wrap gap-1.5 items-center text-xs">
          <span className="text-[11px] font-semibold text-[#7A5805] mr-1">Pintasan Cepat:</span>
          {shortcuts.map((sc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => loadDirectory(sc.path)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#E5D7B7] hover:border-[#B8860B] text-[#7A5805] text-[11px] font-medium transition shadow-2xs"
            >
              {sc.icon === 'hard-drive' ? (
                <HardDrive className="w-3 h-3 text-[#B8860B]" />
              ) : sc.icon === 'home' ? (
                <Home className="w-3 h-3 text-[#B8860B]" />
              ) : (
                <Folder className="w-3 h-3 text-[#B8860B]" />
              )}
              {sc.name}
            </button>
          ))}
        </div>

        {/* Breadcrumb / Current Path Display */}
        <div className="px-5 py-2.5 border-b border-[#EAE4D9] flex items-center gap-2 text-xs bg-white">
          <button
            type="button"
            onClick={() => loadDirectory('')}
            className="p-1 rounded hover:bg-[#FAF6EC] text-[#70685C] hover:text-[#B8860B]"
            title="Ke Menu Utama / Drive"
          >
            <Home className="w-4 h-4" />
          </button>

          {parentPath && (
            <button
              type="button"
              onClick={() => loadDirectory(parentPath)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F4F0E8] hover:bg-[#EAE4D9] text-[#231F1A] transition"
              title="Naik satu level folder"
            >
              <ArrowUp className="w-3 h-3" />
              Naik
            </button>
          )}

          <div className="flex-1 font-mono text-[11px] text-[#231F1A] bg-[#FAF9F5] px-2.5 py-1 rounded border border-[#EAE4D9] truncate">
            {navPath || '(Pilih Drive atau Folder Pintasan di atas)'}
          </div>
        </div>

        {/* Directory List Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-[#B8860B] animate-spin mx-auto" />
              <p className="text-xs text-[#70685C]">Memuat daftar folder...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F8C4C4] text-xs text-[#C53030]">
              {error}
            </div>
          ) : directories.length === 0 && navPath ? (
            <div className="py-10 text-center text-xs text-[#70685C]">
              <Folder className="w-8 h-8 text-[#D1C7B7] mx-auto mb-2" />
              <p className="font-medium text-[#231F1A]">Folder ini kosong (tidak ada subfolder)</p>
              <p className="text-[11px] mt-1">Anda bisa langsung memilih folder ini menggunakan tombol di bawah.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {directories.map((dir) => (
                <button
                  key={dir.fullPath}
                  type="button"
                  onClick={() => loadDirectory(dir.fullPath)}
                  className="flex items-center gap-2.5 p-2 rounded-lg text-left text-xs hover:bg-[#FAF6EC] hover:border-[#E5D7B7] border border-transparent transition group"
                >
                  <Folder className="w-4 h-4 text-[#B8860B] group-hover:scale-110 transition flex-shrink-0" />
                  <span className="truncate font-medium text-[#231F1A] group-hover:text-[#7A5805]">
                    {dir.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#EAE4D9] bg-[#FAF9F5] flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenNative}
            isLoading={isOpeningNative}
            className="w-full sm:w-auto gap-1.5 text-xs text-[#7A5805] border-[#E5D7B7] hover:bg-white"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
            Buka File Explorer Windows
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Batal
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                if (navPath) {
                  onSelect(navPath);
                  onClose();
                }
              }}
              disabled={!navPath}
              className="gap-1.5 text-xs"
            >
              <Check className="w-3.5 h-3.5" />
              Pilih Folder Ini
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
