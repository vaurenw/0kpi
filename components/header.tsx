"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Home, LayoutDashboard, LogOut } from "lucide-react"
import { useUser, useAuth } from "@clerk/nextjs"
import { UserButton } from "@clerk/nextjs"

export function Header() {
  const pathname = usePathname()
  const { user, isLoaded } = useUser()
  const { signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
  }

  if (!isLoaded) {
    return (
      <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-14">
            <div className="animate-pulse bg-muted h-4 w-24 rounded"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-1 pb-1">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center h-12 sm:h-14 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
            <Link href="/" className="text-xs sm:text-sm font-bold select-none hover:underline focus:outline-none" aria-label="Home">
              ʘ
            </Link>
          </div>
          <div className="flex-1 flex justify-center">
            <nav className="flex flex-row items-center gap-3 sm:gap-6">
              <Link href="/" className="text-xs sm:text-sm font-medium hover:underline">Home</Link>
              <button
                className="text-xs sm:text-sm font-medium hover:underline bg-transparent border-0 p-0 m-0 cursor-pointer"
                onClick={() => {
                  if (!user) router.push("/sign-up")
                  else router.push("/dashboard")
                }}
              >
                Dashboard
              </button>
              <button
                className="text-xs sm:text-sm font-medium hover:underline bg-transparent border-0 p-0 m-0 cursor-pointer"
                onClick={() => {
                  if (!user) router.push("/sign-up")
                  else router.push("/create-goal")
                }}
              >
                Create
              </button>
            </nav>
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            {user && <UserButton afterSignOutUrl="/" />}
          </div>
        </div>
      </div>
    </header>
  )
}
