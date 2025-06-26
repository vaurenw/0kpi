import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <Image src="/logo.png" alt="Logo" width={64} height={64} className="mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-3">404</h1>
        <h2 className="text-lg font-semibold text-foreground mb-3">Page Not Found</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
        </p>
        <div className="space-x-3">
          <Link href="/">
            <Button size="sm">Go Home</Button>
          </Link>
          <Link href="/create-goal">
            <Button variant="outline" size="sm">
              Create Goal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
