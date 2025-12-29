"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  LogOut, 
  User,
  Menu,
  X,
  Settings,
  ChevronRight
} from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"
import { cn } from "@/lib/utils"

export default function BusinessOwnerLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Check if current page is login or register
  const isAuthPage = pathname === "/business-owner/login" || pathname === "/business-owner/register"

  useEffect(() => {
    // Skip auth check for login/register pages
    if (isAuthPage) return

    const current = localStorage.getItem("currentEmployee")
    if (current) {
      const emp = JSON.parse(current)
      setCurrentUser(emp)
    }
  }, [pathname, isAuthPage])

  // If it's a login/register page, render without sidebar
  if (isAuthPage) {
    return <>{children}</>
  }

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("firebaseToken")
      localStorage.removeItem("currentEmployee")
      localStorage.removeItem("employeeLoggedIn")
      safeRedirect(router, "role-selection")
    }
  }

  const navLinks = [
    {
      href: "/business-owner/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/business-owner/employees",
      label: "Employees",
      icon: Users,
    },
    {
      href: "/business-owner/attendance",
      label: "Attendance",
      icon: Calendar,
    },
    {
      href: "/business-owner/leave-requests",
      label: "Leave Requests",
      icon: FileText,
    },
  ]

  const isActive = (href) => pathname === href

  const getInitials = (name) => {
    if (!name) return "BO"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-300 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo Section */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Business Portal</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navLinks.map((link) => {
            const Icon = link.icon
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
              >
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{link.label}</span>
                  {active && <ChevronRight className="ml-auto h-4 w-4" />}
                </div>
              </Link>
            )
          })}

          <Separator className="my-4" />

          {/* Admin Panel Link */}
          <Link href="/admin/dashboard" onClick={() => setSidebarOpen(false)}>
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <Settings className="h-5 w-5" />
              <span>Admin Panel</span>
            </div>
          </Link>
        </nav>

        {/* User Profile Section */}
        {currentUser && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3 rounded-lg bg-accent/50 p-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">
                  {currentUser.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Business Owner
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  router.push("/business-owner/profile")
                  setSidebarOpen(false)
                }}
              >
                <User className="h-4 w-4" />
                Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-semibold">Business Portal</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
