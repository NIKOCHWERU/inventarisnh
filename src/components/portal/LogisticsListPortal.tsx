'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  AlertTriangle,
  RefreshCw,
  Search,
  TrendingDown,
  Pencil,
  Trash2,
  LayoutGrid,
  List,
  Eye,
  MapPin,
  Calendar,
  User,
  X,
  CheckCircle2,
} from 'lucide-react';
import { LogisticsEditModal, LogisticItem } from './LogisticsEditModal';
import { formatRupiah } from '@/lib/format';
import { portalFetch } from '@/lib/api-client';
import { formatPhotoUrl } from '@/lib/base-path';

interface LogisticsListPortalProps {
  currentUser: { id: string; name: string; role: string };
}

const CATEGORY_COLORS: Record<string, string> = {
  'Makanan & Minuman': 'bg-orange-50 text-orange-700 border-orange-200',
  'Kebersihan': 'bg-blue-50 text-blue-700 border-blue-200',
  'ATK (Alat Tulis Kantor)': 'bg-purple-50 text-purple-700 border-purple-200',
  'Peralatan Dapur': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Sanitasi & Kesehatan': 'bg-teal-50 text-teal-700 border-teal-200',
  'Lainnya': 'bg-stone-50 text-stone-700 border-stone-200',
};

export function LogisticsListPortal({ currentUser }: LogisticsListPortalProps) {
  const [items, setItems] = useState<LogisticItem[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);

  // View mode: 'grid' or 'list'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals
  const [detailItem, setDetailItem] = useState<LogisticItem | null>(null);
  const [editingItem, setEditingItem] = useState<LogisticItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load saved view mode from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('portal_logistics_view_mode');
      if (saved === 'grid' || saved === 'list') {
        setViewMode(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('portal_logistics_view_mode', mode);
    } catch {
      // ignore
    }
  };

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('search', search);
      if (onlyMine) params.set('only_mine', 'true');

      const [logRes, locRes] = await Promise.all([
        portalFetch(`/api/logistics?${params}`),
        portalFetch('/api/inventory/locations'),
      ]);
      const logData = await logRes.json();
      const locData = await locRes.json();

      if (logData.items) {
        let list: LogisticItem[] = logData.items;
        if (onlyLow) list = list.filter((i) => i.quantity <= i.min_stock);
        setItems(list);
      }
      if (locData.locations) setLocationSuggestions(locData.locations);
    } catch (err) {
      console.error('Failed to load logistics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, onlyLow, onlyMine]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleUpdated = (updated: LogisticItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    if (detailItem?.id === updated.id) {
      setDetailItem(updated);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Hapus item logistik ini? Foto juga akan dihapus.')) return;
    setDeletingId(id);
    try {
      const res = await portalFetch(`/api/logistics/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        if (detailItem?.id === id) setDetailItem(null);
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const lowStockCount = items.filter((i) => i.quantity <= i.min_stock).length;

  return (
    <div className="max-w-3xl mx-auto pb-16 px-1">
      {/* Header bar */}
      <div className="mb-3.5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#231F1A] flex items-center gap-1.5">
            <Package className="w-4 h-4 text-[#B8860B]" />
            Daftar Barang Logistik
          </h2>
          <p className="text-xs text-[#70685C] mt-0.5">
            {items.length} jenis stok logistik kantor
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid vs List View Switcher */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[#F4F0E8] border border-[#EAE4D9]">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              aria-label="Tampilan Grid"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === 'grid'
                  ? 'bg-white text-[#B8860B] shadow-2xs'
                  : 'text-[#70685C] hover:text-[#231F1A]'
              }`}
              title="Tampilan Grid (Kotak Visual)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('list')}
              aria-label="Tampilan List"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-white text-[#B8860B] shadow-2xs'
                  : 'text-[#70685C] hover:text-[#231F1A]'
              }`}
              title="Tampilan List (Daftar Ringkas)"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          <button
            onClick={fetchItems}
            title="Muat Ulang"
            className="p-2 rounded-lg border border-[#EAE4D9] bg-white text-[#70685C] hover:bg-[#FAF9F5] hover:text-[#B8860B] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="mb-3 px-3.5 py-2.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-amber-800 text-xs shadow-2xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Ada <strong>{lowStockCount}</strong> barang dengan stok menipis (di bawah batas minimum).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOnlyLow((v) => !v)}
            className="text-[11px] font-bold text-amber-900 underline hover:no-underline flex-shrink-0"
          >
            {onlyLow ? 'Tampilkan Semua' : 'Filter Ini'}
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="mb-3.5 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8273]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama barang atau catatan..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-[#EAE4D9] bg-white text-xs text-[#231F1A] placeholder-[#8C8273]/70 focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setOnlyLow((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
              onlyLow
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-[#EAE4D9] bg-white text-[#70685C] hover:bg-[#FAF9F5]'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Stok Menipis {lowStockCount > 0 && `(${lowStockCount})`}
          </button>

          <button
            type="button"
            onClick={() => setOnlyMine((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
              onlyMine
                ? 'border-[#B8860B] bg-[#F7F2E4] text-[#7A5805]'
                : 'border-[#EAE4D9] bg-white text-[#70685C] hover:bg-[#FAF9F5]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Diinput Saya
          </button>

          {(search || onlyLow || onlyMine) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setOnlyLow(false);
                setOnlyMine(false);
              }}
              className="text-xs text-[#8C8273] hover:text-[#231F1A] underline ml-auto"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-[#EAE4D9] p-10 text-center">
          <div className="w-6 h-6 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-[#70685C]">Memuat data logistik...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <div className="bg-white rounded-xl border border-[#EAE4D9] text-center py-14 px-4 shadow-2xs">
          <Package className="w-10 h-10 text-[#D1C7B7] mx-auto mb-2.5" />
          <p className="text-sm font-semibold text-[#231F1A]">Tidak ada data logistik</p>
          <p className="text-xs text-[#70685C] mt-1">
            {search || onlyLow || onlyMine
              ? 'Tidak ada barang yang cocok dengan filter saat ini.'
              : 'Belum ada barang logistik yang ditambahkan.'}
          </p>
        </div>
      )}

      {/* Item Display: GRID VIEW */}
      {!isLoading && items.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
          {items.map((item) => {
            const isLow = item.quantity <= item.min_stock;
            const categoryColor = CATEGORY_COLORS[item.category] ?? 'bg-stone-50 text-stone-700 border-stone-200';
            const canEdit = item.creator.id === currentUser.id || currentUser.role === 'Admin';

            return (
              <div
                key={item.id}
                onClick={() => setDetailItem(item)}
                className={`group bg-white rounded-xl border overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col cursor-pointer ${
                  isLow ? 'border-amber-300 ring-1 ring-amber-200/50' : 'border-[#EAE4D9] hover:border-[#C5A059]'
                }`}
              >
                {/* Photo container */}
                <div className="relative aspect-4/3 w-full bg-[#FAF9F5] overflow-hidden border-b border-[#EAE4D9]">
                  {item.photo_path ? (
                    <img
                      src={formatPhotoUrl(item.photo_path)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#C5A059]/60">
                      <Package className="w-8 h-8 stroke-1" />
                    </div>
                  )}

                  {/* Floating Badges */}
                  <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
                    {isLow ? (
                      <span className="flex items-center gap-1 bg-amber-500/95 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Menipis
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-emerald-600/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md shadow-xs">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Aman
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      className="text-xs sm:text-sm font-bold text-[#231F1A] line-clamp-1 group-hover:text-[#B8860B] transition"
                      title={item.name}
                    >
                      {item.name}
                    </h3>

                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      <span
                        className={`text-[9px] sm:text-[10px] font-medium border px-1.5 py-0.5 rounded ${categoryColor}`}
                      >
                        {item.category}
                      </span>
                      {item.price !== undefined && item.price !== null && (
                        <span className="text-[9px] sm:text-[10px] font-bold text-[#2B6336] bg-[#EBF5ED] px-1.5 py-0.5 rounded border border-[#C2E2CA]">
                          {formatRupiah(item.price)}
                        </span>
                      )}
                    </div>

                    {/* Stock number highlight */}
                    <div className="mt-2 flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] text-[#70685C] block">Stok Saat Ini</span>
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`text-base sm:text-lg font-extrabold ${
                              isLow ? 'text-amber-600' : 'text-[#7A5805]'
                            }`}
                          >
                            {item.quantity}
                          </span>
                          <span className="text-[10px] text-[#70685C] font-medium">
                            {item.unit}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] text-[#8C8273] block">Min</span>
                        <span className="text-xs font-semibold text-[#70685C]">
                          {item.min_stock}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] sm:text-[11px] text-[#70685C] flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-[#B8860B] flex-shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="mt-2.5 pt-2 border-t border-[#F0EBE0] flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailItem(item);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-[#FAF9F5] hover:bg-[#F4F0E8] text-[#70685C] hover:text-[#231F1A] text-[11px] font-semibold transition"
                      title="Lihat Detail Lengkap"
                    >
                      <Eye className="w-3 h-3 text-[#B8860B]" />
                      <span>Lihat</span>
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(item);
                        }}
                        className="px-2 py-1 rounded bg-[#FAF9F5] hover:bg-[#F7F2E4] text-[#B8860B] text-[11px] font-semibold transition"
                        title="Edit / Update Stok"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Item Display: LIST VIEW */}
      {!isLoading && items.length > 0 && viewMode === 'list' && (
        <div className="space-y-2">
          {items.map((item) => {
            const isLow = item.quantity <= item.min_stock;
            const categoryColor = CATEGORY_COLORS[item.category] ?? 'bg-stone-50 text-stone-700 border-stone-200';
            const canEdit = item.creator.id === currentUser.id || currentUser.role === 'Admin';

            return (
              <div
                key={item.id}
                onClick={() => setDetailItem(item)}
                className={`group bg-white rounded-xl border p-2.5 sm:p-3 shadow-2xs hover:shadow-sm transition cursor-pointer flex items-center gap-3 ${
                  isLow ? 'border-amber-300 bg-amber-50/15' : 'border-[#EAE4D9] hover:border-[#C5A059]'
                }`}
              >
                {/* Small Thumbnail */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-[#FAF9F5] border border-[#EAE4D9] overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                  {item.photo_path ? (
                    <img
                      src={formatPhotoUrl(item.photo_path)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-[#C5A059]/60" />
                  )}
                  {isLow && (
                    <div className="absolute top-0.5 left-0.5 bg-amber-500 rounded-full p-0.5 text-white">
                      <AlertTriangle className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-bold text-[#231F1A] truncate group-hover:text-[#B8860B] transition">
                      {item.name}
                    </h3>
                    {isLow && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Stok Menipis
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] text-[#70685C]">
                    <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded ${categoryColor}`}>
                      {item.category}
                    </span>
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="w-3 h-3 text-[#B8860B] flex-shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </span>
                  </div>

                  <div className="mt-0.5 text-[10px] text-[#8C8273] flex items-center gap-2 flex-wrap">
                    <span>Oleh: {item.creator.name}</span>
                    <span>·</span>
                    <span>Min: {item.min_stock} {item.unit}</span>
                    {item.notes && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[180px] italic">📝 {item.notes}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Stock & Quick Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-base sm:text-lg font-extrabold leading-none block ${
                        isLow ? 'text-amber-600' : 'text-[#7A5805]'
                      }`}
                    >
                      {item.quantity}
                    </span>
                    <span className="text-[10px] text-[#70685C] font-medium">{item.unit}</span>
                    {item.price !== undefined && item.price !== null && (
                      <span className="text-[10px] font-bold text-[#2B6336] block mt-0.5">
                        {formatRupiah(item.price)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailItem(item);
                      }}
                      className="p-1.5 rounded-lg border border-[#EAE4D9] hover:bg-[#FAF9F5] text-[#70685C] hover:text-[#B8860B] transition"
                      title="Lihat Detail"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(item);
                        }}
                        className="p-1.5 rounded-lg border border-[#B8860B]/40 hover:bg-[#FAF9F5] text-[#B8860B] transition"
                        title="Edit / Update Stok"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL (Lihat Detail Barang) */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#EAE4D9] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D9]">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#B8860B]">
                  Detail Logistik
                </span>
                <h3 className="text-base font-bold text-[#231F1A]">{detailItem.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1.5 rounded-lg text-[#70685C] hover:bg-[#FAF9F5] hover:text-[#231F1A] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Preview */}
            {detailItem.photo_path ? (
              <div className="rounded-xl overflow-hidden bg-[#FAF9F5] border border-[#EAE4D9] max-h-64 flex items-center justify-center">
                <img
                  src={formatPhotoUrl(detailItem.photo_path)}
                  alt={detailItem.name}
                  className="w-full max-h-64 object-contain"
                />
              </div>
            ) : (
              <div className="py-8 bg-[#FAF9F5] rounded-xl border border-[#EAE4D9] flex flex-col items-center justify-center text-[#C5A059]">
                <Package className="w-10 h-10 mb-1 opacity-70" />
                <span className="text-xs text-[#70685C]">Tidak ada foto barang</span>
              </div>
            )}

            {/* Status & Category */}
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${
                  CATEGORY_COLORS[detailItem.category] ?? 'bg-stone-50 text-stone-700 border-stone-200'
                }`}
              >
                {detailItem.category}
              </span>

              {detailItem.quantity <= detailItem.min_stock ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Stok Menipis
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Stok Aman
                </span>
              )}
            </div>

            {/* Key Metrics Grid */}
            <div className={`grid ${detailItem.price !== null && detailItem.price !== undefined ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5`}>
              <div className="bg-[#FAF9F5] p-2.5 sm:p-3 rounded-xl border border-[#EAE4D9]">
                <span className="text-[10px] uppercase font-bold text-[#70685C] block">
                  Stok Saat Ini
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span
                    className={`text-xl sm:text-2xl font-extrabold ${
                      detailItem.quantity <= detailItem.min_stock
                        ? 'text-amber-600'
                        : 'text-[#7A5805]'
                    }`}
                  >
                    {detailItem.quantity}
                  </span>
                  <span className="text-xs text-[#70685C] font-semibold">{detailItem.unit}</span>
                </div>
              </div>

              <div className="bg-[#FAF9F5] p-2.5 sm:p-3 rounded-xl border border-[#EAE4D9]">
                <span className="text-[10px] uppercase font-bold text-[#70685C] block">
                  Batas Min
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#231F1A]">
                    {detailItem.min_stock}
                  </span>
                  <span className="text-xs text-[#70685C] font-semibold">{detailItem.unit}</span>
                </div>
              </div>

              {detailItem.price !== null && detailItem.price !== undefined && (
                <div className="bg-[#FAF9F5] p-2.5 sm:p-3 rounded-xl border border-[#EAE4D9]">
                  <span className="text-[10px] uppercase font-bold text-[#70685C] block">
                    Harga / Satuan
                  </span>
                  <div className="mt-1">
                    <span className="text-xs sm:text-sm font-extrabold text-[#2B6336] line-clamp-1">
                      {formatRupiah(detailItem.price)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Location & Details */}
            <div className="space-y-2 text-xs text-[#231F1A] bg-white rounded-xl border border-[#EAE4D9] p-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#B8860B] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-[#70685C] block">Lokasi Penyimpanan:</span>
                  <span className="font-semibold text-[#231F1A]">{detailItem.location}</span>
                </div>
              </div>

              {detailItem.notes && (
                <div className="pt-2 border-t border-[#F0EBE0]">
                  <span className="text-[10px] text-[#70685C] block">Catatan Tambahan:</span>
                  <p className="mt-0.5 text-xs text-[#231F1A] whitespace-pre-wrap leading-relaxed">
                    {detailItem.notes}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-[#F0EBE0] flex items-center justify-between text-[10px] text-[#8C8273]">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-[#B8860B]" />
                  Penginput: <strong>{detailItem.creator.name}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#B8860B]" />
                  {new Date(detailItem.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="flex-1 py-2 rounded-lg border border-[#EAE4D9] text-xs font-semibold text-[#70685C] hover:bg-[#FAF9F5] transition"
              >
                Tutup
              </button>

              {(detailItem.creator.id === currentUser.id || currentUser.role === 'Admin') && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const itemToEdit = detailItem;
                      setDetailItem(null);
                      setEditingItem(itemToEdit);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#B8860B] hover:bg-[#996D07] text-white text-xs font-bold transition shadow-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit / Update Stok
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(detailItem.id)}
                    disabled={deletingId === detailItem.id}
                    className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                    title="Hapus Barang"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <LogisticsEditModal
          item={editingItem}
          locationSuggestions={locationSuggestions}
          onClose={() => setEditingItem(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
