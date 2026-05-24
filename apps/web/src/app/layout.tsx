import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Arbitration Sandbox — Examination Platform',
  description:
    'A secure MCQ examination simulation platform for arbitration assessments. Timed exams with randomized questions, anti-cheat monitoring, and instant results.',
  keywords: ['arbitration', 'exam', 'MCQ', 'assessment', 'simulation'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      {/* suppressHydrationWarning prevents false positives from browser extensions
          that inject attributes (e.g. data-my-extension) into <body> before React hydrates */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
