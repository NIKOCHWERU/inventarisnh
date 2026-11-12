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
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock,
  History,
  Check,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
  histories?: any[];
}

interface LogisticsEditModalProps {
  item: LogisticItem;
  locationSuggestions?: string[];
  onClose: () => void;
  onUpdated: (updated: LogisticItem) => void;
}

type TabType = 'stock' | 'data' | 'history';

export function LogisticsEditModal({
  item,
  locationSuggestions = [],
  onClose,
  onUpdated,
}: LogisticsEditModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('stock');

  // Form states initialized from item
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [unit, setUnit] = useState(item.unit);
  const [minStock, setMinStock] = useState(item.min_stock);
  const [location, setLocation] = useState(item.location);
  const [notes, setNotes] = useState(item.notes || '');
  const [price, setPrice] = useState(
    item.price != null && !isNaN(item.price)
      ? Math.round(item.price).toLocaleString('id-ID')
      : ''
  );

  // Stock Adjustment States
  // 'IN' = Tambah stok masuk (+), 'OUT' = Kurangi stok terpakai (-), 'SET' = Koreksi langsung angka stok
  const [stockMode, setStockMode] = useState<'IN' | 'OUT' | 'SET'>('IN');
  const [stockAmount, setStockAmount] = useState<string>('5');
  const [stockDirectQty, setStockDirectQty] = useState<number>(item.quantity);
  const [stockChangeReason, setStockChangeReason] = useState<string>('');

  // Photo state
  const [currentPhotoPath, setCurrentPhotoPath] = useState(item.photo_path || null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoInfo, setPhotoInfo] = useState<string | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  // Histories state
  const [histories, setHistories] = useState<any[]>(item.histories || []);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Fetch histories on mount
  useEffect(() => {
    async function loadDetail() {
      setIsLoadingHistory(true);
      try {
        const res = await fetch(`/api/logistics/${item.id}`);
        const data = await res.json();
        if (data.success && data.item?.histories) {
          setHistories(data.item.histories);
        }
      } catch (err) {
        console.error('Failed to load item histories:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    loadDetail();
  }, [item.id]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsCompressingPhoto(true);
    try {
      const res = await compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.78 });
      setNewPhotoFile(res.file);
      setNewPhotoPreview(res.previewUrl);
      setRemovePhoto(false);
      const origMB = (res.originalSize / (1024 * 1024)).toFixed(1);
      const compKB = Math.round(res.compressedSize / 1024);
      setPhotoInfo(`⚡ Dioptimalkan: ${origMB}MB ➔ ${compKB}KB`);
    } catch {
      setNewPhotoFile(file);
      setNewPhotoPreview(URL.createObjectURL(file));
      setRemovePhoto(false);
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleRemoveNewPhoto = () => {
    if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview);
    setNewPhotoFile(null);
    setNewPhotoPreview(null);
    setPhotoInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleDeleteCurrentPhoto = () => {
    setRemovePhoto(true);
    setCurrentPhotoPath(null);
  };

  // Compute calculated final quantity based on stockMode
  const parsedAmt = Math.max(0, parseInt(stockAmount, 10) || 0);
  let computedFinalQty = item.quantity;
  let actionType = 'UPDATE';

  if (stockMode === 'IN') {
    computedFinalQty = item.quantity + parsedAmt;
    actionType = 'STOCK_IN';
  } else if (stockMode === 'OUT') {
    computedFinalQty = Math.max(0, item.quantity - parsedAmt);
    actionType = 'STOCK_OUT';
  } else if (stockMode === 'SET') {
    computedFinalQty = Math.max(0, stockDirectQty);
    actionType = 'ADJUSTMENT';
  }

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
      formData.append('quantity', String(computedFinalQty));
      formData.append('min_stock', String(minStock));
      formData.append('location', location.trim());
      formData.append('notes', notes.trim());

      const rawPrice = price.replace(/[^0-9]/g, '');
      formData.append('price', rawPrice || '');

      formData.append('action', actionType);
      if (stockChangeReason.trim()) {
        formData.append('change_reason', stockChangeReason.trim());
      }

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#EAE4D9] bg-[#FAF9F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#B8860B]" />
            <div>
              <h2 className="text-sm font-bold text-[#231F1A]">
                Kelola Stok Logistik
              </h2>
              <p className="text-[11px] text-[#70685C]">
                {item.name} · Sisa Stok: <strong className="text-[#7A5805]">{item.quantity} {item.unit}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#70685C] hover:bg-[#FAF9F5] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 border-b border-[#EAE4D9] bg-[#FAF9F5]/70 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'stock'
                ? 'border-[#B8860B] text-[#7A5805] bg-white'
                : 'border-transparent text-[#70685C] hover:text-[#231F1A]'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>Update Stok</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'data'
                ? 'border-[#B8860B] text-[#7A5805] bg-white'
                : 'border-transparent text-[#70685C] hover:text-[#231F1A]'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>Edit Data & Foto</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'history'
                ? 'border-[#B8860B] text-[#7A5805] bg-white'
                : 'border-transparent text-[#70685C] hover:text-[#231F1A]'
            }`}
          >
            <History className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>Riwayat ({histories.length})</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: UPDATE STOK (MENAMBAH / BERKURANG / KOREKSI) */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              {/* Status Stok Saat Ini */}
              <div className="p-3.5 rounded-xl bg-[#FAF6EC] border border-[#E5D7B7] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C6D1F]">
                    Stok Saat Ini di Sistem
                  </span>
                  <div className="text-xl font-black text-[#7A5805] mt-0.5">
                    {item.quantity} <span className="text-xs font-semibold">{unit}</span>
                  </div>
                  <span className="text-[10px] text-[#70685C]">
                    Batas minimum peringatan: {minStock} {unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#70685C] block">Lokasi:</span>
                  <span className="font-semibold text-xs text-[#231F1A]">{location}</span>
                </div>
              </div>

              {/* Pilihan Aksi: Tambah (Masuk) / Kurang (Pemakaian) / Koreksi */}
              <div>
                <label className="block text-xs font-semibold text-[#231F1A] mb-1.5">
                  Pilih Jenis Perubahan Stok <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStockMode('IN');
                      if (!stockChangeReason) setStockChangeReason('Penambahan stok / pembelian barang baru');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      stockMode === 'IN'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-300 font-bold'
                        : 'bg-white border-[#EAE4D9] text-[#70685C] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      +
                    </div>
                    <span className="text-xs">Stok Masuk</span>
                    <span className="text-[10px] opacity-75">Menambah</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStockMode('OUT');
                      if (!stockChangeReason) setStockChangeReason('Pemakaian / pengeluaran operasional');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      stockMode === 'OUT'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-300 font-bold'
                        : 'bg-white border-[#EAE4D9] text-[#70685C] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                      -
                    </div>
                    <span className="text-xs">Stok Keluar</span>
                    <span className="text-[10px] opacity-75">Pemakaian</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStockMode('SET');
                      setStockDirectQty(item.quantity);
                      if (!stockChangeReason) setStockChangeReason('Koreksi hasil stok opname fisik');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      stockMode === 'SET'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-300 font-bold'
                        : 'bg-white border-[#EAE4D9] text-[#70685C] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      =
                    </div>
                    <span className="text-xs">Koreksi Stok</span>
                    <span className="text-[10px] opacity-75">Stok Opname</span>
                  </button>
                </div>
              </div>

              {/* Input Jumlah Perubahan */}
              {stockMode !== 'SET' ? (
                <div>
                  <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                    {stockMode === 'IN' ? 'Jumlah Barang Masuk (+)' : 'Jumlah Barang Keluar / Dipakai (-)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStockAmount(String(Math.max(1, (parseInt(stockAmount, 10) || 1) - 1)))}
                      className="w-10 h-10 rounded-xl border border-[#EAE4D9] bg-[#FAF9F5] font-bold text-base text-[#70685C]"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={stockAmount}
                      onChange={(e) => setStockAmount(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#EAE4D9] bg-white text-center text-lg font-bold text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                    />
                    <button
                      type="button"
                      onClick={() => setStockAmount(String((parseInt(stockAmount, 10) || 0) + 1))}
                      className="w-10 h-10 rounded-xl border border-[#EAE4D9] bg-[#FAF9F5] font-bold text-base text-[#70685C]"
                    >
                      +
                    </button>
                  </div>
                  {/* Shortcut pills */}
                  <div className="flex gap-1.5 mt-2">
                    {[1, 5, 10, 20, 50].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setStockAmount(String(n))}
                        className={`flex-1 py-1 rounded-lg text-xs font-semibold border transition ${
                          stockAmount === String(n)
                            ? 'bg-[#B8860B] text-white border-[#B8860B]'
                            : 'bg-white border-[#EAE4D9] text-[#70685C] hover:bg-[#FAF9F5]'
                        }`}
                      >
                        {stockMode === 'IN' ? `+${n}` : `-${n}`}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                    Angka Stok Akhir Sebenarnya (Hasil Fisik)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockDirectQty}
                    onChange={(e) => setStockDirectQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE4D9] text-center text-lg font-bold text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                  />
                </div>
              )}

              {/* Kalkulasi Hasil Stok Akhir */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                <span className="text-[#70685C]">Hasil Akhir Stok:</span>
                <span className="font-bold text-sm text-[#231F1A]">
                  {item.quantity} {stockMode === 'IN' ? `+ ${parsedAmt}` : stockMode === 'OUT' ? `- ${parsedAmt}` : `➔`} ={' '}
                  <span className={`font-black ${computedFinalQty <= minStock ? 'text-red-600' : 'text-[#2B6336]'}`}>
                    {computedFinalQty} {unit}
                  </span>
                </span>
              </div>

              {/* Catatan / Alasan Perubahan (Disimpan ke Riwayat) */}
              <div>
                <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                  Catatan / Keterangan Perubahan Stok <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={stockChangeReason}
                  onChange={(e) => setStockChangeReason(e.target.value)}
                  placeholder="Contoh: Pembelian toko grosir, Pemakaian divisi keuangan..."
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAE4D9] bg-white text-xs text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                />
                <span className="text-[10px] text-[#70685C] mt-1 block">
                  Keterangan ini otomatis dicatat ke riwayat logistik kantor.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT DATA LENGKAP & FOTO */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              {/* Nama Barang */}
              <div>
                <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                  Nama Barang Logistik <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAE4D9] text-xs font-semibold text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                />
              </div>

              {/* Kategori & Satuan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE4D9] bg-white text-xs text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                  >
                    {LOGISTIC_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                    Satuan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="pcs, pack, box..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE4D9] bg-white text-xs text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                  />
                </div>
              </div>

              {/* Lokasi & Min Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                    Lokasi Penyimpanan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Contoh: Pantry Lt. 1"
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE4D9] bg-white text-xs text-[#231F1A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                    Batas Minimum Stok
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={(e) => setMinStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE4D9] bg-white text-xs text-[#231F1A]"
                  />
                </div>
              </div>

              {/* Harga & Catatan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                    Harga Beli / Satuan (Opsional)
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
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#EAE4D9] bg-white text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#231F1A] mb-1">
                    Catatan / Spesifikasi
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Kemasan 30 sachet..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE4D9] bg-white text-xs"
                  />
                </div>
              </div>

              {/* Foto Barang */}
              <div className="pt-2 border-t border-[#EAE4D9]">
                <label className="block text-xs font-semibold text-[#231F1A] mb-1.5">
                  Foto Barang Logistik
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />

                {newPhotoPreview ? (
                  <div className="rounded-xl border border-[#B8860B] bg-[#FAF9F5] p-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={newPhotoPreview}
                        alt="Foto Baru"
                        className="w-14 h-14 object-cover rounded-lg border border-[#EAE4D9]"
                      />
                      <div>
                        <span className="text-[11px] font-bold text-[#2B6336] block">✓ Foto Baru Terpilih</span>
                        {photoInfo && <span className="text-[10px] text-[#70685C]">{photoInfo}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveNewPhoto}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : currentPhotoPath && !removePhoto ? (
                  <div className="rounded-xl border border-[#EAE4D9] bg-[#FAF9F5] p-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={formatPhotoUrl(currentPhotoPath)}
                        alt="Foto Saat Ini"
                        className="w-14 h-14 object-cover rounded-lg border border-[#EAE4D9]"
                      />
                      <div>
                        <span className="text-[11px] font-medium text-[#231F1A] block">Foto Tersimpan</span>
                        <span className="text-[10px] text-[#70685C]">Foto aktif barang logistik</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-2 py-1 rounded-lg bg-white border border-[#EAE4D9] text-[10px] font-semibold text-[#70685C] hover:border-[#B8860B]"
                      >
                        Ganti Foto
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteCurrentPhoto}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 py-2.5 px-3 rounded-xl border border-dashed border-[#B8860B] bg-[#FAF6EC] hover:bg-[#F5EED8] text-[#7A5805] font-semibold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-4 h-4 text-[#B8860B]" />
                      Ambil Foto Kamera
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2.5 px-3 rounded-xl border border-[#EAE4D9] bg-white hover:bg-[#FAF9F5] text-[#70685C] font-semibold text-xs flex items-center justify-center gap-1.5"
                    >
                      <ImageIcon className="w-4 h-4 text-[#70685C]" />
                      Pilih dari Galeri
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RIWAYAT PERUBAHAN STOK BARANG INI */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#EAE4D9]">
                <span className="text-xs font-bold text-[#231F1A]">
                  Riwayat Perubahan & Stok Masuk/Keluar
                </span>
                <span className="text-[10px] text-[#70685C]">
                  {histories.length} riwayat tercatat
                </span>
              </div>

              {isLoadingHistory ? (
                <div className="p-8 text-center text-xs text-[#70685C]">
                  Memuat riwayat perubahan...
                </div>
              ) : histories.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#70685C] bg-[#FAF9F5] rounded-xl border border-dashed border-[#EAE4D9]">
                  Belum ada riwayat tercatat untuk barang ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {histories.map((h) => {
                    const isPlus = h.stock_change > 0 || h.action === 'STOCK_IN' || h.action === 'CREATE';
                    const isMinus = h.stock_change < 0 || h.action === 'STOCK_OUT';
                    return (
                      <div
                        key={h.id}
                        className="p-3 rounded-xl border border-[#EAE4D9] bg-white hover:bg-[#FAF9F5] transition text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                isPlus
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : isMinus
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {h.action === 'CREATE'
                                ? 'Pencatatan Awal'
                                : h.action === 'STOCK_IN'
                                ? `Stok Masuk (+${Math.abs(h.stock_change)})`
                                : h.action === 'STOCK_OUT'
                                ? `Stok Keluar (-${Math.abs(h.stock_change)})`
                                : h.action === 'ADJUSTMENT'
                                ? 'Koreksi Stok'
                                : 'Update Data'}
                            </span>
                            <p className="text-xs font-semibold text-[#231F1A] mt-1">
                              {h.notes || 'Perubahan data logistik'}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-[11px] font-bold text-[#7A5805] block">
                              {h.old_stock != null ? `${h.old_stock} ➔ ` : ''}
                              {h.new_stock != null ? `${h.new_stock} ${unit}` : ''}
                            </span>
                            <span className="text-[10px] text-[#8C8273]">
                              {new Date(h.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-[#F0EBE0] text-[10px] text-[#70685C] flex items-center justify-between">
                          <span>Diubah oleh: <strong>{h.user?.name || 'Staff'}</strong></span>
                          <span>ID: {h.id.slice(0, 6)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer Submit Buttons */}
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
              Simpan & Catat Riwayat
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
