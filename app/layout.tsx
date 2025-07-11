import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { Providers } from "@/components/providers"
import ErrorBoundary from "@/components/error-boundary"
import "./globals.css"

// Validate environment variables on startup
import "@/lib/env"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "gambling on kpis",
  description: "gambling on kpis",
  generator: '0kpi.com'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.0kpi.com/" />
        <meta property="og:title" content="gambling on kpis" />
        <meta property="og:description" content="gambling on kpis" />
        <meta property="og:image" content="/social-preview.png" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://www.0kpi.com/" />
        <meta name="twitter:title" content="gambling on kpis" />
        <meta name="twitter:description" content="gambling on kpis" />
        <meta name="twitter:image" content="/social-preview.png" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
        <ClerkProvider>
          <Providers>
            {children}
          </Providers>
        </ClerkProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
