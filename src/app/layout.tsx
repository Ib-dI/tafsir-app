// src/app/layout.tsx

import Header from "@/components/header";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react"; // <--- AJOUTEZ CETTE LIGNE

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tafsir",
  description: "Application de tafsir audio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="fr">
      <head>
        <link rel="icon" href="/fingerprint.webp" type="image/webp" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-200`}
      >
        <div className="flex flex-col min-h-screen max-w-[900px] mx-auto bg-white text-sm font-sans">
          <Header />
          {/* ENVELOPPEZ LE CHILDREN AVEC SUSPENSE ICI */}
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-blue-600">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
              <p className="text-lg">Chargement du contenu...</p>
            </div>
          }>
            {children}
          </Suspense>
        </div>
      </body>
    </html>
  );
}