import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Candidate Login — Arbitration Sandbox',
  description: 'Log in to access your assigned examination.',
};

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
