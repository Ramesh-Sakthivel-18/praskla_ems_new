"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Clock, CheckCircle, XCircle, Calendar, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { safeRedirect } from "@/lib/redirectUtils"

export default function BusinessOwnerLeaveRequestsPage() {
  const router = useRouter()

  const [currentUser, setCurrentUser] = useState(null)
  const [allRequests, setAllRequests] = useState([])
  const [filteredRequests, setFilteredRequests] = useState([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
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
      loadLeaveRequests()
    }
  }, [currentUser])

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredRequests(allRequests)
    } else {
      const filtered = allRequests.filter(
        (req) => req.status.toLowerCase() === statusFilter.toLowerCase()
      )
      setFilteredRequests(filtered)
    }
  }, [statusFilter, allRequests])

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }

  const loadLeaveRequests = async () => {
    console.log("🔄 Loading leave requests, currentUser:", currentUser)
    setLoading(true)
    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    try {
      const empRes = await fetch(`${base}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      let orgEmployeeIds = new Set()
      if (empRes.ok) {
        const empData = await empRes.json()
        console.log("📊 Employees response:", empData)
        const allEmployees = Array.isArray(empData) ? empData : empData.employees || []
        // Backend already filters by org, just filter by active status
        const orgEmployees = allEmployees.filter((e) => e.isActive !== false)
        orgEmployeeIds = new Set(orgEmployees.map((e) => e.id))
        console.log("👥 Employee IDs for leave filtering:", orgEmployeeIds.size)
      }

      const leaveRes = await fetch(`${base}/api/leave/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log("📋 Leave API response status:", leaveRes.status)

      if (leaveRes.ok) {
        const data = await leaveRes.json()
        console.log("📋 Leave API data:", data)
        const allLeaves = Array.isArray(data.requests) ? data.requests : data.requests || []
        console.log("📋 All leaves count:", allLeaves.length)
        console.log("📋 All leaves:", allLeaves)
        console.log("📋 Employee IDs in set:", [...orgEmployeeIds])
        console.log("📋 Leave employeeIds:", allLeaves.map(l => l.employeeId))

        // Skip filtering - just show all leaves for the org
        const orgLeaves = allLeaves
        console.log("📋 Org leaves after filter:", orgLeaves.length)

        orgLeaves.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0)
          const dateB = new Date(b.createdAt || 0)
          return dateB - dateA
        })

        setAllRequests(orgLeaves)
        setFilteredRequests(orgLeaves)

        const pending = orgLeaves.filter((r) => r.status?.toLowerCase() === "pending").length
        const approved = orgLeaves.filter((r) => r.status?.toLowerCase() === "approved").length
        const rejected = orgLeaves.filter((r) => r.status?.toLowerCase() === "rejected").length

        setStats({
          total: orgLeaves.length,
          pending,
          approved,
          rejected,
        })
      } else {
        console.error("📋 Leave API error:", leaveRes.status)
        setAllRequests([])
        setFilteredRequests([])
      }
    } catch (error) {
      console.error("Failed to load leave requests:", error)
      setAllRequests([])
      setFilteredRequests([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase()
    switch (normalizedStatus) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateValue) => {
    try {
      // Handle Firestore timestamp object
      if (dateValue && typeof dateValue === 'object' && dateValue._seconds) {
        return format(new Date(dateValue._seconds * 1000), "MMM dd, yyyy")
      }
      // Handle regular date string
      if (dateValue) {
        return format(new Date(dateValue), "MMM dd, yyyy")
      }
      return "N/A"
    } catch {
      return String(dateValue) || "N/A"
    }
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
                  <FileText className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Leave Requests</h1>
              </div>
              <p className="text-purple-100">View all leave requests from employees in your organization</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={loadLeaveRequests}
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
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
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {stats.total}
              </div>
              <p className="text-xs text-muted-foreground mt-1">All leave requests</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</CardTitle>
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting decision</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
              <p className="text-xs text-muted-foreground mt-1">Leave granted</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</CardTitle>
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground mt-1">Leave denied</p>
            </CardContent>
          </Card>
        </div>

        {/* Leave Requests Table */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  Leave Requests ({filteredRequests.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  View-only. Admins can approve or reject leave requests.
                </p>
              </div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="bg-white dark:bg-gray-800 border">
                  <TabsTrigger value="all" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">All</TabsTrigger>
                  <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-700">Pending</TabsTrigger>
                  <TabsTrigger value="approved" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">Approved</TabsTrigger>
                  <TabsTrigger value="rejected" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700">Rejected</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                <p className="ml-3 text-sm text-muted-foreground">Loading leave requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {statusFilter === "all" ? "No leave requests found" : `No ${statusFilter} leave requests`}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold">Leave Type</TableHead>
                    <TableHead className="font-semibold">Start Date</TableHead>
                    <TableHead className="font-semibold">End Date</TableHead>
                    <TableHead className="text-center font-semibold">Days</TableHead>
                    <TableHead className="font-semibold">Reason</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Requested On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <TableCell className="font-medium">{request.userName || request.employeeName || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800">
                          {request.leaveType}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(request.startDate)}</TableCell>
                      <TableCell>{formatDate(request.endDate)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-0 font-mono">
                          {request.days}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-gray-600 dark:text-gray-400">
                        {request.reason}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(request.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">View-Only Access</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  As a business owner, you can view all leave requests but cannot approve or reject them.
                  Your admins have the authority to manage leave approvals.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
