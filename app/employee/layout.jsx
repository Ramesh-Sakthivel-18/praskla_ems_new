import { useEffect, useState } from "react"
import { useNavigate, useLocation, Outlet } from "react-router-dom"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
    Building2,
    LayoutDashboard,
    Calendar,
    FileText,
    LogOut,
    User,
    Menu,
    X,
    Clock
} from "lucide-react"
import { getCurrentUser, isAuthenticated, logoutUser } from "@/lib/auth"
import { cn } from "@/lib/utils"

export default function EmployeeLayout({ children }) {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const [currentUser, setCurrentUser] = useState(null)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    // Check if current page is login
    const isAuthPage = pathname === "/employee/login"

    useEffect(() => {
        // Skip auth check for login/register pages
        if (isAuthPage) return

        // Check authentication
        if (!isAuthenticated()) {
            navigate("/employee/login")
            return
        }

        const user = getCurrentUser()
        if (!user || user.role !== "employee") {
            navigate("/employee/login")
            return
        }

        setCurrentUser(user)
    }, [pathname, isAuthPage, navigate])

    // If it's a login page, render without sidebar
    if (isAuthPage) {
        return <>{children}</>
    }

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            logoutUser()
            navigate("/employee/login")
        }
    }

    const navLinks = [
        {
            href: "/employee/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
        },
        {
            href: "/employee/attendance",
            label: "My Attendance",
            icon: Clock,
        },
        {
            href: "/employee/leave-requests",
            label: "Leave Requests",
            icon: FileText,
        },
        {
            href: "/employee/profile",
            label: "My Profile",
            icon: User,
        },
    ]

    const isActive = (href) => pathname === href

    const getInitials = (name) => {
        if (!name) return "EM"
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
                    <div className="p-1 bg-emerald-600 rounded-md">
                        <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-semibold text-emerald-950 dark:text-emerald-50">Employee Portal</span>
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
                        <Link to="/employee/dashboard" className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg shadow-md">
                                <Building2 className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">Employee</h2>
                                <p className="text-xs text-muted-foreground">Self-Service Portal</p>
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
                                    to={link.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all group",
                                        "hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
                                        active
                                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-700"
                                            : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400"
                                    )}
                                >
                                    <Icon className={cn("h-5 w-5", active ? "text-white" : "text-slate-500 group-hover:text-emerald-600 dark:text-slate-400 dark:group-hover:text-emerald-400")} />
                                    <span className="font-medium">{link.label}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    <Separator />

                    {/* User Profile */}
                    <div className="p-4 space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                            <Avatar className="h-10 w-10 border-2 border-emerald-100">
                                <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                                    {getInitials(currentUser?.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">
                                    {currentUser?.name || "Employee"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {currentUser?.email}
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full justify-start hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:border-red-900"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen transition-all">
                <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
                    {children || <Outlet />}
                </div>
            </main>
        </div>
    )
}
