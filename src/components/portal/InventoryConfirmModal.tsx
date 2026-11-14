'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ConditionBadge } from '@/components/ui/Badge';
import { ArrowLeft, Check, Image as ImageIcon, MapPin, Layers, Hash, UserCheck, FileText } from 'lucide-react';
import { formatRupiah } from '@/lib/format';

export interface InventoryPreviewData {
  name: string;
  categoryId: string;
  categoryName: string;
  location: string;
  quantity: number;
  unit?: string;
  condition: string;
  notes?: string;
  price?: number;
  photoPreviewUrl: string | null;
  photoPreviewUrls?: string[];
  submitterName: string;
}

interface InventoryConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  data: InventoryPreviewData;
  isSubmitting: boolean;
}

export function InventoryConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  data,
  isSubmitting,
}: InventoryConfirmModalProps) {
  const allPhotos = data.photoPreviewUrls && data.photoPreviewUrls.length > 0
    ? data.photoPreviewUrls
    : data.photoPreviewUrl
    ? [data.photoPreviewUrl]
    : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title="Periksa Data Inventaris"
      description="Pastikan seluruh informasi barang inventaris yang Anda masukkan sudah benar sebelum disimpan."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Photo Preview if available */}
        {allPhotos.length > 0 ? (
          <div className="w-full rounded-lg overflow-hidden border border-[#EAE4D9] bg-[#FAF9F5] flex flex-col items-center justify-center p-2 space-y-2">
            <img
              src={allPhotos[0]}
              alt="Preview Barang"
              className="w-full max-h-52 object-contain rounded-md"
            />
            {allPhotos.length > 1 && (
              <div className="w-full flex items-center justify-between text-[11px] text-[#70685C] px-1 border-t border-[#EAE4D9] pt-1.5">
                <span className="font-bold text-[#7A5805]">
                  📸 {allPhotos.length} Foto Siap Disimpan
                </span>
                <div className="flex gap-1 overflow-x-auto max-w-[200px]">
                  {allPhotos.slice(0, 6).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Thumb ${i + 1}`}
                      className="w-7 h-7 rounded object-cover border border-[#EAE4D9]"
                    />
                  ))}
                  {allPhotos.length > 6 && (
                    <span className="text-[10px] self-center text-[#70685C] font-semibold">
                      +{allPhotos.length - 6}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full py-5 rounded-lg border border-dashed border-[#D6CCB8] bg-[#FAF9F5] flex flex-col items-center justify-center text-[#70685C]">
            <ImageIcon className="w-8 h-8 text-[#C5A059] mb-1 opacity-70" />
            <span className="text-xs">Tanpa Foto Barang</span>
          </div>
        )}

        {/* Details Grid */}
        <div className="bg-[#FAF9F5] border border-[#EAE4D9] rounded-lg p-4 space-y-3">
          <div>
            <span className="text-xs text-[#70685C] block">Nama Barang</span>
            <span className="text-base font-semibold text-[#231F1A] break-words">
              {data.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#EAE4D9]">
            <div>
              <span className="text-xs text-[#70685C] flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#B8860B]" /> Kategori
              </span>
              <span className="text-sm font-medium text-[#231F1A] mt-0.5 block">
                {data.categoryName}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#70685C] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#B8860B]" /> Lokasi
              </span>
              <span className="text-sm font-medium text-[#231F1A] mt-0.5 block">
                {data.location}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#EAE4D9]">
            <div>
              <span className="text-xs text-[#70685C] flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-[#B8860B]" /> Jumlah
              </span>
              <span className="text-sm font-semibold text-[#231F1A] mt-0.5 block">
                {data.quantity} {data.unit || 'Unit'}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#70685C] block">Kondisi</span>
              <div className="mt-1">
                <ConditionBadge condition={data.condition} />
              </div>
            </div>
          </div>

          {data.notes && (
            <div className="pt-2 border-t border-[#EAE4D9]">
              <span className="text-xs text-[#70685C] flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#B8860B]" /> Catatan / Keterangan
              </span>
              <p className="text-xs text-[#231F1A] mt-0.5 whitespace-pre-wrap leading-relaxed">
                {data.notes}
              </p>
            </div>
          )}

          {data.price !== undefined && data.price !== null && (
            <div className="pt-2 border-t border-[#EAE4D9]">
              <span className="text-xs text-[#70685C] block">Harga / Nilai Perolehan:</span>
              <span className="text-sm font-bold text-[#2B6336] mt-0.5 block">
                {formatRupiah(data.price)}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-[#EAE4D9]">
            <span className="text-xs text-[#70685C] flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-[#B8860B]" /> Nama Penginput
            </span>
            <span className="text-sm font-medium text-[#231F1A] mt-0.5 block">
              {data.submitterName}
            </span>
          </div>
        </div>

        {/* Modal Action Buttons: [Ulangi] and [Setuju, Simpan Data] */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Ulangi
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Setuju, Simpan Data
          </Button>
        </div>
      </div>
    </Modal>
  );
}
