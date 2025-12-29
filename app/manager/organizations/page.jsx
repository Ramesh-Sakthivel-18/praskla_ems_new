"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Building2, 
  Search, 
  CheckCircle, 
  XCircle,
  Users,
  Shield,
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"

export default function ManagerOrganizationsPage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [filteredOrganizations, setFilteredOrganizations] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedOrg, setExpandedOrg] = useState(null)

  useEffect(() => {
    const current = localStorage.getItem("currentEmployee")
    if (!current) {
      safeRedirect(router, "/admin/login")
      return
    }

    const emp = JSON.parse(current)
    if (emp.role !== "manager") {
      alert("Unauthorized. Manager access required.")
      safeRedirect(router, "/admin/login")
      return
    }

    setCurrentUser(emp)
    loadOrganizations()
  }, [router])

  // Event-driven search filter
  useEffect(() => {
    const filtered = organizations.filter((org) => {
      const query = searchQuery.toLowerCase()
      return (
        org.name?.toLowerCase().includes(query) ||
        org.ownerEmail?.toLowerCase().includes(query) ||
        org.phone?.toLowerCase().includes(query)
      )
    })
    setFilteredOrganizations(filtered)
  }, [searchQuery, organizations])

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }

  const loadOrganizations = async () => {
    setLoading(true)
    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    try {
      const response = await fetch(`${base}/api/manager/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const orgs = data.organizations || []
        
        // Sort by created date (newest first)
        orgs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        
        setOrganizations(orgs)
        setFilteredOrganizations(orgs)
      } else if (response.status === 401) {
        alert("Session expired. Please login again.")
        safeRedirect(router, "/admin/login")
      }
    } catch (error) {
      console.error("Failed to load organizations:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (orgId, currentStatus, orgName) => {
    const action = currentStatus ? "deactivate" : "activate"
    if (!window.confirm(`Are you sure you want to ${action} "${orgName}"?`)) {
      return
    }

    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    try {
      // Optimistic update
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === orgId ? { ...org, isActive: !currentStatus } : org
        )
      )

      const response = await fetch(`${base}/api/manager/toggle-status/${orgId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ Organization ${data.isActive ? "activated" : "deactivated"} successfully!`)
      } else {
        alert("❌ Failed to update organization status")
        loadOrganizations() // Reload on failure
      }
    } catch (error) {
      console.error("Toggle status error:", error)
      alert("❌ Network error")
      loadOrganizations()
    }
  }

  const toggleExpand = (orgId) => {
    setExpandedOrg(expandedOrg === orgId ? null : orgId)
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return "N/A"
    }
  }

  const activeOrgs = filteredOrganizations.filter((o) => o.isActive)
  const pendingOrgs = filteredOrganizations.filter((o) => !o.isActive)

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
              Organizations
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage all registered organizations and their details
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/manager/dashboard")}
          >
            Back to Dashboard
          </Button>
        </header>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredOrganizations.length}</div>
              <p className="text-xs text-muted-foreground">Registered businesses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeOrgs.length}</div>
              <p className="text-xs text-muted-foreground">Currently operational</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <XCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingOrgs.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by organization name, owner email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Organizations Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              All Organizations ({filteredOrganizations.length})
            </CardTitle>
            <CardDescription>
              Click on any row to view detailed information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading organizations...</p>
              </div>
            ) : filteredOrganizations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "No organizations found matching your search"
                    : "No organizations registered yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOrganizations.map((org) => (
                  <div key={org.id} className="border rounded-lg overflow-hidden">
                    {/* Main Row */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => toggleExpand(org.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="rounded-full bg-primary/10 p-2">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{org.name}</p>
                            <Badge variant={org.isActive ? "default" : "secondary"}>
                              {org.isActive ? "Active" : "Pending"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{org.ownerEmail}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span>{org.adminCount} admins</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{org.employeeCount} employees</span>
                          </div>
                        </div>
                        
                        {expandedOrg === org.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedOrg === org.id && (
                      <div className="border-t bg-muted/50 p-4 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Business Owner Info */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Business Owner
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Email:</span>
                                <span>{org.ownerEmail}</span>
                              </div>
                              {org.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">Phone:</span>
                                  <span>{org.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Organization Stats */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Organization Details
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Total Admins:</span>
                                <Badge variant="secondary">{org.adminCount}</Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Total Employees:</span>
                                <Badge variant="secondary">{org.employeeCount}</Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Registered:</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  {formatDate(org.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end pt-2">
                          <Button
                            variant={org.isActive ? "destructive" : "default"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleStatus(org.id, org.isActive, org.name)
                            }}
                          >
                            {org.isActive ? (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Deactivate Organization
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activate Organization
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Privacy & Access Control
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  As a manager, you can view organization statistics (admin and employee counts) 
                  but cannot see individual employee names or details. Only organization owners 
                  and admins have access to their organization's employee information.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
