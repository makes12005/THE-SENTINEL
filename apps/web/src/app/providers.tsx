'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

import GlobalSocketHandler from '@/components/global-socket-handler';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <GlobalSocketHandler />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#262a2f',
            color: '#e0e2e8',
            border: '1px solid #42474e',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#a3cbf2', secondary: '#003353' } },
          error:   { iconTheme: { primary: '#ffb4ab', secondary: '#690005' } },
        }}
      />
    </QueryClientProvider>
  );
}
