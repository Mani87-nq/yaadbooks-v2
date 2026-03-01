import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import { ThemeProvider } from 'next-themes';
// import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
// import { PostHogProvider } from "@/components/PostHogProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "YaadBooks — Jamaica's Complete Business Management Solution",
  description: "Invoicing, POS, inventory, payroll, GCT filing, and more — all in one place. Built for Jamaican businesses.",
  keywords: ["accounting software", "Jamaica", "invoicing", "POS", "payroll", "GCT", "business management", "YaadBooks", "Jamaican accounting"],
  authors: [{ name: "YaadBooks" }],
  creator: "YaadBooks",
  publisher: "YaadBooks",
  manifest: "/manifest.json",
  metadataBase: new URL("https://yaadbooks.com"),
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YaadBooks",
  },
  openGraph: {
    title: "YaadBooks — Jamaica's Complete Business Management Solution",
    description: "Invoicing, POS, inventory, payroll, GCT filing, and more — all in one place. Built for Jamaican businesses.",
    type: "website",
    locale: "en_JM",
    siteName: "YaadBooks",
    url: "https://yaadbooks.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "YaadBooks — Jamaica's Complete Business Management Solution",
    description: "Invoicing, POS, inventory, payroll, GCT filing, and more — all in one place. Built for Jamaican businesses.",
    creator: "@yaadbooks",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://yaadbooks.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
