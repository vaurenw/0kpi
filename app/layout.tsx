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
