"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Building2, Users, Shield, Plus, Trash2, UserCheck, UserX } from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"

export default function BusinessOwnerDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  
  // Stats
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    admins: 0,
  })

  // Admins list
  const [admins, setAdmins] = useState([])
  
  // Create admin form
  const [showCreateForm, setShowCreateForm] = useState(false)
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

    setCurrentUser(emp)
    loadDashboard(emp)
  }, [router])

  const loadDashboard = async (user) => {
    setLoading(true)
    const token = localStorage.getItem("firebaseToken")
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

    try {
      // Get all employees
      const employeesRes = await fetch(`${base}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      let allEmployees = []
      if (employeesRes.ok) {
        allEmployees = await employeesRes.json()
      }

      // Filter by organizationId
      const orgEmployees = allEmployees.filter(
        (e) => e.organizationId === user.organizationId
      )

      const adminList = orgEmployees.filter((e) => e.role === "admin")
      const employeeList = orgEmployees.filter((e) => e.role === "employee")

      // Get today's attendance stats
      const today = new Date().toLocaleDateString("en-US")
      const attendanceRes = await fetch(`${base}/api/admin/all?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      let presentToday = 0
      if (attendanceRes.ok) {
        const records = await attendanceRes.json()
        const arr = Array.isArray(records) ? records : records.attendance || []
        presentToday = arr.filter((r) => r.checkIn).length
      }

      setStats({
        totalEmployees: employeeList.length,
        presentToday,
        absentToday: Math.max(employeeList.length - presentToday, 0),
        admins: adminList.length,
      })

      setAdmins(adminList)
    } catch (err) {
      console.error("BO Dashboard: Failed to load data", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem("firebaseToken")
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

    try {
      const response = await fetch(`${base}/api/admin/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newAdmin,
          role: "admin",
          organizationId: currentUser.organizationId,
          workingType: "Full-time",
          salary: "0",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert("✅ Admin created successfully!")
        
        // 1. Reset Form
        setShowCreateForm(false)
        setNewAdmin({ name: "", email: "", password: "", department: "", position: "" })

        // 2. OPTIMISTIC UPDATE (Event Driven): Update state directly without reloading
        const createdAdmin = data.employee
        
        // Add new admin to the table list
        setAdmins((prevAdmins) => [...prevAdmins, createdAdmin])
        
        // Update stats counters
        setStats((prevStats) => ({
          ...prevStats,
          admins: prevStats.admins + 1,
          totalEmployees: prevStats.totalEmployees + 1,
          absentToday: prevStats.absentToday + 1 // New employees are absent by default
        }))

      } else {
        alert(`❌ ${data.error || "Failed to create admin"}`)
      }
    } catch (err) {
      console.error("Create admin error:", err)
      alert("❌ Network error")
    }
  }

  const handleDeleteAdmin = async (adminId) => {
    if (!confirm("Are you sure you want to deactivate this admin?")) return

    const token = localStorage.getItem("firebaseToken")
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

    try {
      const response = await fetch(`${base}/api/admin/employees/${adminId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        alert("✅ Admin deactivated successfully!")
        
        // OPTIMISTIC UPDATE (Event Driven): Update state directly without reloading
        
        // Remove admin from the table list
        setAdmins((prevAdmins) => prevAdmins.filter((admin) => admin.id !== adminId))
        
        // Update stats counters
        setStats((prevStats) => ({
          ...prevStats,
          admins: Math.max(0, prevStats.admins - 1),
          totalEmployees: Math.max(0, prevStats.totalEmployees - 1),
          // We assume they were absent to keep math simple, or you can check attendance records
          absentToday: Math.max(0, prevStats.absentToday - 1) 
        }))

      } else {
        alert("❌ Failed to delete admin")
      }
    } catch (err) {
      console.error("Delete admin error:", err)
      alert("❌ Network error")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold">Business Owner Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Manage your organization, admins, and employees
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              localStorage.clear()
              safeRedirect(router, "/role-selection")
            }}
          >
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Employees
              </CardTitle>
              <Users className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalEmployees}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Present Today
              </CardTitle>
              <UserCheck className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.presentToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Absent Today
              </CardTitle>
              <UserX className="w-5 h-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.absentToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Admins
              </CardTitle>
              <Shield className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.admins}</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Management Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Management
            </CardTitle>
            <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Admin
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create Form */}
            {showCreateForm && (
              <form onSubmit={handleCreateAdmin} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <h3 className="font-semibold">Create New Admin</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
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
                    <Input
                      id="password"
                      type="password"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={newAdmin.department}
                      onChange={(e) => setNewAdmin({ ...newAdmin, department: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={newAdmin.position}
                      onChange={(e) => setNewAdmin({ ...newAdmin, position: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Create Admin</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Admins Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No admins created yet. Click "Create Admin" to add one.
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.name}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>{admin.department}</TableCell>
                      <TableCell>{admin.position || "N/A"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteAdmin(admin.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Link to Admin Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your admins can manage employees through the Admin Panel. You can also access it directly.
            </p>
            <Button onClick={() => safeRedirect(router, "/admin/dashboard")}>
              Go to Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
