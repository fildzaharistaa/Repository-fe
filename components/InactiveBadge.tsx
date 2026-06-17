'use client';

import { Flag } from 'lucide-react';

export function InactiveBadge() {
  return (
    <div
      className="absolute top-1 right-1"
      title="File tidak dibuka lebih dari 5 tahun"
    >
      <Flag className="h-3.5 w-3.5 text-red-500 fill-red-500" />
    </div>
  );
}
