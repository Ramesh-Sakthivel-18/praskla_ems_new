"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Users, 
  Search, 
  Shield, 
  UserCheck, 
  Trash2, 
  Plus, 
  RefreshCw, 
  AlertCircle,
  Building2,
  Eye,
  EyeOff
} from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"

export default function BusinessOwnerEmployeesPage() {
  const router = useRouter()
  
  const [currentUser, setCurrentUser] = useState(null)
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
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
      alert("Unauthorized. Business Owner access required.")
      safeRedirect(router, "/role-selection")
      return
    }

    console.log("✅ Business Owner logged in:", emp.email)
    console.log("🏢 Organization ID:", emp.organizationId)
    setCurrentUser(emp)
  }, [router])

  useEffect(() => {
    if (currentUser) {
      loadEmployees()
    }
  }, [currentUser])

  useEffect(() => {
    // Real-time filter (event-driven)
    const filtered = employees.filter((emp) => {
      const query = searchQuery.toLowerCase()
      return (
        emp.name?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.department?.toLowerCase().includes(query) ||
        emp.position?.toLowerCase().includes(query)
      )
    })
    setFilteredEmployees(filtered)
  }, [searchQuery, employees])

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }

  const loadEmployees = async () => {
    console.log("=".repeat(50))
    console.log("🔄 LOADING EMPLOYEES PAGE")
    console.log("=".repeat(50))
    console.log("👤 Current User:", currentUser.email)
    console.log("🏢 Organization ID:", currentUser.organizationId)
    
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
      // ===== FETCH ALL EMPLOYEES (SAME AS DASHBOARD) =====
      console.log("🔄 Fetching employees from backend...")
      const employeesRes = await fetch(`${base}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log("✅ Response status:", employeesRes.status)

      let orgEmployees = []
      if (employeesRes.ok) {
        orgEmployees = await employeesRes.json()
        console.log("✅ Fetched employees from backend:", orgEmployees.length)
        
        // Log ALL employees
        console.log("📋 ALL EMPLOYEES FROM BACKEND:")
        orgEmployees.forEach((emp, index) => {
          console.log(`   ${index + 1}. ${emp.name} (${emp.email})`)
          console.log(`      - Role: ${emp.role}`)
          console.log(`      - OrgID: ${emp.organizationId || "❌ MISSING"}`)
        })
        
        // Verify all employees belong to this organization
        const wrongOrg = orgEmployees.filter(
          (e) => e.organizationId !== currentUser.organizationId
        )
        
        if (wrongOrg.length > 0) {
          console.warn("⚠️ Backend returned employees from wrong organization:", wrongOrg)
        } else {
          console.log("✅ Backend filtering verified - all employees belong to this organization")
        }
        
        // No filtering by active status
        console.log(`✅ Total employees: ${orgEmployees.length}`)
        
        const adminList = orgEmployees.filter((e) => e.role === "admin")
        const employeeList = orgEmployees.filter((e) => e.role === "employee")
        
        console.log("👑 Admins:", adminList.length)
        adminList.forEach(admin => {
          console.log(`   - ${admin.name} (${admin.email})`)
        })
        
        console.log("👤 Regular employees:", employeeList.length)
        console.log("=".repeat(50))
        
        setEmployees(orgEmployees)
        setFilteredEmployees(orgEmployees)
        
      } else if (employeesRes.status === 401) {
        console.error("❌ Authentication failed")
        setError("Session expired. Please login again.")
        setTimeout(() => {
          localStorage.clear()
          safeRedirect(router, "/business-owner/login")
        }, 2000)
      } else {
        const errorText = await employeesRes.text()
        console.error("❌ Failed to load employees:", employeesRes.status, errorText)
        setError(`Failed to load employees: ${employeesRes.status}`)
      }
    } catch (error) {
      console.error("❌ Network error loading employees:", error)
      setError("Network error. Please check your connection and try again.")
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

    console.log("📝 Creating new admin for organization:", currentUser.organizationId)
    
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

        // Optimistic update
        setEmployees((prev) => [createdAdmin, ...prev])
        
        setShowCreateAdmin(false)
        setShowPassword(false)
        setNewAdmin({
          name: "",
          email: "",
          password: "",
          department: "",
          position: "",
        })
        
        alert(
          `✅ Admin created successfully!\n\n` +
          `📧 Email: ${adminEmail}\n` +
          `🔑 Password: ${adminPassword}\n\n` +
          `⚠️ Share these credentials securely with the admin.`
        )
      } else {
        console.error("❌ Failed to create admin:", data)
        alert(`❌ ${data.error || "Failed to create admin"}`)
      }
    } catch (error) {
      console.error("❌ Create admin error:", error)
      alert("❌ Network error")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteAdmin = async (adminId, adminName) => {
    if (!window.confirm(`Delete admin "${adminName}"? This will deactivate their account.`)) {
      return
    }

    console.log("🗑️ Deleting admin:", adminId)
    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    try {
      const prevEmployees = [...employees]

      setEmployees((prev) => prev.filter((e) => e.id !== adminId))

      const response = await fetch(`${base}/api/admin/employees/${adminId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        console.log("✅ Admin deleted successfully")
        alert("✅ Admin deleted successfully!")
      } else {
        console.error("❌ Failed to delete admin:", response.status)
        setEmployees(prevEmployees)
        alert("❌ Failed to delete admin")
      }
    } catch (error) {
      console.error("❌ Delete admin error:", error)
      alert("❌ Network error")
      loadEmployees()
    }
  }

  const admins = filteredEmployees.filter((e) => e.role === "admin")
  const regularEmployees = filteredEmployees.filter((e) => e.role === "employee")

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
              Organization Employees
            </h1>
            <p className="text-sm text-muted-foreground">
              View all employees and manage admins in your organization
            </p>
            {currentUser.organizationId && (
              <Badge variant="outline" className="mt-2">
                <Building2 className="mr-1 h-3 w-3" />
                Org ID: {currentUser.organizationId.substring(0, 12)}...
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadEmployees}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => router.push("/business-owner/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </header>

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Error Loading Employees</p>
              <p className="text-sm mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadEmployees}
                className="mt-3"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{regularEmployees.length}</div>
              <p className="text-xs text-muted-foreground">Active employees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{admins.length}</div>
              <p className="text-xs text-muted-foreground">Managing employees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredEmployees.length}</div>
              <p className="text-xs text-muted-foreground">All members</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Create Admin */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin}>
            <DialogTrigger asChild>
              <Button disabled={createLoading}>
                <Plus className="mr-2 h-4 w-4" />
                Create Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Admin</DialogTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Create a new admin account for your organization.
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
                    You'll need to share this password with the admin
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
                      setShowCreateAdmin(false)
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
        </div>

        {/* Admins Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Admins ({admins.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="ml-3 text-sm text-muted-foreground">Loading admins...</p>
              </div>
            ) : admins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Shield className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No admins found. Create one to start managing employees.
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
                      <TableHead>Role</TableHead>
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
                        <TableCell>
                          <Badge variant="secondary">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </Badge>
                        </TableCell>
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

        {/* Employees Table (View-Only) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Employees ({regularEmployees.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              View-only. Admins manage employee details through their dashboard.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="ml-3 text-sm text-muted-foreground">Loading employees...</p>
              </div>
            ) : regularEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No employees found. Admins can add employees through their dashboard.
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
                      <TableHead>Working Type</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regularEmployees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell>{emp.email}</TableCell>
                        <TableCell>{emp.department || "-"}</TableCell>
                        <TableCell>{emp.position || "-"}</TableCell>
                        <TableCell>{emp.workingType || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">Employee</Badge>
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
