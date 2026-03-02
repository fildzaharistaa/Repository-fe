'use client';

import { Bell } from 'lucide-react';
import { useState } from 'react';

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-black relative rounded-full p-2 hover:bg-gray-100"
      >
        <Bell size={20} />

        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
          2
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border bg-white shadow-lg">
          <div className="text-black p-3 text-sm font-semibold">
            Notifications
          </div>

          <div className="border-t">
            <div className="text-black cursor-pointer p-3 hover:bg-gray-50">
              User requested folder access
            </div>

            <div className="text-black cursor-pointer p-3 hover:bg-gray-50">
              New file uploaded
            </div>
          </div>
        </div>
      )}
    </div>
  );
}