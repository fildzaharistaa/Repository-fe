import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { FolderProvider } from "@/context/FolderContext";
import { Layout } from "@/components/Layout";
import { Chatbot } from "@/components/Chatbot";
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
  title: "Campus Repository System",
  description: "Campus Repository System - File Management",
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
            <Chatbot />
            <Toaster position="top-right" />
          </FolderProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
