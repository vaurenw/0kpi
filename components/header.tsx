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
import { ExpandableTabs } from "@/components/ui/expandable-tabs"

export function Header() {
  const pathname = usePathname()
  const { user, isLoaded } = useUser()
  const { signOut } = useAuth()
  const router = useRouter()

  const tabs = [
    { title: "Feed", icon: Home },
    { title: "Dashboard", icon: LayoutDashboard },
  ]

  const handleTabChange = (index: number | null) => {
    if (index === 0) router.push("/")
    if (index === 1) router.push("/dashboard")
  }

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
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
            <Image src="/logo.png" alt="Logo" width={40} height={40} className="w-10 h-10" />
          </div>
          <div className="flex-1 flex justify-center">
            <ExpandableTabs
              tabs={tabs}
              className="mx-4"
              onChange={handleTabChange}
              activeColor="text-primary"
            />
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            {user && <UserButton afterSignOutUrl="/" />}
          </div>
        </div>
      </div>
    </header>
  )
}
