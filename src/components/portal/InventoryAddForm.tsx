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
  AlertTriangle,
  X,
  History,
  Check,
  Clock,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import { portalFetch } from '@/lib/api-client';
import { compressImage } from '@/lib/image-compress';

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

const INVENTORY_UNITS = ['PCS', 'SET', 'UNIT', 'BUAH', 'DUS', 'PAKET'];

export function InventoryAddForm({ currentUser, onSuccess }: InventoryAddFormProps) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('PCS');
  const [customUnit, setCustomUnit] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [condition, setCondition] = useState('Baik');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // History & Duplicate Prevention states (dari semua penginput di seluruh kantor)
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [allItemNames, setAllItemNames] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const historyDebounceRef = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch categories, locations, and initial history from ALL users on mount
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
    fetchHistory('');
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

  // Close history dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (nameContainerRef.current && !nameContainerRef.current.contains(event.target as Node)) {
        setIsHistoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchHistory = async (q: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await portalFetch(`/api/inventory/history?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) {
        if (data.items) setHistoryItems(data.items);
        if (data.allNames && data.allNames.length > 0) {
          setAllItemNames(data.allNames);
        }
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    setIsHistoryOpen(true);
    if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    historyDebounceRef.current = setTimeout(() => {
      fetchHistory(val.trim());
    }, 180);
  };

  const handleNameFocus = () => {
    setIsHistoryOpen(true);
    fetchHistory(name.trim());
  };

  const handleApplyHistoryItem = (item: any) => {
    setName(item.name);
    setCategoryName(item.categoryName);
    setCategoryId(item.categoryId);
    if (item.unit) {
      if (INVENTORY_UNITS.includes(item.unit.toUpperCase())) {
        setUnit(item.unit.toUpperCase());
        setIsCustomUnit(false);
      } else {
        setIsCustomUnit(true);
        setCustomUnit(item.unit);
      }
    }
    if (item.location) {
      const parsedLocs = item.location.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (parsedLocs.length > 0) {
        setLocations(parsedLocs);
      }
    }
    setIsHistoryOpen(false);
  };

  // Multiple Locations Handlers
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
      // Otomatis kompres foto resolusi kamera HP (misal 5-15MB) menjadi ~150-250KB JPEG
      const res = await compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.78 });
      setPhotoFile(res.file);
      setPhotoPreview(res.previewUrl);

      const origMB = (res.originalSize / (1024 * 1024)).toFixed(1);
      const compKB = Math.round(res.compressedSize / 1024);
      setPhotoInfo(`⚡ Dioptimalkan: ${origMB}MB ➔ ${compKB}KB (Upload Cepat)`);
    } catch {
      // Fallback
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
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
    cameraInputRef.current && (cameraInputRef.current.value = '');
  };

  const exactDuplicate = historyItems.find(
    (h) => h.name.trim().toLowerCase() === name.trim().toLowerCase()
  );

  const effectiveLocations = locations.length > 0 ? locations : (locationInput.trim() ? [locationInput.trim()] : []);
  const effectiveUnit = isCustomUnit ? (customUnit.trim() || 'PCS') : unit;

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

    if (effectiveLocations.length === 0) {
      setErrorMessage('Pilih atau ketik minimal satu tempat / lokasi barang.');
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

      const finalLocStr = effectiveLocations.join(', ');

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('category_id', finalCategoryId);
      formData.append('location', finalLocStr);
      formData.append('quantity', quantity);
      formData.append('unit', effectiveUnit);
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

      effectiveLocations.forEach((loc) => {
        if (!locationSuggestions.includes(loc)) {
          setLocationSuggestions((prev) => [...prev, loc].sort());
        }
      });

      setIsConfirmOpen(false);
      setSuccessMessage(`Berhasil menyimpan barang: "${name.trim()}"!`);

      // Reset
      setName('');
      setNotes('');
      setPrice('');
      setQuantity('1');
      handleRemovePhoto();

      if (!fastMode) {
        setLocations([]);
        setLocationInput('');
        setCategoryName(categories[0]?.name || '');
        setCondition('Baik');
        setUnit('PCS');
        setIsCustomUnit(false);
        setCustomUnit('');
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
    location: effectiveLocations.join(', '),
    quantity: parseInt(quantity, 10) || 1,
    unit: effectiveUnit,
    condition: condition.trim(),
    notes: notes.trim() || undefined,
    price: price.trim() ? parseFloat(price.replace(/[^0-9]/g, '')) : undefined,
    photoPreviewUrl: photoPreview,
    submitterName: currentUser.name,
  };

  const allLocationSuggestions = Array.from(
    new Set([...locationSuggestions, ...COMMON_LOCATIONS])
  ).slice(0, 10);

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
          {/* Nama Barang dengan Autocomplete Histori & Pencegah Duplikat */}
          <div ref={nameContainerRef} className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#231F1A]">
                Nama Barang <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsHistoryOpen(true);
                  fetchHistory('');
                }}
                className="text-[11px] text-[#B8860B] hover:underline flex items-center gap-1 font-medium"
              >
                <History className="w-3 h-3 text-[#B8860B]" />
                Histori Input ({historyItems.length || 'Cek'})
              </button>
            </div>

            <div className="relative">
              <input
                ref={nameInputRef}
                type="text"
                list="inventory-all-names-list"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={handleNameFocus}
                placeholder="Contoh: Laptop ThinkPad T14, Meja Kerja Staff, Proyektor..."
                required
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm text-[#231F1A] focus:outline-none focus:ring-2 transition ${
                  exactDuplicate ? 'border-amber-400 ring-1 ring-amber-300' : 'border-[#EAE4D9] focus:ring-[#B8860B]'
                }`}
              />
              <datalist id="inventory-all-names-list">
                {allItemNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {isLoadingHistory && (
                <div className="absolute right-3 top-3">
                  <div className="w-4 h-4 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Peringatan jika barang serupa/sama terdeteksi agar tidak double */}
            {exactDuplicate && (
              <div className="mt-1.5 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-bold">⚠️ Perhatian: Barang "{exactDuplicate.name}" sudah pernah diinput!</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Tercatat di: <strong>{exactDuplicate.location}</strong> ({exactDuplicate.quantity} {exactDuplicate.unit || 'PCS'}), diinput oleh <strong>{exactDuplicate.creatorName}</strong> ({new Date(exactDuplicate.createdAt).toLocaleDateString('id-ID')}).
                    Pastikan Anda tidak memasukkan barang yang sama dua kali.
                  </p>
                </div>
              </div>
            )}

            {/* Dropdown Histori Barang Kantor */}
            {isHistoryOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white rounded-xl border border-[#C5A059] shadow-xl max-h-72 overflow-y-auto animate-in fade-in">
                <div className="p-2.5 bg-[#FAF6EC] border-b border-[#EAE4D9] flex items-center justify-between sticky top-0 z-10">
                  <span className="text-[11px] font-bold text-[#7A5805] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#B8860B]" />
                    {name.trim()
                      ? `Barang Serupa di Database (${historyItems.length} ditemukan):`
                      : 'Histori Barang Terakhir yang Diinput Kantor (Semua Orang):'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen(false)}
                    className="p-1 rounded-md hover:bg-black/5 text-[#70685C] text-[10px] font-semibold"
                  >
                    Tutup ✕
                  </button>
                </div>

                {isLoadingHistory ? (
                  <div className="p-4 text-center text-xs text-[#70685C] flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
                    Memuat riwayat inventaris...
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#70685C]">
                    {name.trim()
                      ? `Belum ada barang dengan nama mirip "${name}". Aman untuk diinput (bukan duplikat).`
                      : 'Belum ada data barang sebelumnya.'}
                  </div>
                ) : (
                  <div className="divide-y divide-[#EAE4D9]">
                    {historyItems.map((item) => {
                      const isExact = item.name.toLowerCase() === name.trim().toLowerCase();
                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 hover:bg-[#FAF9F5] transition text-xs flex items-start justify-between gap-2 ${
                            isExact ? 'bg-amber-50/70' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-[#231F1A]">{item.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FAF6EC] text-[#7A5805] border border-[#E5D7B7]">
                                {item.categoryName}
                              </span>
                              {isExact && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 border border-amber-300">
                                  SUDAH TERDAFTAR
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#70685C] mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5 text-[#B8860B]" /> {item.location}
                              </span>
                              <span>•</span>
                              <span>{item.quantity} {item.unit || 'PCS'}</span>
                              <span>•</span>
                              <span className="text-[#8C8273]">
                                Diinput: {item.creatorName} ({new Date(item.createdAt).toLocaleDateString('id-ID')})
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleApplyHistoryItem(item)}
                            className="px-2 py-1 rounded-lg bg-white border border-[#EAE4D9] hover:border-[#B8860B] hover:text-[#B8860B] text-[10px] font-semibold text-[#70685C] flex-shrink-0 transition"
                            title="Salin kategori & lokasi barang ini"
                          >
                            Gunakan Data
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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

          {/* Tempat / Lokasi Ruangan (Bisa beberapa lokasi & ada tombol silang ✕) */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#231F1A]">
                Tempat / Lokasi Ruangan <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-[#70685C]">
                {effectiveLocations.length > 0 ? `${effectiveLocations.length} lokasi dipilih` : 'Bisa pilih lebih dari satu'}
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
                  placeholder="Ketik lokasi (misal: Ruang Rapat Lt. 1, Gudang A) lalu tekan Enter / Tambah..."
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
              {allLocationSuggestions.map((loc) => {
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

          {/* Jumlah ("Hanya Jumlah") & Satuan (PCS / SET / lainnya custom) */}
          <div className="pt-1 border-t border-[#EAE4D9]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              {/* Hanya Jumlah */}
              <div>
                <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                  Jumlah Barang <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuantity(String(Math.max(1, (parseInt(quantity, 10) || 1) - 1)))}
                    className="w-10 h-10 rounded-xl border border-[#EAE4D9] bg-[#FAF9F5] hover:bg-gray-100 flex items-center justify-center text-[#70685C] font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    placeholder="Contoh: 1, 2, 5"
                    className="flex-1 px-3 py-2 rounded-xl border border-[#EAE4D9] bg-white text-center text-base font-bold text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(String((parseInt(quantity, 10) || 1) + 1))}
                    className="w-10 h-10 rounded-xl border border-[#EAE4D9] bg-[#FAF9F5] hover:bg-gray-100 flex items-center justify-center text-[#70685C] font-bold"
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

              {/* Satuan Barang (PCS / SET / lainnya custom) */}
              <div>
                <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                  Satuan <span className="text-red-500">*</span>
                </label>

                {/* Quick Unit Pills */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {INVENTORY_UNITS.map((u) => {
                    const isSelected = !isCustomUnit && unit.toUpperCase() === u;
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
                      placeholder="Ketik satuan (contoh: Roll, Lusin, Rim, Box)..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#B8860B] bg-white text-xs text-[#231F1A] focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomUnit(false);
                        setCustomUnit('');
                        setUnit('PCS');
                      }}
                      className="text-xs text-[#70685C] hover:text-red-600 px-2 py-1"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#70685C]">
                    Satuan aktif: <span className="font-bold text-[#7A5805] bg-[#FAF6EC] px-1.5 py-0.5 rounded border border-[#E5D7B7]">{effectiveUnit}</span>
                  </p>
                )}
              </div>
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

            {isCompressingPhoto ? (
              <div className="p-6 rounded-xl border border-dashed border-[#B8860B] bg-[#FAF6EC] flex flex-col items-center justify-center gap-2 text-center animate-pulse">
                <div className="w-6 h-6 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-[#7A5805]">Mengoptimalkan resolusi foto agar ringan...</span>
              </div>
            ) : !photoPreview ? (
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
              <div className="space-y-1.5">
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
                {photoInfo && (
                  <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-md px-2.5 py-1 flex items-center gap-1">
                    {photoInfo}
                  </p>
                )}
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
