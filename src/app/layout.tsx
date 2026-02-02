import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import SWRProvider from "@/providers/swr-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OSN SD Kec. Rajagaluh",
  description: "Computer Based Test (CBT) untuk Olimpiade Sains Nasional Sekolah Dasar (OSN SD). Platform modern, responsif, dan mudah digunakan.",
  openGraph: {
    title: "OSN SD Kec. Rajagaluh",
    description: "Computer Based Test (CBT) untuk Olimpiade Sains Nasional Sekolah Dasar (OSN SD). Platform modern, responsif, dan mudah digunakan.",
    url: 'https://osnrajagaluh.vercel.app/',
    siteName: 'OSN SD Kec. Rajagaluh',
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'CBT OSN SD Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/opengraph-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-slate-50 text-slate-900`}
      >
        <SWRProvider>
          {children}
          <Toaster position="top-center" richColors />
        </SWRProvider>
      </body>
    </html>
  );
}

