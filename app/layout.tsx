import type { Metadata } from "next";
import "./globals.css";
import { RouteTransition } from "@/components/ui/route-transition";

export const metadata: Metadata = {
  title: "My Website",
  description: "A Next.js website with an animated loading experience.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <RouteTransition>{children}</RouteTransition>
      </body>
    </html>
  );
}
