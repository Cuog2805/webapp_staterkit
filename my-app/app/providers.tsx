"use client";

// Gom các client provider dùng toàn app:
// - ThemeProvider (next-themes): bật/tắt dark mode bằng class `.dark`
// - QueryClientProvider (react-query): cache & quản lý state dữ liệu từ services

import { useState, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: ReactNode }) {
  // QueryClient tạo 1 lần cho mỗi lần mount (không chia sẻ giữa request trên server).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
