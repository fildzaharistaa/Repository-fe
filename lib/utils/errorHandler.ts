export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    // Check if it's a network error
    if (error.message.includes('fetch') || error.message.includes('Network')) {
      return 'Network error. Please check your connection.';
    }
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const apiError = error as { message?: string | string[] };
    if (apiError.message) {
      if (Array.isArray(apiError.message)) {
        return apiError.message.join(', ');
      }
      return apiError.message;
    }
  }

  return 'An unexpected error occurred';
}

/**
 * Converts a download error into a user-friendly Indonesian message.
 * Detects 403 "download permission" errors and returns an informative message
 * instead of the raw API error string.
 */
export function getDownloadErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes('download permission') ||
    lower.includes('forbidden') ||
    lower.includes('403')
  ) {
    return 'Pemilik folder belum memberikan izin download untuk file ini.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Koneksi gagal. Periksa jaringan Anda dan coba lagi.';
  }
  return msg || 'Gagal mengunduh file.';
}


