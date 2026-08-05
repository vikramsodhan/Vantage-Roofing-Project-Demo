import "./globals.css"

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Vantage Roofing",
  description: "Vantage Roofing job tracking app",
  // This deployment is a public portfolio demo holding fabricated data under a
  // real company's name, so it must stay out of search results. Inherited by
  // every route, since none override `robots`. See app/robots.ts for why the
  // accompanying robots.txt deliberately allows crawling.
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
