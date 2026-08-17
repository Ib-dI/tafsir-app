// src/app/layout.tsx
import AppShell from "@/components/AppShell";
import Header from "@/components/header";
import LoadingSpinner from "@/components/LoadingSpinner";
import { FontSettingsProvider } from "@/context/FontSettingsContext";
import { TranslationDisplayProvider } from "@/context/TranslationDisplayContext";
import { WordByWordProvider } from "@/context/WordByWordContext";
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
        className={`${geistSans.variable} ${geistMono.variable} bg-[#FBF3E4] antialiased`}
      >
        <AppShell>
          <FontSettingsProvider>
            <WordByWordProvider>
              <TranslationDisplayProvider>
                <Header />
                {/* ENVELOPPEZ LE CHILDREN AVEC SUSPENSE ICI */}
                <Suspense
                  fallback={
                    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FBF3E4]">
                      <LoadingSpinner
                        size="xl"
                        color="gold"
                        text="Chargement du contenu..."
                        className="gap-4"
                      />
                    </div>
                  }
                >
                  {children}
                </Suspense>
              </TranslationDisplayProvider>
            </WordByWordProvider>
          </FontSettingsProvider>
          {/* AJOUTEZ CE COMPOSANT ICI */}
          {/* <NotificationsSetup /> */}
        </AppShell>
      </body>
    </html>
  );
}
