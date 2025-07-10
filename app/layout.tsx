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
  title: "Pledge Goals - Commit to Your Goals",
  description:
    "A goal-oriented pledge system that helps you stay accountable to your commitments through financial incentives.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
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
