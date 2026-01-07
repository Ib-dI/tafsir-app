// src/app/layout.tsx
import Header from "@/components/header";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
// import NotificationsSetup from "@/components/NotificationsSetup"; // Ajoutez cette ligne

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
        {/* Précharge uniquement la police critique Uthmanic (woff2, la plus légère) */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/UthmanicHafs1Ver18.woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-zinc-200 antialiased`}
      >
        <div className="mx-auto flex min-h-screen max-w-[900px] flex-col bg-white font-sans text-sm">
          <Header />
          {/* ENVELOPPEZ LE CHILDREN AVEC SUSPENSE ICI */}
          <Suspense
            fallback={
              <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
                <LoadingSpinner
                  size="xl"
                  color="blue"
                  text="Chargement du contenu..."
                  className="gap-4"
                />
              </div>
            }
          >
            {children}
          </Suspense>
          {/* AJOUTEZ CE COMPOSANT ICI */}
          {/* <NotificationsSetup /> */}
        </div>
      </body>
    </html>
  );
}