import type React from "react"
import "./globals.css"
import type { Metadata, Viewport } from "next"

const title = 'HUD for Viture'
const prefix = (process.env.GITHUB_PAGES === 'true' ? '/viture-hud' : '') + '/'

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
}

export const metadata: Metadata = {
  title,
  description: "A heads-up display interface for daily information",
  applicationName: title,
  manifest: prefix + "manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title,
  },
  icons: {
    icon: [
      { url: prefix + "64x64.png", sizes: "64x64", type: "image/png" },
      { url: prefix + "128x128.png", sizes: "128x128", type: "image/png" },
      { url: prefix + "192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: prefix + "192x192.png", sizes: "192x192", type: "image/png" }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  )
}
