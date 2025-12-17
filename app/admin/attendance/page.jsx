"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminNavbar } from "@/components/admin-navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Clock, UserCheck, UserX } from "lucide-react"
import { format, parseISO } from "date-fns"
import { safeRedirect } from "@/lib/redirectUtils"

export default function AdminAttendancePage() {
  const router = useRouter()
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"))
  const [lastUpdated, setLastUpdated] = useState(null)
  const [todayStats, setTodayStats] = useState({
    totalEmployees: 0,
    presentEmployees: 0,
    onBreak: 0,
    checkedOut: 0
  })

  useEffect(() => {
    if (!localStorage.getItem("adminLoggedIn")) {
      console.log('⚠️ AdminAttendance: Not logged in, redirecting to login')
      safeRedirect(router, "/admin/login")
      return
    }

    const token = localStorage.getItem("firebaseToken")
    if (!token) {
      console.log('⚠️ AdminAttendance: No token found, redirecting to login')
      safeRedirect(router, "/admin/login")
      return
    }

    loadAttendance()
  }, [dateFilter, router])

  const loadAttendance = async () => {
    const token = localStorage.getItem("firebaseToken")
    if (!token) return

    try {
      // Updated API endpoint - using the correct admin route
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/admin/all?date=${dateFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ AdminAttendance: Received attendance data:', data.length, 'records')
        // Ensure data is an array
        const recordsArray = Array.isArray(data) ? data : (data.attendance || [])
        setAttendanceRecords(recordsArray)
        
        // Calculate today's statistics
        const today = new Date().toLocaleDateString('en-US')
        const todayRecords = recordsArray.filter(record => record.date === today)
        
        let stats = {
          totalEmployees: todayRecords.length,
          presentEmployees: todayRecords.filter(r => r.checkIn && !r.checkOut).length,
          onBreak: todayRecords.filter(r => r.breakIn && !r.breakOut).length,
          checkedOut: todayRecords.filter(r => r.checkOut).length
        }
        
        // Fetch total active employees to show real count in the card
        try {
          const empRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/admin/employees`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (empRes.ok) {
            const empData = await empRes.json()
            const employees = Array.isArray(empData) ? empData : (empData.employees || [])
            stats.totalEmployees = employees.filter(e => e.isActive !== false).length
          }
        } catch (e) {
          console.warn('⚠️ AdminAttendance: Failed to fetch employees count', e)
        }
        
        setTodayStats(stats)
        setLastUpdated(new Date())
        console.log('📊 AdminAttendance: Today\'s stats:', stats)
      } else {
        console.error('❌ AdminAttendance: Failed to load attendance:', response.status)
        console.error('❌ AdminAttendance: Response text:', await response.text())
        
        // If unauthorized, clear tokens and redirect to login
        if (response.status === 401) {
          console.log('🔄 AdminAttendance: Token expired or invalid, redirecting to login')
          localStorage.removeItem("adminLoggedIn")
          localStorage.removeItem("firebaseToken")
          localStorage.removeItem("currentEmployee")
          safeRedirect(router, "/admin/login")
        } else if (response.status === 404) {
          // Handle 404 by setting empty array
          setAttendanceRecords([])
          setTodayStats({
            totalEmployees: 0,
            presentEmployees: 0,
            onBreak: 0,
            checkedOut: 0
          })
        }
      }
    } catch (error) {
      console.error('❌ AdminAttendance: Error loading attendance:', error)
      // Set empty array on error to prevent UI issues
      setAttendanceRecords([])
    }
  }

  const handleCheckIn = async (employeeId) => {
    const token = localStorage.getItem("firebaseToken")
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'checkIn', employeeId })
      })

      if (response.ok) {
        loadAttendance()
      }
    } catch (error) {
      console.error('Error checking in employee:', error)
    }
  }

  const handleCheckOut = async (employeeId) => {
    const token = localStorage.getItem("firebaseToken")
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'checkOut', employeeId })
      })

      if (response.ok) {
        loadAttendance()
      }
    } catch (error) {
      console.error('Error checking out employee:', error)
    }
  }

  const handleBreakStart = async (employeeId) => {
    const token = localStorage.getItem("firebaseToken")
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'breakIn', employeeId })
      })

      if (response.ok) {
        loadAttendance()
      }
    } catch (error) {
      console.error('Error starting break:', error)
    }
  }

  const handleBreakEnd = async (employeeId) => {
    const token = localStorage.getItem("firebaseToken")
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'breakOut', employeeId })
      })

      if (response.ok) {
        loadAttendance()
      }
    } catch (error) {
      console.error('Error ending break:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminNavbar />

      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">Attendance Management</h2>
            <p className="text-muted-foreground mt-1">Track and manage employee attendance records</p>
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
                <UserCheck className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{todayStats.totalEmployees}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
                <UserCheck className="w-5 h-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{todayStats.presentEmployees}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">On Break</CardTitle>
                <Clock className="w-5 h-5 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">{todayStats.onBreak}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Checked Out</CardTitle>
                <UserX className="w-5 h-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{todayStats.checkedOut}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Filter Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="date" className="text-sm font-medium">Date:</label>
                  <Input
                    id="date"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button onClick={loadAttendance}>Refresh</Button>
                {lastUpdated && (
                  <span className="text-sm text-muted-foreground">
                    Last updated: {format(lastUpdated, "h:mm a")}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Records */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Break Start</TableHead>
                    <TableHead>Break End</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords && attendanceRecords.length > 0 ? (
                    attendanceRecords.map((record) => (
                      <TableRow key={record.id || record.employeeId + record.date}>
                        <TableCell className="font-medium">{record.employeeName || 'Unknown'}</TableCell>
                        <TableCell>{record.date || 'N/A'}</TableCell>
                        <TableCell>{record.checkIn || '-'}</TableCell>
                        <TableCell>{record.breakIn || '-'}</TableCell>
                        <TableCell>{record.breakOut || '-'}</TableCell>
                        <TableCell>{record.checkOut || '-'}</TableCell>
                        <TableCell>
                          {record.checkOut ? (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                              Checked Out
                            </span>
                          ) : record.breakIn && !record.breakOut ? (
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                              On Break
                            </span>
                          ) : record.checkIn ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                              Not Checked In
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!record.checkIn ? (
                            <Button size="sm" onClick={() => handleCheckIn(record.employeeId)}>
                              Check In
                            </Button>
                          ) : !record.checkOut ? (
                            <>
                              {!record.breakIn || (record.breakIn && record.breakOut) ? (
                                <Button size="sm" variant="secondary" onClick={() => handleBreakStart(record.employeeId)} className="mr-2">
                                  Start Break
                                </Button>
                              ) : (
                                <Button size="sm" variant="secondary" onClick={() => handleBreakEnd(record.employeeId)} className="mr-2">
                                  End Break
                                </Button>
                              )}
                              <Button size="sm" variant="destructive" onClick={() => handleCheckOut(record.employeeId)}>
                                Check Out
                              </Button>
                            </>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan="8" className="text-center py-8 text-muted-foreground">
                        No attendance records found for the selected date.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
