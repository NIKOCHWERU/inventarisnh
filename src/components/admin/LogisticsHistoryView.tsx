'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Calendar,
  Package,
  User,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatPhotoUrl } from '@/lib/base-path';

export function LogisticsHistoryView() {
  const [histories, setHistories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  // Expand snapshot state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistories = async (pageNumber = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNumber),
        limit: '30',
      });
      if (actionFilter && actionFilter !== 'ALL') params.set('action', actionFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const res = await fetch(`/api/logistics/history?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setHistories(data.histories || []);
        setTotal(data.pagination.total);
        setPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to load histories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistories(1);
  }, [actionFilter, startDate, endDate]);

  const filteredHistories = histories.filter((h) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (h.logistic?.name && h.logistic.name.toLowerCase().includes(q)) ||
      (h.user?.name && h.user.name.toLowerCase().includes(q)) ||
      (h.notes && h.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Filter Card */}
      <div className="bg-white rounded-2xl border border-[#EAE4D9] p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE4D9]">
          <div>
            <h3 className="text-sm font-bold text-[#231F1A] flex items-center gap-2">
              <History className="w-4 h-4 text-[#B8860B]" />
              Riwayat Perubahan & Audit Trail Logistik
            </h3>
            <p className="text-[11px] text-[#70685C] mt-0.5">
              Catatan lengkap setiap kali stok ditambah, dikurangi, dikoreksi, atau diedit oleh staf.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#7A5805] bg-[#FAF6EC] px-3 py-1 rounded-lg border border-[#E5D7B7]">
            {total} riwayat tercatat
          </span>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
          <div>
            <label className="block text-[11px] font-bold text-[#70685C] mb-1">
              Cari Riwayat
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8273]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama barang, staf, keterangan..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#EAE4D9] text-xs focus:ring-1 focus:ring-[#B8860B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#70685C] mb-1">
              Jenis Aktivitas
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#EAE4D9] text-xs font-medium focus:ring-1 focus:ring-[#B8860B]"
            >
              <option value="ALL">Semua Aktivitas</option>
              <option value="STOCK_IN">Stok Masuk (+)</option>
              <option value="STOCK_OUT">Stok Keluar (-)</option>
              <option value="ADJUSTMENT">Koreksi Stok</option>
              <option value="CREATE">Barang Baru Dibuat</option>
              <option value="UPDATE">Update Data</option>
              <option value="DELETE">Penghapusan</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#70685C] mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#EAE4D9] text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#70685C] mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#EAE4D9] text-xs"
            />
          </div>
        </div>
      </div>

      {/* Feed List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#70685C] bg-white rounded-2xl border border-[#EAE4D9]">
          <div className="w-6 h-6 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Memuat riwayat logistik...
        </div>
      ) : filteredHistories.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#70685C] bg-white rounded-2xl border border-[#EAE4D9]">
          Tidak ada riwayat aktivitas logistik yang sesuai filter.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredHistories.map((h) => {
            const isExpanded = expandedId === h.id;
            const isPlus = h.stock_change > 0 || h.action === 'STOCK_IN' || h.action === 'CREATE';
            const isMinus = h.stock_change < 0 || h.action === 'STOCK_OUT';

            let oldSnapshot: any = null;
            let newSnapshot: any = null;
            try {
              if (h.old_data) oldSnapshot = JSON.parse(h.old_data);
              if (h.new_data) newSnapshot = JSON.parse(h.new_data);
            } catch {}

            return (
              <div
                key={h.id}
                className="bg-white rounded-2xl border border-[#EAE4D9] p-4 shadow-2xs transition hover:border-[#C5A059]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    {h.logistic?.photo_path ? (
                      <img
                        src={formatPhotoUrl(h.logistic.photo_path)}
                        alt={h.logistic.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[#EAE4D9] flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#FAF6EC] border border-[#E5D7B7] text-[#B8860B] flex items-center justify-center font-bold text-xs flex-shrink-0">
                        📦
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-[#231F1A]">
                          {h.logistic?.name || 'Barang Logistik'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            h.action === 'STOCK_IN'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : h.action === 'STOCK_OUT'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : h.action === 'CREATE'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : h.action === 'DELETE'
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {h.action === 'CREATE'
                            ? 'Barang Baru Dibuat'
                            : h.action === 'STOCK_IN'
                            ? `Stok Masuk (+${Math.abs(h.stock_change)})`
                            : h.action === 'STOCK_OUT'
                            ? `Stok Keluar (-${Math.abs(h.stock_change)})`
                            : h.action === 'ADJUSTMENT'
                            ? 'Koreksi Stok'
                            : h.action === 'DELETE'
                            ? 'Data Dihapus'
                            : 'Update Data'}
                        </span>
                      </div>

                      <p className="text-xs text-[#70685C] mt-1">
                        Catatan: <strong className="text-[#231F1A] font-medium">{h.notes || 'Tidak ada catatan'}</strong>
                      </p>

                      <div className="text-[10px] text-[#8C8273] mt-1 flex items-center gap-3 flex-wrap">
                        <span>Oleh: <strong className="text-[#231F1A]">{h.user?.name || 'Pengguna'}</strong> ({h.user?.role || 'Staff'})</span>
                        <span>•</span>
                        <span>
                          {new Date(h.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>•</span>
                        <span>ID Log: {h.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Stock comparison */}
                  <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[#F0EBE0]">
                    <div className="text-right">
                      {h.old_stock != null && h.new_stock != null ? (
                        <>
                          <span className="text-[11px] text-[#70685C] block">
                            {h.old_stock} ➔ <strong className="text-sm font-bold text-[#231F1A]">{h.new_stock}</strong> {h.logistic?.unit || 'unit'}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              isPlus ? 'text-emerald-700' : isMinus ? 'text-rose-700' : 'text-blue-700'
                            }`}
                          >
                            {h.stock_change > 0 ? `+${h.stock_change}` : h.stock_change} unit
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-[#70685C]">-</span>
                      )}
                    </div>

                    {(oldSnapshot || newSnapshot) && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : h.id)}
                        className="p-1.5 rounded-lg border border-[#EAE4D9] hover:bg-[#FAF9F5] text-[#70685C] hover:text-[#231F1A] text-xs flex items-center gap-1 transition"
                        title="Lihat Snapshot Data Sebelumnya"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#B8860B]" />
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Snapshot Accordion */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[#F0EBE0] bg-[#FAF9F5] rounded-xl p-3 text-xs space-y-2 animate-in fade-in">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5805] block">
                      Snapshot Data Logistik Sebelum vs Sesudah:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      {oldSnapshot && (
                        <div className="p-2.5 rounded-lg bg-white border border-[#EAE4D9]">
                          <span className="font-bold text-red-600 block mb-1">Sebelum Perubahan:</span>
                          <p>Nama: {oldSnapshot.name}</p>
                          <p>Stok: {oldSnapshot.quantity} {oldSnapshot.unit}</p>
                          <p>Lokasi: {oldSnapshot.location}</p>
                          <p>Kategori: {oldSnapshot.category}</p>
                          {oldSnapshot.price && <p>Harga: Rp {oldSnapshot.price.toLocaleString('id-ID')}</p>}
                        </div>
                      )}
                      {newSnapshot && (
                        <div className="p-2.5 rounded-lg bg-white border border-[#EAE4D9]">
                          <span className="font-bold text-emerald-600 block mb-1">Sesudah Perubahan:</span>
                          <p>Nama: {newSnapshot.name}</p>
                          <p>Stok: {newSnapshot.quantity} {newSnapshot.unit}</p>
                          <p>Lokasi: {newSnapshot.location}</p>
                          <p>Kategori: {newSnapshot.category}</p>
                          {newSnapshot.price && <p>Harga: Rp {newSnapshot.price.toLocaleString('id-ID')}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pt-3 flex items-center justify-between text-xs text-[#70685C]">
              <span>
                Halaman {page} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fetchHistories(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-[#EAE4D9] bg-white disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() => fetchHistories(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-[#EAE4D9] bg-white disabled:opacity-40"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
