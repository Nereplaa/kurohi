import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "KUROHI — Anime İzleme Platformu",
  description: "Anime keşfet, izle ve takip et.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-abyss text-[#F0F0F5]">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8 min-h-[calc(100vh-4rem)]">{children}</main>
        <Footer />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{ style: { background: "#1A1A2E", border: "1px solid #2A2A42", color: "#F0F0F5" } }}
        />
      </body>
    </html>
  );
}
