import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
  FileText, Clock, CheckCircle, XCircle, AlertTriangle, ArrowLeft,
  RefreshCw, AlertCircle, Search, Eye, Calendar, Filter, X
} from "lucide-react"
import { format } from "date-fns"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { getValidIdToken } from "@/lib/firebaseClient"

export default function AdminLeaveRequestsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState("all")

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Detail Dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [viewingLeave, setViewingLeave] = useState(null)

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

  const { data: leaveRequests = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['admin-leave-requests'],
    queryFn: async () => {
      const token = await getValidIdToken()
      if (!token) throw new Error("Authentication failed.")
      const base = import.meta.env.VITE_API_URL || "http://localhost:3000"
      const response = await fetch(`${base}/api/admin/leaves`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`Failed to load leave requests: ${response.status}`)
      const data = await response.json()
      return data.leaves || data.data || (Array.isArray(data) ? data : [])
    },
    enabled: !!currentUser,
    staleTime: 30000,
  })

  const error = queryError?.message || null
  const refreshLeaves = () => queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] })

  // ── Computed Values ──────────────────────────────
  const leaveTypes = useMemo(() => {
    const types = new Set()
    leaveRequests.forEach((lr) => {
      if (lr.type || lr.leaveType) types.add(lr.type || lr.leaveType)
    })
    return Array.from(types).sort()
  }, [leaveRequests])

  const stats = useMemo(() => ({
    total: leaveRequests.length,
    pending: leaveRequests.filter((r) => r.status === "pending").length,
    approved: leaveRequests.filter((r) => r.status === "approved").length,
    rejected: leaveRequests.filter((r) => r.status === "rejected").length,
  }), [leaveRequests])

  // ── Client-side Filtering with useMemo ──────────
  const filteredLeaves = useMemo(() => {
    let filtered = leaveRequests

    // Tab status filter
    if (activeTab !== "all") {
      filtered = filtered.filter((r) => r.status === activeTab)
    }

    // Search by name
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          (r.userName || r.employeeName || "").toLowerCase().includes(term) ||
          (r.reason || "").toLowerCase().includes(term)
      )
    }

    // Leave type filter
    if (leaveTypeFilter !== "all") {
      filtered = filtered.filter(
        (r) => (r.type || r.leaveType) === leaveTypeFilter
      )
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter((r) => {
        const leaveStart = r.startDate || r.fromDate
        return leaveStart && leaveStart >= dateFrom
      })
    }
    if (dateTo) {
      filtered = filtered.filter((r) => {
        const leaveEnd = r.endDate || r.toDate
        return leaveEnd && leaveEnd <= dateTo
      })
    }

    return filtered
  }, [leaveRequests, activeTab, searchTerm, leaveTypeFilter, dateFrom, dateTo])

  // ── Badge Helpers ───────────────────────────────
  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
      case "pending":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Pending</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200">{status}</Badge>
    }
  }

  const hasActiveFilters = searchTerm || leaveTypeFilter !== "all" || dateFrom || dateTo

  if (!currentUser) return null

  const statusTabs = [
    { key: "all", label: "All", count: stats.total, icon: FileText },
    { key: "pending", label: "Pending", count: stats.pending, icon: Clock },
    { key: "approved", label: "Approved", count: stats.approved, icon: CheckCircle },
    { key: "rejected", label: "Rejected", count: stats.rejected, icon: XCircle },
  ]

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
            <p className="text-sm text-slate-500 mt-0.5">View all employee leave requests across the organization</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshLeaves}
            disabled={loading}
            className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
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

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Error Loading Leave Requests</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
            <Button variant="outline" size="sm" onClick={refreshLeaves} className="mt-3 border-red-200 text-red-700 hover:bg-red-100">
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        </div>
      )}

      {/* ── Status Tabs ─────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statusTabs.map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`bg-white border rounded-xl p-5 text-left shadow-sm hover:shadow-md transition-all duration-200 ${activeTab === key
                ? "border-blue-300 ring-2 ring-blue-100"
                : "border-slate-200"
              }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
              <div className={`p-2 rounded-lg border ${activeTab === key
                  ? "bg-blue-50 border-blue-100"
                  : "bg-slate-50 border-slate-100"
                }`}>
                <Icon className={`h-4 w-4 ${activeTab === key ? "text-blue-600" : "text-slate-400"
                  }`} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${activeTab === key ? "text-blue-600" : "text-slate-700"
              }`}>{count}</p>
            <p className="text-xs text-slate-400 mt-1">
              {key === "all" ? "Total requests" : `${label} requests`}
            </p>
          </button>
        ))}
      </div>

      {/* ── Table with Search & Filters ──────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by employee name or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200 focus-visible:ring-blue-500 bg-slate-50 hover:bg-white transition-colors"
              />
            </div>

            {/* Leave Type */}
            <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
              <SelectTrigger className="w-[160px] border-slate-200 text-sm">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="Leave Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {leaveTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
              <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From"
                className="w-[120px] border-0 p-0 h-auto text-xs text-slate-700 focus-visible:ring-0 bg-transparent"
              />
              <span className="text-xs text-slate-300">—</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To"
                className="w-[120px] border-0 p-0 h-auto text-xs text-slate-700 focus-visible:ring-0 bg-transparent"
              />
            </div>

            {/* Clear */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-red-500 gap-1"
                onClick={() => {
                  setSearchTerm("")
                  setLeaveTypeFilter("all")
                  setDateFrom("")
                  setDateTo("")
                }}
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-700">{filteredLeaves.length}</span> of{" "}
              <span className="font-semibold text-slate-700">{leaveRequests.length}</span> requests
            </span>
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="ml-3 text-sm text-slate-500">Loading leave requests...</p>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-slate-100 rounded-full mb-3">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No leave requests found</p>
              <p className="text-xs text-slate-400 mt-1">
                {hasActiveFilters || activeTab !== "all"
                  ? "Try adjusting your filters or search."
                  : "No leave requests have been submitted yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-100 hover:bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-6">Employee</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Dates</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Days</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Reason</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeaves.map((leave) => {
                  const startDate = leave.startDate || leave.fromDate || ""
                  const endDate = leave.endDate || leave.toDate || ""
                  const leaveType = leave.type || leave.leaveType || "—"
                  const employeeName = leave.userName || leave.employeeName || "Unknown"

                  return (
                    <TableRow key={leave.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <TableCell className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold">
                            {employeeName.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-800">{employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge className="bg-blue-50 text-blue-600 border-blue-100">{leaveType}</Badge>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="text-xs text-slate-600 space-y-0.5">
                          <div>{startDate ? format(new Date(startDate), "MMM dd, yyyy") : "—"}</div>
                          {endDate && endDate !== startDate && (
                            <div className="text-slate-400">to {format(new Date(endDate), "MMM dd, yyyy")}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="text-sm font-medium text-slate-700">
                          {leave.days || leave.totalDays || "1"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5">{getStatusBadge(leave.status)}</TableCell>
                      <TableCell className="py-3.5">
                        <span className="text-xs text-slate-500 max-w-[200px] truncate block">
                          {leave.reason || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => { setViewingLeave(leave); setDetailOpen(true) }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </div>

      {/* ── Leave Detail Dialog ──────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Leave Request Details
            </DialogTitle>
          </DialogHeader>
          {viewingLeave && (
            <div className="space-y-4 py-2">
              {/* Employee Info */}
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="h-12 w-12 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center text-blue-700 text-lg font-bold">
                  {(viewingLeave.userName || viewingLeave.employeeName || "U").substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {viewingLeave.userName || viewingLeave.employeeName || "Unknown"}
                  </h3>
                  <div className="mt-1">{getStatusBadge(viewingLeave.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase">Leave Type</span>
                  <p className="mt-1 text-sm text-slate-700">{viewingLeave.type || viewingLeave.leaveType || "—"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase">Days</span>
                  <p className="mt-1 text-sm text-slate-700">{viewingLeave.days || viewingLeave.totalDays || "1"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase">Start Date</span>
                  <p className="mt-1 text-sm text-slate-700">
                    {(viewingLeave.startDate || viewingLeave.fromDate)
                      ? format(new Date(viewingLeave.startDate || viewingLeave.fromDate), "MMMM dd, yyyy")
                      : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase">End Date</span>
                  <p className="mt-1 text-sm text-slate-700">
                    {(viewingLeave.endDate || viewingLeave.toDate)
                      ? format(new Date(viewingLeave.endDate || viewingLeave.toDate), "MMMM dd, yyyy")
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Reason</span>
                <p className="mt-1 text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3">
                  {viewingLeave.reason || "No reason provided"}
                </p>
              </div>

              {/* Reviewer Info */}
              {(viewingLeave.reviewedBy || viewingLeave.approvedBy || viewingLeave.rejectedBy) && (
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-xs font-medium text-slate-400 uppercase">Reviewed By</span>
                  <p className="mt-1 text-sm text-slate-700">
                    {viewingLeave.reviewerName || viewingLeave.reviewedBy || viewingLeave.approvedBy || viewingLeave.rejectedBy || "—"}
                  </p>
                  {viewingLeave.reviewerComment && (
                    <p className="mt-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-3">
                      "{viewingLeave.reviewerComment}"
                    </p>
                  )}
                </div>
              )}

              {/* Applied Date */}
              {viewingLeave.createdAt && (
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-xs font-medium text-slate-400 uppercase">Applied On</span>
                  <p className="mt-1 text-sm text-slate-700">
                    {viewingLeave.createdAt?._seconds
                      ? format(new Date(viewingLeave.createdAt._seconds * 1000), "MMMM dd, yyyy 'at' hh:mm a")
                      : format(new Date(viewingLeave.createdAt), "MMMM dd, yyyy 'at' hh:mm a")}
                  </p>
                </div>
              )}

              {/* Admin Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-700">
                  <strong>Note:</strong> Admin accounts have view-only access to leave requests. Only Team Leads and Managers can approve or reject leave requests.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
