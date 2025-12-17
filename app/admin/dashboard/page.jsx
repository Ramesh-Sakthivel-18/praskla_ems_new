"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminNavbar } from "@/components/admin-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, UserX, FileText } from "lucide-react"
import { format } from "date-fns"
import { Spinner } from "@/components/ui/spinner"
import { safeRedirect } from "@/lib/redirectUtils"
import { getValidIdToken } from "@/lib/firebaseClient"

export default function AdminDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    if (!localStorage.getItem("adminLoggedIn")) {
      safeRedirect(router, "/admin/login")
    }
  }, [router])

  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    leaveRequests: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [unsubscribes, setUnsubscribes] = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const today = format(new Date(), "M/d/yyyy")
      const token = await getValidIdToken()
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const [employeesRes, attendanceRes, leavesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/employees`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/all?date=${today}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/leave/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ])

        let totalEmployees = 0
        if (employeesRes.ok) {
          const employees = await employeesRes.json()
          totalEmployees = (Array.isArray(employees) ? employees : employees.employees || []).length
        }

        let presentToday = 0
        let recent = []
        if (attendanceRes.ok) {
          const records = await attendanceRes.json()
          const arr = Array.isArray(records) ? records : (records.attendance || [])
          presentToday = arr.filter(r => r.date === today && r.checkIn).length
          recent = arr
            .sort((a, b) => new Date(b.updatedAt || b.date) - new Date(a.updatedAt || a.date))
            .slice(0, 4)
            .map(r => ({
              type: 'attendance',
              message: `${r.employeeName} ${r.checkOut ? `checked out at ${r.checkOut}` : r.checkIn ? `checked in at ${r.checkIn}` : 'updated'}`,
              time: r.updatedAt || ''
            }))
        }

        let leaveRequests = 0
        if (leavesRes.ok) {
          const leaves = await leavesRes.json()
          const arr = Array.isArray(leaves) ? leaves : (leaves.requests || leaves.leaveRequests || [])
          leaveRequests = arr.filter(l => l.status === 'Pending').length
        }

        setStats({ totalEmployees, presentToday, absentToday: Math.max(totalEmployees - presentToday, 0), leaveRequests })
        setRecentActivity(recent)
      } catch (e) {
        console.error('AdminDashboard: Failed to load stats', e)
      }
      setLoading(false)
    }
    load()
  }, [])

  const absentToday = stats.totalEmployees - stats.presentToday

  const statsData = [
    { title: "Total Employees", value: stats.totalEmployees, icon: Users, color: "text-primary" },
    { title: "Present Today", value: stats.presentToday, icon: UserCheck, color: "text-green-600" },
    { title: "Absent Today", value: absentToday, icon: UserX, color: "text-destructive" },
    { title: "Leave Requests", value: stats.leaveRequests, icon: FileText, color: "text-accent" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminNavbar />

      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">Dashboard Overview</h2>
            <p className="text-muted-foreground mt-1">Welcome back! Here's your overview for today.</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Loading...</CardTitle>
                    <Spinner className="w-5 h-5" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-muted-foreground">...</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statsData.map((stat) => {
                const Icon = stat.icon
                return (
                  <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === "attendance" ? "bg-green-600" : "bg-accent"
                        }`}></div>
                        <span className="text-foreground">{activity.message}</span>
                        {activity.time && <span className="text-muted-foreground ml-auto text-xs">({activity.time})</span>}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Attendance Rate</span>
                      <span className="text-foreground font-medium">87.5%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: "87.5%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">On Time Check-ins</span>
                      <span className="text-foreground font-medium">92%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-accent h-2 rounded-full" style={{ width: "92%" }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
