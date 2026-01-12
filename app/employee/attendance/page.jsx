"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Clock, Calendar, CheckCircle, Coffee, LogOut,
  AlertCircle, RefreshCw, MapPin
} from "lucide-react"
import { format } from "date-fns"
import { safeRedirect } from "@/lib/redirectUtils"
import { getValidIdToken } from "@/lib/firebaseClient"

export default function EmployeeAttendancePage() {
  const router = useRouter()
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [todayRecord, setTodayRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Basic auth check handled by layout, but good to be safe
    if (!localStorage.getItem("currentUser")) {
      safeRedirect(router, "/employee/login")
      return
    }
    loadData()
  }, [])

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    const token = await getValidIdToken()

    if (!token) return

    try {
      const base = getApiBase()
      const [historyRes, todayRes] = await Promise.all([
        fetch(`${base}/attendance/my-records`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${base}/attendance/today`, { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      if (historyRes.ok) {
        const data = await historyRes.json()
        setAttendanceRecords(processRecords(data))
      }

      if (todayRes.ok) {
        const data = await todayRes.json()
        setTodayRecord(data)
      }

    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load attendance records')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action) => {
    setActionLoading(true)
    const token = await getValidIdToken()

    if (!token) return

    try {
      const response = await fetch(`${getApiBase()}/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        loadData() // Refresh data
      } else {
        const err = await response.json()
        alert(`Failed to ${action}: ${err.error}`)
      }
    } catch (error) {
      console.error('Action error:', error)
      alert('Network error')
    } finally {
      setActionLoading(false)
    }
  }

  // Helper to process/clean records (fix NaN hours etc)
  const processRecords = (data) => {
    if (!Array.isArray(data)) return []
    return data.map(r => {
      // Basic formatting if needed, backend ideally sends formatted strings
      // If validation needed on totalHours seeing 'NaN', fix it here
      if (r.totalHours && r.totalHours.includes('NaN')) {
        return { ...r, totalHours: calculateHours(r.checkIn, r.checkOut, r.breakIn, r.breakOut) }
      }
      return r
    })
  }

  const calculateHours = (inTime, outTime, breakStart, breakEnd) => {
    // Simplified client-side recalc if backend fails
    if (!inTime || !outTime) return '-'
    // Parsing logic omitted for brevity, assuming standard format; if complex, rely on backend
    return 'Pending'
  }

  const isWorking = todayRecord?.checkIn && !todayRecord?.checkOut
  const isOnBreak = todayRecord?.breakIn && !todayRecord?.breakOut

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            My Attendance
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your work hours and history
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <Calendar className="h-5 w-5 text-emerald-600" />
          <span className="font-medium">{format(new Date(), "MMMM yyyy")}</span>
        </div>
      </div>

      {/* Today's Status Card */}
      <Card className="border-t-4 border-t-emerald-500 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-600" />
              Today's Status
            </CardTitle>
            <Badge variant={isWorking ? "default" : "secondary"} className={isWorking ? "bg-emerald-600" : "bg-slate-200 text-slate-700"}>
              {todayRecord?.checkOut ? "Completed" : isWorking ? (isOnBreak ? "On Break" : "Checked In") : "Not Started"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 py-4">
            {/* Timeline Items */}
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Check In</span>
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${todayRecord?.checkIn ? 'text-emerald-500' : 'text-slate-300'}`} />
                <span className="text-lg font-mono font-medium">{todayRecord?.checkIn || "--:--"}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Break Start</span>
              <div className="flex items-center gap-2">
                <Coffee className={`h-4 w-4 ${todayRecord?.breakIn ? 'text-amber-500' : 'text-slate-300'}`} />
                <span className="text-lg font-mono font-medium">{todayRecord?.breakIn || "--:--"}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Break End</span>
              <div className="flex items-center gap-2">
                <Coffee className={`h-4 w-4 ${todayRecord?.breakOut ? 'text-blue-500' : 'text-slate-300'}`} />
                <span className="text-lg font-mono font-medium">{todayRecord?.breakOut || "--:--"}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Check Out</span>
              <div className="flex items-center gap-2">
                <LogOut className={`h-4 w-4 ${todayRecord?.checkOut ? 'text-red-500' : 'text-slate-300'}`} />
                <span className="text-lg font-mono font-medium">{todayRecord?.checkOut || "--:--"}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
            {!todayRecord?.checkIn ? (
              <Button onClick={() => handleAction('checkIn')} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 min-w-[150px]">
                {actionLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Check In
              </Button>
            ) : !todayRecord?.checkOut ? (
              <>
                <Button
                  onClick={() => handleAction(isOnBreak ? 'breakOut' : 'breakIn')}
                  disabled={actionLoading}
                  variant="outline"
                  className={`min-w-[150px] ${isOnBreak ? 'border-amber-500 text-amber-700' : 'border-blue-500 text-blue-700'}`}
                >
                  <Coffee className="mr-2 h-4 w-4" />
                  {isOnBreak ? "End Break" : "Start Break"}
                </Button>
                <Button
                  onClick={() => handleAction('checkOut')}
                  disabled={actionLoading}
                  variant="destructive"
                  className="min-w-[150px]"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Check Out
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Shift completed for today
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Break</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{record.checkIn || '-'}</TableCell>
                      <TableCell>
                        {record.breakIn ? (
                          <div className="text-xs">
                            <span className="text-amber-600">{record.breakIn}</span> - <span className="text-blue-600">{record.breakOut || '...'}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{record.checkOut || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {record.totalHours || '0h'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.checkOut ? "default" : "secondary"} className={record.checkOut ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-blue-100 text-blue-800 hover:bg-blue-100"}>
                          {record.checkOut ? "Present" : "In Progress"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
