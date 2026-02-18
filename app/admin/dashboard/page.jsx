import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Users, UserCheck, UserX, FileText, RefreshCw, AlertCircle,
  Clock, TrendingUp, Calendar, Plus
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

  const getQuotaPercentage = () => {
    if (!dashboardData?.quota) return 0
    const { employeesCreated, canCreateUpTo } = dashboardData.quota
    if (!canCreateUpTo) return 0
    return Math.min(Math.round((employeesCreated / canCreateUpTo) * 100), 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-sm text-slate-500">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  const employees = dashboardData?.employees || { total: 0, active: 0, inactive: 0 }
  const attendance = dashboardData?.attendance || { presentCount: 0, totalRecords: 0 }
  const leaves = dashboardData?.leaves || { pendingCount: 0, pending: [] }
  const quota = dashboardData?.quota || { employeesCreated: 0, canCreateUpTo: 0, remaining: 0 }

  const quotaPct = getQuotaPercentage()
  const quotaBarColor = "bg-blue-600"

  const statsData = [
    {
      title: "Active Employees",
      value: employees.active || 0,
      subtitle: `${employees.inactive || 0} inactive`,
      icon: Users,
      accent: "text-blue-600",
      iconBg: "bg-blue-50 border-blue-100",
    },
    {
      title: "Present Today",
      value: attendance.presentCount || 0,
      subtitle: "Checked in",
      icon: UserCheck,
      accent: "text-blue-600",
      iconBg: "bg-blue-50 border-blue-100",
    },
    {
      title: "Absent",
      value: (employees.active || 0) - (attendance.presentCount || 0),
      subtitle: "Not checked in",
      icon: UserX,
      accent: "text-slate-500",
      iconBg: "bg-slate-50 border-slate-200",
    },
    {
      title: "Pending Requests",
      value: leaves.pendingCount || 0,
      subtitle: "Leaves awaiting",
      icon: FileText,
      accent: "text-blue-600",
      iconBg: "bg-blue-50 border-blue-100",
    },
  ]

  const quickActions = [
    { label: "Manage Staff", icon: Users, path: "/admin/employees" },
    { label: "Check Attendance", icon: Calendar, path: "/admin/attendance" },
    { label: "Review Leaves", icon: FileText, path: "/admin/leave-requests" },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">

      {/* ── Page Header ───────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Overview for <span className="text-slate-700 font-medium">{currentUser?.name}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={loadDashboard}
            variant="outline"
            size="sm"
            className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => navigate("/admin/employees")}
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-none"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* ── Error Alert ───────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Error Loading Dashboard</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadDashboard}
            className="border-red-200 text-red-700 hover:bg-red-100 shrink-0"
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── Stats Grid ────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statsData.map(({ title, value, subtitle, icon: Icon, accent, iconBg }) => (
          <div key={title} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-none">{title}</span>
              <div className={`p-2 rounded-lg border ${iconBg}`}>
                <Icon className={`h-4 w-4 ${accent}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${accent}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          </div>
        ))}
      </div>

      {/* ── Main Content ──────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Left: Quota + Quick Actions */}
        <div className="lg:col-span-2 space-y-6">

          {/* Quota */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="p-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="text-sm font-semibold text-slate-800">Employee Creation Quota</h2>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <span className="text-3xl font-bold text-slate-900">{quota.employeesCreated || 0}</span>
                  <span className="text-sm text-slate-400 ml-2">of {quota.canCreateUpTo || 0} used</span>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-600">
                  {quota.remaining || 0} remaining
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${quotaBarColor}`}
                  style={{ width: `${quotaPct}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">{quotaPct}% capacity used</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-4">
            {quickActions.map(({ label, icon: Icon, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center gap-3 hover:border-blue-300 hover:bg-blue-50/40 transition-all duration-150 group shadow-sm hover:shadow-md"
              >
                <div className="p-3 rounded-xl bg-slate-100 group-hover:bg-blue-100 border border-slate-200 group-hover:border-blue-200 transition-colors">
                  <Icon className="h-5 w-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Pending Leaves */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Pending Leaves</h2>
            <button
              onClick={() => navigate("/admin/leave-requests")}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              View All →
            </button>
          </div>

          <div className="flex-1 px-5 py-4">
            {!leaves.pending?.length ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                <div className="p-3 bg-slate-100 rounded-full mb-3">
                  <FileText className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaves.pending.slice(0, 5).map((leave, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="mt-0.5 p-1.5 rounded-md bg-white border border-slate-200 shrink-0">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {leave.userName || leave.employeeName || 'Employee'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-600">
                          {leave.leaveType}
                        </span>
                        <span className="text-xs text-slate-400">{leave.startDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}