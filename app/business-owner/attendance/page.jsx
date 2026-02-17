import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, UserCheck, UserX, Coffee, LogOut, ArrowLeft, RefreshCw, Users, MapPin } from "lucide-react"
import { format } from "date-fns"
import { safeRedirect } from "@/lib/redirectUtils"

const getApiBase = () => import.meta.env.VITE_API_URL || "http://localhost:3000"

const fetchAttendance = async (dateFilter) => {
  const token = localStorage.getItem("firebaseToken")
  const base = getApiBase()

  const empRes = await fetch(`${base}/api/admin/employees?role=employee`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  let orgEmployees = []
  if (empRes.ok) {
    const empData = await empRes.json()
    const allEmployees = Array.isArray(empData) ? empData : empData.employees || []
    orgEmployees = allEmployees.filter((e) => e.isActive !== false)
  }

  const orgEmployeeIds = new Set(orgEmployees.map((e) => e.id))
  const totalEmployees = orgEmployees.length
  const dateStr = format(new Date(dateFilter), "yyyy-MM-dd")

  const attRes = await fetch(`${base}/api/admin/attendance?date=${dateStr}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  let orgRecords = []
  if (attRes.ok) {
    const data = await attRes.json()
    const allRecords = data.records || []
    orgRecords = allRecords.filter((r) => orgEmployeeIds.has(r.userId || r.employeeId))
  }

  return { orgRecords, totalEmployees }
}

export default function BusinessOwnerAttendancePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [currentUser, setCurrentUser] = useState(null)
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"))

  useEffect(() => {
    const current = localStorage.getItem("currentUser")
    if (!current) {
      safeRedirect(navigate, "/business-owner/login")
      return
    }
    const emp = JSON.parse(current)
    if (emp.role !== "business_owner") {
      alert("Unauthorized. Business Owner access required.")
      safeRedirect(navigate, "/role-selection")
      return
    }
    setCurrentUser(emp)
  }, [navigate])

  const { data, isLoading: loading } = useQuery({
    queryKey: ['bo-attendance', dateFilter],
    queryFn: () => fetchAttendance(dateFilter),
    enabled: !!currentUser,
  })

  const attendanceRecords = data?.orgRecords || []
  const totalEmployees = data?.totalEmployees || 0

  const stats = useMemo(() => {
    const present = attendanceRecords.filter((r) => r.checkIn && !r.checkOut).length
    const checkedOut = attendanceRecords.filter((r) => r.checkOut).length
    const onBreak = attendanceRecords.filter((r) => r.breakIn && !r.breakOut).length
    const absent = Math.max(totalEmployees - attendanceRecords.length, 0)
    return { totalEmployees, presentEmployees: present, absentEmployees: absent, checkedOut, onBreak }
  }, [attendanceRecords, totalEmployees])

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
                onClick={() => navigate("/business-owner/dashboard")}
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
                    <TableHead className="font-semibold">Location</TableHead>
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
                      <TableCell>
                        {(() => {
                          const checkInEvent = record.events?.find(e => e.type === 'checkIn' && e.location);
                          if (checkInEvent?.location) {
                            const { lat, lng } = checkInEvent.location;
                            return (
                              <a
                                href={`https://www.google.com/maps?q=${lat},${lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                title={`Lat: ${lat}, Lng: ${lng}`}
                              >
                                <MapPin className="h-3 w-3" />
                                View Map
                              </a>
                            );
                          }
                          return <span className="text-muted-foreground text-xs">-</span>;
                        })()}
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
