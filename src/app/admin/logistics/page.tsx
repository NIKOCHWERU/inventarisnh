'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  Package,
  ArrowUpDown,
  RefreshCw,
  Minus,
  AlertCircle,
  Eye,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LogisticsEditModal } from '@/components/portal/LogisticsEditModal';
import { formatRupiah } from '@/lib/format';

const LOGISTIC_CATEGORIES = [
  'Semua Kategori',
  'Makanan & Minuman',
  'Kebersihan',
  'ATK (Alat Tulis Kantor)',
  'Peralatan Dapur',
  'Sanitasi & Kesehatan',
  'Lainnya',
];

export default function AdminLogisticsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Edit / Add modal state
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick updating stock
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);

  // Preview photo modal
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Add form fields
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Makanan & Minuman');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newQuantity, setNewQuantity] = useState('10');
  const [newMinStock, setNewMinStock] = useState('5');
  const [newLocation, setNewLocation] = useState('Gudang Pantry');
  const [newNotes, setNewNotes] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);

  async function loadLogistics() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/logistics?limit=500');
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
      }
    } catch (err) {
      console.error('Failed to load logistics:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLogistics();
  }, []);

  async function handleQuickStockChange(item: any, delta: number) {
    const newQty = Math.max(0, item.quantity + delta);
    setUpdatingStockId(item.id);
    try {
      const res = await fetch(`/api/logistics/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
        );
      }
    } catch (err) {
      console.error('Quick stock error:', err);
    } finally {
      setUpdatingStockId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus data logistik "${name}" secara permanen?`)) return;
    try {
      const res = await fetch(`/api/logistics/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setActionMessage({ type: 'success', text: `Item "${name}" berhasil dihapus.` });
        setTimeout(() => setActionMessage(null), 3500);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Gagal menghapus item.' });
    }
  }

  async function handleCreateNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSavingNew(true);
    try {
      const formData = new FormData();
      formData.append('name', newName.trim());
      formData.append('category', newCategory);
      formData.append('unit', newUnit.trim());
      formData.append('quantity', String(Math.max(0, parseInt(newQuantity, 10) || 0)));
      formData.append('min_stock', String(Math.max(0, parseInt(newMinStock, 10) || 5)));
      formData.append('location', newLocation.trim() || 'Gudang Utama');
      if (newNotes.trim()) formData.append('notes', newNotes.trim());
      const rawPrice = newPrice.replace(/[^0-9]/g, '');
      if (rawPrice) formData.append('price', rawPrice);

      const res = await fetch('/api/logistics', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ type: 'success', text: `Barang "${newName}" berhasil ditambahkan ke logistik!` });
        setIsAddModalOpen(false);
        setNewName('');
        setNewNotes('');
        setNewPrice('');
        loadLogistics();
        setTimeout(() => setActionMessage(null), 3500);
      } else {
        throw new Error(data.error || 'Gagal menyimpan.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan barang logistik.');
    } finally {
      setIsSavingNew(false);
    }
  }

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      selectedCategory === 'Semua Kategori' || item.category === selectedCategory;
    const matchLowStock = onlyLowStock ? item.quantity <= item.min_stock : true;
    return matchSearch && matchCategory && matchLowStock;
  });

  const lowStockCount = items.filter((i) => i.quantity <= i.min_stock).length;
  const totalUnits = items.reduce((acc, cur) => acc + cur.quantity, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE4D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#231F1A] flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-[#B8860B]" />
            Manajemen Logistik & Stok Kantor
          </h1>
          <p className="text-xs text-[#70685C] mt-1">
            Kelola stok barang habis pakai, konsumsi pantry, ATK kantor, dan perlengkapan kebersihan.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => setIsAddModalOpen(true)}
          className="gap-1.5 text-xs font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Tambah Barang Logistik
        </Button>
      </div>

      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            actionMessage.type === 'success'
              ? 'bg-[#EBF5ED] border-[#C2E2CA] text-[#2B6336]'
              : 'bg-[#FDF2F2] border-[#F8C4C4] text-[#C53030]'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs">
          <span className="text-xs font-medium text-[#70685C] block">Total Jenis Logistik</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#231F1A]">{items.length}</span>
            <span className="text-xs text-[#70685C]">item</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs">
          <span className="text-xs font-medium text-[#70685C] block">Total Seluruh Stok Fisik</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#231F1A]">{totalUnits}</span>
            <span className="text-xs text-[#70685C]">unit / pack</span>
          </div>
        </div>

        <div
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`rounded-xl border p-4 shadow-2xs cursor-pointer transition ${
            onlyLowStock
              ? 'bg-[#FDF2F2] border-[#C53030] ring-2 ring-[#C53030]'
              : lowStockCount > 0
              ? 'bg-[#FFF8F0] border-[#FBD38D] hover:bg-[#FEEBC8]'
              : 'bg-white border-[#EAE4D9]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#C53030]">Peringatan Stok Menipis</span>
            <AlertTriangle className="w-4 h-4 text-[#C53030]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#C53030]">{lowStockCount}</span>
            <span className="text-xs text-[#C53030]">barang hampir habis (Klik filter)</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs">
          <span className="text-xs font-medium text-[#70685C] block">Kategori Terdaftar</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#231F1A]">
              {new Set(items.map((i) => i.category)).size}
            </span>
            <span className="text-xs text-[#70685C]">kategori</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#70685C] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama barang, lokasi, kategori..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B] bg-white"
          >
            {LOGISTIC_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {onlyLowStock && (
            <button
              type="button"
              onClick={() => setOnlyLowStock(false)}
              className="px-2.5 py-1.5 rounded-lg bg-[#C53030] text-white text-xs font-semibold hover:bg-red-700"
            >
              Hapus Filter Menipis ✕
            </button>
          )}

          {/* View Mode Switcher */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[#F4F0E8] border border-[#EAE4D9]">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-white text-[#B8860B] shadow-2xs'
                  : 'text-[#70685C] hover:text-[#231F1A]'
              }`}
              title="Tampilan Tabel"
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'grid'
                  ? 'bg-white text-[#B8860B] shadow-2xs'
                  : 'text-[#70685C] hover:text-[#231F1A]'
              }`}
              title="Tampilan Grid (Kartu Visual)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadLogistics}
            className="text-xs"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Table of Logistics */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-[#EAE4D9] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F5] border-b border-[#EAE4D9] text-[#70685C] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">Foto & Barang</th>
                <th className="px-4 py-3 font-semibold">Kategori</th>
                <th className="px-4 py-3 font-semibold">Lokasi</th>
                <th className="px-4 py-3 font-semibold text-center">Stok Saat Ini</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Kelola Stok Cepat</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4D9]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#70685C]">
                    <RefreshCw className="w-5 h-5 text-[#B8860B] animate-spin mx-auto mb-2" />
                    Memuat data logistik kantor...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#70685C]">
                    <Package className="w-8 h-8 text-[#D1C7B7] mx-auto mb-2" />
                    Tidak ada data logistik yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.quantity <= item.min_stock;
                  const isUpdating = updatingStockId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#FAF9F5] transition ${
                        isLow ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Name & Photo */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.photo_path ? (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto(item.photo_path)}
                              className="w-10 h-10 rounded-lg overflow-hidden border border-[#EAE4D9] flex-shrink-0 relative group"
                              title="Klik untuk memperbesar foto"
                            >
                              <img
                                src={item.photo_path}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#F4F0E8] border border-[#EAE4D9] flex items-center justify-center text-[#B8860B] flex-shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-[#231F1A] block">{item.name}</span>
                            {item.notes && (
                              <span className="text-[11px] text-[#70685C] block truncate max-w-xs">
                                {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FAF6EC] border border-[#E5D7B7] text-[#7A5805] text-[11px] font-medium">
                          {item.category}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3 text-[#231F1A] font-medium">
                        {item.location}
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-3 text-center">
                        <div>
                          <span
                            className={`text-sm font-bold ${
                              isLow ? 'text-[#C53030]' : 'text-[#231F1A]'
                            }`}
                          >
                            {item.quantity}
                          </span>
                          <span className="text-[11px] text-[#70685C] ml-1">{item.unit}</span>
                        </div>
                        {item.price !== null && item.price !== undefined && (
                          <div className="text-[10px] text-[#2B6336] font-bold mt-0.5">
                            {formatRupiah(item.price)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-[#C53030] text-[10px] font-bold border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            Menipis (Min: {item.min_stock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Aman
                          </span>
                        )}
                      </td>

                      {/* Quick Stock Buttons */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={isUpdating || item.quantity <= 0}
                            onClick={() => handleQuickStockChange(item, -1)}
                            className="w-7 h-7 rounded-md bg-[#FAF9F5] border border-[#EAE4D9] hover:bg-red-50 hover:border-red-300 text-[#70685C] hover:text-[#C53030] flex items-center justify-center transition font-bold disabled:opacity-40"
                            title="Kurang 1"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleQuickStockChange(item, 1)}
                            className="w-7 h-7 rounded-md bg-[#FAF9F5] border border-[#EAE4D9] hover:bg-emerald-50 hover:border-emerald-300 text-[#70685C] hover:text-emerald-700 flex items-center justify-center transition font-bold"
                            title="Tambah 1"
                          >
                            <Plus className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleQuickStockChange(item, 5)}
                            className="px-1.5 h-7 rounded-md bg-[#F7F2E4] border border-[#E5D7B7] hover:bg-[#FAF6EC] text-[#7A5805] font-bold text-[10px] flex items-center justify-center transition"
                            title="Tambah 5 (Restok Cepat)"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      {/* Action Edit / Delete */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 rounded-md hover:bg-[#FAF6EC] text-[#70685C] hover:text-[#B8860B] transition"
                            title="Edit Data"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-[#70685C] hover:text-[#C53030] transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Grid View of Logistics */}
      {viewMode === 'grid' && (
        <div>
          {isLoading ? (
            <div className="bg-white rounded-xl border border-[#EAE4D9] py-12 text-center text-xs text-[#70685C]">
              <RefreshCw className="w-5 h-5 text-[#B8860B] animate-spin mx-auto mb-2" />
              Memuat data logistik kantor...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#EAE4D9] py-12 text-center text-xs text-[#70685C]">
              <Package className="w-8 h-8 text-[#D1C7B7] mx-auto mb-2" />
              Tidak ada data logistik yang cocok dengan pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredItems.map((item) => {
                const isLow = item.quantity <= item.min_stock;
                const isUpdating = updatingStockId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl border overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col ${
                      isLow ? 'border-amber-300 ring-1 ring-amber-200/50' : 'border-[#EAE4D9]'
                    }`}
                  >
                    {/* Photo header */}
                    <div className="relative aspect-4/3 w-full bg-[#FAF9F5] overflow-hidden border-b border-[#EAE4D9]">
                      {item.photo_path ? (
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(item.photo_path)}
                          className="w-full h-full block focus:outline-none cursor-pointer"
                        >
                          <img
                            src={item.photo_path}
                            alt={item.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </button>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#C5A059]/60">
                          <Package className="w-8 h-8 opacity-60" />
                        </div>
                      )}

                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100/95 text-[#C53030] text-[10px] font-bold border border-red-200 shadow-xs">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Stok Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/95 text-emerald-800 text-[10px] font-semibold border border-emerald-200 shadow-xs">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Aman
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h4 className="text-sm font-bold text-[#231F1A] line-clamp-1" title={item.name}>
                          {item.name}
                        </h4>

                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FAF6EC] border border-[#E5D7B7] text-[#7A5805]">
                            {item.category}
                          </span>
                          {item.price !== null && item.price !== undefined && (
                            <span className="text-[10px] font-bold text-[#2B6336] bg-[#EBF5ED] px-2 py-0.5 rounded-full border border-[#C2E2CA]">
                              {formatRupiah(item.price)}
                            </span>
                          )}
                          <span className="text-[11px] text-[#70685C] truncate">
                            📍 {item.location}
                          </span>
                        </div>

                        {/* Stock Number */}
                        <div className="mt-2.5 flex items-baseline justify-between bg-[#FAF9F5] p-2 rounded-lg border border-[#EAE4D9]">
                          <div>
                            <span className="text-[10px] text-[#70685C] block">Stok</span>
                            <div className="flex items-baseline gap-1">
                              <span
                                className={`text-lg font-black ${
                                  isLow ? 'text-[#C53030]' : 'text-[#7A5805]'
                                }`}
                              >
                                {item.quantity}
                              </span>
                              <span className="text-xs text-[#70685C] font-semibold">
                                {item.unit}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] text-[#8C8273] block">Min</span>
                            <span className="text-xs font-bold text-[#231F1A]">{item.min_stock}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stock Quick Stepper & Actions */}
                      <div className="pt-2 border-t border-[#F0EBE0] space-y-2">
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            disabled={isUpdating || item.quantity <= 0}
                            onClick={() => handleQuickStockChange(item, -1)}
                            className="flex-1 h-7 rounded-md bg-[#FAF9F5] border border-[#EAE4D9] hover:bg-red-50 hover:border-red-300 text-[#70685C] hover:text-[#C53030] text-xs font-bold flex items-center justify-center transition disabled:opacity-40"
                            title="Kurang 1"
                          >
                            <Minus className="w-3 h-3 mr-0.5" />1
                          </button>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleQuickStockChange(item, 1)}
                            className="flex-1 h-7 rounded-md bg-[#FAF9F5] border border-[#EAE4D9] hover:bg-emerald-50 hover:border-emerald-300 text-[#70685C] hover:text-emerald-700 text-xs font-bold flex items-center justify-center transition"
                            title="Tambah 1"
                          >
                            <Plus className="w-3 h-3 mr-0.5" />1
                          </button>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleQuickStockChange(item, 5)}
                            className="px-2 h-7 rounded-md bg-[#F7F2E4] border border-[#E5D7B7] hover:bg-[#FAF6EC] text-[#7A5805] text-[11px] font-bold flex items-center justify-center transition"
                            title="Restok +5"
                          >
                            +5
                          </button>
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 rounded-md hover:bg-[#FAF9F5] text-[#70685C] hover:text-[#B8860B] transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-[#70685C] hover:text-[#C53030] transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal Component */}
      {editingItem && (
        <LogisticsEditModal
          item={editingItem}
          locationSuggestions={[]}
          onClose={() => setEditingItem(null)}
          onUpdated={() => {
            setEditingItem(null);
            loadLogistics();
            setActionMessage({ type: 'success', text: 'Perubahan logistik berhasil disimpan.' });
            setTimeout(() => setActionMessage(null), 3000);
          }}
        />
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#EAE4D9] p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D9]">
              <h3 className="text-sm font-bold text-[#231F1A] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#B8860B]" />
                Tambah Barang Logistik Kantor
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#70685C] hover:text-[#231F1A] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNew} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#231F1A] mb-1">
                  Nama Barang *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Kopi Kapal Api Sachet, Kertas A4 70gr..."
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#231F1A] mb-1">Kategori *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B] bg-white"
                  >
                    {LOGISTIC_CATEGORIES.filter((c) => c !== 'Semua Kategori').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#231F1A] mb-1">Satuan *</label>
                  <input
                    type="text"
                    required
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="pcs / pack / rim / botol"
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#231F1A] mb-1">Jumlah Stok Awal *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#231F1A] mb-1">Peringatan Stok Minimum *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#231F1A] mb-1">Lokasi Penyimpanan *</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Gudang Pantry / Lemari ATK Lt. 1"
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#231F1A] mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="Merk, spesifikasi, atau petunjuk restock..."
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-[#231F1A]">
                    Harga Satuan / Beli (Opsional)
                  </label>
                  {newPrice && (
                    <span className="text-[11px] font-bold text-[#2B6336]">
                      {formatRupiah(parseFloat(newPrice.replace(/[^0-9]/g, '')))}
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
                    value={newPrice}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, '');
                      if (!digits) setNewPrice('');
                      else setNewPrice(parseInt(digits, 10).toLocaleString('id-ID'));
                    }}
                    placeholder="0 (Contoh: 25.000)"
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-[#EAE4D9] text-xs font-semibold text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EAE4D9]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSavingNew}
                  disabled={isSavingNew}
                >
                  Simpan Barang Logistik
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-lg max-h-[85vh] bg-white rounded-2xl p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black font-bold z-10"
            >
              ✕
            </button>
            <img
              src={previewPhoto}
              alt="Preview"
              className="rounded-xl max-h-[80vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
