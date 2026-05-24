import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin — Arbitration Sandbox',
  description: 'Administrator portal for the Arbitration Sandbox examination platform.',
};

/**
 * Route-group layout for all admin pages.
 * Each page handles its own shell (AdminNav + main content) directly,
 * so this layout stays minimal — no nav injected here to avoid
 * wrapping the /admin/login page with chrome.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
