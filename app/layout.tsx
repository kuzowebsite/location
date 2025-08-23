import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "Location Sharing Site",
  description: "Share your location with admin",
  generator: "v0.app",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      <head>
        <script
          async
          src="https://maps.googleapis.com/maps/api/js?key=AIzaSyB0IqCku-K4CH0KPlQVJa0b71RpFJ3tlj8&libraries=places&language=mn"
        />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
