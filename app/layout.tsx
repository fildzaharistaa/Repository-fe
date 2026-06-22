import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { FolderProvider } from "@/context/FolderContext";
import { Layout } from "@/components/Layout";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistem Repository Kampus FIK UPNVJ",
  description: "Sistem Repository Kampus FIK UPNVJ",
};

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
        <AuthProvider>
          <FolderProvider>
            <Layout>{children}</Layout>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  borderRadius: "12px",
                  padding: "12px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  maxWidth: "400px",
                },
                success: {
                  iconTheme: { primary: "#16a34a", secondary: "#f0fdf4" },
                  style: {
                    background: "#f0fdf4",
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                  },
                },
                error: {
                  iconTheme: { primary: "#dc2626", secondary: "#fef2f2" },
                  style: {
                    background: "#fef2f2",
                    color: "#991b1b",
                    border: "1px solid #fecaca",
                  },
                },
              }}
            />
          </FolderProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
