import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GigsProvider } from "@/context/GigsContext";
import { SenderInfoProvider } from "@/context/SenderInfoContext";
import { AnalyticsProvider } from "@/context/AnalyticsContext";
import { Toaster } from "@/components/ui/toaster";
import { ClientsProvider } from "@/context/ClientsContext";
import { InvoicesProvider } from "@/context/InvoicesContext";
import { ClientDocumentsProvider } from "@/context/ClientDocumentsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GigÉire - Skip the spreadsheets. Skip the headaches.",
  description:
    "The app that makes freelance admin disappear. Designed for Irish creatives who'd rather shoot, mix or edit than chase invoices.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          defer
          data-domain="gigeire.com"
          src="https://plausible.io/js/script.js"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SenderInfoProvider>
          <ClientsProvider>
            <InvoicesProvider>
              <ClientDocumentsProvider>
                <GigsProvider>
                  <AnalyticsProvider>
                    {children}
                    <Toaster />
                  </AnalyticsProvider>
                </GigsProvider>
              </ClientDocumentsProvider>
            </InvoicesProvider>
          </ClientsProvider>
        </SenderInfoProvider>
      </body>
    </html>
  );
}
