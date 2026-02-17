import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Users, UserCheck, UserX, FileText, RefreshCw, AlertCircle,
  Clock, TrendingUp, Calendar, ChevronRight, Plus, Building2
} from "lucide-react"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { getValidIdToken } from "@/lib/firebaseClient"

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [currentUser, setCurrentUser] = useState(null)

  // Auth Check
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/admin/login")
      return
    }
    const user = getCurrentUser()
    if (!user || (user.role !== "admin" && user.role !== "system_admin")) {
      navigate("/admin/login")
      return
    }
    setCurrentUser(user)
  }, [navigate])



  const { data: dashboardData = null, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const token = await getValidIdToken()
      if (!token) throw new Error("Authentication failed. Please login again.")
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000"
      const response = await fetch(`${apiBase}/api/admin/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      if (response.status === 401) throw new Error("Session expired. Please login again.")
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || "Failed to load dashboard") }
      return response.json()
    },
    enabled: !!currentUser,
  })

  const error = queryError?.message || null
  const loadDashboard = () => queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })

  // Calculate quota percentage
  const getQuotaPercentage = () => {
    if (!dashboardData?.quota) return 0
    // Admin quota structure: { employeesCreated, canCreateUpTo, remaining }
    const { employeesCreated, canCreateUpTo } = dashboardData.quota
    if (!canCreateUpTo) return 0
    return Math.min(Math.round((employeesCreated / canCreateUpTo) * 100), 100)
  }

  const getQuotaColor = () => {
    const percentage = getQuotaPercentage()
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground animate-pulse">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  const employees = dashboardData?.employees || { total: 0, active: 0, inactive: 0 }
  const attendance = dashboardData?.attendance || { presentCount: 0, totalRecords: 0 } // Adjusted key
  const leaves = dashboardData?.leaves || { pendingCount: 0, pending: [] }
  const quota = dashboardData?.quota || { employeesCreated: 0, canCreateUpTo: 0, remaining: 0 }

  const statsData = [
    {
      title: "Active Employees",
      value: employees.active || 0,
      subtitle: `${employees.inactive || 0} inactive`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Present Today",
      value: attendance.presentCount || 0,
      subtitle: "Checked in",
      icon: UserCheck,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      title: "Absent",
      value: (employees.active || 0) - (attendance.presentCount || 0),
      subtitle: "Not checked in",
      icon: UserX,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
    {
      title: "Pending Requests",
      value: leaves.pendingCount || 0,
      subtitle: "Leaves awaiting",
      icon: FileText,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview for {currentUser?.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={loadDashboard} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate("/admin/employees")} size="sm" className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md">
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
          <CardContent className="pt-6 flex gap-4 items-center text-red-700 dark:text-red-300">
            <AlertCircle className="h-6 w-6" />
            <div className="flex-1">
              <p className="font-semibold">Error Loading Dashboard</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={loadDashboard} className="border-red-200 hover:bg-red-100">Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">{stat.value}</h3>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quota Usage */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b">
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Employee Creation Quota
              </CardTitle>
              <CardDescription>
                You can create up to {quota.canCreateUpTo || 0} employees
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{quota.employeesCreated || 0}</span>
                  <span className="text-muted-foreground ml-2">used</span>
                </div>
                <Badge variant="outline" className="text-base px-3 py-1">
                  {quota.remaining || 0} left
                </Badge>
              </div>
              <Progress value={getQuotaPercentage()} className={`h-3 rounded-full ${getQuotaColor().replace('bg-', '[&>div]:bg-')}`} />
              <p className="text-xs text-muted-foreground mt-2 text-right">
                {getQuotaPercentage()}% capacity used
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={() => navigate("/admin/employees")}
            >
              <Users className="h-6 w-6 text-blue-600" />
              Manage Staff
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              onClick={() => navigate("/admin/attendance")}
            >
              <Calendar className="h-6 w-6 text-emerald-600" />
              Check Attendance
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              onClick={() => navigate("/admin/leave-requests")}
            >
              <FileText className="h-6 w-6 text-amber-600" />
              Review Leaves
            </Button>
          </div>
        </div>

        {/* Right Column (1/3) */}
        <div>
          <Card className="border-0 shadow-lg h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Pending Leaves</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin/leave-requests")}>View All</Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {leaves.pending?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {leaves.pending?.slice(0, 5).map((leave, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                        <Clock className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{leave.userName || leave.employeeName || 'Employee'}</p>
                        <p className="text-xs text-muted-foreground truncate">{leave.leaveType}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-white dark:bg-gray-700">
                        {leave.startDate}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
