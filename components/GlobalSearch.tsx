'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

type Item = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parent: string;
  uploadedBy: string;
};

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  // DUMMY DATA
  const items: Item[] = [
    { id: '1', name: 'Skripsi 2026', type: 'folder', parent:'Repository', uploadedBy: 'adminWD1@example.com' },
    { id: '2', name: 'Skripsi 2027', type: 'file', parent:'Repository', uploadedBy: 'adminWD2@example.com' },
    { id: '3', name: 'Proposal.docx', type: 'file', parent:'Repository', uploadedBy: 'adminWD1@example.com' },
    { id: '4', name: 'Laporan Akhir', type: 'folder', parent:'Repository', uploadedBy: 'adminWD2@example.com' },
    { id: '5', name: 'Data Penelitian.xlsx', type: 'file', parent:'Repository', uploadedBy: 'admin@example.com' },
    { id: '6', name: 'Presentasi Final.pptx', type: 'file', parent:'Repository', uploadedBy: 'admin@example.com' },
    { id: '7', name: 'Kumpulan Skripsi', type: 'folder', parent:'Repository', uploadedBy: 'admin@example.com' },
    { id: '8', name: 'Kumpulan Tugas', type: 'folder', parent:'Repository', uploadedBy: 'admin@example.com' },
  ];

  const results = useMemo(() => {
    if (!query) return items;

    const pattern = query
    .toLowerCase()
    .split('')
    .join('.*');

    const regex = new RegExp(pattern);

    return items.filter(item =>
        regex.test(item.name.toLowerCase())
    );
}, [query]);

  return (
    <div className="relative w-80">
      {/* Input */}
      <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm">
        <Search size={25} className="text-black" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder="Cari file atau folder..."
          className="w-full text-sm outline-none text-black"
        />
      </div>

      {/* Dropdown Result */}
      {open && query && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border bg-white shadow-lg">
          {results.length === 0 && (
            <div className="p-3 text-sm text-gray-500">
              Tidak ada hasil yang ditemukan
            </div>
          )}

          {results.map((item) => (
            <div
                key={item.id}
                className="text-black cursor-pointer p-3 hover:bg-gray-50">
                <div className="text-sm font-medium">
                {item.name}
                </div>

                <div className="text-black text-sm text-gray-500">
                {item.type} • Parent: {item.parent}
                </div>

                <div className="text-black text-sm text-gray-400">
                Uploaded by: {item.uploadedBy}
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
}