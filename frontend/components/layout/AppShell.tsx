"use client";

import React from "react";

export interface AppShellProps {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  slideOver?: React.ReactNode;
  isSlideOverOpen?: boolean;
}

export function AppShell({
  sidebar,
  header,
  children,
  slideOver,
  isSlideOverOpen,
}: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-100 dark:bg-neutral-950 font-sans antialiased">
      {sidebar}
      <div className="flex flex-1 flex-col overflow-hidden">
        {header}
        <main className="relative flex flex-1 overflow-hidden">{children}</main>
      </div>
      {isSlideOverOpen && slideOver}
    </div>
  );
}
