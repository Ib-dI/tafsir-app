// src/app/layout.tsx
import AppShell from "@/components/AppShell";
import Header from "@/components/header";
import LoadingSpinner from "@/components/LoadingSpinner";
import { FontSettingsProvider } from "@/context/FontSettingsContext";
import { TranslationDisplayProvider } from "@/context/TranslationDisplayContext";
import { WordByWordProvider } from "@/context/WordByWordContext";
import { SITE_URL } from "@/lib/site";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tafsir du Coran en Shi-Maoré | Tafsir",
    template: "%s | Tafsir",
  },
  description:
    "Étudiez le tafsir du Coran verset par verset, avec l'audio en Shi-Maoré synchronisé au texte coranique.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Tafsir",
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Tafsir",
              url: SITE_URL,
              description:
                "Étudiez le tafsir du Coran verset par verset, avec l'audio en Shi-Maoré synchronisé au texte coranique.",
              inLanguage: "fr",
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#FBF3E4] antialiased`}
      >
        <AppShell header={<Header />}>
          <FontSettingsProvider>
            <WordByWordProvider>
              <TranslationDisplayProvider>
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
        </AppShell>
      </body>
    </html>
  );
}
