'use client';

import { 
  Image as ImageIcon, 
  Video, 
  Music, 
  FileText, 
  FileSpreadsheet,
  Archive,
  Paperclip
} from 'lucide-react';
import { getFileTypeInfo } from '@/lib/utils/formatters';

interface FileIconProps {
  mimeType: string;
  className?: string;
}

export function FileIcon({ mimeType, className }: FileIconProps) {
  const mimeTypeLower = mimeType.toLowerCase();
  const fileInfo = getFileTypeInfo(mimeTypeLower);
  
  // Use the provided className or fallback to default size, then append the color
  const baseClass = className || 'h-5 w-5';
  const computedClassName = `${baseClass} ${fileInfo.iconColor}`;
  
  if (mimeTypeLower.startsWith('image/')) return <ImageIcon className={computedClassName} />;
  if (mimeTypeLower.startsWith('video/')) return <Video className={computedClassName} />;
  if (mimeTypeLower.startsWith('audio/')) return <Music className={computedClassName} />;
  if (mimeTypeLower.includes('pdf')) return <FileText className={computedClassName} />;
  if (mimeTypeLower.includes('word') || mimeTypeLower.includes('document')) return <FileText className={computedClassName} />;
  if (mimeTypeLower.includes('excel') || mimeTypeLower.includes('spreadsheet')) return <FileSpreadsheet className={computedClassName} />;
  if (mimeTypeLower.includes('zip') || mimeTypeLower.includes('archive')) return <Archive className={computedClassName} />;
  return <Paperclip className={computedClassName} />;
}

