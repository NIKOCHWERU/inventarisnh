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
        {data.photoPreviewUrl ? (
          <div className="w-full rounded-lg overflow-hidden border border-[#EAE4D9] bg-[#FAF9F5] flex flex-col items-center justify-center p-1">
            <img
              src={data.photoPreviewUrl}
              alt="Preview Barang"
              className="w-full max-h-56 object-contain rounded-md"
            />
            <span className="text-[11px] text-[#70685C] mt-1 pb-1">
              Foto Barang Inventaris
            </span>
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
