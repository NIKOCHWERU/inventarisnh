'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Building,
  Shield,
  Key,
  HardDrive,
  Save,
  CheckCircle2,
  AlertCircle,
  Database,
  Lock,
  Download,
  Upload,
  FolderOpen,
  FileSpreadsheet,
  RefreshCw,
  Archive,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FolderPickerModal } from '@/components/admin/FolderPickerModal';
import { withBasePath } from '@/lib/base-path';

export default function AdminSettingsPage() {
  const [officeName, setOfficeName] = useState('');
  const [appTitle, setAppTitle] = useState('');
  const [allowEmployeeEdit, setAllowEmployeeEdit] = useState(false);
  const [qrDefaultExpiryHours, setQrDefaultExpiryHours] = useState('24');
  const [uploadDirectory, setUploadDirectory] = useState('');
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);

  // Admin user
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Folder check state
  const [isCheckingFolder, setIsCheckingFolder] = useState(false);
  const [folderCheckResult, setFolderCheckResult] = useState<{
    writable: boolean;
    message: string;
  } | null>(null);

  // Database Backup / Restore state
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement | null>(null);

  // Excel Import state
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [excelImportResult, setExcelImportResult] = useState<{
    type: 'success' | 'error';
    text: string;
    errors?: string[];
  } | null>(null);
  const excelFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings) {
          setOfficeName(data.settings.office_name);
          setAppTitle(data.settings.app_title);
          setAllowEmployeeEdit(data.settings.allow_employee_edit);
          setQrDefaultExpiryHours(data.settings.qr_default_expiry_hours);
          setUploadDirectory(data.settings.upload_directory || '');
        }
        if (data.admin) {
          setAdminName(data.admin.name);
          setAdminUsername(data.admin.username);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password baru tidak cocok.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setErrorMessage('Password baru minimal harus 6 karakter.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          office_name: officeName,
          app_title: appTitle,
          allow_employee_edit: allowEmployeeEdit,
          qr_default_expiry_hours: qrDefaultExpiryHours,
          upload_directory: uploadDirectory,
          admin_name: adminName,
          admin_username: adminUsername,
          new_password: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan pengaturan.');
      }

      setSuccessMessage('Pengaturan berhasil disimpan!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckFolder = async () => {
    setIsCheckingFolder(true);
    setFolderCheckResult(null);
    try {
      const res = await fetch('/api/settings/check-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_path: uploadDirectory }),
      });
      const data = await res.json();
      setFolderCheckResult({
        writable: data.writable,
        message: data.message,
      });
    } catch (err: any) {
      setFolderCheckResult({
        writable: false,
        message: 'Gagal menguji akses folder: ' + err.message,
      });
    } finally {
      setIsCheckingFolder(false);
    }
  };

  const handleBackup = (type: 'db' | 'zip') => {
    setIsBackingUp(true);
    window.location.href = withBasePath(`/api/admin/database/backup?type=${type}`);
    setTimeout(() => setIsBackingUp(false), 3000);
  };

  const handleRestoreFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`PERINGATAN: Memulihkan database dari "${file.name}" akan mengganti database saat ini. Sistem akan otomatis membuat file cadangan sebelum mengganti. Lanjutkan?`)) {
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    setRestoreMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/database/restore', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memulihkan database.');
      }

      setRestoreMessage({
        type: 'success',
        text: data.message + ' Halaman akan disegarkan dalam beberapa detik...',
      });

      setTimeout(() => {
        window.location.reload();
      }, 3500);
    } catch (err: any) {
      setRestoreMessage({
        type: 'error',
        text: err.message,
      });
    } finally {
      setIsRestoring(false);
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
    }
  };

  const handleImportExcelSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingExcel(true);
    setExcelImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/database/import-excel', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengimpor file Excel.');
      }

      setExcelImportResult({
        type: 'success',
        text: data.message,
        errors: data.errors,
      });
    } catch (err: any) {
      setExcelImportResult({
        type: 'error',
        text: err.message,
      });
    } finally {
      setIsImportingExcel(false);
      if (excelFileInputRef.current) excelFileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-[#70685C]">
        Memuat pengaturan aplikasi...
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="pb-2 border-b border-[#EAE4D9]">
        <h1 className="text-2xl font-bold text-[#231F1A]">Pengaturan Sistem & Database</h1>
        <p className="text-xs text-[#70685C] mt-1">
          Konfigurasi identitas kantor, penyimpanan foto inventaris, backup/restore database, dan impor data.
        </p>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-[#EBF5ED] border border-[#C2E2CA] text-xs text-[#2B6336] flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F8C4C4] text-xs text-[#C53030] flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Identitas Kantor & Operasional */}
        <div className="bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#EAE4D9]">
            <Building className="w-4 h-4 text-[#B8860B]" />
            <h3 className="text-sm font-bold text-[#231F1A]">
              Identitas Kantor & Kebijakan Input
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#231F1A] mb-1.5">
                Nama Kantor / Perusahaan
              </label>
              <input
                type="text"
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
              />
              <p className="text-[11px] text-[#70685C] mt-1">
                Akan dicetak pada kop laporan PDF dan Excel.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-[#231F1A] mb-1.5">
                Judul Aplikasi
              </label>
              <input
                type="text"
                value={appTitle}
                onChange={(e) => setAppTitle(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
              />
            </div>
          </div>

          {/* Toggle Izin Karyawan */}
          <div className="pt-2 border-t border-[#EAE4D9]">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowEmployeeEdit}
                onChange={(e) => setAllowEmployeeEdit(e.target.checked)}
                className="mt-0.5 rounded border-[#EAE4D9] text-[#B8860B] focus:ring-[#B8860B]"
              />
              <div className="text-xs">
                <span className="font-semibold text-[#231F1A] block">
                  Izinkan Karyawan Mengedit / Menghapus Inventaris Miliknya Sendiri
                </span>
                <span className="text-[#70685C]">
                  Secara default nonaktif demi menjaga integritas data. Jika diaktifkan, karyawan dapat merevisi data barang yang mereka input sendiri.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Card 2: Pengaturan Penyimpanan Foto Inventaris */}
        <div className="bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#EAE4D9]">
            <FolderOpen className="w-4 h-4 text-[#B8860B]" />
            <h3 className="text-sm font-bold text-[#231F1A]">
              Lokasi Penyimpanan Foto Inventaris
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[#231F1A] mb-1">
                Folder Direktori Penyimpanan Foto
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={uploadDirectory}
                  onChange={(e) => {
                    setUploadDirectory(e.target.value);
                    setFolderCheckResult(null);
                  }}
                  placeholder="Contoh: D:\Inventaris_Foto atau biarkan kosong untuk default"
                  className="flex-1 px-3 py-2 font-mono text-xs rounded-lg border border-[#EAE4D9] text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFolderPickerOpen(true)}
                  className="gap-1.5 text-xs flex-shrink-0 border-[#E5D7B7] bg-[#F7F2E4] hover:bg-[#EAE4D9] text-[#7A5805] font-semibold"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#B8860B]" />
                  Pilih Folder (Klik)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckFolder}
                  isLoading={isCheckingFolder}
                  disabled={isCheckingFolder}
                  className="gap-1.5 text-xs flex-shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Uji Akses
                </Button>
              </div>
              <p className="text-[11px] text-[#70685C] mt-1.5">
                Klik tombol <strong>"Pilih Folder (Klik)"</strong> di atas untuk menjelajahi folder komputer Anda secara visual. Kosongkan untuk menggunakan folder bawaan aplikasi (<code>public/uploads</code>).
              </p>
            </div>

            <FolderPickerModal
              isOpen={isFolderPickerOpen}
              currentPath={uploadDirectory}
              onSelect={(selected) => {
                setUploadDirectory(selected);
                setFolderCheckResult(null);
              }}
              onClose={() => setIsFolderPickerOpen(false)}
            />

            {folderCheckResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  folderCheckResult.writable
                    ? 'bg-[#EBF5ED] border-[#C2E2CA] text-[#2B6336]'
                    : 'bg-[#FDF2F2] border-[#F8C4C4] text-[#C53030]'
                }`}
              >
                {folderCheckResult.writable ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{folderCheckResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Keamanan Akun Administrator */}
        <div className="bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#EAE4D9]">
            <Shield className="w-4 h-4 text-[#B8860B]" />
            <h3 className="text-sm font-bold text-[#231F1A]">
              Profil & Kredensial Administrator
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#231F1A] mb-1.5">
                Nama Lengkap Administrator
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#231F1A] mb-1.5">
                Username Login
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#EAE4D9]">
            <span className="text-xs font-semibold text-[#231F1A] block mb-2">
              Ubah Password (Kosongkan jika tidak ingin mengubah)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#70685C] mb-1">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter..."
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
                />
              </div>

              <div>
                <label className="block text-[#70685C] mb-1">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru..."
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE4D9] text-xs text-[#231F1A] focus:ring-1 focus:ring-[#B8860B]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button for Form */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            disabled={isSaving}
            className="gap-2 text-xs font-semibold"
          >
            <Save className="w-4 h-4" />
            Simpan Konfigurasi Sistem
          </Button>
        </div>
      </form>

      {/* Card 4: Backup & Restore Database SQLite */}
      <div className="bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#EAE4D9]">
          <Database className="w-4 h-4 text-[#B8860B]" />
          <h3 className="text-sm font-bold text-[#231F1A]">
            Backup & Restore Database (SQLite)
          </h3>
        </div>

        <p className="text-xs text-[#70685C]">
          Sistem berjalan menggunakan basis data mandiri SQLite (<code>prisma/dev.db</code>). Anda dapat mencadangkan seluruh data kapan saja untuk keamanan atau memindahkan sistem ke komputer lain.
        </p>

        {restoreMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              restoreMessage.type === 'success'
                ? 'bg-[#EBF5ED] border-[#C2E2CA] text-[#2B6336]'
                : 'bg-[#FDF2F2] border-[#F8C4C4] text-[#C53030]'
            }`}
          >
            {restoreMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{restoreMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Section Backup */}
          <div className="p-4 rounded-xl border border-[#EAE4D9] bg-[#FAF9F5] space-y-3">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[#B8860B]" />
              <h4 className="text-xs font-bold text-[#231F1A]">Ekspor / Backup Database</h4>
            </div>
            <p className="text-[11px] text-[#70685C]">
              Unduh salinan data untuk disimpan di Flashdisk atau komputer lain:
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleBackup('db')}
                disabled={isBackingUp}
                className="gap-1.5 text-xs flex-1"
              >
                <Database className="w-3.5 h-3.5 text-[#B8860B]" />
                Download File .db
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleBackup('zip')}
                disabled={isBackingUp}
                className="gap-1.5 text-xs flex-1"
              >
                <Archive className="w-3.5 h-3.5 text-[#B8860B]" />
                Full Backup (.zip + Foto)
              </Button>
            </div>
          </div>

          {/* Section Restore */}
          <div className="p-4 rounded-xl border border-[#EAE4D9] bg-[#FAF9F5] space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#B8860B]" />
              <h4 className="text-xs font-bold text-[#231F1A]">Impor / Restore Database</h4>
            </div>
            <p className="text-[11px] text-[#70685C]">
              Pilih file <code>.db</code> cadangan untuk menggantikan database aktif:
            </p>
            <div>
              <input
                ref={restoreFileInputRef}
                type="file"
                accept=".db,.sqlite,.sqlite3"
                onChange={handleRestoreFileSelected}
                className="hidden"
                id="restore-db-file"
                disabled={isRestoring}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => restoreFileInputRef.current?.click()}
                isLoading={isRestoring}
                disabled={isRestoring}
                className="w-full gap-1.5 text-xs border-amber-300 hover:bg-amber-50 text-[#8B6508]"
              >
                <Upload className="w-3.5 h-3.5" />
                Pilih File Cadangan (.db) untuk Restore
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Card 5: Impor Data Massal dari Excel */}
      <div className="bg-white rounded-xl border border-[#EAE4D9] p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#EAE4D9]">
          <FileSpreadsheet className="w-4 h-4 text-[#B8860B]" />
          <h3 className="text-sm font-bold text-[#231F1A]">
            Impor Data Inventaris dari Excel (Mass Import)
          </h3>
        </div>

        <p className="text-xs text-[#70685C]">
          Punya ratusan data inventaris lama? Anda dapat mengimpor sekaligus melalui file Excel (.xlsx). Kategori baru akan otomatis dibuat jika belum terdaftar di sistem.
        </p>

        {excelImportResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-2 ${
              excelImportResult.type === 'success'
                ? 'bg-[#EBF5ED] border-[#C2E2CA] text-[#2B6336]'
                : 'bg-[#FDF2F2] border-[#F8C4C4] text-[#C53030]'
            }`}
          >
            <div className="flex items-center gap-2">
              {excelImportResult.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="font-semibold">{excelImportResult.text}</span>
            </div>
            {excelImportResult.errors && excelImportResult.errors.length > 0 && (
              <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                {excelImportResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <a
            href="/api/admin/database/template-excel"
            download="Template_Import_Inventaris.xlsx"
            className="w-full sm:w-auto"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs text-[#231F1A]"
            >
              <Download className="w-3.5 h-3.5 text-[#B8860B]" />
              Unduh Template Excel (.xlsx)
            </Button>
          </a>

          <input
            ref={excelFileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleImportExcelSelected}
            className="hidden"
            id="import-excel-file"
            disabled={isImportingExcel}
          />

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => excelFileInputRef.current?.click()}
            isLoading={isImportingExcel}
            disabled={isImportingExcel}
            className="w-full sm:w-auto gap-1.5 text-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File Excel untuk Impor
          </Button>
        </div>
      </div>
    </div>
  );
}
