import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Syne } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/toast-provider";
import { PwaStartup } from "@/components/pwa-startup";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ClassConnect",
    template: "%s | ClassConnect",
  },
  description:
    "Integrated student performance management frontend for attendance, grades, analytics and department reporting.",
  applicationName: "ClassConnect",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ClassConnect",
  },
  icons: {
    icon: [{ url: "/pwa-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/pwa-icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#003b78" },
    { media: "(prefers-color-scheme: dark)", color: "#001f3f" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={syne.variable}>
        <PwaStartup />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
