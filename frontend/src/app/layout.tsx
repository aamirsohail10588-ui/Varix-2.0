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
  title: "VARIX — Financial Governance Platform",
  description: "Enterprise financial reconciliation and governance platform",
};

import AppShell from "@/components/layout/AppShell";
import { SystemStateProvider } from "@/state/SystemStateProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SystemStateProvider>
          <AppShell>
            {children}
          </AppShell>
        </SystemStateProvider>
      </body>
    </html>
  );
}

