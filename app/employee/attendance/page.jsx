"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { EmployeeSidebar } from "@/components/employee-sidebar"
import { EmployeeNavbar } from "@/components/employee-navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Clock } from "lucide-react"
import { format } from "date-fns"
import { safeRedirect } from "@/lib/redirectUtils"
import { getValidIdToken } from "@/lib/firebaseClient"

export default function EmployeeAttendancePage() {
  const router = useRouter()
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [currentRecord, setCurrentRecord] = useState(null)

  useEffect(() => {
    if (!localStorage.getItem("employeeLoggedIn")) {
      safeRedirect(router, "/employee/login")
    }
    loadAttendance()
  }, [])

  const getApiBase = () => {
    const env = process.env.NEXT_PUBLIC_API_URL || ''
    if (!env) return 'http://localhost:3000'
    if (env.includes('5001')) return 'http://localhost:3000'
    return env
  }

  const loadAttendance = async () => {
    const token = await getValidIdToken()
    if (!token) return

    try {
      const response = await fetch(`${getApiBase()}/api/attendance/my-records`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        const parseTime = (str) => {
          if (!str || typeof str !== 'string') return NaN
          const normalized = String(str).replace(/\u202f/g, ' ').trim()
          const parts = normalized.split(' ')
          const timePart = parts[0] || normalized
          const ampm = parts[1]
          const [hhStr, mmStrRaw] = timePart.split(':')
          const hhNum = parseInt(hhStr, 10)
          const mmNum = parseInt(mmStrRaw, 10)
          let hh = isNaN(hhNum) ? 0 : hhNum
          const mm = isNaN(mmNum) ? 0 : mmNum
          if (ampm && ampm.toUpperCase() === 'PM' && hh !== 12) hh += 12
          if (ampm && ampm.toUpperCase() === 'AM' && hh === 12) hh = 0
          return hh * 60 + mm
        }
        const cleaned = Array.isArray(data) ? data.map(r => {
          const invalid = !r.totalHours || (typeof r.totalHours === 'string' && r.totalHours.includes('NaN'))
          if (invalid && r.checkIn && r.checkOut) {
            const start = parseTime(r.checkIn)
            const end = parseTime(r.checkOut)
            let bmin = 0
            if (r.breakIn && r.breakOut) {
              const bs = parseTime(r.breakIn)
              const be = parseTime(r.breakOut)
              if (!isNaN(bs) && !isNaN(be)) bmin = Math.max(0, be - bs)
            }
            if (!isNaN(start) && !isNaN(end) && end >= start) {
              const mins = Math.max(0, end - start - bmin)
              const hours = Math.floor(mins / 60)
              const minutes = mins % 60
              r.totalHours = `${hours}h ${minutes}m`
            } else {
              r.totalHours = '0h 0m'
            }
          }
          return r
        }) : data
        setAttendanceRecords(cleaned)
      } else if (response.status === 401) {
        localStorage.removeItem("employeeLoggedIn")
        localStorage.removeItem("firebaseToken")
        safeRedirect(router, "/employee/login")
      }
    } catch (error) {
      console.error('Error loading attendance:', error)
    }
  }

  const handleCheckIn = async () => {
    const token = await getValidIdToken()
    if (!token) return

    try {
      const response = await fetch(`${getApiBase()}/api/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'checkIn' })
      })
      if (response.ok) {
        loadAttendance()
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
      const response = await fetch(`${getApiBase()}/api/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'checkOut' })
      })
      if (response.ok) {
        loadAttendance()
      } else if (response.status === 401) {
        localStorage.removeItem("employeeLoggedIn")
        localStorage.removeItem("firebaseToken")
        safeRedirect(router, "/employee/login")
      }
    } catch (error) {
      console.error('Error checking out:', error)
    }
  }

  const handleBreakStart = async () => {
    const token = await getValidIdToken()
    if (!token) return

    try {
      const response = await fetch(`${getApiBase()}/api/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'breakIn' })
      })
      if (response.ok) {
        loadAttendance()
      } else if (response.status === 401) {
        localStorage.removeItem("employeeLoggedIn")
        localStorage.removeItem("firebaseToken")
        safeRedirect(router, "/employee/login")
      }
    } catch (error) {
      console.error('Error starting break:', error)
    }
  }

  const handleBreakEnd = async () => {
    const token = await getValidIdToken()
    if (!token) return

    try {
      const response = await fetch(`${getApiBase()}/api/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'breakOut' })
      })
      if (response.ok) {
        loadAttendance()
      } else if (response.status === 401) {
        localStorage.removeItem("employeeLoggedIn")
        localStorage.removeItem("firebaseToken")
        safeRedirect(router, "/employee/login")
      }
    } catch (error) {
      console.error('Error ending break:', error)
    }
  }

  const formatTotalHours = (record) => {
    const val = record?.totalHours
    if (val && typeof val === 'string' && !val.includes('NaN')) return val
    const parseTime = (str) => {
      if (!str || typeof str !== 'string') return NaN
      const normalized = String(str).replace(/\u202f/g, ' ').replace(/\u00a0/g, ' ').trim()
      const parts = normalized.split(' ')
      const timePart = parts[0] || normalized
      const ampm = parts[1]
      const [hhStr, mmStrRaw] = timePart.split(':')
      const hhNum = parseInt(hhStr, 10)
      const mmNum = parseInt(mmStrRaw, 10)
      let hh = isNaN(hhNum) ? 0 : hhNum
      const mm = isNaN(mmNum) ? 0 : mmNum
      if (ampm && ampm.toUpperCase() === 'PM' && hh !== 12) hh += 12
      if (ampm && ampm.toUpperCase() === 'AM' && hh === 12) hh = 0
      return hh * 60 + mm
    }
    if (!record?.checkIn || !record?.checkOut) return '-'
    const start = parseTime(record.checkIn)
    const end = parseTime(record.checkOut)
    let bmin = 0
    if (record.breakIn && record.breakOut) {
      const bs = parseTime(record.breakIn)
      const be = parseTime(record.breakOut)
      if (!isNaN(bs) && !isNaN(be)) bmin = Math.max(0, be - bs)
    }
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      const mins = Math.max(0, end - start - bmin)
      const hours = Math.floor(mins / 60)
      const minutes = mins % 60
      return `${hours}h ${minutes}m`
    }
    return '0h 0m'
  }

  return (
    <div className="min-h-screen bg-background">
      <EmployeeSidebar />
      <EmployeeNavbar />

      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">My Attendance</h2>
            <p className="text-muted-foreground mt-1">Track your daily attendance records</p>
          </div>

          {/* Quick Actions */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button onClick={handleCheckIn}>Check In</Button>
                <Button variant="secondary" onClick={handleBreakStart}>Start Break</Button>
                <Button variant="secondary" onClick={handleBreakEnd}>End Break</Button>
                <Button variant="destructive" onClick={handleCheckOut}>Check Out</Button>
              </div>
            </CardContent>
          </Card>

          {/* Attendance History */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Break Start</TableHead>
                    <TableHead>Break End</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.checkIn || '-'}</TableCell>
                      <TableCell>{record.breakIn || '-'}</TableCell>
                      <TableCell>{record.breakOut || '-'}</TableCell>
                      <TableCell>{record.checkOut || '-'}</TableCell>
                      <TableCell>{formatTotalHours(record)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
