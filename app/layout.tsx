import type {Metadata} from 'next';
import { Manrope } from 'next/font/google';
import './globals.css'; // Global styles

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'AutoBlog AI - Tech Support for Laypeople',
  description: 'Manage automated blog posts',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${manrope.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-50 text-slate-900 font-sans min-h-screen flex" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
