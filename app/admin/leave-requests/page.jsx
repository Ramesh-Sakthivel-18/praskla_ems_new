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
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-0">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-0">
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
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-blue-600 rounded-lg shadow-sm">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Leave Requests</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage employee leave requests</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLeaveRequests}
            disabled={loading}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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

      {/* ── Stats Cards ────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Requests</span>
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-xs text-slate-400 mt-1">Pending & Past</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending</span>
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600">{stats.pending}</p>
          <p className="text-xs text-slate-400 mt-1">Needs action</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Approved</span>
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600">{stats.approved}</p>
          <p className="text-xs text-slate-400 mt-1">Granted</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Rejected</span>
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
              <XCircle className="h-4 w-4 text-slate-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-500">{stats.rejected}</p>
          <p className="text-xs text-slate-400 mt-1">Denied</p>
        </div>
      </div>

      {/* ── Leave Requests Table ───────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-50 border border-blue-100 rounded-lg">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800">Employee Requests</h2>
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
            <TabsList className="bg-slate-100 p-1 rounded-lg border border-slate-200 w-full md:w-auto">
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-xs">All</TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-xs">Pending</TabsTrigger>
              <TabsTrigger value="approved" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-xs">Approved</TabsTrigger>
              <TabsTrigger value="rejected" className="data-[state=active]:bg-white data-[state=active]:text-slate-700 data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-xs">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="ml-3 text-sm text-slate-500">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">
                No requests found
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-100 hover:bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-6">Employee</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Dates</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 text-center">Days</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Reason</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                    <TableCell className="py-3.5 px-6 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold shadow-sm">
                          {(request.userName || request.employeeName || "U").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800">{request.userName || request.employeeName || "Unknown"}</div>
                          <div className="text-xs text-slate-400">{formatDate(request.createdAt)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 shadow-none">
                        {request.leaveType}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5 text-sm text-slate-600">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </TableCell>
                    <TableCell className="py-3.5 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {request.days}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5 max-w-xs truncate text-slate-500 text-sm">
                      {request.reason}
                    </TableCell>
                    <TableCell className="py-3.5">{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="py-3.5 text-right">
                      {request.status?.toLowerCase() === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            className="h-7 w-7 p-0 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            onClick={() => handleUpdateStatus(request.id, 'Approved')}
                            disabled={actionLoading === request.id}
                            title="Approve"
                          >
                            {actionLoading === request.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 w-7 p-0 rounded-full bg-red-600 hover:bg-red-700 shadow-sm"
                            onClick={() => handleUpdateStatus(request.id, 'Rejected')}
                            disabled={actionLoading === request.id}
                            title="Reject"
                          >
                            {actionLoading === request.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <X className="h-3.5 w-3.5" />}
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
      </div>
    </div>
  )
}
