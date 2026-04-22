import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title:       'THE SENTINEL — Real-Time Bus Alert System, Gujarat',
  description: 'Never miss your bus again. THE SENTINEL sends real-time WhatsApp & SMS alerts when your bus is 2km away. For passengers, operators, and fleet managers across Gujarat.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google Fonts — must be in <head> to avoid CSS @import rule ordering issues */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
        />
        {/* Material Symbols icon font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="bg-[#101418] text-[#e0e2e8] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
