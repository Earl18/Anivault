import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SiteFooter } from "@/components/site-footer";
import { getFooterBackgroundImageFromDb } from "@/lib/anime-store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Home | AniVault",
  description: "AniVault is your anime streaming destination with a bold neon-purple look and a curated watch experience.",
  icons: {
    icon: "/anivault-logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const footerBackgroundImage = await getFooterBackgroundImageFromDb();

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
        style={{ background: "#050505" }}
      >
        <main className="flex-1">
          {children}
        </main>
        <SiteFooter backgroundImage={footerBackgroundImage} />
        <Toaster />
      </body>
    </html>
  );
}
