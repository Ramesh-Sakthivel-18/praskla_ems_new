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
import { Building2, Users, Shield, UserCheck, UserX, Clock, FileText, Calendar, ArrowRight, Plus, Trash2, Settings, AlertCircle, RefreshCw, Eye, EyeOff } from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"

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

  // ✅ NEW: Auth check using centralized helper
  useEffect(() => {
    console.log('🔐 Checking authentication...')
    
    if (!isAuthenticated()) {
      console.log('❌ Not authenticated, redirecting to login')
      safeRedirect(router, '/business-owner/login')
      return
    }

    const user = getCurrentUser()
    console.log('✅ User found:', user?.email, 'Role:', user?.role)

    if (!user) {
      console.log('❌ No user data, redirecting to login')
      safeRedirect(router, '/business-owner/login')
      return
    }

    // ✅ Accept both role formats
    if (user.role !== 'business_owner' && user.role !== 'businessowner') {
      alert('Unauthorized. Please login as Business Owner.')
      safeRedirect(router, '/role-selection')
      return
    }

    console.log("✅ Business Owner logged in:", user.email)
    console.log("🏢 Organization ID:", user.organizationId)
    setCurrentUser(user)
    loadDashboard(user)
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
      // 1. GET ALL EMPLOYEES
      console.log("🔄 Fetching employees from backend...")
      const employeesRes = await fetch(`${base}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      let orgEmployees = []
      if (employeesRes.ok) {
        orgEmployees = await employeesRes.json()
        console.log("✅ Fetched employees from backend:", orgEmployees.length)
        
        // Filter to only this organization
        orgEmployees = orgEmployees.filter(e => 
          e.organizationId === user.organizationId
        )
        console.log("✅ Organization employees:", orgEmployees.length)
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

      // 2. GET TODAY'S ATTENDANCE
      const today = new Date().toLocaleDateString("en-US")
      console.log("📅 Fetching attendance for date:", today)
      
      const attendanceRes = await fetch(`${base}/api/admin/all?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      let presentToday = 0
      if (attendanceRes.ok) {
        const records = await attendanceRes.json()
        const arr = Array.isArray(records) ? records : (records.attendance || [])
        
        // Filter to org employees
        const orgEmployeeIds = new Set(orgEmployees.map((e) => e.id))
        const orgAttendance = arr.filter(r => orgEmployeeIds.has(r.employeeId))
        
        presentToday = orgAttendance.filter(r => r.checkIn).length
        console.log("✅ Present today:", presentToday)
      } else {
        console.error("❌ Failed to fetch attendance:", attendanceRes.status)
      }

      // 3. GET LEAVE REQUESTS
      console.log("📄 Fetching leave requests...")
      const leaveRes = await fetch(`${base}/api/leave/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      let pendingLeaves = 0
      let totalLeaves = 0
      if (leaveRes.ok) {
        const data = await leaveRes.json()
        const allLeaves = Array.isArray(data.requests) ? data.requests : []
        
        // Filter to org employees
        const orgEmployeeIds = new Set(orgEmployees.map((e) => e.id))
        const orgLeaves = allLeaves.filter((leave) => orgEmployeeIds.has(leave.employeeId))
        
        totalLeaves = orgLeaves.length
        pendingLeaves = orgLeaves.filter((l) => l.status === "Pending").length
        console.log("✅ Leaves - Total:", totalLeaves, "Pending:", pendingLeaves)
      } else {
        console.error("❌ Failed to fetch leaves:", leaveRes.status)
      }

      // 4. UPDATE STATE
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

    if (!newAdmin.password || newAdmin.password.length < 6) {
      alert("❌ Password must be at least 6 characters long")
      return
    }

    console.log("📝 Creating new admin...")
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
          password: newAdmin.password,
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
        const adminEmail = newAdmin.email
        const adminPassword = newAdmin.password

        setAdmins((prev) => [createdAdmin, ...prev])
        setStats((prev) => ({ ...prev, admins: prev.admins + 1 }))
        setShowCreateForm(false)
        setNewAdmin({ name: "", email: "", password: "", department: "", position: "" })

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
      const prevAdmins = [...admins]
      const prevStats = { ...stats }

      setAdmins((prev) => prev.filter((admin) => admin.id !== adminId))
      setStats((prev) => ({ ...prev, admins: Math.max(0, prev.admins - 1) }))

      const response = await fetch(`${base}/api/admin/employees/${adminId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        console.log("✅ Admin deleted successfully")
        alert("✅ Admin deleted successfully!")
      } else {
        console.error("❌ Failed to delete admin:", response.status)
        setAdmins(prevAdmins)
        setStats(prevStats)
        alert("❌ Failed to delete admin. Please try again.")
      }
    } catch (err) {
      console.error("❌ Delete admin error:", err)
      alert("❌ Network error. Please try again.")
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
          <div className="text-muted-foreground">Loading your organization...</div>
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
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => loadDashboard(currentUser)} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
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
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Organization Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {currentUser.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => router.push('/business-owner/profile')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total workforce
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Checked in today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
              <UserX className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.absentToday}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Not checked in
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admins}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Managing org
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
              <FileText className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeaves}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingLeaves}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => router.push('/business-owner/employees')}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium">Manage Employees</p>
                <p className="text-xs text-muted-foreground mt-1">
                  View and manage all employees
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => router.push('/business-owner/attendance')}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium">Attendance Records</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Track employee attendance
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => router.push('/business-owner/leaves')}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium">Leave Management</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Review leave requests
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Admin Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Admin Management</CardTitle>
              <CardDescription>
                Add an admin to help manage employees, attendance, and leave requests for your organization.
              </CardDescription>
            </div>
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Admin</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={newAdmin.name}
                      onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={newAdmin.password}
                        onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2.5"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={newAdmin.department}
                      onChange={(e) => setNewAdmin({ ...newAdmin, department: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={newAdmin.position}
                      onChange={(e) => setNewAdmin({ ...newAdmin, position: e.target.value })}
                      placeholder="Admin"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={createLoading}>
                      {createLoading ? "Creating..." : "Create Admin"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No admins created yet</p>
                <p className="text-sm mt-1">Create your first admin to delegate management tasks</p>
              </div>
            ) : (
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
                      <TableCell>
                        <Badge variant="secondary">{admin.department || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>{admin.position || "Admin"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
