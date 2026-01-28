import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { StoreProvider } from "@/components/StoreProvider";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Clawdbot Hub",
  description: "Command center for your AI assistant",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="font-sans bg-slate-950 text-slate-100 min-h-screen antialiased">
        <StoreProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto p-4 lg:p-8 pt-20 lg:pt-8 bg-slate-900">
              {children}
            </main>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
