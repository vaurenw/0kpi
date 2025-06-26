"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
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

  const handleLogout = async () => {
    await signOut()
  }

  const navigation = [
    { name: "Feed", href: "/", icon: Home },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ]

  if (!isLoaded) {
    return (
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-2">
              <Image src="/logo.png" alt="Logo" width={24} height={24} className="w-6 h-6" />
              <span className="text-lg font-semibold text-foreground">Pledge Goals</span>
            </div>
            <div className="animate-pulse bg-muted h-4 w-24 rounded"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/logo.png" alt="Logo" width={24} height={24} className="w-6 h-6" />
            <span className="text-lg font-semibold text-foreground">Pledge Goals</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn("flex items-center space-x-1.5 h-8 text-sm", isActive && "bg-muted")}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn("h-8 w-8 p-0", isActive && "bg-muted")}
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center space-x-2">
            {user && (
              <>
                <UserButton afterSignOutUrl="/" />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
