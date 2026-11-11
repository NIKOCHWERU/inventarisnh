'use client';

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
  FolderPlus,
  Calendar,
  Layers,
  AlertCircle,
  X,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConditionBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatRupiah } from '@/lib/format';

export default function AdminInventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Filtering
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [condition, setCondition] = useState('all');
  const [location, setLocation] = useState('');
  const [createdBy, setCreatedBy] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<any | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Category Manager Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [catError, setCatError] = useState<string | null>(null);

  // Form states for Edit
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editCondition, setEditCondition] = useState('Baik');
  const [editNotes, setEditNotes] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editRemovePhoto, setEditRemovePhoto] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Load Categories & Employees for filters
  const loadMetadata = async () => {
    try {
      const [catRes, empRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/employees'),
      ]);
      const catData = await catRes.json();
      const empData = await empRes.json();
      if (catData.categories) setCategories(catData.categories);
      if (empData.employees) setEmployees(empData.employees);
    } catch (e) {
      console.error(e);
    }
  };

  const loadInventories = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryId && categoryId !== 'all') params.set('category_id', categoryId);
      if (condition && condition !== 'all') params.set('condition', condition);
      if (location) params.set('location', location);
      if (createdBy && createdBy !== 'all') params.set('created_by', createdBy);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', page.toString());
      params.set('limit', '15');

      const res = await fetch(`/api/inventory?${params.toString()}`);
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadInventories();
  }, [page, categoryId, condition, createdBy, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadInventories();
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(items.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Open Detail Modal
  const openDetail = async (item: any) => {
    try {
      const res = await fetch(`/api/inventory/${item.id}`);
      const data = await res.json();
      if (data.item) {
        setDetailItem(data.item);
        setIsDetailOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Edit Modal
  const openEdit = (item: any) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategoryId(item.categoryId);
    setEditLocation(item.location);
    setEditQuantity(item.quantity.toString());
    setEditCondition(item.condition);
    setEditNotes(item.notes || '');
    setEditPrice(
      item.price != null && !isNaN(item.price)
        ? Math.round(item.price).toLocaleString('id-ID')
        : ''
    );
    setEditPhotoFile(null);
    setEditPhotoPreview(item.photoPath || null);
    setEditRemovePhoto(false);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);
    setEditError(null);

    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('category_id', editCategoryId);
      formData.append('location', editLocation.trim());
      formData.append('quantity', editQuantity);
      formData.append('condition', editCondition.trim());
      formData.append('notes', editNotes.trim());
      const rawPrice = editPrice.replace(/[^0-9]/g, '');
      formData.append('price', rawPrice || '');
      if (editRemovePhoto) {
        formData.append('remove_photo', 'true');
      } else if (editPhotoFile) {
        formData.append('photo', editPhotoFile);
      }

      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan perubahan.');
      }

      setIsEditOpen(false);
      loadInventories();
    } catch (err: any) {
      setEditError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Single Delete
  const handleDeleteItem = async () => {
    if (!deleteConfirmItem) return;
    try {
      const res = await fetch(`/api/inventory/${deleteConfirmItem.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteConfirmItem(null);
        setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmItem.id));
        loadInventories();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      }
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      loadInventories();
    } catch (e) {
      console.error(e);
    }
  };

  // Category Management Handlers
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setCatError(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menambah kategori.');
      }
      setNewCatName('');
      loadMetadata();
    } catch (err: any) {
      setCatError(err.message);
    }
  };

  const handleUpdateCategory = async (catId: string, name: string) => {
    setCatError(null);
    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengubah kategori.');
      }
      setEditingCat(null);
      loadMetadata();
    } catch (err: any) {
      setCatError(err.message);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    setCatError(null);
    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus kategori.');
      }
      loadMetadata();
    } catch (err: any) {
      setCatError(err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE4D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#231F1A]">Data Inventaris</h1>
          <p className="text-xs text-[#70685C] mt-1">
            Kelola, telusuri, filter, dan perbarui seluruh daftar aset inventaris kantor.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
            className="gap-1.5 text-xs"
          >
            <FolderPlus className="w-4 h-4 text-[#B8860B]" />
            Kelola Kategori ({categories.length})
          </Button>

          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Terpilih ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white rounded-xl border border-[#EAE4D9] p-4 shadow-2xs space-y-3">
        {/* Row 1: Search and Date Range */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[#C5A059] absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama barang, lokasi, atau penginput..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] placeholder-[#C5A059]/70 focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
              title="Tanggal Awal"
            />
            <span className="text-xs text-[#C5A059]">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
              title="Tanggal Akhir"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="md" className="flex-1 text-xs">
              Terapkan Filter
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setSearch('');
                setCategoryId('all');
                setCondition('all');
                setLocation('');
                setCreatedBy('all');
                setStartDate('');
                setEndDate('');
                setPage(1);
                loadInventories();
              }}
              title="Reset Filter"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </form>

        {/* Row 2: Category, Condition, Location, and Employee Dropdowns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-[#EAE4D9]">
          <div>
            <label className="text-[11px] text-[#70685C] font-medium block mb-1">
              Kategori
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
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
            <label className="text-[11px] text-[#70685C] font-medium block mb-1">
              Kondisi
            </label>
            <select
              value={condition}
              onChange={(e) => {
                setCondition(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
            >
              <option value="all">Semua Kondisi</option>
              <option value="Baik">Baik</option>
              <option value="Rusak Ringan">Rusak Ringan</option>
              <option value="Rusak Berat">Rusak Berat</option>
              <option value="Perlu Perbaikan">Perlu Perbaikan</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-[#70685C] font-medium block mb-1">
              Tempat / Lokasi
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onBlur={() => {
                setPage(1);
                loadInventories();
              }}
              placeholder="Filter nama lokasi..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
            />
          </div>

          <div>
            <label className="text-[11px] text-[#70685C] font-medium block mb-1">
              Penginput
            </label>
            <select
              value={createdBy}
              onChange={(e) => {
                setCreatedBy(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] bg-white focus:outline-none focus:ring-1 focus:ring-[#B8860B]"
            >
              <option value="all">Semua Penginput</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-[#EAE4D9] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF9F5] border-b border-[#EAE4D9] text-[#70685C] font-semibold">
                <th className="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={handleSelectAll}
                    className="rounded border-[#EAE4D9] text-[#B8860B] focus:ring-[#B8860B]"
                  />
                </th>
                <th className="py-3 px-2 text-center w-12">No.</th>
                <th className="py-3 px-3 text-center w-16">Foto</th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-[#231F1A]"
                  onClick={() => toggleSort('name')}
                >
                  <span className="flex items-center gap-1">
                    Nama Barang <ArrowUpDown className="w-3 h-3 text-[#C5A059]" />
                  </span>
                </th>
                <th className="py-3 px-3">Kategori</th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-[#231F1A]"
                  onClick={() => toggleSort('location')}
                >
                  <span className="flex items-center gap-1">
                    Lokasi <ArrowUpDown className="w-3 h-3 text-[#C5A059]" />
                  </span>
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#231F1A]"
                  onClick={() => toggleSort('quantity')}
                >
                  <span className="flex items-center justify-end gap-1">
                    Jumlah <ArrowUpDown className="w-3 h-3 text-[#C5A059]" />
                  </span>
                </th>
                <th
                  className="py-3 px-3 text-center cursor-pointer hover:text-[#231F1A]"
                  onClick={() => toggleSort('condition')}
                >
                  <span className="flex items-center justify-center gap-1">
                    Kondisi <ArrowUpDown className="w-3 h-3 text-[#C5A059]" />
                  </span>
                </th>
                <th className="py-3 px-3">Ditambahkan Oleh</th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-[#231F1A]"
                  onClick={() => toggleSort('created_at')}
                >
                  <span className="flex items-center gap-1">
                    Tanggal Input <ArrowUpDown className="w-3 h-3 text-[#C5A059]" />
                  </span>
                </th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4D9]">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#70685C]">
                    Memuat data inventaris...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#70685C]">
                    Tidak ada barang inventaris yang ditemukan.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#FAF9F5] transition-colors"
                  >
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleToggleSelect(item.id)}
                        className="rounded border-[#EAE4D9] text-[#B8860B] focus:ring-[#B8860B]"
                      />
                    </td>
                    <td className="py-3 px-2 text-center text-[#70685C]">
                      {item.no}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {item.photoPath ? (
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(item.photoPath)}
                          className="w-10 h-10 rounded-md overflow-hidden border border-[#EAE4D9] bg-[#FAF9F5] inline-flex items-center justify-center hover:opacity-80"
                        >
                          <img
                            src={item.photoPath}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <span className="text-[#C5A059] text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#231F1A]">
                      <button
                        onClick={() => openDetail(item)}
                        className="hover:text-[#B8860B] text-left block"
                      >
                        {item.name}
                      </button>
                      {item.notes && (
                        <span className="text-[10px] text-[#70685C] block truncate max-w-xs font-normal">
                          📝 {item.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#70685C]">
                      <span className="px-2 py-0.5 rounded bg-[#F4F0E8] text-[11px]">
                        {item.categoryName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#70685C]">{item.location}</td>
                    <td className="py-3 px-3 text-right font-semibold text-[#231F1A]">
                      <div>{item.quantity} Unit</div>
                      {item.price !== null && item.price !== undefined && (
                        <div className="text-[10px] text-[#2B6336] font-bold">
                          {formatRupiah(item.price)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ConditionBadge condition={item.condition} />
                    </td>
                    <td className="py-3 px-3 font-medium text-[#231F1A]">
                      {item.creatorName}
                    </td>
                    <td className="py-3 px-3 text-[#70685C]">
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openDetail(item)}
                          title="Detail & Riwayat"
                          className="p-1.5 text-[#70685C] hover:text-[#B8860B] hover:bg-[#F7F2E4] rounded-md transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          title="Edit Barang"
                          className="p-1.5 text-[#70685C] hover:text-[#C5A059] hover:bg-[#F4F0E8] rounded-md transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmItem(item)}
                          title="Hapus Barang"
                          className="p-1.5 text-[#70685C] hover:text-red-600 hover:bg-red-50 rounded-md transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="px-4 py-3 bg-[#FAF9F5] border-t border-[#EAE4D9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#70685C]">
          <div>
            Menampilkan <strong>{items.length}</strong> dari <strong>{totalCount}</strong> barang
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2 text-xs"
            >
              <ChevronLeft className="w-4 h-4" /> Sebelumnya
            </Button>
            <span className="px-2 font-medium">
              Hal {page} dari {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2 text-xs"
            >
              Selanjutnya <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL with History Audit Trail */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Detail & Riwayat Inventaris"
        maxWidth="lg"
      >
        {detailItem && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {detailItem.photoPath ? (
                <img
                  src={detailItem.photoPath}
                  alt={detailItem.name}
                  className="w-full sm:w-40 h-40 object-cover rounded-lg border border-[#EAE4D9]"
                />
              ) : (
                <div className="w-full sm:w-40 h-40 rounded-lg border border-[#EAE4D9] bg-[#FAF9F5] flex items-center justify-center text-[#C5A059]">
                  <ImageIcon className="w-8 h-8 opacity-60" />
                </div>
              )}

              <div className="flex-1 space-y-2 text-xs">
                <div>
                  <span className="text-[#70685C] block">Nama Barang</span>
                  <h4 className="text-base font-bold text-[#231F1A]">
                    {detailItem.name}
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#EAE4D9]">
                  <div>
                    <span className="text-[#70685C] block">Kategori</span>
                    <span className="font-semibold text-[#231F1A]">
                      {detailItem.categoryName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#70685C] block">Lokasi</span>
                    <span className="font-semibold text-[#231F1A]">
                      {detailItem.location}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#EAE4D9]">
                  <div>
                    <span className="text-[#70685C] block">Jumlah</span>
                    <span className="font-bold text-[#231F1A]">
                      {detailItem.quantity} Unit
                    </span>
                  </div>
                  <div>
                    <span className="text-[#70685C] block">Harga / Nilai</span>
                    <span className="font-bold text-[#2B6336]">
                      {detailItem.price !== null && detailItem.price !== undefined
                        ? formatRupiah(detailItem.price)
                        : '-'}
                    </span>
                  </div>
                </div>

                <div className="pt-1 border-t border-[#EAE4D9]">
                  <span className="text-[#70685C] block">Kondisi Fisik</span>
                  <div className="mt-1">
                    <ConditionBadge condition={detailItem.condition} />
                  </div>
                </div>

                <div className="pt-1 border-t border-[#EAE4D9]">
                  <span className="text-[#70685C] block">Ditambahkan Oleh</span>
                  <span className="font-medium text-[#231F1A]">
                    {detailItem.creatorName} ({detailItem.creator?.role || 'Penginventaris'})
                  </span>
                  <span className="text-[11px] text-[#C5A059] block mt-0.5">
                    Waktu Input:{' '}
                    {new Date(detailItem.createdAt).toLocaleString('id-ID')}
                  </span>
                </div>

                {detailItem.notes && (
                  <div className="pt-1 border-t border-[#EAE4D9]">
                    <span className="text-[#70685C] block">Catatan / Keterangan:</span>
                    <p className="font-medium text-[#231F1A] mt-0.5 whitespace-pre-wrap text-xs">
                      {detailItem.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Riwayat Perubahan Data (Audit Trail) */}
            <div className="pt-3 border-t border-[#EAE4D9]">
              <h5 className="text-xs font-bold text-[#231F1A] flex items-center gap-1.5 mb-2.5">
                <History className="w-4 h-4 text-[#B8860B]" />
                Riwayat Perubahan Data (Audit Trail)
              </h5>

              {detailItem.activityLogs && detailItem.activityLogs.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {detailItem.activityLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg border border-[#EAE4D9] bg-[#FAF9F5] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#231F1A]">
                          {log.action === 'CREATE' ? 'Pembuatan Pertama' : 'Pembaruan Data'} oleh {log.userName}
                        </span>
                        <span className="text-[10px] text-[#C5A059]">
                          {new Date(log.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                      {log.newData && (
                        <p className="text-[11px] text-[#70685C]">
                          Kondisi: <strong>{log.newData.condition}</strong> | Lokasi: <strong>{log.newData.location}</strong> | Jumlah: <strong>{log.newData.quantity}</strong>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#70685C] italic">
                  Belum ada riwayat modifikasi pada barang ini.
                </p>
              )}
            </div>

            <div className="pt-2 text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Data Inventaris"
        maxWidth="md"
      >
        <div className="space-y-3.5 text-xs">
          {editError && (
            <div className="p-2.5 rounded-lg bg-[#FDF2F2] border border-[#F8C4C4] text-[#C53030]">
              {editError}
            </div>
          )}

          <div>
            <label className="block font-medium text-[#231F1A] mb-1">
              Nama Barang
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#231F1A] mb-1">
              Kategori
            </label>
            <select
              value={editCategoryId}
              onChange={(e) => setEditCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-[#231F1A] mb-1">
              Tempat / Lokasi
            </label>
            <input
              type="text"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#231F1A] mb-1">
                Jumlah (Unit)
              </label>
              <input
                type="number"
                min="1"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#231F1A] mb-1">
                Kondisi Fisik Barang
              </label>
              <input
                type="text"
                list="admin-condition-suggestions"
                value={editCondition}
                onChange={(e) => setEditCondition(e.target.value)}
                placeholder="Ketik kondisi atau pilih saran..."
                className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
              />
              <datalist id="admin-condition-suggestions">
                <option value="Baik" />
                <option value="Rusak Ringan" />
                <option value="Rusak Berat" />
                <option value="Perlu Perbaikan" />
                <option value="Baru" />
                <option value="Bekas Normal" />
                <option value="Lecet Pemakaian" />
                <option value="Perlu Servis" />
              </datalist>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['Baik', 'Rusak Ringan', 'Rusak Berat', 'Perlu Servis'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditCondition(s)}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-[#FAF9F5] border border-[#EAE4D9] text-[#70685C] hover:text-[#B8860B]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#231F1A] mb-1">
              Catatan / Keterangan (Opsional)
            </label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Nomor seri, spesifikasi, atau info tambahan..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B] resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-medium text-[#231F1A]">
                Harga / Nilai Perolehan (Opsional)
              </label>
              {editPrice && (
                <span className="text-[11px] font-bold text-[#2B6336]">
                  {formatRupiah(parseFloat(editPrice.replace(/[^0-9]/g, '')))}
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
                value={editPrice}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, '');
                  if (!digits) setEditPrice('');
                  else setEditPrice(parseInt(digits, 10).toLocaleString('id-ID'));
                }}
                placeholder="0 (Contoh: 1.500.000)"
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-[#EAE4D9] text-xs font-semibold text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
              />
            </div>
          </div>

          {/* Photo handling */}
          <div>
            <label className="block font-medium text-[#231F1A] mb-1">
              Foto Barang
            </label>
            {editPhotoPreview && !editRemovePhoto ? (
              <div className="flex items-center gap-3 p-2 border border-[#EAE4D9] rounded-lg bg-[#FAF9F5]">
                <img
                  src={editPhotoPreview}
                  alt="Preview"
                  className="w-14 h-14 object-cover rounded"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditRemovePhoto(true)}
                  className="text-red-600 hover:text-red-700 text-xs"
                >
                  Hapus Foto Ini
                </Button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setEditPhotoFile(file);
                    setEditPhotoPreview(URL.createObjectURL(file));
                    setEditRemovePhoto(false);
                  }
                }}
                className="w-full text-xs text-[#70685C]"
              />
            )}
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(false)}
              disabled={isSavingEdit}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveEdit}
              isLoading={isSavingEdit}
              disabled={isSavingEdit}
            >
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deleteConfirmItem)}
        onClose={() => setDeleteConfirmItem(null)}
        title="Konfirmasi Hapus Inventaris"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#231F1A]">
            Apakah Anda yakin ingin menghapus barang{' '}
            <strong>"{deleteConfirmItem?.name}"</strong>?
          </p>
          <p className="text-[#70685C]">
            Data dan file foto terkait akan dihapus secara permanen dari server. Tindakan ini tidak dapat dibatalkan.
          </p>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmItem(null)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteItem}
            >
              Ya, Hapus Data
            </Button>
          </div>
        </div>
      </Modal>

      {/* BULK DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        title="Konfirmasi Hapus Massal"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#231F1A]">
            Anda akan menghapus <strong>{selectedIds.length}</strong> barang inventaris sekaligus.
          </p>
          <p className="text-[#70685C]">
            Seluruh data terpilih akan dihapus permanen. Lanjutkan?
          </p>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDeleteOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
            >
              Hapus Semua Terpilih
            </Button>
          </div>
        </div>
      </Modal>

      {/* CATEGORY MANAGER MODAL */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Kelola Kategori Inventaris"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {catError && (
            <div className="p-2.5 rounded-lg bg-[#FDF2F2] border border-[#F8C4C4] text-[#C53030]">
              {catError}
            </div>
          )}

          {/* Add Category Form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nama kategori baru..."
              className="flex-1 px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddCategory}
              disabled={!newCatName.trim()}
            >
              Tambah
            </Button>
          </div>

          {/* Category List */}
          <div className="divide-y divide-[#EAE4D9] max-h-64 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="py-2.5 flex items-center justify-between gap-2"
              >
                {editingCat?.id === cat.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      defaultValue={cat.name}
                      id={`cat-input-${cat.id}`}
                      className="flex-1 px-2 py-1 rounded border border-[#EAE4D9] text-xs text-[#231F1A]"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById(
                          `cat-input-${cat.id}`
                        ) as HTMLInputElement;
                        if (input && input.value.trim()) {
                          handleUpdateCategory(cat.id, input.value.trim());
                        }
                      }}
                    >
                      Simpan
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingCat(null)}
                    >
                      Batal
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="font-semibold text-[#231F1A] block">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-[#70685C]">
                        Digunakan oleh {cat.inventoryCount || 0} barang
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingCat(cat)}
                        className="p-1 text-[#70685C] hover:text-[#B8860B]"
                        title="Edit Nama Kategori"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 text-[#70685C] hover:text-red-600"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 text-right">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Selesai
            </Button>
          </div>
        </div>
      </Modal>

      {/* FULL PHOTO PREVIEW MODAL */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-lg w-full bg-white rounded-xl overflow-hidden p-2">
            <img
              src={previewPhoto}
              alt="Foto Detail"
              className="w-full max-h-[75vh] object-contain rounded-lg"
            />
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewPhoto(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
