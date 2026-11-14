'use client';

import React, { useState, useEffect } from 'react';
import { ConditionBadge } from '@/components/ui/Badge';
import {
  Search,
  Image as ImageIcon,
  MapPin,
  Layers,
  Hash,
  UserCheck,
  Calendar,
  RefreshCw,
  LayoutGrid,
  List,
  Eye,
  X,
  Package,
  Pencil,
  Camera,
} from 'lucide-react';
import { InventoryEditModal } from './InventoryEditModal';
import { PhotoGalleryViewer } from '@/components/ui/PhotoGalleryViewer';
import { Button } from '@/components/ui/Button';
import { formatRupiah } from '@/lib/format';
import { portalFetch } from '@/lib/api-client';
import { formatPhotoUrl } from '@/lib/base-path';

interface InventoryItem {
  no: number;
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
  createdById: string;
  creatorName: string;
  createdAt: string;
}

interface InventoryListPortalProps {
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

export function InventoryListPortal({ currentUser }: InventoryListPortalProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [condition, setCondition] = useState('all');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // View mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);

  // Load saved view mode
  useEffect(() => {
    try {
      const saved = localStorage.getItem('portal_inventory_view_mode');
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
      localStorage.setItem('portal_inventory_view_mode', mode);
    } catch {
      // ignore
    }
  };

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryId && categoryId !== 'all') params.set('category_id', categoryId);
      if (condition && condition !== 'all') params.set('condition', condition);
      if (filterMode === 'mine') params.set('only_mine', 'true');
      params.set('limit', '100');

      const res = await portalFetch(`/api/inventory?${params.toString()}`);
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
      }
    } catch (err) {
      console.error('Failed to load inventory items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filterMode, categoryId, condition]);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [catRes, locRes] = await Promise.all([
          portalFetch('/api/categories'),
          portalFetch('/api/inventory/locations'),
        ]);
        const catData = await catRes.json();
        const locData = await locRes.json();
        if (catData.categories) {
          setCategories(catData.categories.filter((c: any) => c.status === 'ACTIVE'));
        }
        if (locData.locations) {
          setLocationSuggestions(locData.locations);
        }
      } catch (err) {}
    }
    loadMeta();
  }, []);

  const handleUpdated = (updated: any) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === updated.id
          ? {
              ...i,
              name: updated.name,
              categoryId: updated.categoryId,
              categoryName: updated.categoryName,
              location: updated.location,
              quantity: updated.quantity,
              unit: updated.unit,
              condition: updated.condition,
              notes: updated.notes,
              price: updated.price,
              photoPath: updated.photoPath,
            }
          : i
      )
    );
    if (detailItem?.id === updated.id) {
      setDetailItem((prev: any) => ({
        ...prev,
        ...updated,
      }));
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-4 px-1">
      {/* Top Filter & Search Controls */}
      <div className="bg-white rounded-xl border border-[#EAE4D9] p-3.5 sm:p-4 shadow-2xs space-y-3">
        {/* Toggle Mode: Semua Inventaris vs Inventaris Saya */}
        <div className="grid grid-cols-2 p-1 bg-[#F4F0E8] rounded-lg">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`py-1.5 sm:py-2 text-xs font-semibold rounded-md transition ${
              filterMode === 'all'
                ? 'bg-white text-[#231F1A] shadow-2xs'
                : 'text-[#70685C] hover:text-[#231F1A]'
            }`}
          >
            Semua Inventaris Kantor
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('mine')}
            className={`py-1.5 sm:py-2 text-xs font-semibold rounded-md transition ${
              filterMode === 'mine'
                ? 'bg-white text-[#231F1A] shadow-2xs'
                : 'text-[#70685C] hover:text-[#231F1A]'
            }`}
          >
            Inventaris Saya
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#C5A059] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama barang, lokasi, atau penginput..."
              className="w-full pl-9 pr-3 py-1.5 sm:py-2 rounded-lg border border-[#EAE4D9] text-xs sm:text-sm text-[#231F1A] placeholder-[#C5A059]/70 focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition"
            />
          </div>
          <Button type="submit" variant="primary" size="sm">
            Cari
          </Button>
          <button
            type="button"
            onClick={fetchItems}
            title="Muat Ulang"
            className="p-2 rounded-lg border border-[#EAE4D9] bg-white text-[#70685C] hover:bg-[#FAF9F5] hover:text-[#B8860B] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EAE4D9]">
          <div>
            <label className="text-[10px] text-[#70685C] font-semibold block mb-1">
              Kategori
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#70685C] font-semibold block mb-1">
              Kondisi
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
            >
              <option value="all">Semua Kondisi</option>
              <option value="Baik">Baik</option>
              <option value="Rusak Ringan">Rusak Ringan</option>
              <option value="Rusak Berat">Rusak Berat</option>
              <option value="Perlu Perbaikan">Perlu Perbaikan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Item List Header & View Switcher */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-[#70685C]">
          Menampilkan <strong className="text-[#231F1A]">{items.length}</strong> Barang
          {filterMode === 'mine' && ' (Input Anda)'}
        </span>

        {/* Grid vs List Switcher */}
        <div className="inline-flex items-center p-0.5 rounded-lg bg-[#F4F0E8] border border-[#EAE4D9]">
          <button
            type="button"
            onClick={() => handleSetViewMode('grid')}
            aria-label="Tampilan Grid"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
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
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
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
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-[#EAE4D9] p-10 text-center">
          <div className="w-6 h-6 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-[#70685C]">Memuat data inventaris...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="bg-white rounded-xl border border-[#EAE4D9] p-10 text-center space-y-2 shadow-2xs">
          <Package className="w-10 h-10 text-[#D1C7B7] mx-auto mb-1" />
          <p className="text-sm font-semibold text-[#231F1A]">
            Belum ada barang inventaris yang sesuai
          </p>
          <p className="text-xs text-[#70685C]">
            Coba ubah kata kunci pencarian atau filter yang dipilih.
          </p>
        </div>
      )}

      {/* GRID VIEW */}
      {!isLoading && items.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
          {items.map((item) => {
            return (
              <div
                key={item.id}
                onClick={() => setDetailItem(item)}
                className="group bg-white rounded-xl border border-[#EAE4D9] hover:border-[#C5A059] overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col cursor-pointer"
              >
                {/* Photo Header */}
                <div className="relative aspect-4/3 w-full bg-[#FAF9F5] overflow-hidden border-b border-[#EAE4D9]">
                  {item.photoPath ? (
                    <img
                      src={formatPhotoUrl(item.photoPath)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#C5A059]/60">
                      <ImageIcon className="w-8 h-8 opacity-60" />
                    </div>
                  )}

                  {/* Multi-photo badge */}
                  {item.photoPaths && item.photoPaths.length > 1 && (
                    <div className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                      <Camera className="w-3 h-3 text-[#B8860B]" />
                      <span>{item.photoPaths.length} Foto</span>
                    </div>
                  )}

                  {/* Condition Badge floating on top right */}
                  <div className="absolute top-1.5 right-1.5">
                    <ConditionBadge condition={item.condition} />
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

                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] sm:text-[10px] text-[#70685C] bg-[#F4F0E8] px-1.5 py-0.5 rounded truncate">
                        {item.categoryName}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-[#7A5805] bg-[#F7F2E4] px-1.5 py-0.5 rounded border border-[#E5D7B7]">
                        {item.quantity} <span className="uppercase">{item.unit || 'PCS'}</span>
                      </span>
                      {item.price !== undefined && item.price !== null && (
                        <span className="text-[9px] sm:text-[10px] font-bold text-[#2B6336] bg-[#EBF5ED] px-1.5 py-0.5 rounded border border-[#C2E2CA]">
                          {formatRupiah(item.price)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-[10px] sm:text-[11px] text-[#70685C] flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-[#B8860B] flex-shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>

                    {item.notes && (
                      <div className="mt-1 text-[10px] text-[#70685C] italic truncate" title={item.notes}>
                        📝 {item.notes}
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="mt-2.5 pt-2 border-t border-[#F0EBE0] flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailItem(item);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-[#FAF9F5] hover:bg-[#F4F0E8] text-[#70685C] hover:text-[#231F1A] text-[11px] font-semibold transition"
                    >
                      <Eye className="w-3 h-3 text-[#B8860B]" />
                      <span>Detail</span>
                    </button>
                    {(item.createdById === currentUser.id || currentUser.role === 'Admin') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(item);
                        }}
                        className="px-2 py-1 rounded bg-[#FAF6EC] hover:bg-[#F5EED8] border border-[#C5A059] text-[#7A5805] text-[11px] font-semibold flex items-center gap-1 transition"
                        title="Edit Data Barang"
                      >
                        <Pencil className="w-3 h-3 text-[#B8860B]" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {!isLoading && items.length > 0 && viewMode === 'list' && (
        <div className="space-y-2">
          {items.map((item) => {
            const isMyItem = item.createdById === currentUser.id;
            const formattedDate = new Date(item.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={item.id}
                onClick={() => setDetailItem(item)}
                className="group bg-white rounded-xl border border-[#EAE4D9] hover:border-[#C5A059] p-2.5 sm:p-3 shadow-2xs hover:shadow-sm transition cursor-pointer flex items-center gap-3"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-[#FAF9F5] border border-[#EAE4D9] overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                  {item.photoPath ? (
                    <img
                      src={formatPhotoUrl(item.photoPath)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-[#C5A059]/60" />
                  )}
                  {item.photoPaths && item.photoPaths.length > 1 && (
                    <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-2xs text-white text-[9px] font-bold px-1 rounded shadow-xs">
                      {item.photoPaths.length}
                    </span>
                  )}
                </div>

                {/* Main Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-bold text-[#231F1A] truncate group-hover:text-[#B8860B] transition">
                      {item.name}
                    </h3>
                    <ConditionBadge condition={item.condition} />
                  </div>

                  <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] text-[#70685C]">
                    <span className="text-[10px] bg-[#F4F0E8] px-1.5 py-0.5 rounded">
                      {item.categoryName}
                    </span>
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="w-3 h-3 text-[#B8860B] flex-shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </span>
                  </div>

                  <div className="mt-0.5 text-[10px] text-[#8C8273] flex items-center gap-2 flex-wrap">
                    <span>
                      Oleh:{' '}
                      <strong className={isMyItem ? 'text-[#B8860B]' : 'text-[#231F1A]'}>
                        {isMyItem ? 'Saya' : item.creatorName}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>{formattedDate}</span>
                    {item.notes && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[180px] italic">📝 {item.notes}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Quantity & Action */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-base sm:text-lg font-extrabold text-[#7A5805] leading-none block">
                      {item.quantity}
                    </span>
                    <span className="text-[10px] text-[#70685C] font-semibold uppercase">{item.unit || 'PCS'}</span>
                    {item.price !== undefined && item.price !== null && (
                      <span className="text-[10px] font-bold text-[#2B6336] block mt-0.5">
                        {formatRupiah(item.price)}
                      </span>
                    )}
                  </div>

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

                  {(isMyItem || currentUser.role === 'Admin') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem(item);
                      }}
                      className="p-1.5 rounded-lg border border-[#C5A059] bg-[#FAF6EC] text-[#7A5805] hover:bg-[#F5EED8] transition"
                      title="Edit Data Barang"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL (Lihat Detail Inventaris) */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#EAE4D9] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D9]">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#B8860B]">
                  Detail Inventaris
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

            {/* Photo Gallery with Multi-Photo Carousel & Lightbox */}
            {(() => {
              const photos = detailItem.photoPaths && detailItem.photoPaths.length > 0
                ? detailItem.photoPaths
                : (detailItem.photoPath ? [detailItem.photoPath] : []);
              return (
                <div className="rounded-xl overflow-hidden bg-[#FAF9F5] border border-[#EAE4D9]">
                  <PhotoGalleryViewer photos={photos} itemName={detailItem.name} />
                </div>
              );
            })()}

            {/* Badges */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold bg-[#F4F0E8] text-[#70685C] border border-[#EAE4D9] px-2.5 py-1 rounded-full">
                {detailItem.categoryName}
              </span>
              <ConditionBadge condition={detailItem.condition} />
            </div>

            {/* Key Metrics */}
            <div className={`grid ${detailItem.price !== null && detailItem.price !== undefined ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5`}>
              <div className="bg-[#FAF9F5] p-2.5 rounded-xl border border-[#EAE4D9]">
                <span className="text-[10px] uppercase font-bold text-[#70685C] block">
                  Jumlah
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#7A5805]">
                    {detailItem.quantity}
                  </span>
                  <span className="text-[10px] text-[#70685C] font-bold uppercase">{detailItem.unit || 'PCS'}</span>
                </div>
              </div>

              <div className="bg-[#FAF9F5] p-2.5 rounded-xl border border-[#EAE4D9]">
                <span className="text-[10px] uppercase font-bold text-[#70685C] block">
                  Kondisi
                </span>
                <div className="mt-1">
                  <span className="text-xs sm:text-sm font-bold text-[#231F1A] line-clamp-1">
                    {detailItem.condition}
                  </span>
                </div>
              </div>

              {detailItem.price !== null && detailItem.price !== undefined && (
                <div className="bg-[#FAF9F5] p-2.5 rounded-xl border border-[#EAE4D9]">
                  <span className="text-[10px] uppercase font-bold text-[#70685C] block">
                    Harga / Nilai
                  </span>
                  <div className="mt-1">
                    <span className="text-xs sm:text-sm font-bold text-[#2B6336] line-clamp-1">
                      {formatRupiah(detailItem.price)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Details */}
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
                  <span className="text-[10px] text-[#70685C] block">Catatan / Keterangan:</span>
                  <p className="mt-0.5 text-xs text-[#231F1A] whitespace-pre-wrap leading-relaxed">
                    {detailItem.notes}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-[#F0EBE0] flex items-center justify-between text-[10px] text-[#8C8273]">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-[#B8860B]" />
                  Penginput:{' '}
                  <strong className={detailItem.createdById === currentUser.id ? 'text-[#B8860B]' : 'text-[#231F1A]'}>
                    {detailItem.createdById === currentUser.id ? 'Saya' : detailItem.creatorName}
                  </strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#B8860B]" />
                  {new Date(detailItem.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center gap-2">
              {(detailItem.createdById === currentUser.id || currentUser.role === 'Admin') && (
                <button
                  type="button"
                  onClick={() => {
                    const it = detailItem;
                    setDetailItem(null);
                    setEditingItem(it);
                  }}
                  className="flex-1 py-2 rounded-xl bg-[#FAF6EC] hover:bg-[#F5EED8] border border-[#B8860B] text-xs font-bold text-[#7A5805] flex items-center justify-center gap-1.5 transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Barang Ini
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="flex-1 py-2 rounded-xl bg-[#FAF9F5] hover:bg-[#F4F0E8] border border-[#EAE4D9] text-xs font-semibold text-[#231F1A] transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <InventoryEditModal
          item={editingItem}
          categories={categories}
          locationSuggestions={locationSuggestions}
          onClose={() => setEditingItem(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
