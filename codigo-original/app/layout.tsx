import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnakeOMG — Arena",
  description: "Come, resuelve y escapa. Entra con tu cuenta de SnakeOMG.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
