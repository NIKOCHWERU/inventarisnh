'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Image as ImageIcon, Trash2, Package, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { formatRupiah } from '@/lib/format';
import { formatPhotoUrl } from '@/lib/base-path';
import { compressImage } from '@/lib/image-compress';

const LOGISTIC_CATEGORIES = [
  'Makanan & Minuman',
  'Kebersihan',
  'ATK (Alat Tulis Kantor)',
  'Peralatan Dapur',
  'Sanitasi & Kesehatan',
  'Lainnya',
];

const LOGISTIC_UNITS = [
  'pcs', 'bungkus', 'botol', 'pack', 'lusin',
  'kg', 'liter', 'dus', 'lembar', 'rol', 'set', 'buah',
];

export interface LogisticItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  min_stock: number;
  location: string;
  notes?: string | null;
  price?: number | null;
  photo_path?: string | null;
  created_at: string;
  creator: { id: string; name: string };
}

interface LogisticsEditModalProps {
  item: LogisticItem;
  locationSuggestions: string[];
  onClose: () => void;
  onUpdated: (updated: LogisticItem) => void;
}

export function LogisticsEditModal({
  item,
  locationSuggestions,
  onClose,
  onUpdated,
}: LogisticsEditModalProps) {
  // Form state — initialized from item
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [unit, setUnit] = useState(item.unit);
  const [quantity, setQuantity] = useState(item.quantity);
  const [minStock, setMinStock] = useState(item.min_stock);
  const [location, setLocation] = useState(item.location);
  const [notes, setNotes] = useState(item.notes || '');
  const [price, setPrice] = useState(
    item.price != null && !isNaN(item.price)
      ? Math.round(item.price).toLocaleString('id-ID')
      : ''
  );

  // Photo state
  const [currentPhotoPath, setCurrentPhotoPath] = useState(item.photo_path || null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const res = await compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.78 });
      setNewPhotoFile(res.file);
      setNewPhotoPreview(res.previewUrl);
      setRemovePhoto(false);
    } catch {
      setNewPhotoFile(file);
      setNewPhotoPreview(URL.createObjectURL(file));
      setRemovePhoto(false);
    }
  };

  const handleRemoveNewPhoto = () => {
    if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview);
    setNewPhotoFile(null);
    setNewPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleDeleteCurrentPhoto = () => {
    setRemovePhoto(true);
    setCurrentPhotoPath(null);
  };

  const adjustQty = (delta: number) => {
    setQuantity((prev) => Math.max(0, prev + delta));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Nama wajib diisi.'); return; }
    if (!location.trim()) { setError('Lokasi wajib diisi.'); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('category', category.trim());
      formData.append('unit', unit.trim());
      formData.append('quantity', String(quantity));
      formData.append('min_stock', String(minStock));
      formData.append('location', location.trim());
      formData.append('notes', notes.trim());
      const rawPrice = price.replace(/[^0-9]/g, '');
      formData.append('price', rawPrice || '');
      if (removePhoto && !newPhotoFile) formData.append('remove_photo', 'true');
      if (newPhotoFile) formData.append('photo', newPhotoFile);

      const res = await fetch(`/api/logistics/${item.id}`, {
        method: 'PUT',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal menyimpan.');
      onUpdated(data.item);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE4D9]">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#B8860B]" />
            <h2 className="text-sm font-semibold text-[#231F1A]">Edit Barang Logistik</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#70685C] hover:bg-[#FAF9F5] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Nama */}
            <div>
              <label className="block text-xs font-medium text-[#231F1A] mb-1.5">Nama Barang *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#EAE4D9] text-sm focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
              />
            </div>

            {/* Kategori + Satuan */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#231F1A] mb-1.5">Kategori *</label>
                <Combobox value={category} onChange={setCategory} options={LOGISTIC_CATEGORIES} allowCreate />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#231F1A] mb-1.5">Satuan *</label>
                <Combobox value={unit} onChange={setUnit} options={LOGISTIC_UNITS} allowCreate />
              </div>
            </div>

            {/* Stok — dengan tombol +/- */}
            <div>
              <label className="block text-xs font-medium text-[#231F1A] mb-1.5">
                Jumlah Stok *
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => adjustQty(-1)}
                  className="w-10 h-10 rounded-lg border border-[#EAE4D9] flex items-center justify-center text-[#70685C] hover:border-[#B8860B] hover:text-[#B8860B] transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="flex-1 text-center text-xl font-bold px-3 py-2 rounded-lg border border-[#EAE4D9] focus:outline-none focus:ring-2 focus:ring-[#B8860B] text-[#231F1A]"
                />
                <button
                  type="button"
                  onClick={() => adjustQty(1)}
                  className="w-10 h-10 rounded-lg border border-[#EAE4D9] flex items-center justify-center text-[#70685C] hover:border-[#B8860B] hover:text-[#B8860B] transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-[#70685C] mt-1">
                Stok minimum:{' '}
                <input
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(parseInt(e.target.value, 10) || 0)}
                  className="w-14 text-center border border-[#EAE4D9] rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
                />{' '}
                {unit} (alert jika di bawah ini)
              </p>
            </div>

            {/* Lokasi */}
            <div>
              <label className="block text-xs font-medium text-[#231F1A] mb-1.5">Lokasi Simpan *</label>
              <Combobox
                value={location}
                onChange={setLocation}
                options={locationSuggestions}
                placeholder="Dapur, Gudang, dll..."
                allowCreate
              />
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-medium text-[#231F1A] mb-1.5">Catatan</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Merk, kadaluarsa, dll..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#EAE4D9] text-sm text-[#231F1A] placeholder-[#C5A059]/60 focus:outline-none focus:ring-2 focus:ring-[#B8860B] resize-none"
              />
            </div>

            {/* Harga Beli / Satuan (Opsional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#231F1A]">
                  Harga Beli / Satuan <span className="text-[#70685C] font-normal">(Opsional)</span>
                </label>
                {price && (
                  <span className="text-[11px] font-bold text-[#2B6336]">
                    {formatRupiah(parseFloat(price.replace(/[^0-9]/g, '')))}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8C8273]">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, '');
                    if (!digits) setPrice('');
                    else setPrice(parseInt(digits, 10).toLocaleString('id-ID'));
                  }}
                  placeholder="0 (Contoh: 25.000)"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[#EAE4D9] text-sm font-semibold text-[#231F1A] placeholder-[#8C8273]/70 focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                />
              </div>
            </div>

            {/* Foto */}
            <div>
              <label className="block text-xs font-medium text-[#231F1A] mb-1.5">
                Foto Barang <span className="text-[#70685C] font-normal">(Opsional)</span>
              </label>

              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handlePhotoSelect} className="hidden" />

              {/* New photo preview */}
              {newPhotoPreview && (
                <div className="relative rounded-xl border border-[#EAE4D9] overflow-hidden mb-2">
                  <img src={newPhotoPreview} alt="Preview baru" className="w-full max-h-48 object-contain bg-[#FAF9F5]" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      type="button"
                      onClick={handleRemoveNewPhoto}
                      className="bg-red-500 text-white rounded-lg p-1.5 shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-center text-[#70685C] py-1">Foto baru (belum disimpan)</p>
                </div>
              )}

              {/* Current photo (if no new photo selected) */}
              {!newPhotoPreview && currentPhotoPath && (
                <div className="relative rounded-xl border border-[#EAE4D9] overflow-hidden mb-2">
                  <img src={formatPhotoUrl(currentPhotoPath)} alt="Foto saat ini" className="w-full max-h-48 object-contain bg-[#FAF9F5]" />
                  <div className="absolute top-2 right-2">
                    <button
                      type="button"
                      onClick={handleDeleteCurrentPhoto}
                      className="bg-red-500 text-white rounded-lg p-1.5 shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-center text-[#70685C] py-1">Foto saat ini</p>
                </div>
              )}

              {/* Upload buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-2.5 border border-[#EAE4D9] rounded-lg bg-[#FAF9F5] hover:bg-[#F4F0E8] transition flex items-center justify-center gap-1.5 text-xs text-[#70685C]"
                >
                  <Camera className="w-4 h-4 text-[#B8860B]" />
                  Kamera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 border border-[#EAE4D9] rounded-lg bg-[#FAF9F5] hover:bg-[#F4F0E8] transition flex items-center justify-center gap-1.5 text-xs text-[#70685C]"
                >
                  <ImageIcon className="w-4 h-4 text-[#C5A059]" />
                  Galeri
                </button>
              </div>
              <p className="text-[10px] text-[#70685C] mt-1">JPG, PNG, WebP — maks. 5 MB</p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-[#EAE4D9] px-5 py-4 flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex-1 font-semibold"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </span>
              ) : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
