'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  AlertCircle, 
  Loader2, 
  Download,
  Info
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { File as FileEntity } from '@/types';

interface FilePreviewProps {
  file: FileEntity;
}

export function FilePreview({ file }: FilePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<{
    type: 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'docx' | 'xlsx' | 'unsupported';
    url?: string;
    text?: string;
    html?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadPreview = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const mimeType = file.mime_type.toLowerCase();
        
        // 1. PDF - use iframe with preview URL
        if (mimeType.includes('pdf')) {
          let url = apiClient.getPreviewUrl(file.id);
          // Hide toolbar (download/print) if user doesn't have download permission
          if (file.can_download === false) {
            url += '#toolbar=0&navpanes=0';
          }
          setPreviewContent({ type: 'pdf', url });
          setLoading(false);
          return;
        }

        // 2. Images
        if (mimeType.startsWith('image/')) {
          const blob = await apiClient.previewFile(file.id);
          if (isMounted) {
            setPreviewContent({ type: 'image', url: URL.createObjectURL(blob) });
            setLoading(false);
          }
          return;
        }

        // 3. Video
        if (mimeType.startsWith('video/')) {
          // Native browser support check for common formats
          const isSupported = mimeType.includes('mp4') || mimeType.includes('webm') || mimeType.includes('ogg');
          if (isSupported) {
            setPreviewContent({ type: 'video', url: apiClient.getPreviewUrl(file.id) });
            setLoading(false);
          } else {
            setPreviewContent({ type: 'unsupported' });
            setLoading(false);
          }
          return;
        }

        // 4. Audio
        if (mimeType.startsWith('audio/')) {
          const isSupported = mimeType.includes('mpeg') || mimeType.includes('wav') || mimeType.includes('ogg') || mimeType.includes('mp3');
          if (isSupported) {
            setPreviewContent({ type: 'audio', url: apiClient.getPreviewUrl(file.id) });
            setLoading(false);
          } else {
            setPreviewContent({ type: 'unsupported' });
            setLoading(false);
          }
          return;
        }

        // 4. DOCX (Word)
        if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
          try {
            const blob = await apiClient.previewFile(file.id);
            const arrayBuffer = await blob.arrayBuffer();
            const mammoth = await import('mammoth');
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (isMounted) {
              setPreviewContent({ type: 'docx', html: result.value });
              setLoading(false);
            }
          } catch (err) {
            console.error('DOCX conversion error:', err);
            setPreviewContent({ type: 'unsupported' });
            setLoading(false);
          }
          return;
        }

        // 5. XLSX (Excel)
        if (mimeType.includes('spreadsheetml') || mimeType.includes('excel')) {
          try {
            const blob = await apiClient.previewFile(file.id);
            const arrayBuffer = await blob.arrayBuffer();
            const XLSX = await import('xlsx');
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const html = XLSX.utils.sheet_to_html(worksheet);
            if (isMounted) {
              setPreviewContent({ type: 'xlsx', html });
              setLoading(false);
            }
          } catch (err) {
            console.error('XLSX conversion error:', err);
            setPreviewContent({ type: 'unsupported' });
            setLoading(false);
          }
          return;
        }

        // 6. PPTX (PowerPoint)
        if (mimeType.includes('presentationml') || mimeType.includes('powerpoint')) {
          setPreviewContent({ type: 'unsupported' });
          setLoading(false);
          return;
        }

        // 7. Text files
        if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('xml')) {
          const blob = await apiClient.previewFile(file.id);
          const text = await blob.text();
          if (isMounted) {
            setPreviewContent({ type: 'text', text });
            setLoading(false);
          }
          return;
        }

        // Fallback for unsupported types
        setPreviewContent({ type: 'unsupported' });
        setLoading(false);

      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Gagal memuat preview file');
          setLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      isMounted = false;
      if (previewContent?.url && previewContent.type === 'image') {
        URL.revokeObjectURL(previewContent.url);
      }
    };
  }, [file.id, file.mime_type]);

  const handleDownload = async () => {
    try {
      const blob = await apiClient.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Gagal mengunduh file');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg bg-gray-50 border border-gray-100">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">Mempersiapkan preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg bg-red-50 border border-red-100 p-6 text-center">
        <AlertCircle className="mb-3 h-12 w-12 text-red-500" />
        <h4 className="text-lg font-bold text-red-900">Gagal Memuat Preview</h4>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!previewContent || previewContent.type === 'unsupported') {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-white border border-gray-200 p-12 text-center shadow-xs">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
          <Info className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Preview Tidak Tersedia</h3>
        <p className="mt-2 max-w-xs text-sm text-gray-500 leading-relaxed">
          Maaf, format file <strong>{file.mime_type}</strong> belum didukung untuk preview langsung di browser.
        </p>
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 hover:shadow-lg transition-all"
          >
            <Download className="h-4 w-4" />
            Unduh File Sekarang
          </button>
          <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 flex items-start gap-2 text-left">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Anda tetap dapat mengunduh file ini untuk membukanya di aplikasi desktop Anda.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="max-h-[70vh] min-h-[400px] overflow-auto p-2">
        {previewContent.type === 'image' && (
          <div className="flex items-center justify-center p-4">
            <img 
              src={previewContent.url} 
              alt={file.name} 
              className="max-h-full max-w-full rounded-lg shadow-xs"
            />
          </div>
        )}

        {previewContent.type === 'pdf' && (
          <iframe
            src={previewContent.url}
            className="h-[70vh] w-full rounded-lg border-0"
            title={file.name}
          />
        )}

        {previewContent.type === 'video' && (
          <div className="flex items-center justify-center bg-black rounded-lg overflow-hidden">
            <video 
              src={previewContent.url} 
              controls 
              className="max-h-[70vh] w-full"
              autoPlay={true}
            />
          </div>
        )}

        {previewContent.type === 'audio' && (
          <div className="flex h-64 items-center justify-center bg-gray-50 p-8 rounded-lg">
            <div className="w-full max-w-md text-center">
              <div className="mb-6 mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Music className="h-10 w-10" />
              </div>
              <h4 className="mb-4 font-semibold text-gray-900">{file.name}</h4>
              <audio 
                src={previewContent.url} 
                controls 
                className="w-full"
              />
            </div>
          </div>
        )}

        {previewContent.type === 'text' && (
          <div className="rounded-lg bg-gray-50 p-6">
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
              {previewContent.text}
            </pre>
          </div>
        )}

        {previewContent.type === 'docx' && (
          <div className="bg-white p-8 md:p-12">
            <div 
              className="prose prose-sm md:prose-base max-w-none text-gray-800 word-preview-content"
              dangerouslySetInnerHTML={{ __html: previewContent.html || '' }} 
            />
            <style jsx global>{`
              .word-preview-content table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
              .word-preview-content th, .word-preview-content td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; }
              .word-preview-content th { background-color: #f9fafb; }
            `}</style>
          </div>
        )}

        {previewContent.type === 'xlsx' && (
          <div className="bg-white p-4 overflow-auto">
            <div 
              className="excel-preview-content"
              dangerouslySetInnerHTML={{ __html: previewContent.html || '' }} 
            />
            <style jsx global>{`
              .excel-preview-content table { border-collapse: collapse; width: 100%; font-size: 0.875rem; }
              .excel-preview-content th, .excel-preview-content td { border: 1px solid #e5e7eb; padding: 0.4rem 0.6rem; min-width: 80px; }
              .excel-preview-content tr:nth-child(even) { background-color: #f9fafb; }
              .excel-preview-content th { background-color: #f3f4f6; font-weight: 600; text-align: center; }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
