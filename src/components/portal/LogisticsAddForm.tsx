'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import {
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  ShoppingCart,
  Package,
  Camera,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import { portalFetch } from '@/lib/api-client';

const LOGISTIC_CATEGORIES = [
  'Makanan & Minuman',
  'Kebersihan',
  'ATK (Alat Tulis Kantor)',
  'Peralatan Dapur',
  'Sanitasi & Kesehatan',
  'Lainnya',
];

const PRESET_ITEMS: { name: string; category: string; unit: string }[] = [
  { name: 'Kopi Kapal Api Sachet', category: 'Makanan & Minuman', unit: 'bungkus' },
  { name: 'Air Mineral Botol 600ml', category: 'Makanan & Minuman', unit: 'botol' },
  { name: 'Teh Celup Sariwangi', category: 'Makanan & Minuman', unit: 'pack' },
  { name: 'Gula Pasir 1kg', category: 'Makanan & Minuman', unit: 'kg' },
  { name: 'Kertas A4 70gr (Rim)', category: 'ATK (Alat Tulis Kantor)', unit: 'rim' },
  { name: 'Pulpen Gel Hitam', category: 'ATK (Alat Tulis Kantor)', unit: 'pcs' },
  { name: 'Spidol Whiteboard', category: 'ATK (Alat Tulis Kantor)', unit: 'pcs' },
  { name: 'Sabun Cuci Piring Sunlight', category: 'Kebersihan', unit: 'botol' },
  { name: 'Tisu Meja / Kotak', category: 'Kebersihan', unit: 'pack' },
  { name: 'Tisu Toilet', category: 'Kebersihan', unit: 'rol' },
  { name: 'Sabun Cuci Tangan', category: 'Kebersihan', unit: 'botol' },
  { name: 'Kantong Sampah Hitam', category: 'Kebersihan', unit: 'pack' },
];

const COMMON_LOCATIONS = [
  'Gudang Pantry',
  'Lemari ATK Lt. 1',
  'Lemari ATK Lt. 2',
  'Dapur Bersama',
  'Gudang Kebersihan',
  'Ruang Kerja Staf',
];

interface LogisticsAddFormProps {
  currentUser: { id: string; name: string; role: string };
  onSuccess?: () => void;
}

export function LogisticsAddForm({ currentUser, onSuccess }: LogisticsAddFormProps) {
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(LOGISTIC_CATEGORIES[0]);
  const [unit, setUnit] = useState('pcs');
  const [quantity, setQuantity] = useState('10');
  const [minStock, setMinStock] = useState('5');
  const [location, setLocation] = useState('Gudang Pantry');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');

  // Fast mode
  const [fastMode, setFastMode] = useState(true);

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [logRes, locRes] = await Promise.all([
          portalFetch('/api/logistics?limit=100'),
          portalFetch('/api/inventory/locations'),
        ]);
        const logData = await logRes.json();
        const locData = await locRes.json();
        if (logData.items) {
          const names = Array.from(new Set<string>(logData.items.map((i: any) => i.name))).sort();
          setExistingNames(names);
        }
        if (locData.locations) setLocationSuggestions(locData.locations);
      } catch (err) {
        console.error('Failed to load logistic form data:', err);
      }
    }
    loadData();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    const preset = PRESET_ITEMS.find((p) => p.name.toLowerCase() === val.toLowerCase());
    if (preset) {
      setCategory(preset.category);
      setUnit(preset.unit);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran foto maksimal 5 MB.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setErrorMessage(null);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Nama barang wajib diisi.');
      return;
    }
    if (!category.trim()) {
      setErrorMessage('Kategori wajib dipilih.');
      return;
    }
    if (!unit.trim()) {
      setErrorMessage('Satuan wajib diisi.');
      return;
    }
    if (!location.trim()) {
      setErrorMessage('Lokasi wajib diisi.');
      return;
    }
    const qNum = parseInt(quantity, 10);
    if (isNaN(qNum) || qNum < 0) {
      setErrorMessage('Jumlah stok tidak valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('category', category.trim());
      formData.append('unit', unit.trim());
      formData.append('quantity', String(qNum));
      formData.append('min_stock', String(parseInt(minStock, 10) || 5));
      formData.append('location', location.trim());
      formData.append('notes', notes.trim());
      const rawPrice = price.replace(/[^0-9]/g, '');
      if (rawPrice) formData.append('price', rawPrice);
      if (photoFile) formData.append('photo', photoFile);

      const res = await portalFetch('/api/logistics', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal menyimpan.');

      if (!existingNames.includes(name.trim())) {
        setExistingNames((prev) => [...prev, name.trim()].sort());
      }
      if (location.trim() && !locationSuggestions.includes(location.trim())) {
        setLocationSuggestions((prev) => [...prev, location.trim()].sort());
      }

      setSuccessMessage(`Berhasil menambahkan logistik: "${name.trim()}" (${qNum} ${unit})`);

      // Reset
      setName('');
      setQuantity('10');
      setMinStock('5');
      setNotes('');
      setPrice('');
      handleRemovePhoto();

      if (!fastMode) {
        setLocation('Gudang Pantry');
        setCategory(LOGISTIC_CATEGORIES[0]);
        setUnit('pcs');
      }

      // Auto focus back on name input for the next item
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allLocations = Array.from(
    new Set([...locationSuggestions, ...COMMON_LOCATIONS])
  ).slice(0, 8);

  return (
    <div className="max-w-xl mx-auto pb-8 space-y-4">
      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-[#EBF5ED] border border-[#C2E2CA] text-[#2B6336] flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold">Berhasil Disimpan!</h4>
            <p className="text-xs mt-0.5">{successMessage}</p>
            {fastMode && (
              <p className="text-[11px] mt-1 text-[#43794F] font-medium">
                ⚡ Mode Cepat Aktif: Lokasi & Kategori tetap tersimpan untuk item berikutnya.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs underline text-[#2B6336]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F8C4C4] text-[#C53030] flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold">Perhatian</h4>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs underline text-[#C53030]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Quick Presets: 1-Click Fill */}
      <div className="bg-white rounded-2xl border border-[#EAE4D9] shadow-2xs p-4">
        <h3 className="text-xs font-bold text-[#231F1A] mb-2 flex items-center gap-1.5">
          <ShoppingCart className="w-4 h-4 text-[#B8860B]" />
          Pintasan Barang Umum (1-Klik Langsung Terisi):
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_ITEMS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                setName(preset.name);
                setCategory(preset.category);
                setUnit(preset.unit);
              }}
              className="px-2.5 py-1 rounded-lg border border-[#EAE4D9] text-[11px] font-medium text-[#70685C] hover:border-[#B8860B] hover:text-[#7A5805] hover:bg-[#FAF6EC] transition shadow-2xs"
            >
              + {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl border border-[#EAE4D9] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#EAE4D9] bg-[#FAF9F5] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#231F1A] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#B8860B]" />
              Input Stok Logistik & Habis Pakai
            </h2>
            <p className="text-[11px] text-[#70685C]">
              Konsumsi kantor, pantry, perlengkapan kebersihan, dan ATK.
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Nama Barang */}
          <div>
            <label className="block text-xs font-semibold text-[#231F1A] mb-1">
              Nama Barang Logistik <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Contoh: Kopi Kapal Api Sachet, Kertas A4..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE4D9] bg-white text-sm text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition"
            />
          </div>

          {/* Kategori & Satuan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                Kategori <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE4D9] bg-white text-xs font-medium text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
              >
                {LOGISTIC_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                Satuan Ukuran <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs / pack / botol / rim"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE4D9] bg-white text-xs text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
              />
            </div>
          </div>

          {/* Lokasi dengan Quick Chips */}
          <div>
            <label className="block text-xs font-semibold text-[#231F1A] mb-1">
              Lokasi Penyimpanan <span className="text-red-500">*</span>
            </label>
            <Combobox
              value={location}
              onChange={setLocation}
              options={allLocations}
              placeholder="Contoh: Gudang Pantry, Lemari ATK..."
              allowCreate
            />

            {/* Quick Location Chips */}
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-semibold text-[#70685C] mr-0.5 flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5 text-[#B8860B]" /> Cepat:
              </span>
              {allLocations.map((loc) => (
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

          {/* Stok Awal & Peringatan Minimum */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                Jumlah Stok Masuk <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuantity(String(Math.max(0, (parseInt(quantity, 10) || 0) - 1)))}
                  className="w-9 h-9 rounded-lg border border-[#EAE4D9] bg-[#FAF9F5] hover:bg-gray-100 flex items-center justify-center text-[#70685C] font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="flex-1 px-3 py-2 rounded-lg border border-[#EAE4D9] bg-white text-center text-sm font-bold text-[#231F1A] focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(String((parseInt(quantity, 10) || 0) + 1))}
                  className="w-9 h-9 rounded-lg border border-[#EAE4D9] bg-[#FAF9F5] hover:bg-gray-100 flex items-center justify-center text-[#70685C] font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Numbers */}
              <div className="flex gap-1 mt-1.5">
                {[5, 10, 20, 50].map((n) => (
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

            <div>
              <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                Batas Minimum Peringatan Stok
              </label>
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE4D9] bg-white text-xs text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
              />
              <span className="text-[10px] text-[#70685C] mt-1 block">
                Jika stok di bawah angka ini, sistem otomatis memberi alert menipis.
              </span>
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-semibold text-[#231F1A] mb-1">
              Catatan / Spesifikasi (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Rasa original, kemasan isi 30 sachet..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#EAE4D9] bg-white text-xs text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
            />
          </div>

          {/* Harga Satuan / Beli (Opsional) */}
          <div className="pt-2 border-t border-[#EAE4D9]">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#231F1A]">
                Harga Beli / Satuan <span className="text-[11px] text-[#70685C] font-normal">(Opsional)</span>
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
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-[#EAE4D9] bg-white text-xs sm:text-sm font-semibold text-[#231F1A] placeholder-[#8C8273]/70 focus:outline-none focus:ring-1 focus:ring-[#B8860B] transition"
              />
            </div>
            <span className="text-[10px] text-[#70685C] mt-1 block">
              Perkiraan harga beli per satuan atau total perolehan barang habis pakai.
            </span>
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
                  <span className="text-xs font-bold">Kamera HP</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl border border-dashed border-[#EAE4D9] bg-white hover:bg-[#FAF9F5] text-[#70685C] flex flex-col items-center justify-center gap-1.5 transition"
                >
                  <ImageIcon className="w-5 h-5 text-[#70685C]" />
                  <span className="text-xs font-medium">Galeri</span>
                </button>
              </div>
            ) : (
              <div className="relative rounded-xl border border-[#EAE4D9] overflow-hidden bg-black/5 flex items-center justify-center h-44">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-contain" />
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
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="w-full font-bold text-sm shadow-sm gap-2"
            >
              <Plus className="w-4 h-4" />
              Simpan Barang Logistik
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
