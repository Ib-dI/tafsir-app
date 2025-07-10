import Header from "@/components/header";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Tafsir",
  description: "Applicattion de tafsir audio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/fingerprint.webp" type="image/webp" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-200`}
      >
        <div className="flex flex-col min-h-screen max-w-[900px] mx-auto bg-white text-sm font-sans">
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}
