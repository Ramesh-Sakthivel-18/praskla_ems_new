"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, UserCheck, UserX, Coffee, LogOut, ArrowLeft, RefreshCw, Users } from "lucide-react"
import { format } from "date-fns"
import { safeRedirect } from "@/lib/redirectUtils"

export default function BusinessOwnerAttendancePage() {
  const router = useRouter()

  const [currentUser, setCurrentUser] = useState(null)
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"))
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentEmployees: 0,
    absentEmployees: 0,
    checkedOut: 0,
    onBreak: 0,
  })

  useEffect(() => {
    const current = localStorage.getItem("currentUser")
    if (!current) {
      safeRedirect(router, "/business-owner/login")
      return
    }

    const emp = JSON.parse(current)
    if (emp.role !== "business_owner") {
      alert("Unauthorized. Business Owner access required.")
      safeRedirect(router, "/role-selection")
      return
    }

    setCurrentUser(emp)
  }, [router])

  useEffect(() => {
    if (currentUser) {
      loadAttendance()
    }
  }, [currentUser, dateFilter])

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }

  const loadAttendance = async () => {
    console.log("🔄 Loading attendance, currentUser:", currentUser)
    setLoading(true)
    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    try {
      const empRes = await fetch(`${base}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      let orgEmployees = []
      if (empRes.ok) {
        const empData = await empRes.json()
        console.log("📊 Employees response:", empData)
        const allEmployees = Array.isArray(empData) ? empData : empData.employees || []
        // Only filter by role=employee (backend already filters by org)
        orgEmployees = allEmployees.filter((e) => e.role === "employee" && e.isActive !== false)
        console.log("👥 Filtered employees for attendance:", orgEmployees.length)
      }

      const orgEmployeeIds = new Set(orgEmployees.map((e) => e.id))
      const totalEmployees = orgEmployees.length

      const targetDate = new Date(dateFilter)
      const dateStr = format(targetDate, "yyyy-MM-dd")

      const attRes = await fetch(`${base}/api/admin/attendance?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (attRes.ok) {
        const data = await attRes.json()
        const allRecords = data.records || []
        // Note: Backend might return records for all users if not filtered, but we filter by org employees here just in case,
        // although backend /attendance endpoint for admin should already filter by organizationId.
        // However, the previous logic filtered by 'orgEmployeeIds' which were only 'employee' role.
        // If we want to show admins too, we should relax this or include admins in orgEmployeeIds.
        // For now, keeping logic consistent with "Employees" page which shows all.
        // If 'orgEmployees' above (lines 74) filters for role='employee', then attendance will only show for employees.
        // If we want to show all, we should have fetched all employees.
        // Let's stick to the previous behavior but use the correct property.
        const orgRecords = allRecords.filter((r) => orgEmployeeIds.has(r.userId || r.employeeId))

        setAttendanceRecords(orgRecords)

        const present = orgRecords.filter((r) => r.checkIn && !r.checkOut).length
        const checkedOut = orgRecords.filter((r) => r.checkOut).length
        const onBreak = orgRecords.filter((r) => r.breakIn && !r.breakOut).length
        const absent = Math.max(totalEmployees - orgRecords.length, 0)

        setStats({
          totalEmployees,
          presentEmployees: present,
          absentEmployees: absent,
          checkedOut,
          onBreak,
        })
      } else {
        setAttendanceRecords([])
        setStats({
          totalEmployees,
          presentEmployees: 0,
          absentEmployees: totalEmployees,
          checkedOut: 0,
          onBreak: 0,
        })
      }
    } catch (error) {
      console.error("Failed to load attendance:", error)
      setAttendanceRecords([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (record) => {
    if (record.checkOut) {
      return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-0">Checked Out</Badge>
    }
    if (record.breakIn && !record.breakOut) {
      return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0">On Break</Badge>
    }
    if (record.checkIn) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">Present</Badge>
    }
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">Absent</Badge>
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Header */}
        <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 p-6 text-white shadow-xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGM0LjQxOCAwIDgtMy41ODIgOC04cy0zLjU4Mi04LTgtOC04IDMuNTgyLTggOCAzLjU4MiA4IDggOHoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Clock className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Organization Attendance</h1>
              </div>
              <p className="text-purple-100">View attendance records for all employees in your organization</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl">
                <Calendar className="h-4 w-4" />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-auto bg-transparent border-0 text-white placeholder:text-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Button
                onClick={() => router.push("/business-owner/dashboard")}
                className="bg-white text-purple-700 hover:bg-purple-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {stats.totalEmployees}
              </div>
              <p className="text-xs text-muted-foreground mt-1">In organization</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Present</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.presentEmployees}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently working</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Absent</CardTitle>
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.absentEmployees}</div>
              <p className="text-xs text-muted-foreground mt-1">Not checked in</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">On Break</CardTitle>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Coffee className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.onBreak}</div>
              <p className="text-xs text-muted-foreground mt-1">Taking break</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Checked Out</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <LogOut className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.checkedOut}</div>
              <p className="text-xs text-muted-foreground mt-1">Finished day</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              Attendance Records - {format(new Date(dateFilter), "MMMM dd, yyyy")}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              View-only. Employees manage their own attendance from the employee portal.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                <p className="ml-3 text-sm text-muted-foreground">Loading attendance...</p>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                  <UserX className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No attendance records found for {format(new Date(dateFilter), "MMMM dd, yyyy")}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Check In</TableHead>
                    <TableHead className="font-semibold">Check Out</TableHead>
                    <TableHead className="font-semibold">Break In</TableHead>
                    <TableHead className="font-semibold">Break Out</TableHead>
                    <TableHead className="font-semibold">Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <TableCell className="font-medium">{record.userName || record.employeeName}</TableCell>
                      <TableCell>{getStatusBadge(record)}</TableCell>
                      <TableCell>
                        {record.checkIn ? (
                          <span className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{record.checkIn}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.checkOut ? (
                          <span className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{record.checkOut}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.breakIn ? (
                          <span className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{record.breakIn}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.breakOut ? (
                          <span className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{record.breakOut}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.totalHours ? (
                          <Badge className="font-mono bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0">
                            {record.totalHours}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
