"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { EmployeeSidebar } from "@/components/employee-sidebar"
import { EmployeeNavbar } from "@/components/employee-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Calendar, FileText, BarChart2 } from "lucide-react"
import { format } from "date-fns"
import { safeRedirect } from "@/lib/redirectUtils"
import { getValidIdToken } from "@/lib/firebaseClient"

export default function EmployeeDashboardPage() {
  const router = useRouter()
  const [attendance, setAttendance] = useState(null)
  const [stats, setStats] = useState({ totalHours: 0, daysPresent: 0, leaveBalance: 0 })
  const [recent, setRecent] = useState([])

  useEffect(() => {
    if (!localStorage.getItem("employeeLoggedIn")) {
      safeRedirect(router, "/employee/login")
    }
    loadAttendance()
    loadWeekly()
  }, [])

  const loadAttendance = async () => {
    const token = await getValidIdToken()
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/attendance/today`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAttendance(data)
      } else if (response.status === 401) {
        localStorage.removeItem("employeeLoggedIn")
        localStorage.removeItem("firebaseToken")
        safeRedirect(router, "/employee/login")
      }
    } catch (error) {
      console.error('Error loading attendance:', error)
    }
  }

  const loadWeekly = async () => {
    const token = await getValidIdToken()
    if (!token) return
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/attendance/weekly-hours`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        const weekly = data.weekly || []
        const daysPresent = weekly.filter(d => d.checkIn).length
        setStats({
          totalHours: data.stats?.totalHours || 0,
          daysPresent,
          leaveBalance: 0
        })
        const items = weekly.slice(-5).reverse().flatMap(d => {
          const events = []
          if (d.checkIn) events.push({ label: `Checked in at ${d.checkIn}`, when: d.date, color: 'bg-green-600' })
          if (d.breakIn) events.push({ label: `Started break at ${d.breakIn}`, when: d.date, color: 'bg-yellow-500' })
          if (d.breakOut) events.push({ label: `Ended break at ${d.breakOut}`, when: d.date, color: 'bg-yellow-500' })
          if (d.checkOut) events.push({ label: `Checked out at ${d.checkOut}`, when: d.date, color: 'bg-accent' })
          return events
        })
        setRecent(items.slice(0, 6))
      } else if (response.status === 401) {
        localStorage.removeItem("employeeLoggedIn")
        localStorage.removeItem("firebaseToken")
        safeRedirect(router, "/employee/login")
      }
    } catch (error) {
      console.error('Error loading weekly hours:', error)
    }
  }

  const handleCheckIn = async () => {
    const token = await getValidIdToken()
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'checkIn' })
      })
      if (response.ok) {
        loadAttendance()
        loadWeekly()
      } else if (response.status === 401) {
        localStorage.removeItem("employeeLoggedIn")
        localStorage.removeItem("firebaseToken")
        safeRedirect(router, "/employee/login")
      }
    } catch (error) {
      console.error('Error checking in:', error)
    }
  }

  const handleCheckOut = async () => {
    const token = await getValidIdToken()
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'checkOut' })
      })
      if (response.ok) {
        loadAttendance()
        loadWeekly()
      } else if (response.status === 401) {
        localStorage.removeItem("employeeLoggedIn")
        localStorage.removeItem("firebaseToken")
        safeRedirect(router, "/employee/login")
      }
    } catch (error) {
      console.error('Error checking out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <EmployeeSidebar />
      <EmployeeNavbar />

      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground mt-1">Welcome back! Here's your overview for today.</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today's Status</CardTitle>
                <Clock className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {attendance ? (
                  <div>
                    {attendance.checkIn ? (
                      <div>
                        <p className="text-2xl font-bold text-green-600">Checked In</p>
                        <p className="text-sm text-muted-foreground">
                          At {attendance.checkIn}
                        </p>
                        {attendance.checkOut ? (
                          <p className="text-sm text-muted-foreground mt-1">
                            Checked out at {attendance.checkOut}
                          </p>
                        ) : (
                          <Button className="mt-2" onClick={handleCheckOut}>
                            Check Out
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-2xl font-bold text-muted-foreground">Not Checked In</p>
                        <Button className="mt-2" onClick={handleCheckIn}>
                          Check In
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
                <BarChart2 className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats.totalHours}</div>
                <p className="text-xs text-muted-foreground">This week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Days Present</CardTitle>
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats.daysPresent}</div>
                <p className="text-xs text-muted-foreground">This week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Leave Balance</CardTitle>
                <FileText className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats.leaveBalance}</div>
                <p className="text-xs text-muted-foreground">Days remaining</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recent.length > 0 ? recent.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                      <span className="text-foreground">{item.label}</span>
                      <span className="text-muted-foreground ml-auto text-xs">{item.when}</span>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-sm">No recent activity</p>
                  )}
                </div>
              </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
