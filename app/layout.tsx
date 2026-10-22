import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'NoteFlow — A little space for your thoughts',
  description:
    'Capture your ideas, find your focus. A thoughtful workspace for notes, with tags, search, archives, and themes.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
