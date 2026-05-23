import type { Metadata } from 'next';
import '@/styles/globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
