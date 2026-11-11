'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { InventoryConfirmModal, InventoryPreviewData } from './InventoryConfirmModal';
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
  MapPin,
  Layers,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import { portalFetch } from '@/lib/api-client';

interface CategoryOption {
  id: string;
  name: string;
}

interface InventoryAddFormProps {
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
  onSuccess?: () => void;
}

const COMMON_LOCATIONS = [
  'Ruang Rapat Lt. 1',
  'Ruang Rapat Lt. 2',
  'Ruang Kerja Staf',
  'Gudang Utama',
  'Pantry / Dapur',
  'Lobby Resepsionis',
  'Ruang IT / Server',
];

const CONDITION_SUGGESTIONS = [
  'Baik',
  'Rusak Ringan',
  'Rusak Berat',
  'Perlu Perbaikan',
  'Baru',
  'Bekas Layak Pakai',
  'Lecet Pemakaian',
  'Perlu Servis',
];

export function InventoryAddForm({ currentUser, onSuccess }: InventoryAddFormProps) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [condition, setCondition] = useState('Baik');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Fast mode: keep location & category to speed up inputting multiple items
  const [fastMode, setFastMode] = useState(true);

  // Validation & feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories and locations on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, locRes] = await Promise.all([
          portalFetch('/api/categories'),
          portalFetch('/api/inventory/locations'),
        ]);
        const catData = await catRes.json();
        const locData = await locRes.json();

        if (catData.categories) {
          const activeOnly = catData.categories.filter((c: any) => c.status === 'ACTIVE');
          setCategories(activeOnly);
          if (activeOnly.length > 0 && !categoryName) {
            setCategoryName(activeOnly[0].name);
            setCategoryId(activeOnly[0].id);
          }
        }
        if (locData.locations) {
          setLocationSuggestions(locData.locations);
        }
      } catch (err) {
        console.error('Failed to load form data:', err);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadData();
  }, []);

  // Whenever categoryName changes, resolve the category ID
  useEffect(() => {
    const matched = categories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    );
    setCategoryId(matched ? matched.id : '');
  }, [categoryName, categories]);

  const handleCategoryChange = async (val: string) => {
    setCategoryName(val);
  };

  const handleCreateCategory = async (newName: string) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (data.success && data.category) {
        setCategories((prev) => [...prev, { id: data.category.id, name: data.category.name }]);
        setCategoryId(data.category.id);
        setCategoryName(data.category.name);
      }
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran file foto maksimal 5 MB.');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    setErrorMessage(null);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleTriggerConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Nama barang wajib diisi.');
      return;
    }
    if (!categoryName.trim()) {
      setErrorMessage('Kategori barang wajib diisi.');
      return;
    }
    if (!location.trim()) {
      setErrorMessage('Tempat / Lokasi barang wajib diisi.');
      return;
    }
    if (!condition.trim()) {
      setErrorMessage('Kondisi fisik barang wajib diisi atau dipilih.');
      return;
    }
    const qNum = parseInt(quantity, 10);
    if (isNaN(qNum) || qNum < 1) {
      setErrorMessage('Jumlah barang minimal harus 1.');
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalCategoryId = categoryId;
      if (!finalCategoryId && categoryName.trim()) {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: categoryName.trim() }),
        });
        const data = await res.json();
        if (data.success && data.category) {
          finalCategoryId = data.category.id;
          setCategories((prev) => [...prev, { id: data.category.id, name: data.category.name }]);
          setCategoryId(data.category.id);
        } else if (data.error?.includes('sudah ada')) {
          const refetch = await fetch('/api/categories');
          const refetchData = await refetch.json();
          const found = refetchData.categories?.find(
            (c: any) => c.name.toLowerCase() === categoryName.trim().toLowerCase()
          );
          if (found) finalCategoryId = found.id;
        } else {
          throw new Error(data.error || 'Gagal membuat kategori baru.');
        }
      }

      if (!finalCategoryId) {
        throw new Error('Kategori tidak valid. Pilih atau tambah kategori baru.');
      }

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('category_id', finalCategoryId);
      formData.append('location', location.trim());
      formData.append('quantity', quantity);
      formData.append('condition', condition.trim());
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }
      if (price.trim()) {
        formData.append('price', price.replace(/[^0-9]/g, ''));
      }
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await portalFetch('/api/inventory', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Gagal menyimpan data inventaris.');
      }

      if (!locationSuggestions.includes(location.trim())) {
        setLocationSuggestions((prev) => [...prev, location.trim()].sort());
      }

      setIsConfirmOpen(false);
      setSuccessMessage(`Berhasil menyimpan barang: "${name.trim()}"!`);

      // Reset
      setName('');
      setNotes('');
      setPrice('');
      setQuantity('1');
      handleRemovePhoto();

      if (!fastMode) {
        setLocation('');
        setCategoryName(categories[0]?.name || '');
        setCondition('Baik');
      }

      // Auto focus back on name input for the next item
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setIsConfirmOpen(false);
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat menyimpan barang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryName = categoryName || 'Kategori Dipilih';

  const previewData: InventoryPreviewData = {
    name: name.trim(),
    categoryId,
    categoryName: selectedCategoryName,
    location: location.trim(),
    quantity: parseInt(quantity, 10) || 1,
    condition: condition.trim(),
    notes: notes.trim() || undefined,
    price: price.trim() ? parseFloat(price.replace(/[^0-9]/g, '')) : undefined,
    photoPreviewUrl: photoPreview,
    submitterName: currentUser.name,
  };

  const allLocationSuggestions = Array.from(
    new Set([...locationSuggestions, ...COMMON_LOCATIONS])
  ).slice(0, 8);

  return (
    <div className="max-w-xl mx-auto pb-8">
      {/* Success Notification */}
      {successMessage && (
        <div className="mb-4 p-4 rounded-xl bg-[#EBF5ED] border border-[#C2E2CA] text-[#2B6336] flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#2B6336]" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold">Data Berhasil Disimpan!</h4>
            <p className="text-xs mt-0.5">{successMessage}</p>
            {fastMode && (
              <p className="text-[11px] mt-1 text-[#43794F] font-medium">
                ⚡ Mode Cepat Aktif: Lokasi & Kategori tetap tersimpan untuk input barang berikutnya.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs underline text-[#2B6336] hover:text-[#1F4626]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="mb-4 p-4 rounded-xl bg-[#FDF2F2] border border-[#F8C4C4] text-[#C53030] flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#C53030]" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold">Perhatian</h4>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs underline text-[#C53030] hover:text-[#9B2424]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Card Form */}
      <div className="bg-white rounded-2xl border border-[#EAE4D9] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#EAE4D9] bg-[#FAF9F5] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#231F1A]">
              Input Barang Inventaris Aset
            </h2>
            <p className="text-[11px] text-[#70685C]">
              Catat peralatan kantor (meja, laptop, printer, AC, dll).
            </p>
          </div>

          {/* Fast Mode Toggle */}
          <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-[#EAE4D9] shadow-2xs hover:border-[#B8860B] transition">
            <input
              type="checkbox"
              checked={fastMode}
              onChange={(e) => setFastMode(e.target.checked)}
              className="rounded text-[#B8860B] focus:ring-[#B8860B]"
            />
            <span className="text-[11px] font-semibold text-[#7A5805] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#B8860B]" />
              Mode Cepat
            </span>
          </label>
        </div>

        <form onSubmit={handleTriggerConfirmation} className="p-5 space-y-4">
          {/* Nama Barang */}
          <div>
            <label className="block text-xs font-semibold text-[#231F1A] mb-1">
              Nama Barang <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Laptop ThinkPad T14, Meja Kerja Staff..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE4D9] bg-white text-sm text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition"
            />
          </div>

          {/* Kategori — Combobox */}
          <div>
            <label className="block text-xs font-semibold text-[#231F1A] mb-1">
              Kategori <span className="text-red-500">*</span>
            </label>
            <Combobox
              value={categoryName}
              onChange={handleCategoryChange}
              options={categories.map((c) => c.name)}
              placeholder={isLoadingCategories ? 'Memuat kategori...' : 'Pilih atau ketik kategori...'}
              allowCreate
              onCreateNew={handleCreateCategory}
              disabled={isLoadingCategories}
            />
          </div>

          {/* Tempat / Lokasi dengan Quick Chips */}
          <div>
            <label className="block text-xs font-semibold text-[#231F1A] mb-1">
              Tempat / Lokasi Ruangan <span className="text-red-500">*</span>
            </label>
            <Combobox
              value={location}
              onChange={setLocation}
              options={allLocationSuggestions}
              placeholder="Contoh: Ruang Rapat Lt. 1, Gudang Utama..."
              allowCreate
            />

            {/* Quick Location Pills */}
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-semibold text-[#70685C] mr-0.5 flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5 text-[#B8860B]" /> Cepat:
              </span>
              {allLocationSuggestions.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition ${
                    location === loc
                      ? 'bg-[#B8860B] text-white border-[#B8860B]'
                      : 'bg-[#FAF9F5] border-[#EAE4D9] text-[#70685C] hover:border-[#B8860B] hover:text-[#B8860B]'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Jumlah & Kondisi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Quantity with Steppers */}
            <div>
              <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                Jumlah Unit <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuantity(String(Math.max(1, (parseInt(quantity, 10) || 1) - 1)))}
                  className="w-9 h-9 rounded-lg border border-[#EAE4D9] bg-[#FAF9F5] hover:bg-gray-100 flex items-center justify-center text-[#70685C] font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="flex-1 px-3 py-2 rounded-lg border border-[#EAE4D9] bg-white text-center text-sm font-bold text-[#231F1A] focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(String((parseInt(quantity, 10) || 1) + 1))}
                  className="w-9 h-9 rounded-lg border border-[#EAE4D9] bg-[#FAF9F5] hover:bg-gray-100 flex items-center justify-center text-[#70685C] font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Numbers */}
              <div className="flex gap-1 mt-1.5">
                {[1, 2, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuantity(String(n))}
                    className={`flex-1 py-0.5 rounded text-[10px] font-bold border ${
                      quantity === String(n)
                        ? 'bg-[#B8860B] text-white border-[#B8860B]'
                        : 'bg-white border-[#EAE4D9] text-[#70685C] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Condition with Manual Input & Suggestion Chips */}
            <div>
              <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                Kondisi Fisik Barang <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="condition-suggestions-list"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="Ketik kondisi atau klik saran di bawah..."
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] bg-white text-xs font-medium text-[#231F1A] placeholder-[#8C8273]/70 focus:outline-none focus:ring-1 focus:ring-[#B8860B] transition"
                />
                <datalist id="condition-suggestions-list">
                  {CONDITION_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {CONDITION_SUGGESTIONS.slice(0, 6).map((s) => {
                  const isSelected = condition.trim().toLowerCase() === s.toLowerCase();
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCondition(s)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                        isSelected
                          ? 'bg-[#B8860B] text-white border-[#B8860B] shadow-2xs'
                          : 'bg-white border-[#EAE4D9] text-[#70685C] hover:border-[#B8860B] hover:text-[#B8860B]'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Catatan / Keterangan Tambahan */}
          <div className="pt-2 border-t border-[#EAE4D9]">
            <label className="block text-xs font-semibold text-[#231F1A] mb-1">
              Catatan / Keterangan <span className="text-[11px] text-[#70685C] font-normal">(Opsional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Nomor seri SN-84920, warna hitam, garansi sampai Des 2026, disimpan di rak lemari B..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] bg-white text-xs text-[#231F1A] placeholder-[#8C8273]/70 focus:outline-none focus:ring-1 focus:ring-[#B8860B] transition resize-none"
            />
          </div>

          {/* Harga / Nilai Barang (Opsional) */}
          <div className="pt-2 border-t border-[#EAE4D9]">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#231F1A]">
                Harga / Nilai Perolehan <span className="text-[11px] text-[#70685C] font-normal">(Opsional)</span>
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
                placeholder="0 (Contoh: 1.500.000)"
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-[#EAE4D9] bg-white text-xs sm:text-sm font-semibold text-[#231F1A] placeholder-[#8C8273]/70 focus:outline-none focus:ring-1 focus:ring-[#B8860B] transition"
              />
            </div>
          </div>

          {/* Foto Barang */}
          <div className="pt-2 border-t border-[#EAE4D9]">
            <label className="block text-xs font-semibold text-[#231F1A] mb-1.5">
              Foto Barang <span className="text-[11px] text-[#70685C] font-normal">(Opsional)</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {!photoPreview ? (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-3 rounded-xl border border-dashed border-[#B8860B]/60 bg-[#FAF6EC] hover:bg-[#F7F2E4] text-[#7A5805] flex flex-col items-center justify-center gap-1.5 transition"
                >
                  <Camera className="w-5 h-5 text-[#B8860B]" />
                  <span className="text-xs font-bold">Buka Kamera HP</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl border border-dashed border-[#EAE4D9] bg-white hover:bg-[#FAF9F5] text-[#70685C] flex flex-col items-center justify-center gap-1.5 transition"
                >
                  <ImageIcon className="w-5 h-5 text-[#70685C]" />
                  <span className="text-xs font-medium">Pilih Galeri</span>
                </button>
              </div>
            ) : (
              <div className="relative rounded-xl border border-[#EAE4D9] overflow-hidden bg-black/5 flex items-center justify-center h-44">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2.5 right-2.5 p-2 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition"
                  title="Hapus Foto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-bold text-sm shadow-sm gap-2"
            >
              <Plus className="w-4 h-4" />
              Simpan Inventaris Sekarang
            </Button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      <InventoryConfirmModal
        isOpen={isConfirmOpen}
        data={previewData}
        onConfirm={handleConfirmSubmit}
        onClose={() => setIsConfirmOpen(false)}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
