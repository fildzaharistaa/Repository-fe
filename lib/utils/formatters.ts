export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
   const formattedDate = date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${formattedDate}\n${formattedTime}`;
}

export function getFileTypeInfo(mimeType: string) {
  const mimeLower = (mimeType || '').toLowerCase();
  
  if (mimeLower.includes('pdf')) {
    return { label: 'PDF', iconColor: 'text-red-500', badgeClass: 'bg-red-100 text-red-800' };
  }
  if (mimeLower.includes('wordprocessingml') || mimeLower.includes('msword') || mimeLower.includes('document')) {
    return { label: 'DOC', iconColor: 'text-blue-500', badgeClass: 'bg-blue-100 text-blue-800' };
  }
  if (mimeLower.includes('spreadsheetml') || mimeLower.includes('excel')) {
    return { label: 'XLS', iconColor: 'text-green-500', badgeClass: 'bg-green-100 text-green-800' };
  }
  if (mimeLower.includes('presentationml') || mimeLower.includes('powerpoint')) {
    return { label: 'PPT', iconColor: 'text-orange-500', badgeClass: 'bg-orange-100 text-orange-800' };
  }
  if (mimeLower.startsWith('image/')) {
    const ext = mimeLower.split('/')[1]?.toUpperCase() || 'IMG';
    // Remove "+xml" or similar extensions if present
    const cleanExt = ext.split('+')[0];
    return { label: cleanExt, iconColor: 'text-yellow-500', badgeClass: 'bg-yellow-100 text-yellow-800' };
  }
  if (mimeLower.startsWith('video/')) {
    return { label: 'VIDEO', iconColor: 'text-purple-500', badgeClass: 'bg-purple-100 text-purple-800' };
  }
  if (mimeLower.startsWith('audio/')) {
    return { label: 'AUDIO', iconColor: 'text-pink-500', badgeClass: 'bg-pink-100 text-pink-800' };
  }
  if (mimeLower.includes('zip') || mimeLower.includes('rar') || mimeLower.includes('tar') || mimeLower.includes('archive')) {
    return { label: 'ARCHIVE', iconColor: 'text-gray-600', badgeClass: 'bg-gray-200 text-gray-800' };
  }
  if (mimeLower.includes('text/plain')) {
    return { label: 'TXT', iconColor: 'text-gray-500', badgeClass: 'bg-gray-100 text-gray-800' };
  }
  
  return { label: 'FILE', iconColor: 'text-gray-500', badgeClass: 'bg-gray-100 text-gray-800' };
}

const FIVE_YEARS_MS = 5 * 365.25 * 24 * 60 * 60 * 1000;

export function isFileInactive(file: { created_at: string; last_accessed_at?: string | null }): boolean {
  const ref = file.last_accessed_at
    ? new Date(file.last_accessed_at).getTime()
    : new Date(file.created_at).getTime();
  return Date.now() - ref > FIVE_YEARS_MS;
}

// Keep old function for backward compatibility (returns string for non-React usage)
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
  return '📎';
}
