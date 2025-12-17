"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { EmployeeSidebar } from "@/components/employee-sidebar"
import { EmployeeNavbar } from "@/components/employee-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Calendar } from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"
import { getValidIdToken } from "@/lib/firebaseClient"

export default function WeeklyHoursPage() {
  const router = useRouter()
  const [weeklyData, setWeeklyData] = useState([])
  const [totals, setTotals] = useState({ total: 0, longest: 0, average: 0 })

  useEffect(() => {
    if (!localStorage.getItem("employeeLoggedIn")) {
      safeRedirect(router, "/employee/login")
      return
    }
    loadWeeklyData()
  }, [router])

  const loadWeeklyData = async () => {
    const token = await getValidIdToken()
    if (!token) return
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/attendance/weekly-hours`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setWeeklyData(data.weekly || [])
        setTotals({
          total: data.stats?.totalHours || 0,
          longest: data.stats?.longestDay || 0,
          average: data.stats?.averagePerDay || 0
        })
      } else if (response.status === 401) {
        localStorage.removeItem("employeeLoggedIn")
        localStorage.removeItem("firebaseToken")
        safeRedirect(router, "/employee/login")
      }
    } catch (error) {
      console.error('Error loading weekly hours:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <EmployeeSidebar />
      <EmployeeNavbar />

      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">Weekly Hours</h2>
            <p className="text-muted-foreground mt-1">Track your working hours throughout the week</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                This Week's Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-foreground">{totals.total}</p>
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-foreground">{totals.longest}</p>
                    <p className="text-sm text-muted-foreground">Longest Day</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-foreground">{totals.average}</p>
                    <p className="text-sm text-muted-foreground">Average/Day</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
