'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type ActiveMenu = 'dashboard' | 'all-folders' | 'recent-files' | 'all-files' | 'shared-folders' | 'shared-files' | 'recycle-bin' | null;

interface FolderContextType {
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  activeMenu: ActiveMenu;
  setActiveMenu: (menu: ActiveMenu) => void;
  virtualRootFolderId: string | null;
  setVirtualRootFolderId: (id: string | null) => void;
}

const FolderContext = createContext<FolderContextType | undefined>(undefined);

export function FolderProvider({ children }: { children: ReactNode }) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('dashboard');
  const [virtualRootFolderId, setVirtualRootFolderId] = useState<string | null>(null);

  return (
    <FolderContext.Provider value={{
      selectedFolderId,
      setSelectedFolderId,
      activeMenu,
      setActiveMenu,
      virtualRootFolderId,
      setVirtualRootFolderId,
    }}>
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

