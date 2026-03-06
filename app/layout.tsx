import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "R Industries Music Line",
  description: "Private High-Fidelity Streaming Engine",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased bg-black text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}