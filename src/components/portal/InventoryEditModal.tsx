'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Image as ImageIcon,
  Trash2,
  Package,
  Minus,
  Plus,
  MapPin,
  Check,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { formatRupiah } from '@/lib/format';
import { formatPhotoUrl } from '@/lib/base-path';
import { compressImage } from '@/lib/image-compress';
import { portalFetch } from '@/lib/api-client';

const INVENTORY_UNITS = ['PCS', 'SET', 'UNIT', 'BUAH', 'DUS', 'PAKET'];

const CONDITION_SUGGESTIONS = [
  'Baik',
  'Rusak Ringan',
  'Rusak Berat',
  'Perlu Perbaikan',
  'Baru',
  'Bekas Layak Pakai',
];

const COMMON_LOCATIONS = [
  'Ruang Rapat Lt. 1',
  'Ruang Rapat Lt. 2',
  'Ruang Kerja Staf',
  'Gudang Utama',
  'Pantry / Dapur',
  'Lobby Resepsionis',
  'Ruang IT / Server',
];

export interface InventoryEditItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  location: string;
  quantity: number;
  unit?: string | null;
  condition: string;
  notes?: string | null;
  price?: number | null;
  photoPath: string | null;
  photoPaths?: string[];
  createdById?: string;
  creatorName?: string;
}

interface InventoryEditModalProps {
  item: InventoryEditItem;
  categories: { id: string; name: string }[];
  locationSuggestions: string[];
  onClose: () => void;
  onUpdated: (updated: any) => void;
}

export function InventoryEditModal({
  item,
  categories,
  locationSuggestions,
  onClose,
  onUpdated,
}: InventoryEditModalProps) {
  // Form states
  const [name, setName] = useState(item.name);
  const [categoryName, setCategoryName] = useState(item.categoryName);
  const [categoryId, setCategoryId] = useState(item.categoryId);

  // Multi locations
  const initialLocations = item.location
    ? item.location.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const [locations, setLocations] = useState<string[]>(initialLocations);
  const [locationInput, setLocationInput] = useState('');

  // Quantity & unit
  const [quantity, setQuantity] = useState(String(item.quantity || 1));
  const rawUnit = (item.unit || 'PCS').toUpperCase();
  const isPredefined = INVENTORY_UNITS.includes(rawUnit);
  const [unit, setUnit] = useState(isPredefined ? rawUnit : 'PCS');
  const [customUnit, setCustomUnit] = useState(!isPredefined ? item.unit || '' : '');
  const [isCustomUnit, setIsCustomUnit] = useState(!isPredefined);

  // Condition, Notes, Price
  const [condition, setCondition] = useState(item.condition || 'Baik');
  const [notes, setNotes] = useState(item.notes || '');
  const [price, setPrice] = useState(
    item.price != null && !isNaN(item.price)
      ? Math.round(item.price).toLocaleString('id-ID')
      : ''
  );

  // Photos State (Up to 100 photos)
  const MAX_PHOTOS = 100;
  const initialPhotos = item.photoPaths && item.photoPaths.length > 0
    ? item.photoPaths
    : (item.photoPath ? [item.photoPath] : []);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(initialPhotos);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);
  const [photoInfo, setPhotoInfo] = useState<string | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [compressProgress, setCompressProgress] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const totalPhotoCount = existingPhotos.length + newPhotoFiles.length;

  const handlePhotosSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    if (totalPhotoCount + rawFiles.length > MAX_PHOTOS) {
      setError(
        `Maksimal ${MAX_PHOTOS} foto per barang. Saat ini sudah ada ${totalPhotoCount} foto, dan Anda memilih ${rawFiles.length} foto lagi.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      return;
    }

    setError(null);
    setIsCompressingPhoto(true);

    const newlyCompressedFiles: File[] = [];
    const newlyPreviewUrls: string[] = [];
    let totalOrigBytes = 0;
    let totalCompBytes = 0;

    for (let i = 0; i < rawFiles.length; i++) {
      const f = rawFiles[i];
      setCompressProgress(`Mengoptimalkan foto ${i + 1} dari ${rawFiles.length}...`);
      try {
        const res = await compressImage(f, { maxWidth: 1280, maxHeight: 1280, quality: 0.78 });
        newlyCompressedFiles.push(res.file);
        newlyPreviewUrls.push(res.previewUrl);
        totalOrigBytes += res.originalSize;
        totalCompBytes += res.compressedSize;
      } catch {
        newlyCompressedFiles.push(f);
        newlyPreviewUrls.push(URL.createObjectURL(f));
        totalOrigBytes += f.size;
        totalCompBytes += f.size;
      }
    }

    setNewPhotoFiles((prev) => [...prev, ...newlyCompressedFiles]);
    setNewPhotoPreviews((prev) => [...prev, ...newlyPreviewUrls]);
    setIsCompressingPhoto(false);
    setCompressProgress(null);

    const origMB = (totalOrigBytes / (1024 * 1024)).toFixed(1);
    const compMB = (totalCompBytes / (1024 * 1024)).toFixed(1);
    setPhotoInfo(`⚡ ${rawFiles.length} foto dioptimalkan: ${origMB}MB ➔ ${compMB}MB`);

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleRemoveExistingPhoto = (index: number) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverExistingPhoto = (index: number) => {
    if (index === 0) return;
    setExistingPhotos((prev) => {
      const copy = [...prev];
      const [target] = copy.splice(index, 1);
      return [target, ...copy];
    });
  };

  const handleRemoveNewPhoto = (index: number) => {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAllPhotos = () => {
    setExistingPhotos([]);
    setNewPhotoFiles([]);
    setNewPhotoPreviews([]);
    setPhotoInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleAddLocation = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!locations.includes(trimmed)) {
      setLocations((prev) => [...prev, trimmed]);
    }
    setLocationInput('');
  };

  const handleRemoveLocation = (index: number) => {
    setLocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleLocation = (loc: string) => {
    if (locations.includes(loc)) {
      setLocations((prev) => prev.filter((l) => l !== loc));
    } else {
      setLocations((prev) => [...prev, loc]);
    }
  };

  const handleCategoryChange = (val: string) => {
    setCategoryName(val);
    const matched = categories.find((c) => c.name.toLowerCase() === val.toLowerCase());
    if (matched) setCategoryId(matched.id);
  };

  const effectiveLocations =
    locations.length > 0 ? locations : locationInput.trim() ? [locationInput.trim()] : [];
  const effectiveUnit = isCustomUnit ? customUnit.trim() || 'PCS' : unit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama barang wajib diisi.');
      return;
    }
    if (!categoryName.trim()) {
      setError('Kategori barang wajib diisi.');
      return;
    }
    if (effectiveLocations.length === 0) {
      setError('Minimal satu tempat / lokasi barang wajib ditentukan.');
      return;
    }

    const qNum = parseInt(quantity, 10);
    if (isNaN(qNum) || qNum < 1) {
      setError('Jumlah barang minimal 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalCategoryId = categoryId;
      if (!finalCategoryId && categoryName.trim()) {
        const catRes = await portalFetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: categoryName.trim() }),
        });
        const catData = await catRes.json();
        if (catData.success && catData.category) {
          finalCategoryId = catData.category.id;
        }
      }

      const formData = new FormData();
      formData.append('name', name.trim());
      if (finalCategoryId) formData.append('category_id', finalCategoryId);
      formData.append('location', effectiveLocations.join(', '));
      formData.append('quantity', String(qNum));
      formData.append('unit', effectiveUnit);
      formData.append('condition', condition.trim());
      formData.append('notes', notes.trim());

      const rawPrice = price.replace(/[^0-9]/g, '');
      formData.append('price', rawPrice || '');

      formData.append('existing_photos', JSON.stringify(existingPhotos));
      newPhotoFiles.forEach((file) => {
        formData.append('photos', file);
      });
      if (newPhotoFiles[0]) {
        formData.append('photo', newPhotoFiles[0]);
      }
      if (existingPhotos.length === 0 && newPhotoFiles.length === 0) {
        formData.append('remove_all_photos', 'true');
        formData.append('remove_photo', 'true');
      }

      const res = await portalFetch(`/api/inventory/${item.id}`, {
        method: 'PUT',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan perubahan.');
      }

      const updatedPhotoPaths = data.inventory?.photoPaths ?? (
        existingPhotos.length > 0 ? existingPhotos : []
      );
      const updatedPhotoPath = data.inventory?.photo_path ?? (
        updatedPhotoPaths[0] ?? null
      );

      onUpdated({
        ...item,
        name: name.trim(),
        categoryId: finalCategoryId || item.categoryId,
        categoryName: categoryName.trim(),
        location: effectiveLocations.join(', '),
        quantity: qNum,
        unit: effectiveUnit,
        condition: condition.trim(),
        notes: notes.trim() || null,
        price: rawPrice ? parseFloat(rawPrice) : null,
        photoPath: updatedPhotoPath,
        photoPaths: updatedPhotoPaths,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allSuggestions = Array.from(
    new Set([...locationSuggestions, ...COMMON_LOCATIONS])
  ).slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EAE4D9] bg-[#FAF9F5]">
          <div>
            <h2 className="text-sm font-bold text-[#231F1A] flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#B8860B]" />
              Edit Data Barang Inventaris
            </h2>
            <p className="text-[11px] text-[#70685C]">
              ID: {item.id.slice(0, 8)}... · Oleh: {item.creatorName || 'Anda'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#70685C] hover:bg-[#FAF9F5] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nama Barang */}
          <div>
            <label className="block text-xs font-semibold text-[#231F1A] mb-1">
              Nama Barang <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-[#EAE4D9] bg-white text-sm text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-semibold text-[#231F1A] mb-1">
              Kategori <span className="text-red-500">*</span>
            </label>
            <Combobox
              value={categoryName}
              onChange={handleCategoryChange}
              options={categories.map((c) => c.name)}
              placeholder="Pilih atau ketik kategori..."
              allowCreate
            />
          </div>

          {/* Lokasi (Multi tags + Tombol silang) */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#231F1A]">
                Tempat / Lokasi Ruangan <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-[#70685C]">
                {effectiveLocations.length} lokasi dipilih
              </span>
            </div>

            {/* Chips lokasi dengan tombol silang ✕ */}
            {locations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE4D9] mb-2">
                {locations.map((loc, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF6EC] border border-[#C5A059] text-xs font-semibold text-[#7A5805]"
                  >
                    <MapPin className="w-3 h-3 text-[#B8860B]" />
                    <span>{loc}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(idx)}
                      className="w-4 h-4 rounded-full bg-[#B8860B]/20 hover:bg-red-500 hover:text-white text-[#7A5805] inline-flex items-center justify-center transition ml-0.5"
                    >
                      <X className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input tambah lokasi */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLocation(locationInput);
                  }
                }}
                placeholder="Ketik lokasi lalu tekan Enter / Tambah..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-[#EAE4D9] bg-white text-xs text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
              />
              <button
                type="button"
                onClick={() => handleAddLocation(locationInput)}
                disabled={!locationInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-[#FAF6EC] border border-[#B8860B]/60 text-[#7A5805] font-semibold text-xs disabled:opacity-50"
              >
                + Tambah
              </button>
            </div>

            {/* Saran cepat */}
            <div className="mt-1.5 flex flex-wrap gap-1 items-center">
              <span className="text-[10px] text-[#70685C] mr-1">Saran:</span>
              {allSuggestions.map((loc) => {
                const isSelected = locations.includes(loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleToggleLocation(loc)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition ${
                      isSelected
                        ? 'bg-[#B8860B] text-white border-[#B8860B]'
                        : 'bg-white border-[#EAE4D9] text-[#70685C] hover:border-[#B8860B]'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Jumlah & Satuan */}
          <div className="pt-1 border-t border-[#EAE4D9]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div>
                <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                  Jumlah Barang <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(String(Math.max(1, (parseInt(quantity, 10) || 1) - 1)))
                    }
                    className="w-9 h-9 rounded-xl border border-[#EAE4D9] bg-[#FAF9F5] flex items-center justify-center font-bold text-[#70685C]"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="flex-1 px-3 py-1.5 rounded-xl border border-[#EAE4D9] bg-white text-center text-sm font-bold text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(String((parseInt(quantity, 10) || 1) + 1))
                    }
                    className="w-9 h-9 rounded-xl border border-[#EAE4D9] bg-[#FAF9F5] flex items-center justify-center font-bold text-[#70685C]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                  Satuan <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {INVENTORY_UNITS.map((u) => {
                    const isSelected = !isCustomUnit && unit === u;
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          setUnit(u);
                          setIsCustomUnit(false);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                          isSelected
                            ? 'bg-[#B8860B] text-white border-[#B8860B]'
                            : 'bg-white border-[#EAE4D9] text-[#70685C]'
                        }`}
                      >
                        {u}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setIsCustomUnit(true)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                      isCustomUnit
                        ? 'bg-[#B8860B] text-white border-[#B8860B]'
                        : 'bg-white border-dashed border-[#B8860B] text-[#B8860B]'
                    }`}
                  >
                    + Lainnya
                  </button>
                </div>
                {isCustomUnit && (
                  <input
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="Ketik satuan..."
                    className="w-full px-2.5 py-1 rounded-lg border border-[#B8860B] text-xs"
                    autoFocus
                  />
                )}
              </div>
            </div>
          </div>

          {/* Kondisi Fisik */}
          <div className="pt-1 border-t border-[#EAE4D9]">
            <label className="block text-xs font-semibold text-[#231F1A] mb-1">
              Kondisi Fisik <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#EAE4D9] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {CONDITION_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCondition(s)}
                  className={`px-2 py-0.5 rounded text-[10px] border transition ${
                    condition.toLowerCase() === s.toLowerCase()
                      ? 'bg-[#B8860B] text-white border-[#B8860B]'
                      : 'bg-white border-[#EAE4D9] text-[#70685C]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan & Harga */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#EAE4D9]">
            <div>
              <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                Catatan (Opsional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Catatan tambahan..."
                className="w-full px-3 py-1.5 rounded-xl border border-[#EAE4D9] text-xs resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                Harga Perolehan (Opsional)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8C8273]">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, '');
                    setPrice(digits ? parseInt(digits, 10).toLocaleString('id-ID') : '');
                  }}
                  placeholder="0"
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#EAE4D9] text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Foto Barang (Maksimal 100 Foto) */}
          <div className="pt-1 border-t border-[#EAE4D9]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#231F1A]">
                Foto Barang <span className="text-[10px] text-[#70685C] font-normal">(Maks. {MAX_PHOTOS} Foto)</span>
              </label>
              {totalPhotoCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#B8860B] bg-[#FAF6EC] px-2 py-0.5 rounded-full border border-[#B8860B]/30">
                    📸 {totalPhotoCount} / {MAX_PHOTOS} Foto
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllPhotos}
                    className="text-[10px] text-red-600 hover:text-red-700 hover:underline font-medium"
                  >
                    Hapus Semua
                  </button>
                </div>
              )}
            </div>

            {/* Input file & kamera tersembunyi */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotosSelect}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotosSelect}
            />

            {isCompressingPhoto ? (
              <div className="p-4 rounded-xl border border-dashed border-[#B8860B] bg-[#FAF6EC] flex flex-col items-center justify-center gap-1.5 text-center animate-pulse">
                <div className="w-5 h-5 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-[#7A5805]">
                  {compressProgress || 'Mengoptimalkan resolusi foto agar ringan...'}
                </span>
              </div>
            ) : totalPhotoCount === 0 ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-dashed border-[#B8860B] bg-[#FAF6EC] hover:bg-[#F5EED8] text-[#7A5805] font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Camera className="w-4 h-4 text-[#B8860B]" />
                  Ambil Foto Kamera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-[#EAE4D9] bg-white hover:bg-[#FAF9F5] text-[#70685C] font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <ImageIcon className="w-4 h-4 text-[#70685C]" />
                  Pilih Galeri (Multi-Foto)
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto p-1.5 border border-[#EAE4D9] rounded-xl bg-[#FAF9F5]">
                  {/* Existing Photos */}
                  {existingPhotos.map((src, idx) => (
                    <div
                      key={`exist-${idx}`}
                      className={`relative group rounded-lg overflow-hidden border ${
                        idx === 0 ? 'border-[#B8860B] ring-2 ring-[#B8860B]/40' : 'border-[#EAE4D9]'
                      } bg-black/5 aspect-square flex items-center justify-center shadow-xs`}
                    >
                      <img
                        src={formatPhotoUrl(src)}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {idx === 0 ? (
                        <span className="absolute top-1 left-1 bg-[#B8860B] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-white" /> Utama
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetCoverExistingPhoto(idx)}
                          className="absolute top-1 left-1 bg-black/60 hover:bg-[#B8860B] text-white text-[8px] font-medium px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                          title="Jadikan Foto Utama"
                        >
                          Utamakan
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveExistingPhoto(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white shadow hover:bg-red-700 transition"
                        title="Hapus Foto"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}

                  {/* Newly selected photos */}
                  {newPhotoPreviews.map((src, idx) => (
                    <div
                      key={`new-${idx}`}
                      className="relative group rounded-lg overflow-hidden border border-emerald-400 bg-emerald-50/20 aspect-square flex items-center justify-center shadow-xs"
                    >
                      <img
                        src={src}
                        alt={`Foto Baru ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[8px] font-bold px-1 py-0.5 rounded shadow-xs">
                        +Baru
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNewPhoto(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white shadow hover:bg-red-700 transition"
                        title="Batal Foto Baru"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add more button tile */}
                  {totalPhotoCount < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-[#B8860B]/50 hover:border-[#B8860B] bg-white hover:bg-[#FAF6EC] flex flex-col items-center justify-center gap-0.5 text-[#7A5805] transition p-1"
                      title="Tambah Foto Lagi"
                    >
                      <Plus className="w-4 h-4 text-[#B8860B]" />
                      <span className="text-[9px] font-bold">Tambah</span>
                    </button>
                  )}
                </div>

                {/* Additional upload buttons */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    {totalPhotoCount < MAX_PHOTOS && (
                      <>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-2 py-1 rounded-lg border border-[#B8860B]/40 bg-[#FAF6EC] text-[#7A5805] hover:bg-[#F7F2E4] text-[11px] font-semibold flex items-center gap-1 transition"
                        >
                          <Camera className="w-3 h-3" />
                          + Kamera
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2 py-1 rounded-lg border border-[#EAE4D9] bg-white text-[#574F44] hover:bg-[#FAF9F5] text-[11px] font-medium flex items-center gap-1 transition"
                        >
                          <ImageIcon className="w-3 h-3" />
                          + Galeri
                        </button>
                      </>
                    )}
                  </div>
                  {photoInfo && (
                    <span className="text-[10px] text-emerald-700 font-medium">{photoInfo}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#EAE4D9] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-[#EAE4D9] bg-white text-xs font-semibold text-[#70685C] hover:bg-[#FAF9F5]"
            >
              Batal
            </button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="gap-1.5 font-bold shadow-xs"
            >
              <Check className="w-4 h-4" />
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
