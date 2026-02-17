import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Clock, CheckCircle, XCircle, Calendar, ArrowLeft, RefreshCw, AlertCircle, Check, X } from "lucide-react"
import { format } from "date-fns"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { getValidIdToken } from "@/lib/firebaseClient"

const getApiBase = () => import.meta.env.VITE_API_URL || "http://localhost:3000"

export default function AdminLeaveRequestsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [currentUser, setCurrentUser] = useState(null)
  const [allRequests, setAllRequests] = useState([])
  const [filteredRequests, setFilteredRequests] = useState([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [actionLoading, setActionLoading] = useState(null) // ID of request being processed

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
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

  const { data: leaveRequests = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['admin-leave-requests'],
    queryFn: async () => {
      const token = await getValidIdToken()
      if (!token) throw new Error("Authentication failed.")
      const base = import.meta.env.VITE_API_URL || "http://localhost:3000"
      const response = await fetch(`${base}/api/leave/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`Failed to load leave requests: ${response.status}`)
      const data = await response.json()
      return Array.isArray(data.requests) ? data.requests : (data.data || [])
    },
    enabled: !!currentUser,
  })

  // Sync query data with local state for optimistic updates
  useEffect(() => {
    if (leaveRequests.length > 0) {
      setAllRequests(leaveRequests)

      // Update stats
      const pending = leaveRequests.filter((r) => r.status?.toLowerCase() === "pending").length
      const approved = leaveRequests.filter((r) => r.status?.toLowerCase() === "approved").length
      const rejected = leaveRequests.filter((r) => r.status?.toLowerCase() === "rejected").length
      setStats({ total: leaveRequests.length, pending, approved, rejected })
    }
  }, [leaveRequests])

  const error = queryError?.message || null
  const loadLeaveRequests = () => queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] })

  const handleUpdateStatus = async (id, status) => {
    const token = await getValidIdToken()
    const base = getApiBase()

    if (!token) return

    const previousRequests = [...allRequests]

    // Optimistic Update: Update UI immediately
    setAllRequests(prev => prev.map(req =>
      req.id === id ? { ...req, status: status } : req
    ))

    // Also update cached query data
    queryClient.setQueryData(['admin-leave-requests'], (oldData) => {
      if (!oldData) return []
      const list = Array.isArray(oldData) ? oldData : (oldData.data || [])
      return list.map(req => req.id === id ? { ...req, status: status } : req)
    })

    setActionLoading(id)

    try {
      const response = await fetch(`${base}/api/leave/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        // Success - background refresh to ensure consistency
        loadLeaveRequests()
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      } else {
        // Revert on failure
        setAllRequests(previousRequests)
        loadLeaveRequests()
        alert("Failed to update status")
      }
    } catch (error) {
      console.error('Error updating leave request:', error)
      // Revert on error
      setAllRequests(previousRequests)
      loadLeaveRequests()
      alert("Network error")
    } finally {
      setActionLoading(null)
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
      if (dateValue && typeof dateValue === 'object' && dateValue._seconds) {
        return format(new Date(dateValue._seconds * 1000), "MMM dd, yyyy")
      }
      if (dateValue) {
        return format(new Date(dateValue), "MMM dd, yyyy")
      }
      return "N/A"
    } catch {
      return String(dateValue) || "N/A"
    }
  }

  if (!currentUser) return null

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGM0LjQxOCAwIDgtMy41ODIgOC04cy0zLjU4Mi04LTgtOC04IDMuNTgyLTggOCAzLjU4MiA4IDggOHoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Leave Requests</h1>
            </div>
            <p className="text-blue-100">Manage employee leave requests</p>
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
              onClick={() => navigate("/admin/dashboard")}
              className="bg-white text-blue-700 hover:bg-blue-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>
      </div>

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
            <p className="text-xs text-muted-foreground mt-1">Pending & Past</p>
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
            <p className="text-xs text-muted-foreground mt-1">Needs action</p>
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
            <p className="text-xs text-muted-foreground mt-1">Granted</p>
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
            <p className="text-xs text-muted-foreground mt-1">Denied</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              Employee Requests
            </CardTitle>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="bg-white dark:bg-gray-800 border">
                <TabsTrigger value="all" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">All</TabsTrigger>
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
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="ml-3 text-sm text-muted-foreground">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm text-muted-foreground">
                No requests found
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Dates</TableHead>
                  <TableHead className="text-center font-semibold">Days</TableHead>
                  <TableHead className="font-semibold">Reason</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                          {(request.userName || request.employeeName || "U").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{request.userName || request.employeeName || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {request.leaveType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono">
                        {request.days}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-gray-600 dark:text-gray-400">
                      {request.reason}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      {request.status?.toLowerCase() === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            className="h-8 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleUpdateStatus(request.id, 'Approved')}
                            disabled={actionLoading === request.id}
                          >
                            {actionLoading === request.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8"
                            onClick={() => handleUpdateStatus(request.id, 'Rejected')}
                            disabled={actionLoading === request.id}
                          >
                            {actionLoading === request.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                          </Button>
                        </div>
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
  )
}
