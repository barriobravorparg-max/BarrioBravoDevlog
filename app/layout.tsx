import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barrio Bravo RP",
  description: "Devlog y actualizaciones de Barrio Bravo RP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
