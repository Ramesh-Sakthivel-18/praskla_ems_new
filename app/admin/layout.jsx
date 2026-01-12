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
    X
} from "lucide-react"
import { getCurrentUser, isAuthenticated, logoutUser } from "@/lib/auth"
import { cn } from "@/lib/utils"

export default function AdminLayout({ children }) {
    const router = useRouter()
    const pathname = usePathname()
    const [currentUser, setCurrentUser] = useState(null)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    // Check if current page is login or register
    const isAuthPage = pathname === "/admin/login" || pathname === "/admin/register"

    useEffect(() => {
        // Skip auth check for login/register pages
        if (isAuthPage) return

        // Check authentication
        if (!isAuthenticated()) {
            router.push("/admin/login")
            return
        }

        const user = getCurrentUser()
        if (!user || (user.role !== "admin" && user.role !== "manager")) {
            router.push("/admin/login")
            return
        }

        setCurrentUser(user)
    }, [pathname, isAuthPage, router])

    // If it's a login/register page, render without sidebar
    if (isAuthPage) {
        return <>{children}</>
    }

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            logoutUser()
            router.push("/admin/login")
        }
    }

    const navLinks = [
        {
            href: "/admin/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
        },
        {
            href: "/admin/employees",
            label: "Employees",
            icon: Users,
        },
        {
            href: "/admin/attendance",
            label: "Attendance",
            icon: Calendar,
        },
        {
            href: "/admin/leave-requests",
            label: "Leave Requests",
            icon: FileText,
        },
        {
            href: "/admin/profile",
            label: "Profile",
            icon: User,
        },
    ]

    const isActive = (href) => pathname === href

    const getInitials = (name) => {
        if (!name) return "AD"
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-b px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-blue-600" />
                    <span className="font-semibold">Admin Portal</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {/* Sidebar Overlay (Mobile) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-slate-800 border-r transition-transform duration-300",
                    "lg:translate-x-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b">
                        <Link href="/admin/dashboard" className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                                <Building2 className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">EMS Admin</h2>
                                <p className="text-xs text-muted-foreground">Management Portal</p>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {navLinks.map((link) => {
                            const Icon = link.icon
                            const active = isActive(link.href)

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                                        "hover:bg-slate-100 dark:hover:bg-slate-700",
                                        active && "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90"
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="font-medium">{link.label}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    <Separator />

                    {/* User Profile */}
                    <div className="p-4 space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                            <Avatar className="h-10 w-10 bg-gradient-to-r from-blue-600 to-indigo-600">
                                <AvatarFallback className="text-white">
                                    {getInitials(currentUser?.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {currentUser?.name || "Administrator"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {currentUser?.email}
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:pl-64 pt-16 lg:pt-0">
                <div className="p-4 md:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
