import type { Metadata, Viewport } from "next";
import { Inter, Archivo_Black } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const display = Archivo_Black({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Woop — Recovery, Strain & Sleep",
  description: "Personal recovery, strain and sleep tracker. Whoop-style insights without the wearable.",
  applicationName: "Woop",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Woop",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${display.variable} h-full`}
    >
      <body className="min-h-full bg-bg text-fg antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
