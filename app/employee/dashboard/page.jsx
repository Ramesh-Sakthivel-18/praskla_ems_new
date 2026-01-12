"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Clock, Calendar, FileText, BarChart2, Coffee, LogOut,
  CheckCircle, RefreshCw, ChevronRight, CalendarDays, AlertCircle
} from "lucide-react"
import { format } from "date-fns"
import { safeRedirect } from "@/lib/redirectUtils"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { getValidIdToken } from "@/lib/firebaseClient"

export default function EmployeeDashboardPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ totalHours: 0, daysPresent: 0 })
  const [leaveBalance, setLeaveBalance] = useState(null)
  const [upcomingLeaves, setUpcomingLeaves] = useState([])
  const [recent, setRecent] = useState([])
  const [actionLoading, setActionLoading] = useState(false)

  // Auth Check
  useEffect(() => {
    if (!isAuthenticated()) {
      safeRedirect(router, "/employee/login")
      return
    }

    const user = getCurrentUser()
    if (!user || user.role !== 'employee') {
      safeRedirect(router, "/employee/login")
      return
    }

    setCurrentUser(user)
    loadDashboardData()
  }, [router])

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  }

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    const token = await getValidIdToken()
    const base = getApiBase()

    if (!token) {
      // Don't error hard on dashboard load, just redirect or show empty state if truly invalid
      // But here allow soft fail
    }

    try {
      // Fetch all data in parallel
      const [todayRes, weeklyRes, balanceRes, upcomingRes, recordsRes] = await Promise.all([
        fetch(`${base}/api/attendance/today`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${base}/api/attendance/weekly-hours`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${base}/api/leave/balance`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${base}/api/leave/upcoming`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${base}/api/attendance/my-records`, { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      // Process today's attendance
      if (todayRes.ok) {
        const data = await todayRes.json()
        setAttendance(data)
      }

      // Process weekly stats
      if (weeklyRes.ok) {
        const data = await weeklyRes.json()
        setStats({
          totalHours: data.stats?.totalHours || 0,
          daysPresent: data.stats?.daysWorked || 0
        })
      }

      // Process recent activity from my-records
      if (recordsRes.ok) {
        const records = await recordsRes.json()
        const recordsArray = Array.isArray(records) ? records : (records.data || records.records || [])

        // Build recent activity from attendance records
        const items = recordsArray.slice(0, 5).flatMap(d => {
          const events = []
          if (d.checkIn) events.push({ label: `Checked in at ${d.checkIn}`, when: d.date, color: 'bg-emerald-500', icon: CheckCircle })
          if (d.breakIn) events.push({ label: `Started break at ${d.breakIn}`, when: d.date, color: 'bg-amber-500', icon: Coffee })
          if (d.breakOut) events.push({ label: `Ended break at ${d.breakOut}`, when: d.date, color: 'bg-blue-500', icon: Coffee })
          if (d.checkOut) events.push({ label: `Checked out at ${d.checkOut}`, when: d.date, color: 'bg-gray-500', icon: LogOut })
          return events
        })
        setRecent(items.slice(0, 5))
      }

      // Process leave balance
      if (balanceRes.ok) {
        const data = await balanceRes.json()
        setLeaveBalance(data.data || null)
      }

      // Process upcoming leaves
      if (upcomingRes.ok) {
        const data = await upcomingRes.json()
        setUpcomingLeaves(data.data || [])
      }

    } catch (err) {
      console.error('Error loading dashboard:', err)
      // setError(`Failed to load dashboard: ${err.message}`) // Optional: Suppress dashboard errors for cleaner UI, or show toast
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceAction = async (action) => {
    setActionLoading(true)
    const token = await getValidIdToken()
    const base = getApiBase()

    try {
      const response = await fetch(`${base}/api/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        const data = await response.json()
        // Update attendance state directly from the response
        setAttendance(data.data || data.record)

        // Only refresh attendance-related data (not leave balance which doesn't change)
        const [weeklyRes, recordsRes] = await Promise.all([
          fetch(`${base}/api/attendance/weekly-hours`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${base}/api/attendance/my-records`, { headers: { 'Authorization': `Bearer ${token}` } })
        ])

        if (weeklyRes.ok) {
          const weeklyData = await weeklyRes.json()
          setStats({
            totalHours: weeklyData.stats?.totalHours || 0,
            daysPresent: weeklyData.stats?.daysWorked || 0
          })
        }

        if (recordsRes.ok) {
          const records = await recordsRes.json()
          const recordsArray = Array.isArray(records) ? records : (records.data || records.records || [])
          const items = recordsArray.slice(0, 5).flatMap(d => {
            const events = []
            if (d.checkIn) events.push({ label: `Checked in at ${d.checkIn}`, when: d.date, color: 'bg-emerald-500', icon: CheckCircle })
            if (d.breakIn) events.push({ label: `Started break at ${d.breakIn}`, when: d.date, color: 'bg-amber-500', icon: Coffee })
            if (d.breakOut) events.push({ label: `Ended break at ${d.breakOut}`, when: d.date, color: 'bg-blue-500', icon: Coffee })
            if (d.checkOut) events.push({ label: `Checked out at ${d.checkOut}`, when: d.date, color: 'bg-gray-500', icon: LogOut })
            return events
          })
          setRecent(items.slice(0, 5))
        }
      } else {
        const err = await response.json()
        alert(`Failed to ${action}: ${err.error}`)
      }
    } catch (error) {
      console.error('Action error:', error)
      alert('Network error. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const getLeaveBalancePercentage = (type) => {
    if (!leaveBalance || !leaveBalance[type]) return 0
    const { used, total } = leaveBalance[type]
    return total ? Math.round((used / total) * 100) : 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) return null

  const isWorking = attendance?.checkIn && !attendance?.checkOut
  const isOnBreak = attendance?.breakIn && !attendance?.breakOut

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-700 to-teal-700 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
            Welcome back, {currentUser.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM do, yyyy")} • Here's your daily overview
          </p>
        </div>
        <Button onClick={loadDashboardData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-200">Error</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Time Tracker Card - Takes 2 columns */}
        <Card className="lg:col-span-2 transition-all duration-300 hover:shadow-lg border-2 border-emerald-500/20">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <Clock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Time Tracker</CardTitle>
                  <p className="text-sm text-muted-foreground">Track your work hours</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${isWorking ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-sm font-medium">
                  {isWorking ? (isOnBreak ? 'On Break' : 'Working') : 'Not Working'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Time Display */}
            <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl">
              <div className={`text-6xl font-bold tracking-tighter ${isWorking ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                {format(new Date(), "HH:mm")}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {format(new Date(), "EEEE, MMMM do")}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              {!attendance?.checkIn ? (
                <Button
                  className="col-span-2 h-14 text-lg bg-emerald-600 hover:bg-emerald-700 transition-all hover:shadow-lg text-white"
                  onClick={() => handleAttendanceAction('checkIn')}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-5 w-5" />
                  )}
                  {actionLoading ? "Processing..." : "Check In"}
                </Button>
              ) : !attendance?.checkOut ? (
                <>
                  <Button
                    variant="outline"
                    className={`h-14 text-lg border-2 transition-all hover:shadow-md ${isOnBreak
                      ? 'border-blue-300 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                      : 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                      }`}
                    onClick={() => handleAttendanceAction(isOnBreak ? 'breakOut' : 'breakIn')}
                    disabled={actionLoading}
                  >
                    <Coffee className="mr-2 h-5 w-5" />
                    {isOnBreak ? "End Break" : "Start Break"}
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-14 text-lg transition-all hover:shadow-md"
                    onClick={() => handleAttendanceAction('checkOut')}
                    disabled={actionLoading}
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Check Out
                  </Button>
                </>
              ) : (
                <div className="col-span-2 text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">
                    You have completed your shift today
                  </p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                    Checked out at {attendance.checkOut}
                  </p>
                </div>
              )}
            </div>

            {/* Today's Timeline */}
            <div className="grid grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Check In</p>
                <p className="font-semibold text-sm">{attendance?.checkIn || '--:--'}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Break Start</p>
                <p className="font-semibold text-sm">{attendance?.breakIn || '--:--'}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Break End</p>
                <p className="font-semibold text-sm">{attendance?.breakOut || '--:--'}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Check Out</p>
                <p className="font-semibold text-sm">{attendance?.checkOut || '--:--'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards Column */}
        <div className="space-y-4">
          {/* Weekly Hours */}
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Hours</CardTitle>
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <BarChart2 className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalHours}h</div>
              <p className="text-xs text-muted-foreground mt-1">
                Worked this week
              </p>
              <Progress value={Math.min((stats.totalHours / 40) * 100, 100)} className="h-2 mt-3" />
              <p className="text-xs text-muted-foreground mt-1">{Math.round((stats.totalHours / 40) * 100)}% of 40h target</p>
            </CardContent>
          </Card>

          {/* Days Present */}
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.daysPresent} <span className="text-lg font-normal text-muted-foreground">/ 5</span></div>
              <p className="text-xs text-muted-foreground mt-1">
                Days present this week
              </p>
              <Progress value={(stats.daysPresent / 5) * 100} className="h-2 mt-3" />
            </CardContent>
          </Card>

          {/* Quick Apply Leave */}
          <Button
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 transition-all text-white"
            onClick={() => router.push("/employee/leave-requests")}
          >
            <FileText className="mr-2 h-5 w-5" />
            Apply for Leave
          </Button>
        </div>
      </div>

      {/* Leave Balance and Recent Activity Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leave Balance */}
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Leave Balance</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Your available leave days
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/employee/leave-requests")}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                Apply
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {leaveBalance && leaveBalance.allocated ? (
              <div className="space-y-4">
                {Object.entries(leaveBalance.allocated).map(([type, total]) => {
                  const used = leaveBalance.used?.[type] || 0
                  const remaining = leaveBalance.remaining?.[type] || (total - used)
                  const percentage = total > 0 ? (used / total) * 100 : 0
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">{type}</span>
                        <span className="text-sm">
                          <span className="font-bold">{remaining}</span>
                          <span className="text-muted-foreground"> / {total} days left</span>
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Leave balance not available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Your latest actions
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/employee/attendance")}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recent.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                      <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.when), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Leaves */}
      {upcomingLeaves.length > 0 && (
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Upcoming Leaves</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Your approved upcoming leaves
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {upcomingLeaves.slice(0, 3).map((leave, i) => (
                <div
                  key={leave.id || i}
                  className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="h-4 w-4 text-emerald-600" />
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                      {leave.leaveType}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm">
                    {format(new Date(leave.startDate), "MMM d")} - {format(new Date(leave.endDate), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{leave.reason || 'No reason provided'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
