'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, Image as ImageIcon } from 'lucide-react';
import { formatPhotoUrl } from '@/lib/base-path';

interface PhotoGalleryViewerProps {
  photos: string[];
  itemName: string;
}

export function PhotoGalleryViewer({ photos, itemName }: PhotoGalleryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Reset index when photos change
  useEffect(() => {
    setCurrentIndex(0);
  }, [photos]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowRight' && photos.length > 1) {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
      }
      if (e.key === 'ArrowLeft' && photos.length > 1) {
        setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, photos.length]);

  if (!photos || photos.length === 0) {
    return (
      <div className="py-8 bg-[#FAF9F5] rounded-xl border border-[#EAE4D9] flex flex-col items-center justify-center text-[#C5A059]">
        <ImageIcon className="w-10 h-10 mb-1 opacity-70" />
        <span className="text-xs text-[#70685C]">Tidak ada foto barang</span>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex] || photos[0];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  return (
    <div className="space-y-2">
      {/* Main Active Photo Container */}
      <div className="relative rounded-xl overflow-hidden bg-[#231F1A]/5 border border-[#EAE4D9] group flex items-center justify-center h-64 sm:h-72 select-none">
        <img
          src={formatPhotoUrl(currentPhoto)}
          alt={`${itemName} - Foto ${currentIndex + 1}`}
          onClick={() => setIsLightboxOpen(true)}
          className="w-full h-full object-contain cursor-zoom-in transition-transform duration-200"
        />

        {/* Counter Badge */}
        {photos.length > 1 && (
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold shadow-sm">
            {currentIndex + 1} / {photos.length} Foto
          </div>
        )}

        {/* Expand / Lightbox Button */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition shadow-sm"
          title="Perbesar Layar Penuh"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Previous / Next Arrow Buttons on hover */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-xs transition shadow-md"
              title="Foto Sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-xs transition shadow-md"
              title="Foto Selanjutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Strip (Scrollable) if > 1 photo */}
      {photos.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
          {photos.map((photo, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={`${photo}-${idx}`}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition ${
                  isActive
                    ? 'border-[#B8860B] ring-2 ring-[#B8860B]/30 scale-100'
                    : 'border-[#EAE4D9] hover:border-[#C5A059] opacity-70 hover:opacity-100'
                }`}
                title={`Lihat Foto ${idx + 1}`}
              >
                <img
                  src={formatPhotoUrl(photo)}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-black/60 text-white text-[9px] font-bold rounded-tl">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Bar */}
          <div
            className="w-full flex items-center justify-between text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold truncate max-w-xs sm:max-w-md">
                {itemName}
              </span>
              <span className="text-xs text-white/60">
                ({currentIndex + 1} dari {photos.length} Foto)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Large Image in Lightbox */}
          <div
            className="relative flex-1 w-full flex items-center justify-center overflow-hidden my-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={formatPhotoUrl(currentPhoto)}
              alt={`${itemName} - Foto ${currentIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain select-none"
            />

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition border border-white/20 shadow-lg"
                  title="Foto Sebelumnya (Panah Kiri)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition border border-white/20 shadow-lg"
                  title="Foto Selanjutnya (Panah Kanan)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails Strip in Lightbox */}
          {photos.length > 1 && (
            <div
              className="w-full flex items-center justify-center gap-2 overflow-x-auto py-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {photos.map((photo, idx) => (
                <button
                  key={`lightbox-thumb-${idx}`}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition ${
                    idx === currentIndex
                      ? 'border-[#B8860B] ring-2 ring-[#B8860B]/50 scale-105'
                      : 'border-white/30 hover:border-white/70 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={formatPhotoUrl(photo)}
                    alt={`Thumb ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
