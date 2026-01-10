"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { EmployeeSidebar } from "@/components/employee-sidebar"
import { EmployeeNavbar } from "@/components/employee-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Calendar, FileText, BarChart2, Coffee, LogOut, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import { safeRedirect } from "@/lib/redirectUtils"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"

export default function EmployeeDashboardPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalHours: 0, daysPresent: 0, leaveBalance: 0 })
  const [recent, setRecent] = useState([])
  const [actionLoading, setActionLoading] = useState(false)

  // ✅ Auth Check
  useEffect(() => {
    if (!isAuthenticated()) {
      safeRedirect(router, "/employee/login")
      return
    }

    const user = getCurrentUser()
    if (!user || user.role !== 'employee') {
      alert("Unauthorized. Employee access required.")
      safeRedirect(router, "/role-selection")
      return
    }

    setCurrentUser(user)
    loadDashboardData(user)
  }, [router])

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  }

  const loadDashboardData = async (user) => {
    setLoading(true)
    const token = localStorage.getItem('firebaseToken')
    const base = getApiBase()

    try {
      // 1. Get Today's Attendance
      console.log('📅 Fetching today\'s attendance...')
      const todayRes = await fetch(`${base}/api/attendance/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (todayRes.ok) {
        const data = await todayRes.json()
        setAttendance(data)
      }

      // 2. Get Weekly Stats
      console.log('📊 Fetching weekly stats...')
      const weeklyRes = await fetch(`${base}/api/attendance/weekly-hours`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (weeklyRes.ok) {
        const data = await weeklyRes.json()
        const weekly = data.weekly || []
        const daysPresent = weekly.filter(d => d.checkIn).length
        
        setStats({
          totalHours: data.stats?.totalHours || 0,
          daysPresent,
          leaveBalance: 12 // Hardcoded for demo, usually from backend
        })

        // Build recent activity
        const items = weekly.slice(-5).reverse().flatMap(d => {
          const events = []
          if (d.checkIn) events.push({ label: `Checked in at ${d.checkIn}`, when: d.date, color: 'bg-green-600', icon: CheckCircle })
          if (d.breakIn) events.push({ label: `Started break at ${d.breakIn}`, when: d.date, color: 'bg-orange-500', icon: Coffee })
          if (d.breakOut) events.push({ label: `Ended break at ${d.breakOut}`, when: d.date, color: 'bg-blue-500', icon: Coffee })
          if (d.checkOut) events.push({ label: `Checked out at ${d.checkOut}`, when: d.date, color: 'bg-gray-600', icon: LogOut })
          return events
        })
        setRecent(items.slice(0, 5))
      }

    } catch (error) {
      console.error('❌ Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceAction = async (action) => {
    setActionLoading(true)
    const token = localStorage.getItem('firebaseToken')
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
        setAttendance(data.record)
        // Refresh stats
        loadDashboardData(currentUser)
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Navbar & Sidebar handled by Layout usually, but included components if needed */}
      
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {currentUser.name.split(' ')[0]}! 👋</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM do, yyyy")} • Here's your daily overview
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Main Attendance Card */}
          <Card className="col-span-2 row-span-2 border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Time Tracker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className={`text-5xl font-bold tracking-tighter ${attendance?.checkIn && !attendance?.checkOut ? 'text-green-600' : 'text-gray-400'}`}>
                  {format(new Date(), "HH:mm")}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className={`h-2.5 w-2.5 rounded-full ${attendance?.checkIn && !attendance?.checkOut ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  {attendance?.checkIn && !attendance?.checkOut ? 'Currently Working' : 'Not Working'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {!attendance?.checkIn ? (
                  <Button 
                    className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                    onClick={() => handleAttendanceAction('checkIn')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : "Check In"}
                  </Button>
                ) : !attendance?.checkOut ? (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full h-12 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                      onClick={() => handleAttendanceAction(attendance.breakIn && !attendance.breakOut ? 'breakOut' : 'breakIn')}
                      disabled={actionLoading}
                    >
                      {attendance.breakIn && !attendance.breakOut ? "End Break" : "Start Break"}
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full h-12"
                      onClick={() => handleAttendanceAction('checkOut')}
                      disabled={actionLoading}
                    >
                      Check Out
                    </Button>
                  </>
                ) : (
                  <div className="col-span-2 text-center p-3 bg-muted rounded-lg text-muted-foreground">
                    You have checked out for today at {attendance.checkOut}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
                <div>
                  <p className="text-muted-foreground">Check In</p>
                  <p className="font-medium">{attendance?.checkIn || '--:--'}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Check Out</p>
                  <p className="font-medium">{attendance?.checkOut || '--:--'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Weekly Hours</CardTitle>
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHours}h</div>
              <p className="text-xs text-muted-foreground mt-1">
                Worked this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Attendance</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.daysPresent} days</div>
              <p className="text-xs text-muted-foreground mt-1">
                Present this week
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recent.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                ) : (
                  recent.map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={`h-2 w-2 rounded-full ${item.color}`} />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.when), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
