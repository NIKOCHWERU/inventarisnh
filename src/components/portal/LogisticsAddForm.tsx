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
  X,
  Check,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import { portalFetch } from '@/lib/api-client';
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
  'pcs',
  'pack',
  'liter',
  'kg',
  'botol',
  'bungkus',
  'dus',
  'rim',
  'lusin',
  'set',
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
  const [customUnit, setCustomUnit] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [quantity, setQuantity] = useState('10');
  const [minStock, setMinStock] = useState('5');
  const [locations, setLocations] = useState<string[]>(['Gudang Pantry']);
  const [locationInput, setLocationInput] = useState('');
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
          portalFetch('/api/logistics?limit=1000'),
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
      if (LOGISTIC_UNITS.includes(preset.unit.toLowerCase())) {
        setUnit(preset.unit.toLowerCase());
        setIsCustomUnit(false);
      } else {
        setIsCustomUnit(true);
        setCustomUnit(preset.unit);
      }
    }
  };

  const handleAddLocation = (locName: string) => {
    const trimmed = locName.trim();
    if (!trimmed) return;
    if (!locations.includes(trimmed)) {
      setLocations((prev) => [...prev, trimmed]);
    }
    setLocationInput('');
  };

  const handleRemoveLocation = (index: number) => {
    setLocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleLocation = (locName: string) => {
    const trimmed = locName.trim();
    if (!trimmed) return;
    if (locations.includes(trimmed)) {
      setLocations((prev) => prev.filter((l) => l !== trimmed));
    } else {
      setLocations((prev) => [...prev, trimmed]);
    }
  };

  const [photoInfo, setPhotoInfo] = useState<string | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingPhoto(true);
    setErrorMessage(null);

    try {
      const res = await compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.78 });
      setPhotoFile(res.file);
      setPhotoPreview(res.previewUrl);

      const origMB = (res.originalSize / (1024 * 1024)).toFixed(1);
      const compKB = Math.round(res.compressedSize / 1024);
      setPhotoInfo(`⚡ Dioptimalkan: ${origMB}MB ➔ ${compKB}KB (Upload Cepat)`);
    } catch {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoInfo(null);
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
    const finalUnit = isCustomUnit ? (customUnit.trim() || 'pcs') : unit;
    const effectiveLocs = locations.length > 0 ? locations : (locationInput.trim() ? [locationInput.trim()] : []);

    if (!finalUnit.trim()) {
      setErrorMessage('Satuan wajib diisi.');
      return;
    }
    if (effectiveLocs.length === 0) {
      setErrorMessage('Pilih atau ketik minimal satu lokasi penyimpanan.');
      return;
    }
    const qNum = parseInt(quantity, 10);
    if (isNaN(qNum) || qNum < 0) {
      setErrorMessage('Jumlah stok tidak valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalLocString = effectiveLocs.join(', ');
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('category', category.trim());
      formData.append('unit', finalUnit.trim());
      formData.append('quantity', String(qNum));
      formData.append('min_stock', String(parseInt(minStock, 10) || 5));
      formData.append('location', finalLocString);
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
      effectiveLocs.forEach((loc) => {
        if (!locationSuggestions.includes(loc)) {
          setLocationSuggestions((prev) => [...prev, loc].sort());
        }
      });

      setSuccessMessage(`Berhasil menambahkan logistik: "${name.trim()}" (${qNum} ${finalUnit})`);

      // Reset
      setName('');
      setQuantity('10');
      setMinStock('5');
      setNotes('');
      setPrice('');
      handleRemovePhoto();

      if (!fastMode) {
        setLocations(['Gudang Pantry']);
        setLocationInput('');
        setCategory(LOGISTIC_CATEGORIES[0]);
        setUnit('pcs');
        setIsCustomUnit(false);
        setCustomUnit('');
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
              list="logistics-all-names-list"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Contoh: Kopi Kapal Api Sachet, Kertas A4..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE4D9] bg-white text-sm text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition"
            />
            <datalist id="logistics-all-names-list">
              {existingNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-semibold text-[#231F1A] mb-1">
              Kategori Logistik <span className="text-red-500">*</span>
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

          {/* Lokasi Penyimpanan (Bisa beberapa lokasi & ada tombol silang ✕) */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#231F1A]">
                Lokasi Penyimpanan <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-[#70685C]">
                {locations.length > 0 ? `${locations.length} lokasi dipilih` : 'Bisa pilih lebih dari satu'}
              </span>
            </div>

            {/* Chips lokasi yang sudah ditambahkan dengan tombol silang ✕ */}
            {locations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE4D9] mb-2 animate-in fade-in">
                {locations.map((loc, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF6EC] border border-[#C5A059] text-xs font-semibold text-[#7A5805] shadow-2xs group"
                  >
                    <MapPin className="w-3 h-3 text-[#B8860B]" />
                    <span>{loc}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(idx)}
                      className="w-4 h-4 rounded-full bg-[#B8860B]/20 hover:bg-red-500 hover:text-white text-[#7A5805] inline-flex items-center justify-center transition ml-0.5"
                      title={`Hapus / silang lokasi "${loc}"`}
                    >
                      <X className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input untuk menambah lokasi baru */}
            <div className="flex gap-1.5">
              <div className="flex-1">
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
                  placeholder="Ketik lokasi (misal: Gudang Pantry, Lemari ATK) lalu Enter / Tambah..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAE4D9] bg-white text-xs text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                />
              </div>
              <button
                type="button"
                onClick={() => handleAddLocation(locationInput)}
                disabled={!locationInput.trim()}
                className="px-3 py-2 rounded-xl bg-[#FAF6EC] border border-[#B8860B]/60 text-[#7A5805] hover:bg-[#B8860B] hover:text-white font-semibold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </div>

            {/* Quick Location Pills (klik untuk tambah / klik lagi untuk kurangi/silang) */}
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-semibold text-[#70685C] mr-0.5 flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5 text-[#B8860B]" /> Saran Cepat:
              </span>
              {allLocations.map((loc) => {
                const isSelected = locations.includes(loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleToggleLocation(loc)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#B8860B] text-white border-[#B8860B] shadow-2xs'
                        : 'bg-white border-[#EAE4D9] text-[#70685C] hover:border-[#B8860B] hover:text-[#B8860B]'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3 stroke-[2.5]" /> : <Plus className="w-3 h-3 opacity-60" />}
                    {loc}
                    {isSelected && <X className="w-2.5 h-2.5 ml-0.5 opacity-80" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stok ("Hanya Jumlah") & Satuan Ukuran (pack / liter / kg / pcs / dll) */}
          <div className="pt-1 border-t border-[#EAE4D9]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              {/* Hanya Jumlah */}
              <div>
                <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                  Jumlah Stok Masuk <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuantity(String(Math.max(0, (parseInt(quantity, 10) || 0) - 1)))}
                    className="w-10 h-10 rounded-xl border border-[#EAE4D9] bg-[#FAF9F5] hover:bg-gray-100 flex items-center justify-center text-[#70685C] font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    placeholder="Contoh: 10, 20"
                    className="flex-1 px-3 py-2 rounded-xl border border-[#EAE4D9] bg-white text-center text-base font-bold text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(String((parseInt(quantity, 10) || 0) + 1))}
                    className="w-10 h-10 rounded-xl border border-[#EAE4D9] bg-[#FAF9F5] hover:bg-gray-100 flex items-center justify-center text-[#70685C] font-bold"
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
                      className={`flex-1 py-1 rounded-lg text-xs font-bold border transition ${
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

              {/* Satuan Ukuran (pack / liter / kg / pcs / lainnya) */}
              <div>
                <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                  Satuan <span className="text-red-500">*</span>
                </label>

                {/* Quick Unit Pills */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {LOGISTIC_UNITS.map((u) => {
                    const isSelected = !isCustomUnit && unit.toLowerCase() === u.toLowerCase();
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          setUnit(u);
                          setIsCustomUnit(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          isSelected
                            ? 'bg-[#B8860B] text-white border-[#B8860B] shadow-2xs'
                            : 'bg-[#FAF9F5] border-[#EAE4D9] text-[#70685C] hover:border-[#B8860B] hover:text-[#B8860B]'
                        }`}
                      >
                        {u}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setIsCustomUnit(true)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                      isCustomUnit
                        ? 'bg-[#B8860B] text-white border-[#B8860B] shadow-2xs'
                        : 'bg-white border-dashed border-[#B8860B] text-[#B8860B] hover:bg-[#FAF6EC]'
                    }`}
                  >
                    + Lainnya
                  </button>
                </div>

                {/* Custom Unit Input */}
                {isCustomUnit ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in">
                    <input
                      type="text"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      placeholder="Ketik satuan baru (contoh: gallon, tabung, karton)..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#B8860B] bg-white text-xs text-[#231F1A] focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomUnit(false);
                        setCustomUnit('');
                        setUnit('pcs');
                      }}
                      className="text-xs text-[#70685C] hover:text-red-600 px-2 py-1"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#70685C]">
                    Satuan aktif: <span className="font-bold text-[#7A5805] bg-[#FAF6EC] px-1.5 py-0.5 rounded border border-[#E5D7B7]">{isCustomUnit ? (customUnit || 'pcs') : unit}</span>
                  </p>
                )}
              </div>
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

            {isCompressingPhoto ? (
              <div className="p-6 rounded-xl border border-dashed border-[#B8860B] bg-[#FAF6EC] flex flex-col items-center justify-center gap-2 text-center animate-pulse">
                <div className="w-6 h-6 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-[#7A5805]">Mengoptimalkan foto agar ringan...</span>
              </div>
            ) : !photoPreview ? (
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
              <div className="space-y-1.5">
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
                {photoInfo && (
                  <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-md px-2.5 py-1 flex items-center gap-1">
                    {photoInfo}
                  </p>
                )}
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
