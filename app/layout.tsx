import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Alola Logistics',
  description: 'Alola Logistics Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
