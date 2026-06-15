'use client';

import { Clock } from 'lucide-react';

export function InactiveBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 shrink-0"
      title="File tidak dibuka lebih dari 5 tahun"
    >
      <Clock className="h-2.5 w-2.5" />
      5 Thn Tidak Dibuka
    </span>
  );
}
