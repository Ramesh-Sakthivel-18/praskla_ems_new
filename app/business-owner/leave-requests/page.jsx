"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Clock, CheckCircle, XCircle, Calendar } from "lucide-react"
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
    const current = localStorage.getItem("currentEmployee")
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

  // Event-driven filter: Update filtered list when status changes
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
    setLoading(true)
    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    try {
      // 1. Get all employees in organization
      const empRes = await fetch(`${base}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      let orgEmployeeIds = new Set()
      if (empRes.ok) {
        const empData = await empRes.json()
        const allEmployees = Array.isArray(empData) ? empData : empData.employees || []
        const orgEmployees = allEmployees.filter(
          (e) =>
            e.organizationId === currentUser.organizationId &&
            e.isActive !== false
        )
        orgEmployeeIds = new Set(orgEmployees.map((e) => e.id))
      }

      // 2. Get all leave requests
      const leaveRes = await fetch(`${base}/api/leave/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (leaveRes.ok) {
        const data = await leaveRes.json()
        const allLeaves = Array.isArray(data.requests) ? data.requests : data.requests || []

        // Filter to only organization employees
        const orgLeaves = allLeaves.filter((leave) =>
          orgEmployeeIds.has(leave.employeeId)
        )

        // Sort by created date (newest first)
        orgLeaves.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0)
          const dateB = new Date(b.createdAt || 0)
          return dateB - dateA
        })

        setAllRequests(orgLeaves)
        setFilteredRequests(orgLeaves)

        // Calculate stats
        const pending = orgLeaves.filter((r) => r.status === "Pending").length
        const approved = orgLeaves.filter((r) => r.status === "Approved").length
        const rejected = orgLeaves.filter((r) => r.status === "Rejected").length

        setStats({
          total: orgLeaves.length,
          pending,
          approved,
          rejected,
        })
      } else {
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
    switch (status) {
      case "Pending":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case "Approved":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        )
      case "Rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy")
    } catch {
      return dateString
    }
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Leave Requests
            </h1>
            <p className="text-sm text-muted-foreground">
              View all leave requests from employees in your organization
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/business-owner/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All leave requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting decision</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.approved}
              </div>
              <p className="text-xs text-muted-foreground">Leave granted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats.rejected}
              </div>
              <p className="text-xs text-muted-foreground">Leave denied</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Leave Requests ({filteredRequests.length})
              </CardTitle>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              View-only. Admins can approve or reject leave requests.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading leave requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {statusFilter === "all"
                    ? "No leave requests found"
                    : `No ${statusFilter} leave requests`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead className="text-center">Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.employeeName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.leaveType}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(request.startDate)}</TableCell>
                        <TableCell>{formatDate(request.endDate)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{request.days}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  View-Only Access
                </p>
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
