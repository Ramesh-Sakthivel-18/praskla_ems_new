import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Clock, CheckCircle, XCircle, Calendar, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { safeRedirect } from "@/lib/redirectUtils"

const getApiBase = () => import.meta.env.VITE_API_URL || "http://localhost:3000"

const fetchLeaveRequests = async () => {
  const token = localStorage.getItem("firebaseToken")
  const base = getApiBase()

  const leaveRes = await fetch(`${base}/api/leave/all`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!leaveRes.ok) throw new Error(`Failed to load leave requests: ${leaveRes.status}`)

  const data = await leaveRes.json()
  const allLeaves = Array.isArray(data.requests) ? data.requests : data.requests || []

  allLeaves.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0)
    const dateB = new Date(b.createdAt || 0)
    return dateB - dateA
  })

  return allLeaves
}

export default function BusinessOwnerLeaveRequestsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [currentUser, setCurrentUser] = useState(null)
  const [statusFilter, setStatusFilter] = useState("all")

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

  const { data: allRequests = [], isLoading: loading } = useQuery({
    queryKey: ['bo-leave-requests'],
    queryFn: fetchLeaveRequests,
    enabled: !!currentUser,
  })

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return allRequests
    return allRequests.filter((req) => req.status?.toLowerCase() === statusFilter.toLowerCase())
  }, [statusFilter, allRequests])

  const stats = useMemo(() => {
    const pending = allRequests.filter((r) => r.status?.toLowerCase() === "pending").length
    const approved = allRequests.filter((r) => r.status?.toLowerCase() === "approved").length
    const rejected = allRequests.filter((r) => r.status?.toLowerCase() === "rejected").length
    return { total: allRequests.length, pending, approved, rejected }
  }, [allRequests])

  const loadLeaveRequests = () => queryClient.invalidateQueries({ queryKey: ['bo-leave-requests'] })

  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase()
    switch (normalizedStatus) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
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
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">{status}</Badge>
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
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Leave Requests
          </h1>
          <p className="text-slate-500 mt-1">
            View all leave requests from employees in your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLeaveRequests}
            disabled={loading}
            className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/business-owner/dashboard")}
            className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Requests</CardTitle>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.total}
            </div>
            <p className="text-xs text-slate-500 mt-1">All leave requests</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending</CardTitle>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.pending}</div>
            <p className="text-xs text-slate-500 mt-1">Awaiting decision</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Approved</CardTitle>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.approved}</div>
            <p className="text-xs text-slate-500 mt-1">Leave granted</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Rejected</CardTitle>
            <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.rejected}</div>
            <p className="text-xs text-slate-500 mt-1">Leave denied</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <FileText className="h-4 w-4 text-slate-500" />
                Leave Requests ({filteredRequests.length})
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                View-only. Admins can approve or reject leave requests.
              </p>
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <TabsTrigger value="all" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">All</TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">Pending</TabsTrigger>
                <TabsTrigger value="approved" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800">Approved</TabsTrigger>
                <TabsTrigger value="rejected" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="ml-3 text-sm text-slate-500">Loading leave requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <FileText className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500">
                {statusFilter === "all" ? "No leave requests found" : `No ${statusFilter} leave requests`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="font-semibold text-slate-600">Employee</TableHead>
                  <TableHead className="font-semibold text-slate-600">Leave Type</TableHead>
                  <TableHead className="font-semibold text-slate-600">Start Date</TableHead>
                  <TableHead className="font-semibold text-slate-600">End Date</TableHead>
                  <TableHead className="text-center font-semibold text-slate-600">Days</TableHead>
                  <TableHead className="font-semibold text-slate-600">Reason</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600">Requested On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium text-slate-900">{request.userName || request.employeeName || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                        {request.leaveType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">{formatDate(request.startDate)}</TableCell>
                    <TableCell className="text-slate-600">{formatDate(request.endDate)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-mono">
                        {request.days}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-slate-600">
                      {request.reason}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-sm text-slate-500">
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
      <Card className="border-blue-100 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/20 shadow-sm">
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
  )
}
