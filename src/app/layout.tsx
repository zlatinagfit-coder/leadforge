import type { Metadata } from "next";
import { Manrope, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const serif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic", "normal"],
});

export const metadata: Metadata = {
  title: "LeadForge — AI Lead Generation",
  description: "AI агентът намира клиенти за теб всяка сутрин. White-label платформа за маркетинг агенции. Forged at scale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bg"
      className={`${manrope.variable} ${mono.variable} ${serif.variable} antialiased`}
    >
      <body className="bg-bg text-ink min-h-screen" style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
