"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, UserCheck, UserX, Coffee, LogOut } from "lucide-react"
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
    const current = localStorage.getItem("currentEmployee")
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

  // Event-driven: Load attendance when date changes
  useEffect(() => {
    if (currentUser) {
      loadAttendance()
    }
  }, [currentUser, dateFilter])

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }

  const loadAttendance = async () => {
    setLoading(true)
    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    try {
      // 1. Get all employees in organization
      const empRes = await fetch(`${base}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      let orgEmployees = []
      if (empRes.ok) {
        const empData = await empRes.json()
        const allEmployees = Array.isArray(empData) ? empData : empData.employees || []
        orgEmployees = allEmployees.filter(
          (e) =>
            e.organizationId === currentUser.organizationId &&
            e.isActive !== false &&
            e.role === "employee" // Only regular employees (not admins)
        )
      }

      const orgEmployeeIds = new Set(orgEmployees.map((e) => e.id))
      const totalEmployees = orgEmployees.length

      // 2. Convert yyyy-MM-dd → US date format (MM/DD/YYYY)
      const targetDate = new Date(dateFilter)
      const usDateString = targetDate.toLocaleDateString("en-US")

      // 3. Fetch attendance for selected date
      const attRes = await fetch(`${base}/api/admin/all?date=${usDateString}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (attRes.ok) {
        const data = await attRes.json()
        const allRecords = Array.isArray(data) ? data : data.attendance || []

        // Filter to only organization employees
        const orgRecords = allRecords.filter((r) =>
          orgEmployeeIds.has(r.employeeId)
        )

        setAttendanceRecords(orgRecords)

        // Calculate stats
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
      return <Badge variant="secondary">Checked Out</Badge>
    }
    if (record.breakIn && !record.breakOut) {
      return <Badge variant="outline" className="border-orange-500 text-orange-600">On Break</Badge>
    }
    if (record.checkIn) {
      return <Badge variant="default" className="bg-green-600">Present</Badge>
    }
    return <Badge variant="destructive">Absent</Badge>
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
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Organization Attendance
            </h1>
            <p className="text-sm text-muted-foreground">
              View attendance records for all employees in your organization
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-auto"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/business-owner/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">In organization</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Present</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.presentEmployees}
              </div>
              <p className="text-xs text-muted-foreground">Currently working</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <UserX className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats.absentEmployees}
              </div>
              <p className="text-xs text-muted-foreground">Not checked in</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">On Break</CardTitle>
              <Coffee className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.onBreak}
              </div>
              <p className="text-xs text-muted-foreground">Taking break</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Checked Out</CardTitle>
              <LogOut className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.checkedOut}
              </div>
              <p className="text-xs text-muted-foreground">Finished day</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Attendance Records
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              View-only. Employees can manage their own attendance from the employee portal.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading attendance...</p>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserX className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No attendance records found for {format(new Date(dateFilter), "MMMM dd, yyyy")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Break In</TableHead>
                      <TableHead>Break Out</TableHead>
                      <TableHead>Total Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.employeeName}
                        </TableCell>
                        <TableCell>{getStatusBadge(record)}</TableCell>
                        <TableCell>
                          {record.checkIn ? (
                            <span className="text-sm">{record.checkIn}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.checkOut ? (
                            <span className="text-sm">{record.checkOut}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.breakIn ? (
                            <span className="text-sm">{record.breakIn}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.breakOut ? (
                            <span className="text-sm">{record.breakOut}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.totalHours ? (
                            <Badge variant="outline" className="font-mono">
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
