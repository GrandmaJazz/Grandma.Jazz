//layout.tsx
import { ClientBody } from "./ClientBody";
import "./globals.css";
import { suisseIntl, suisseIntlMono, ppEditorialUltralight, ppEditorialUltralightItalic } from "@/lib/fonts";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "Grandma Jazz - Café & Shop",
  description: "Vintage Jazz Cafe and Specialty Shop. Experience premium jazz music, coffee, and unique merchandise.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${suisseIntl.variable} ${suisseIntlMono.variable} ${ppEditorialUltralight.variable} ${ppEditorialUltralightItalic.variable} bg-telepathic-black text-white min-h-screen flex flex-col`}>
        <ClientBody>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          {/* 
            CartDrawer จะถูกรวมในทุกๆ หน้า
            แต่จะแสดงผลเฉพาะเมื่อ isCartOpen ใน CartContext เป็น true 
          */}
          <CartDrawer />
          <Toaster position="top-center" />
        </ClientBody>
      </body>
    </html>
  );
}