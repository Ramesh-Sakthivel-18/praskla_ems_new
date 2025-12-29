"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Building2, 
  Users, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  ArrowRight,
  Shield,
  BarChart3,
  Activity
} from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"

export default function ManagerDashboardPage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    pendingOrganizations: 0,
    totalBusinessOwners: 0,
    totalAdmins: 0,
    totalEmployees: 0,
  })

  const [recentOrgs, setRecentOrgs] = useState([])

  useEffect(() => {
    const current = localStorage.getItem("currentEmployee")
    if (!current) {
      safeRedirect(router, "/admin/login")
      return
    }

    const emp = JSON.parse(current)
    if (emp.role !== "manager") {
      alert("Unauthorized. Manager access required.")
      safeRedirect(router, "/admin/login")
      return
    }

    setCurrentUser(emp)
    loadDashboard()
  }, [router])

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }

  const loadDashboard = async () => {
    setLoading(true)
    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    try {
      const response = await fetch(`${base}/api/manager/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const organizations = data.organizations || []

        const activeOrgs = organizations.filter((o) => o.isActive)
        const pendingOrgs = organizations.filter((o) => !o.isActive)

        let totalAdmins = 0
        let totalEmployees = 0

        organizations.forEach((org) => {
          totalAdmins += org.adminCount || 0
          totalEmployees += org.employeeCount || 0
        })

        setStats({
          totalOrganizations: organizations.length,
          activeOrganizations: activeOrgs.length,
          pendingOrganizations: pendingOrgs.length,
          totalBusinessOwners: organizations.length, // One owner per org
          totalAdmins,
          totalEmployees,
        })

        // Get 3 most recent organizations
        const sorted = [...organizations].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
        setRecentOrgs(sorted.slice(0, 3))
      } else if (response.status === 401) {
        alert("Session expired. Please login again.")
        safeRedirect(router, "/admin/login")
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return "N/A"
    }
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {currentUser.name?.split(" ")[0] || "Manager"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all organizations and business owners from your central dashboard
          </p>
        </header>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Organizations
              </CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                Registered businesses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Organizations
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.activeOrganizations}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently operational
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Approval
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pendingOrganizations}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting activation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Business Owners
              </CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalBusinessOwners}
              </div>
              <p className="text-xs text-muted-foreground">
                Organization owners
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Admins
              </CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalAdmins}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all organizations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Employees
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                Across all organizations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card 
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary"
            onClick={() => router.push("/manager/organizations")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="mt-4">Manage Organizations</CardTitle>
              <CardDescription>
                View all organizations, approve new registrations, and manage status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending approval</span>
                <Badge variant="secondary">{stats.pendingOrganizations}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-muted p-2">
                  <BarChart3 className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <CardTitle className="mt-4">Analytics (Coming Soon)</CardTitle>
              <CardDescription>
                View detailed analytics and reports across all organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">Coming Soon</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Recent Organizations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                Recent Registrations
              </CardTitle>
              <CardDescription className="mt-1">
                Latest organizations that registered
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/manager/organizations")}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : recentOrgs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No organizations registered yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrgs.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.ownerEmail}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">
                          {formatDate(org.createdAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {org.adminCount} admins, {org.employeeCount} employees
                        </p>
                      </div>
                      <Badge
                        variant={org.isActive ? "default" : "secondary"}
                      >
                        {org.isActive ? "Active" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Banner */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Manager Privileges
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  You have full access to manage all organizations, approve registrations, 
                  and view aggregate statistics. Use the Organizations page to manage individual businesses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
