"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { 
  Building2, 
  Users, 
  Shield, 
  UserCheck, 
  UserX, 
  Clock, 
  FileText,
  Calendar,
  ArrowRight,
  Plus,
  Trash2,
  Settings,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"

export default function BusinessOwnerDashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [error, setError] = useState(null)

  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    admins: 0,
    pendingLeaves: 0,
    totalLeaves: 0,
  })

  const [admins, setAdmins] = useState([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    position: "",
  })

  useEffect(() => {
    const current = localStorage.getItem("currentEmployee")
    if (!current) {
      safeRedirect(router, "/business-owner/login")
      return
    }

    const emp = JSON.parse(current)

    if (emp.role !== "business_owner") {
      alert("Unauthorized. Please login as Business Owner.")
      safeRedirect(router, "/role-selection")
      return
    }

    console.log("✅ Business Owner logged in:", emp.email)
    console.log("🏢 Organization ID:", emp.organizationId)
    
    setCurrentUser(emp)
    loadDashboard(emp)
  }, [router])

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }

  const loadDashboard = async (user) => {
    console.log("📊 Loading dashboard for organization:", user.organizationId)
    setLoading(true)
    setError(null)
    
    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    if (!token) {
      console.error("❌ No authentication token found")
      setError("Authentication token not found. Please login again.")
      setLoading(false)
      return
    }

    try {
      // ===== 1. GET ALL EMPLOYEES (BACKEND FILTERS BY ORG) =====
      console.log("🔄 Fetching employees from backend...")
      const employeesRes = await fetch(`${base}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      let orgEmployees = []
      if (employeesRes.ok) {
        orgEmployees = await employeesRes.json()
        console.log("✅ Fetched employees from backend:", orgEmployees.length)
        
        // Verify all employees belong to this organization
        const wrongOrg = orgEmployees.filter(
          (e) => e.organizationId !== user.organizationId
        )
        if (wrongOrg.length > 0) {
          console.warn("⚠️ Backend returned employees from wrong organization:", wrongOrg)
        }
        
        // Filter out inactive employees
        // No filtering by active status
        console.log(`✅ Total employees: ${orgEmployees.length}`)

      } else {
        const errorText = await employeesRes.text()
        console.error("❌ Failed to fetch employees:", employeesRes.status, errorText)
        
        if (employeesRes.status === 401) {
          setError("Session expired. Please login again.")
          setTimeout(() => {
            localStorage.clear()
            safeRedirect(router, "/business-owner/login")
          }, 2000)
          return
        }
        
        throw new Error(`Failed to fetch employees: ${employeesRes.status}`)
      }

      const adminList = orgEmployees.filter((e) => e.role === "admin")
      const employeeList = orgEmployees.filter((e) => e.role === "employee")

      console.log("👥 Total active employees:", employeeList.length)
      console.log("👑 Total active admins:", adminList.length)

      // ===== 2. GET TODAY'S ATTENDANCE =====
      const today = new Date().toLocaleDateString("en-US")
      console.log("📅 Fetching attendance for date:", today)
      
      const attendanceRes = await fetch(`${base}/api/admin/all?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      let presentToday = 0
      if (attendanceRes.ok) {
        const records = await attendanceRes.json()
        const arr = Array.isArray(records) ? records : records.attendance || []
        console.log("📅 Total attendance records for today:", arr.length)
        
        // Create set of employee IDs for faster lookup
        const orgEmployeeIds = new Set(orgEmployees.map((e) => e.id))
        
        // Filter attendance records for organization employees
        const orgAttendance = arr.filter(r => orgEmployeeIds.has(r.employeeId))
        console.log("📅 Organization attendance records:", orgAttendance.length)
        
        presentToday = orgAttendance.filter(r => r.checkIn).length
        console.log("✅ Employees present today:", presentToday)
      } else {
        console.error("❌ Failed to fetch attendance:", attendanceRes.status)
      }

      // ===== 3. GET LEAVE REQUESTS =====
      console.log("📄 Fetching leave requests...")
      const leaveRes = await fetch(`${base}/api/leave/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      let pendingLeaves = 0
      let totalLeaves = 0
      if (leaveRes.ok) {
        const data = await leaveRes.json()
        const allLeaves = Array.isArray(data.requests) ? data.requests : []
        console.log("📄 Total leave requests in system:", allLeaves.length)
        
        // Filter leaves by organization employees
        const orgEmployeeIds = new Set(orgEmployees.map((e) => e.id))
        const orgLeaves = allLeaves.filter((leave) =>
          orgEmployeeIds.has(leave.employeeId)
        )
        
        totalLeaves = orgLeaves.length
        pendingLeaves = orgLeaves.filter((l) => l.status === "Pending").length
        
        console.log("📄 Organization leave requests:", totalLeaves)
        console.log("⏳ Pending leave requests:", pendingLeaves)
      } else {
        console.error("❌ Failed to fetch leaves:", leaveRes.status)
      }

      // ===== 4. UPDATE STATE =====
      setStats({
        totalEmployees: employeeList.length,
        presentToday,
        absentToday: Math.max(employeeList.length - presentToday, 0),
        admins: adminList.length,
        pendingLeaves,
        totalLeaves,
      })

      setAdmins(adminList)
      
      console.log("✅ Dashboard loaded successfully")
      console.log("📊 Final stats:", {
        totalEmployees: employeeList.length,
        presentToday,
        absentToday: Math.max(employeeList.length - presentToday, 0),
        admins: adminList.length,
        pendingLeaves,
        totalLeaves,
      })
      
    } catch (err) {
      console.error("❌ Dashboard: Failed to load data", err)
      setError(`Failed to load dashboard: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    if (!currentUser) {
      alert("❌ User session not found. Please refresh the page.")
      return
    }

    // ✅ Validate password
    if (!newAdmin.password || newAdmin.password.length < 6) {
      alert("❌ Password must be at least 6 characters long")
      return
    }

    console.log("📝 Creating new admin...")
    console.log("📝 Admin data:", { ...newAdmin, password: "***" }) // Don't log actual password
    
    setCreateLoading(true)
    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    try {
      const response = await fetch(`${base}/api/admin/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newAdmin.name,
          email: newAdmin.email,
          password: newAdmin.password, // ✅ Use manually entered password
          department: newAdmin.department,
          position: newAdmin.position || "Admin",
          role: "admin",
          organizationId: currentUser.organizationId,
          workingType: "Full-time",
          salary: "0",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log("✅ Admin created successfully:", data)
        const createdAdmin = data.employee || data

        // Store credentials for display
        const adminEmail = newAdmin.email
        const adminPassword = newAdmin.password

        // Optimistic update
        setAdmins((prev) => [createdAdmin, ...prev])
        setStats((prev) => ({
          ...prev,
          admins: prev.admins + 1,
        }))

        setShowCreateForm(false)
        setNewAdmin({
          name: "",
          email: "",
          password: "",
          department: "",
          position: "",
        })

        // ✅ Show success message with credentials
        alert(
          `✅ Admin created successfully!\n\n` +
          `📧 Email: ${adminEmail}\n` +
          `🔑 Password: ${adminPassword}\n\n` +
          `⚠️ IMPORTANT:\n` +
          `1. Share these credentials securely with the admin\n` +
          `2. The admin can login using these credentials\n` +
          `3. Save this password - it won't be shown again`
        )
      } else {
        console.error("❌ Failed to create admin:", data)
        alert(`❌ ${data.error || "Failed to create admin"}`)
      }
    } catch (err) {
      console.error("❌ Create admin error:", err)
      alert("❌ Network error. Please check your connection.")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteAdmin = async (adminId, adminName) => {
    if (!window.confirm(`Delete admin "${adminName}"? This will deactivate their account.`)) {
      return
    }

    console.log("🗑️ Deleting admin:", adminId, adminName)
    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    try {
      // Store previous state for rollback
      const prevAdmins = [...admins]
      const prevStats = { ...stats }

      // Optimistic update
      setAdmins((prev) => prev.filter((admin) => admin.id !== adminId))
      setStats((prev) => ({
        ...prev,
        admins: Math.max(0, prev.admins - 1),
      }))

      const response = await fetch(`${base}/api/admin/employees/${adminId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        console.log("✅ Admin deleted successfully")
        alert("✅ Admin deleted successfully!")
      } else {
        console.error("❌ Failed to delete admin:", response.status)
        // Rollback on failure
        setAdmins(prevAdmins)
        setStats(prevStats)
        alert("❌ Failed to delete admin. Please try again.")
      }
    } catch (err) {
      console.error("❌ Delete admin error:", err)
      alert("❌ Network error. Please try again.")
      // Reload to ensure consistency
      if (currentUser) {
        loadDashboard(currentUser)
      }
    }
  }

  const handleRefresh = () => {
    if (currentUser) {
      console.log("🔄 Refreshing dashboard...")
      loadDashboard(currentUser)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your organization...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Error Loading Dashboard</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.clear()
                  safeRedirect(router, "/business-owner/login")
                }}
              >
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No user state
  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {currentUser.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your organization, admins, and employees from one place.
            </p>
            {currentUser.organizationId && (
              <Badge variant="outline" className="mt-2">
                <Building2 className="mr-1 h-3 w-3" />
                Org ID: {currentUser.organizationId.substring(0, 8)}...
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => safeRedirect(router, "/admin/dashboard")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Admin Panel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm("Are you sure you want to logout?")) {
                  localStorage.clear()
                  safeRedirect(router, "/role-selection")
                }
              }}
            >
              Logout
            </Button>
          </div>
        </header>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Employees</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">Active employees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Present</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.presentToday}
              </div>
              <p className="text-xs text-muted-foreground">Checked in today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <UserX className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats.absentToday}
              </div>
              <p className="text-xs text-muted-foreground">Not checked in</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admins}</div>
              <p className="text-xs text-muted-foreground">Managing org</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalLeaves}
              </div>
              <p className="text-xs text-muted-foreground">Total requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pendingLeaves}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card 
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary" 
            onClick={() => router.push("/business-owner/employees")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="mt-4">View Employees</CardTitle>
              <CardDescription>
                Manage organization members and admins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total members</span>
                <span className="font-semibold">{stats.totalEmployees + stats.admins}</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary" 
            onClick={() => router.push("/business-owner/attendance")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/20">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="mt-4">View Attendance</CardTitle>
              <CardDescription>
                Track employee attendance and working hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Present today</span>
                <span className="font-semibold text-green-600">{stats.presentToday}</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary" 
            onClick={() => router.push("/business-owner/leave-requests")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="mt-4">Leave Requests</CardTitle>
              <CardDescription>
                View all leave requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending approval</span>
                <span className="font-semibold text-yellow-600">{stats.pendingLeaves}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Organization Admins ({admins.length})
              </CardTitle>
              <CardDescription className="mt-1">
                Admins can manage employees, attendance, and leave requests
              </CardDescription>
            </div>
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <Button disabled={createLoading}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Admin</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create a new admin account for your organization. You'll set their password manually.
                  </p>
                </DialogHeader>
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newAdmin.name}
                      onChange={(e) =>
                        setNewAdmin((s) => ({ ...s, name: e.target.value }))
                      }
                      placeholder="John Doe"
                      required
                      disabled={createLoading}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) =>
                        setNewAdmin((s) => ({ ...s, email: e.target.value }))
                      }
                      placeholder="john@example.com"
                      required
                      disabled={createLoading}
                    />
                  </div>
                  
                  {/* ✅ PASSWORD FIELD WITH SHOW/HIDE */}
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={newAdmin.password}
                        onChange={(e) =>
                          setNewAdmin((s) => ({ ...s, password: e.target.value }))
                        }
                        placeholder="Minimum 6 characters"
                        minLength={6}
                        required
                        disabled={createLoading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        disabled={createLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      You'll need to share this password securely with the admin
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={newAdmin.department}
                      onChange={(e) =>
                        setNewAdmin((s) => ({ ...s, department: e.target.value }))
                      }
                      placeholder="HR, IT, Sales, etc."
                      disabled={createLoading}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={newAdmin.position}
                      onChange={(e) =>
                        setNewAdmin((s) => ({ ...s, position: e.target.value }))
                      }
                      placeholder="Admin"
                      disabled={createLoading}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false)
                        setShowPassword(false)
                        setNewAdmin({
                          name: "",
                          email: "",
                          password: "",
                          department: "",
                          position: "",
                        })
                      }}
                      disabled={createLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createLoading}>
                      {createLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>Create Admin</>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No Admins Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Add an admin to help manage employees, attendance, and leave requests for your organization.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">{admin.name}</TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>{admin.department || "-"}</TableCell>
                        <TableCell>{admin.position || "Admin"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
