import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [currentUser, setCurrentUser] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Auth Check
  useEffect(() => {
    if (!isAuthenticated()) {
      safeRedirect(navigate, "/employee/login")
      return
    }

    const user = getCurrentUser()
    if (!user || user.role !== 'employee') {
      safeRedirect(navigate, "/employee/login")
      return
    }

    setCurrentUser(user)
  }, [navigate])

  const getApiBase = () => import.meta.env.VITE_API_URL || 'http://localhost:3000'

  const { data: dashboardData = {}, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['emp-dashboard'],
    queryFn: async () => {
      const token = await getValidIdToken()
      const base = getApiBase()
      const [todayRes, weeklyRes, balanceRes, upcomingRes, recordsRes] = await Promise.all([
        fetch(`${base}/api/attendance/today`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${base}/api/attendance/weekly-hours`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${base}/api/leave/balance`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${base}/api/leave/upcoming`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${base}/api/attendance/my-records`, { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      const result = {}
      if (todayRes.ok) result.attendance = await todayRes.json()
      if (weeklyRes.ok) { const d = await weeklyRes.json(); result.stats = { totalHours: d.stats?.totalHours || 0, daysPresent: d.stats?.daysWorked || 0 } }
      else result.stats = { totalHours: 0, daysPresent: 0 }
      if (balanceRes.ok) { const d = await balanceRes.json(); result.leaveBalance = d.data || null }
      if (upcomingRes.ok) { const d = await upcomingRes.json(); result.upcomingLeaves = d.data || [] }
      if (recordsRes.ok) {
        const records = await recordsRes.json()
        const recordsArray = Array.isArray(records) ? records : (records.data || records.records || [])
        const items = recordsArray.slice(0, 5).flatMap(d => {
          const events = []
          if (d.checkIn) events.push({ label: `Checked in at ${d.checkIn}`, when: d.date, color: 'bg-emerald-500', icon: 'CheckCircle' })
          if (d.breakIn) events.push({ label: `Started break at ${d.breakIn}`, when: d.date, color: 'bg-amber-500', icon: 'Coffee' })
          if (d.breakOut) events.push({ label: `Ended break at ${d.breakOut}`, when: d.date, color: 'bg-blue-500', icon: 'Coffee' })
          if (d.checkOut) events.push({ label: `Checked out at ${d.checkOut}`, when: d.date, color: 'bg-gray-500', icon: 'LogOut' })
          return events
        })
        result.recent = items.slice(0, 5)
      }
      return result
    },
    enabled: !!currentUser,
  })

  const attendance = dashboardData?.attendance || null
  const stats = dashboardData?.stats || { totalHours: 0, daysPresent: 0 }
  const leaveBalance = dashboardData?.leaveBalance || null
  const upcomingLeaves = dashboardData?.upcomingLeaves || []
  const recent = (dashboardData?.recent || []).map(item => ({
    ...item,
    icon: item.icon === 'CheckCircle' ? CheckCircle : item.icon === 'Coffee' ? Coffee : LogOut
  }))
  const error = queryError?.message || null
  const loadDashboardData = () => queryClient.invalidateQueries({ queryKey: ['emp-dashboard'] })

  const handleAttendanceAction = async (action) => {
    // Avoid double clicks
    if (actionLoading) return

    // Store previous data for rollback
    const previousData = queryClient.getQueryData(['emp-dashboard'])

    // Optimistic Update
    setActionLoading(true)

    // Create optimistic attendance record
    const now = new Date()
    const optimisticTime = format(now, "HH:mm:ss")
    const optimisticDate = format(now, "yyyy-MM-dd")

    queryClient.setQueryData(['emp-dashboard'], (old) => {
      if (!old) return old

      const newAttendance = { ...old.attendance } || { date: optimisticDate }
      const newStats = { ...old.stats }

      // Update attendance state based on action
      if (action === 'checkIn') {
        newAttendance.checkIn = optimisticTime
        newAttendance.status = 'Present'
      } else if (action === 'checkOut') {
        newAttendance.checkOut = optimisticTime
        newAttendance.status = 'Checked Out'
      } else if (action === 'breakIn') {
        newAttendance.breakIn = optimisticTime
        newAttendance.status = 'On Break'
      } else if (action === 'breakOut') {
        newAttendance.breakOut = optimisticTime
        newAttendance.status = 'Present'
      }

      // Add fake recent record for immediate feedback
      let newRecent = [...(old.recent || [])]
      const actionLabels = {
        checkIn: { label: `Checked in at ${optimisticTime}`, icon: 'CheckCircle', color: 'bg-emerald-500' },
        checkOut: { label: `Checked out at ${optimisticTime}`, icon: 'LogOut', color: 'bg-gray-500' },
        breakIn: { label: `Started break at ${optimisticTime}`, icon: 'Coffee', color: 'bg-amber-500' },
        breakOut: { label: `Ended break at ${optimisticTime}`, icon: 'Coffee', color: 'bg-blue-500' }
      }

      if (actionLabels[action]) {
        newRecent.unshift({
          ...actionLabels[action],
          when: optimisticDate
        })
      }

      return {
        ...old,
        attendance: newAttendance,
        recent: newRecent.slice(0, 5)
      }
    })

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
        // Success - invalidate to get real server data
        queryClient.invalidateQueries({ queryKey: ['emp-dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['emp-attendance'] })
        queryClient.invalidateQueries({ queryKey: ['emp-weekly-hours'] })
      } else {
        // Revert on failure
        queryClient.setQueryData(['emp-dashboard'], previousData)
        const err = await response.json()
        alert(`Failed to ${action}: ${err.error}`)
      }
    } catch (error) {
      // Revert on error
      queryClient.setQueryData(['emp-dashboard'], previousData)
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
            onClick={() => navigate("/employee/leave-requests")}
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
                onClick={() => navigate("/employee/leave-requests")}
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
                onClick={() => navigate("/employee/attendance")}
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
