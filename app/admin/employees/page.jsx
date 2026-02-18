import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, UserCheck, UserX, Coffee, LogOut, ArrowLeft, RefreshCw, Users, AlertCircle, MapPin } from "lucide-react"
import { format } from "date-fns"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { getValidIdToken } from "@/lib/firebaseClient"

export default function AdminEmployeesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [currentUser, setCurrentUser] = useState(null)
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"))

  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentEmployees: 0,
    absentEmployees: 0,
    checkedOut: 0,
    onBreak: 0,
  })

  // Auth Check
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/admin/login")
      return
    }
    const user = getCurrentUser()
    if (!user || (user.role !== "admin" && user.role !== "system_admin")) {
      navigate("/admin/login")
      return
    }
    setCurrentUser(user)
  }, [navigate])

  const { data: attendanceRecords = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['admin-attendance', dateFilter],
    queryFn: async () => {
      const token = await getValidIdToken()
      if (!token) throw new Error("Authentication failed.")
      const base = import.meta.env.VITE_API_URL || "http://localhost:3000"
      const response = await fetch(`${base}/api/admin/attendance?date=${dateFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`Failed to load attendance: ${response.status}`)
      const data = await response.json()
      return Array.isArray(data) ? data : (data.records || data.data || [])
    },
    enabled: !!currentUser,
  })

  const error = queryError?.message || null
  const loadAttendance = () => queryClient.invalidateQueries({ queryKey: ['admin-attendance', dateFilter] })

  const getStatusBadge = (record) => {
    if (record.checkOut) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Checked Out
        </span>
      )
    }
    if (record.breakIn && !record.breakOut) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          On Break
        </span>
      )
    }
    if (record.checkIn) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Present
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
        Absent
      </span>
    )
  }

  if (!currentUser) return null

  const statCards = [
    { label: "Total", value: stats.totalEmployees, sub: "Employees", icon: Users, accent: "text-blue-600", iconBg: "bg-blue-50 border-blue-100" },
    { label: "Present", value: stats.presentEmployees, sub: "Working now", icon: UserCheck, accent: "text-blue-600", iconBg: "bg-blue-50 border-blue-100" },
    { label: "Absent", value: stats.absentEmployees, sub: "Not in", icon: UserX, accent: "text-slate-500", iconBg: "bg-slate-50 border-slate-100" },
    { label: "On Break", value: stats.onBreak, sub: "Paused", icon: Coffee, accent: "text-blue-600", iconBg: "bg-blue-50 border-blue-100" },
    { label: "Checked Out", value: stats.checkedOut, sub: "Finished", icon: LogOut, accent: "text-slate-600", iconBg: "bg-slate-50 border-slate-200" },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-blue-600 rounded-lg">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Organisation Attendance</h1>
            <p className="text-sm text-slate-500 mt-0.5">View attendance records for all employees</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <Calendar className="h-4 w-4 text-slate-400" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-auto border-0 p-0 h-auto text-sm text-slate-700 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAttendance}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/admin/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-none"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Error Loading Attendance</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
            <Button variant="outline" size="sm" onClick={loadAttendance} className="mt-3 border-red-200 text-red-700 hover:bg-red-100">
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        </div>
      )}

      {/* ── Stat Cards ────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map(({ label, value, sub, icon: Icon, accent, iconBg }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
              <div className={`p-2 rounded-lg border ${iconBg}`}>
                <Icon className={`h-4 w-4 ${accent}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${accent}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Attendance Table ──────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-50 border border-blue-100 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Attendance Records
                <span className="ml-2 text-slate-400 font-normal">
                  {format(new Date(dateFilter), "MMMM dd, yyyy")}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">View-only. Employees manage their own attendance.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm text-slate-500">Loading attendance records…</span>
          </div>
        ) : attendanceRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-slate-100 rounded-full mb-3">
              <UserX className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No records found</p>
            <p className="text-xs text-slate-400 mt-1">No attendance for this date.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-100 hover:bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-6">Employee</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Check In</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Check Out</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Break In</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Break Out</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Total Hours</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRecords.map((record) => (
                  <TableRow key={record.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                    <TableCell className="py-3.5 px-6">
                      <span className="text-sm font-medium text-slate-800">{record.userName || record.employeeName}</span>
                    </TableCell>
                    <TableCell className="py-3.5">{getStatusBadge(record)}</TableCell>
                    <TableCell className="py-3.5">
                      {record.checkIn
                        ? <code className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded">{record.checkIn}</code>
                        : <span className="text-slate-300 text-sm">—</span>}
                    </TableCell>
                    <TableCell className="py-3.5">
                      {record.checkOut
                        ? <code className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded">{record.checkOut}</code>
                        : <span className="text-slate-300 text-sm">—</span>}
                    </TableCell>
                    <TableCell className="py-3.5">
                      {record.breakIn
                        ? <code className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded">{record.breakIn}</code>
                        : <span className="text-slate-300 text-sm">—</span>}
                    </TableCell>
                    <TableCell className="py-3.5">
                      {record.breakOut
                        ? <code className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded">{record.breakOut}</code>
                        : <span className="text-slate-300 text-sm">—</span>}
                    </TableCell>
                    <TableCell className="py-3.5">
                      {record.totalHours
                        ? <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 font-mono">{record.totalHours}</span>
                        : <span className="text-slate-300 text-sm">—</span>}
                    </TableCell>
                    <TableCell className="py-3.5">
                      {(() => {
                        const checkInEvent = record.events?.find(e => e.type === 'checkIn' && e.location)
                        if (checkInEvent?.location) {
                          const { lat, lng } = checkInEvent.location
                          return (
                            <a
                              href={`https://www.google.com/maps?q=${lat},${lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                              title={`Lat: ${lat}, Lng: ${lng}`}
                            >
                              <MapPin className="h-3 w-3" />
                              View Map
                            </a>
                          )
                        }
                        return <span className="text-slate-300 text-sm">—</span>
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}