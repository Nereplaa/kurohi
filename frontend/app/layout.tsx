import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { I18nProvider } from "@/components/I18nProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "KUROHI — Anime İzleme Platformu",
  description: "Anime keşfet, izle ve takip et.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-abyss text-fg">
        <ThemeProvider />
        <I18nProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 py-8 min-h-[calc(100vh-4rem)]">{children}</main>
          <Footer />
        </I18nProvider>
        <Toaster
          theme="system"
          position="bottom-right"
        />
      </body>
    </html>
  );
}
