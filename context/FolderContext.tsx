'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FolderContextType {
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  activeMenu: 'dashboard' | 'all-folders' | 'recent-files' | 'shared-folders' | 'shared-files' | 'recycle-bin' | null;
  setActiveMenu: (menu: 'dashboard' | 'all-folders' | 'recent-files' | 'shared-folders' | 'shared-files' | 'recycle-bin' | null) => void;
}

const FolderContext = createContext<FolderContextType | undefined>(undefined);

export function FolderProvider({ children }: { children: ReactNode }) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'all-folders' | 'recent-files' | 'shared-folders' | 'shared-files' | 'recycle-bin' | null>('dashboard');

  return (
    <FolderContext.Provider value={{ selectedFolderId, setSelectedFolderId, activeMenu, setActiveMenu }}>
      {children}
    </FolderContext.Provider>
  );
}

export function useFolderContext() {
  const context = useContext(FolderContext);
  if (context === undefined) {
    throw new Error('useFolderContext must be used within a FolderProvider');
  }
  return context;
}

