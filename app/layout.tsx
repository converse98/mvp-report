import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/providers";
import { ToasterClient } from "./ToasterClient"; // 👈 importa el cliente

export const metadata: Metadata = {
  title: "Mi MVP",
  description: "Aplicación construida con Next.js 13+",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-white text-gray-900">
        <Providers>{children}</Providers>
        <ToasterClient /> {/* 👈 renderiza el Toaster en cliente */}
      </body>
    </html>
  );
}
