'use client';

import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  X,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Converter {
  id: number;
  name: string;
  nameModified?: string;
  urlPath?: string;
  brand: string;
  weight?: string;
  pt?: string;
  pd?: string;
  rh?: string;
  keywords?: string;
  imageUrl?: string;
  brandImage?: string;
}

interface BrandOption {
  name: string;
  count: number;
  brandImage?: string | null;
}

interface ConverterFormData {
  name: string;
  brand: string;
  weight: string;
  pt: string;
  pd: string;
  rh: string;
  keywords: string;
  imageUrl: string;
}

// ---------------------------------------------------------------------------
// ImageCell — safe replacement for innerHTML XSS pattern
// ---------------------------------------------------------------------------

const CDN_BASE = 'https://apg.fra1.cdn.digitaloceanspaces.com';
const PLACEHOLDER = '/converter-placeholder.svg';

function getConverterImageUrl(name: string) {
  const cleanName = name.trim().split(' / ')[0].trim();
  return `${CDN_BASE}/images/${encodeURIComponent(cleanName)}.png`;
}

function ImageCell({ src, alt }: { src?: string; alt: string }) {
  // Use CDN URL from converter name (same pattern as catalogue cards)
  const imgSrc = src && src.startsWith('http') ? src : getConverterImageUrl(alt);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = PLACEHOLDER;
  };

  return (
    <div className="h-8 w-8 rounded border border-border overflow-hidden bg-muted flex items-center justify-center">
      <img
        src={imgSrc}
        alt={alt}
        className="h-full w-full object-cover"
        onError={handleError}
      />
    </div>
  );
}

const emptyForm: ConverterFormData = {
  name: '',
  brand: '',
  weight: '',
  pt: '',
  pd: '',
  rh: '',
  keywords: '',
  imageUrl: '',
};

// ---------------------------------------------------------------------------
// Reusable inline Dialog (built on Radix)
// ---------------------------------------------------------------------------

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] max-h-[90vh] overflow-y-auto">
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdminConverters() {
  const { token } = useAuth();

  // --- Data state ---
  const [converters, setConverters] = useState<Converter[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // --- Filter / pagination state ---
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 25;

  // --- Modal state ---
  const [formOpen, setFormOpen] = useState(false);
  const [editingConverter, setEditingConverter] = useState<Converter | null>(null);
  const [formData, setFormData] = useState<ConverterFormData>(emptyForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // --- Delete confirmation ---
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingConverter, setDeletingConverter] = useState<Converter | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // --- Image upload state ---
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- Import state ---
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Debounce timer for search ---
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // =========================================================================
  // Fetch converters
  // =========================================================================

  const fetchConverters = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit };
      if (search) params.query = search;
      if (brandFilter) params.brand = brandFilter;
      const res = await api.adminSearchConverters(params, token);
      setConverters(res.data?.data || []);
      setHasMore(res.data?.hasMore || false);
      if (typeof (res.data as any)?.total === 'number') {
        setTotalCount((res.data as any).total);
      }
    } catch (err: any) {
      console.error('Failed to fetch converters:', err);
      setError(err?.message || 'Failed to load converters');
    } finally {
      setLoading(false);
    }
  }, [token, page, search, brandFilter, limit]);

  // =========================================================================
  // Fetch brands (once)
  // =========================================================================

  const fetchBrands = useCallback(async () => {
    try {
      const res = await api.getBrands(token || undefined);
      setBrands(res.data || []);
    } catch {
      // Brands list is non-critical
    }
  }, [token]);

  useEffect(() => {
    fetchConverters();
  }, [fetchConverters]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // =========================================================================
  // Search handler with debounce
  // =========================================================================

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // =========================================================================
  // Form helpers
  // =========================================================================

  const openAddForm = () => {
    setEditingConverter(null);
    setFormData(emptyForm);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditForm = (converter: Converter) => {
    setEditingConverter(converter);
    setFormData({
      name: converter.name || '',
      brand: converter.brand || '',
      weight: converter.weight || '',
      pt: converter.pt || '',
      pd: converter.pd || '',
      rh: converter.rh || '',
      keywords: converter.keywords || '',
      imageUrl: converter.imageUrl || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleFormChange = (field: keyof ConverterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (file: File) => {
    if (!token) return;
    setImageUploading(true);
    setImageUploadError(null);
    try {
      const res = await api.uploadConverterImage(file, token);
      if (res.data?.url) {
        setFormData((prev) => ({ ...prev, imageUrl: res.data.url }));
      }
    } catch (err: any) {
      setImageUploadError(err?.message || 'Image upload failed. Check DO Spaces configuration.');
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Basic validation
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      if (editingConverter) {
        await api.updateConverter(editingConverter.id, formData, token);
      } else {
        await api.createConverter(formData, token);
      }
      setFormOpen(false);
      fetchConverters();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save converter');
    } finally {
      setFormSubmitting(false);
    }
  };

  // =========================================================================
  // Delete handler
  // =========================================================================

  const openDeleteConfirm = (converter: Converter) => {
    setDeletingConverter(converter);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!token || !deletingConverter) return;
    setDeleteSubmitting(true);
    try {
      await api.deleteConverter(deletingConverter.id, token);
      setDeleteOpen(false);
      setDeletingConverter(null);
      fetchConverters();
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert(err?.message || 'Failed to delete converter');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // =========================================================================
  // CSV Import
  // =========================================================================

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    // Parse header
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const records: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;
      const record: Record<string, string> = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx] || '';
      });
      records.push(record);
    }
    return records;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleImport = async () => {
    if (!token || !importFile) return;
    setImportSubmitting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const text = await importFile.text();
      const records = parseCSV(text);
      if (records.length === 0) {
        setImportError('No valid records found in CSV file');
        setImportSubmitting(false);
        return;
      }
      const res = await api.importConverters(records, token);
      setImportResult(`Successfully imported ${records.length} records.`);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchConverters();
    } catch (err: any) {
      setImportError(err?.message || 'Import failed');
    } finally {
      setImportSubmitting(false);
    }
  };

  // =========================================================================
  // CSV Export
  // =========================================================================

  const handleExport = async () => {
    if (!token) return;
    try {
      // Fetch all results for current filter (up to 10000)
      const params: Record<string, any> = { page: 1, limit: 10000 };
      if (search) params.query = search;
      if (brandFilter) params.brand = brandFilter;
      const res = await api.adminSearchConverters(params, token);
      const data = res.data?.data || [];

      if (data.length === 0) {
        alert('No data to export');
        return;
      }

      const headers = ['id', 'name', 'brand', 'weight', 'pt', 'pd', 'rh', 'keywords', 'imageUrl'];
      const csvRows = [headers.join(',')];
      for (const row of data) {
        const values = headers.map((h) => {
          const val = String(row[h] ?? '');
          // Escape quotes and wrap in quotes if contains comma/quote/newline
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        });
        csvRows.push(values.join(','));
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `converters-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert(err?.message || 'Export failed');
    }
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Converter Management</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={openAddForm}>
                <Plus className="h-4 w-4 mr-1" />
                Add Converter
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setImportOpen(true); setImportError(null); setImportResult(null); setImportFile(null); }}>
                <Upload className="h-4 w-4 mr-1" />
                Import CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Search + Brand Filter row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center mt-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search converters..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9 bg-background"
              />
            </div>
            <select
              value={brandFilter}
              onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} ({b.count})
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
              <Button variant="ghost" size="sm" className="ml-auto h-7 px-2" onClick={fetchConverters}>
                Retry
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 px-2 font-medium text-muted-foreground w-16">ID</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground w-14">Image</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Name</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Brand</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground w-20">Weight</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground w-20">Pt</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground w-20">Pd</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground w-20">Rh</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="border-b border-border/50">
                      <td className="py-3 px-2"><Skeleton className="h-4 w-10" /></td>
                      <td className="py-3 px-2"><Skeleton className="h-8 w-8 rounded" /></td>
                      <td className="py-3 px-2"><Skeleton className="h-4 w-40" /></td>
                      <td className="py-3 px-2"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="py-3 px-2"><Skeleton className="h-4 w-14" /></td>
                      <td className="py-3 px-2"><Skeleton className="h-4 w-14" /></td>
                      <td className="py-3 px-2"><Skeleton className="h-4 w-14" /></td>
                      <td className="py-3 px-2"><Skeleton className="h-4 w-14" /></td>
                      <td className="py-3 px-2"><Skeleton className="h-7 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : converters.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      No converters found
                    </td>
                  </tr>
                ) : (
                  converters.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-2 text-muted-foreground">{c.id}</td>
                      <td className="py-3 px-2">
                        <ImageCell src={c.imageUrl} alt={c.name} />
                      </td>
                      <td className="py-3 px-2 max-w-[200px] truncate font-medium">{c.name}</td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary" className="text-[10px]">{c.brand}</Badge>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">{c.weight || '\u2014'}</td>
                      <td className="py-3 px-2 text-muted-foreground">{c.pt || '\u2014'}</td>
                      <td className="py-3 px-2 text-muted-foreground">{c.pd || '\u2014'}</td>
                      <td className="py-3 px-2 text-muted-foreground">{c.rh || '\u2014'}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Edit"
                            onClick={() => openEditForm(c)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete"
                            onClick={() => openDeleteConfirm(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">
              Page {page}
              {totalCount > 0 && ` \u00b7 ${totalCount} total`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[3ch] text-center">{page}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Add / Edit Converter Dialog                                        */}
      {/* ================================================================== */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {editingConverter ? 'Edit Converter' : 'Add Converter'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {editingConverter
                ? `Editing converter #${editingConverter.id}`
                : 'Create a new converter record'}
            </p>
          </div>

          {formError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="Converter name"
                className="bg-background"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Brand</label>
              <Input
                value={formData.brand}
                onChange={(e) => handleFormChange('brand', e.target.value)}
                placeholder="e.g. CHRYSLER"
                className="bg-background"
                list="brand-suggestions"
              />
              <datalist id="brand-suggestions">
                {brands.map((b) => (
                  <option key={b.name} value={b.name} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Weight</label>
                <Input
                  value={formData.weight}
                  onChange={(e) => handleFormChange('weight', e.target.value)}
                  placeholder="e.g. 2,140"
                  className="bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Pt (Platinum)</label>
                <Input
                  value={formData.pt}
                  onChange={(e) => handleFormChange('pt', e.target.value)}
                  placeholder="e.g. 2,708"
                  className="bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Pd (Palladium)</label>
                <Input
                  value={formData.pd}
                  onChange={(e) => handleFormChange('pd', e.target.value)}
                  placeholder="e.g. 0,000"
                  className="bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Rh (Rhodium)</label>
                <Input
                  value={formData.rh}
                  onChange={(e) => handleFormChange('rh', e.target.value)}
                  placeholder="e.g. 0,000"
                  className="bg-background"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Keywords</label>
              <Input
                value={formData.keywords}
                onChange={(e) => handleFormChange('keywords', e.target.value)}
                placeholder="Search keywords"
                className="bg-background"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Image</label>
              {/* Image preview */}
              {formData.imageUrl && (
                <div className="mb-2 flex items-center gap-3">
                  <div className="h-16 w-16 rounded border border-border overflow-hidden bg-muted flex items-center justify-center">
                    <ImageCell src={formData.imageUrl} alt="Preview" />
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[250px]">{formData.imageUrl}</span>
                </div>
              )}
              {/* Upload button */}
              <div className="flex items-center gap-2 mb-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={imageUploading}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {imageUploading ? 'Uploading...' : 'Upload Image'}
                </Button>
                <span className="text-xs text-muted-foreground">or paste URL below</span>
              </div>
              {imageUploadError && (
                <div className="text-xs text-destructive mb-2">{imageUploadError}</div>
              )}
              <Input
                value={formData.imageUrl}
                onChange={(e) => handleFormChange('imageUrl', e.target.value)}
                placeholder="Image URL (CDN or external)"
                className="bg-background"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formSubmitting}>
                {formSubmitting
                  ? 'Saving...'
                  : editingConverter
                    ? 'Update Converter'
                    : 'Create Converter'}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>

      {/* ================================================================== */}
      {/* Delete Confirmation Dialog                                         */}
      {/* ================================================================== */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Delete Converter</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Are you sure you want to delete{' '}
                <span className="font-medium text-foreground">{deletingConverter?.name}</span>? This
                action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ================================================================== */}
      {/* CSV Import Dialog                                                  */}
      {/* ================================================================== */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Import Converters from CSV</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a CSV file with converter data. The first row must be column headers (e.g. name,
              brand, weight, pt, pd, rh, keywords, imageUrl).
            </p>
          </div>

          {importError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {importError}
            </div>
          )}

          {importResult && (
            <div className="rounded-md border border-primary/50 bg-primary/10 p-3 text-sm text-primary">
              {importResult}
            </div>
          )}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] || null);
                setImportError(null);
                setImportResult(null);
              }}
              className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
            />
            {importFile && (
              <p className="text-xs text-muted-foreground mt-2">
                Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importSubmitting || !importFile}>
              {importSubmitting ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
