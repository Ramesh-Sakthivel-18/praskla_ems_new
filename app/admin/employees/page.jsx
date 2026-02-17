import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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
  UserCheck,
  Plus,
  RefreshCw,
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  ArrowLeft,
  Mail,
  User,
  Briefcase,
  Trash2,
  UserCog // Added icon
} from "lucide-react"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { getValidIdToken } from "@/lib/firebaseClient"

const getApiBase = () => import.meta.env.VITE_API_URL || "http://localhost:3000"

export default function AdminEmployeesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [currentUser, setCurrentUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")

  const [showCreateEmployee, setShowCreateEmployee] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    position: "",
    workingType: "Full-time",
    salary: "",
  })

  // Manager Assignment State
  const [assignManagerOpen, setAssignManagerOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedManagerId, setSelectedManagerId] = useState(null)
  const [managerSearchQuery, setManagerSearchQuery] = useState("")
  const [assignLoading, setAssignLoading] = useState(false)
  const [allOrgMembers, setAllOrgMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)

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

  const { data: employees = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['admin-employees'],
    queryFn: async () => {
      const token = await getValidIdToken()
      if (!token) throw new Error("Authentication failed. Please login again.")
      const base = import.meta.env.VITE_API_URL || "http://localhost:3000"
      // Fetch only active employees
      const response = await fetch(`${base}/api/admin/employees?role=employee&isActive=true`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.status === 401) throw new Error("Session expired.")
      if (!response.ok) throw new Error(`Failed to load employees: ${response.status}`)
      const data = await response.json()
      return Array.isArray(data) ? data : (data.employees || [])
    },
    enabled: !!currentUser,
  })

  const error = queryError?.message || null

  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return []
    const query = searchQuery.toLowerCase()
    return employees.filter((emp) =>
      emp.name?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.department?.toLowerCase().includes(query) ||
      emp.position?.toLowerCase().includes(query)
    )
  }, [searchQuery, employees])

  // Fetch all org members (admins + employees, excluding BOs) for manager assignment
  const fetchAllOrgMembers = async () => {
    setMembersLoading(true)
    try {
      const token = await getValidIdToken()
      const base = getApiBase()
      // Fetch ALL active users (no role filter)
      const response = await fetch(`${base}/api/admin/employees?isActive=true`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        const members = Array.isArray(data) ? data : (data.employees || [])
        // Exclude business owners
        setAllOrgMembers(members.filter(m => m.role !== 'business_owner'))
      }
    } catch (error) {
      console.error('Failed to fetch org members:', error)
    } finally {
      setMembersLoading(false)
    }
  }

  // Filter potential managers from ALL org members (exclude current employee & BOs)
  const potentialManagers = useMemo(() => {
    if (!allOrgMembers.length) return []
    return allOrgMembers.filter(member =>
      member.isActive &&
      member.id !== selectedEmployee?.id &&
      (member.name?.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(managerSearchQuery.toLowerCase()))
    )
  }, [allOrgMembers, selectedEmployee, managerSearchQuery])

  const loadEmployees = () => queryClient.invalidateQueries({ queryKey: ['admin-employees'] })

  const handleCreateEmployee = async (e) => {
    e.preventDefault()

    if (!currentUser) return

    setCreateLoading(true)
    const token = await getValidIdToken()
    const base = getApiBase()

    try {
      const response = await fetch(`${base}/api/admin/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newEmployee,
          role: "employee", // Admins create Employees
          organizationId: currentUser.organizationId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const createdEmployee = data.employee || data
        loadEmployees()
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })

        setShowCreateEmployee(false)
        setShowPassword(false)
        // Reset form
        setNewEmployee({
          name: "",
          email: "",
          password: "",
          department: "",
          position: "",
          workingType: "Full-time",
          salary: "",
        })

        alert(`Employee created successfully!\n\nEmail: ${createdEmployee.email}\nPassword: ${newEmployee.password}`)
      } else {
        alert(`${data.error || "Failed to create employee"}`)
      }
    } catch (error) {
      console.error("Create employee error:", error)
      alert("Network error")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (!window.confirm(`Delete employee "${employeeName}"? This will deactivate their account.`)) {
      return
    }

    // Optimistic Update
    queryClient.setQueryData(['admin-employees'], (oldData) => {
      if (!oldData) return []
      const list = Array.isArray(oldData) ? oldData : (oldData.employees || [])
      return list.filter(emp => emp.id !== employeeId)
    })

    const token = await getValidIdToken()
    const base = getApiBase()

    try {
      const response = await fetch(`${base}/api/admin/employees/${employeeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        // Success
        queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      } else {
        alert("Failed to delete employee")
        queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
      }
    } catch (error) {
      console.error("Delete employee error:", error)
      alert("Network error")
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    }
  }

  const handleOpenAssignManager = (employee) => {
    setSelectedEmployee(employee)
    setSelectedManagerId(employee.managerId || null)
    setManagerSearchQuery("")
    setAssignManagerOpen(true)
    fetchAllOrgMembers() // Fetch all members when dialog opens
  }

  const handleAssignManagerSubmit = async () => {
    if (!selectedEmployee) return

    setAssignLoading(true)
    const token = await getValidIdToken()
    const base = getApiBase()

    try {
      const response = await fetch(`${base}/api/admin/employees/${selectedEmployee.id}/assign-manager`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ managerId: selectedManagerId }),
      })

      if (response.ok) {
        alert(`Manager assigned successfully!`)
        setAssignManagerOpen(false)
        loadEmployees()
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      } else {
        const data = await response.json()
        alert(data.error || "Failed to assign manager")
      }
    } catch (error) {
      console.error("Assign manager error:", error)
      alert("Network error")
    } finally {
      setAssignLoading(false)
    }
  }

  // Helper to count roles
  const activeEmployees = filteredEmployees.filter(e => e.isActive !== false)
  const fullTimeNodes = activeEmployees.filter(e => e.workingType === 'Full-time').length

  if (!currentUser) return null

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGM0LjQxOCAwIDgtMy41ODIgOC04cy0zLjU4Mi04LTgtOC04IDMuNTgyLTggOCAzLjU4MiA4IDggOHoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHkloy4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Manage Employees</h1>
            </div>
            <p className="text-blue-100">View and manage employee accounts</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadEmployees}
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

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-900 dark:text-red-100">Error Loading Employees</p>
              <p className="text-sm mt-1 text-red-700 dark:text-red-300">{error}</p>
              <Button variant="outline" size="sm" onClick={loadEmployees} className="mt-3">Retry</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-700">{activeEmployees.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Full-Time</p>
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Briefcase className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-indigo-700">{fullTimeNodes}</div>
            <p className="text-xs text-muted-foreground mt-1">Employees</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Part-Time / Other</p>
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <UserCheck className="h-4 w-4 text-cyan-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-cyan-700">{activeEmployees.length - fullTimeNodes}</div>
            <p className="text-xs text-muted-foreground mt-1">Employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Create Actions */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-gray-50 border-gray-200"
          />
        </div>

        <Dialog open={showCreateEmployee} onOpenChange={setShowCreateEmployee}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
              <Plus className="mr-2 h-4 w-4" />
              Add New Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Create a new employee account. They will receive an email (simulated) with login details.
              </p>
            </DialogHeader>
            <form onSubmit={handleCreateEmployee} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" required value={newEmployee.name} onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" required value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newEmployee.password}
                    onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={newEmployee.department} onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input id="position" value={newEmployee.position} onChange={e => setNewEmployee({ ...newEmployee, position: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary">Salary</Label>
                  <Input id="salary" value={newEmployee.salary} onChange={e => setNewEmployee({ ...newEmployee, salary: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingType">Working Type</Label>
                  <select
                    id="workingType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newEmployee.workingType}
                    onChange={e => setNewEmployee({ ...newEmployee, workingType: e.target.value })}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateEmployee(false)}>Cancel</Button>
                <Button type="submit" disabled={createLoading} className="bg-blue-600 text-white">
                  {createLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Create Employee
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Employee Table */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Loading employees...
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>{emp.department || "-"}</TableCell>
                    <TableCell>{emp.position || "-"}</TableCell>
                    <TableCell>
                      {emp.managerName ? (
                        <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                          <UserCog className="h-3 w-3" />
                          {emp.managerName}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={emp.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 mr-1"
                        title="Assign Manager"
                        onClick={() => handleOpenAssignManager(emp)}
                      >
                        <UserCog className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Manager Dialog */}
      <Dialog open={assignManagerOpen} onOpenChange={setAssignManagerOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Manager</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Select a manager for <strong>{selectedEmployee?.name}</strong>.
            </p>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Search Manager</Label>
              <Input
                placeholder="Type to search..."
                value={managerSearchQuery}
                onChange={(e) => setManagerSearchQuery(e.target.value)}
              />
            </div>

            <div className="border rounded-md max-h-[250px] overflow-y-auto">
              {membersLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-xs text-muted-foreground mt-2">Loading members...</p>
                </div>
              ) : potentialManagers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No matching members found</div>
              ) : (
                <div className="divide-y">
                  <div
                    className={`p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedManagerId === null ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    onClick={() => setSelectedManagerId(null)}
                  >
                    <div className="font-medium text-red-600">No Manager (Unassign)</div>
                  </div>
                  {potentialManagers.map(manager => (
                    <div
                      key={manager.id}
                      className={`p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedManagerId === manager.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500' : ''}`}
                      onClick={() => setSelectedManagerId(manager.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{manager.name}</div>
                        <Badge variant="outline" className={manager.role === 'admin' ? "bg-purple-50 text-purple-700 border-purple-200 text-xs" : "bg-slate-50 text-slate-600 border-slate-200 text-xs"}>
                          {manager.role}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{manager.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAssignManagerOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignManagerSubmit} disabled={assignLoading}>
              {assignLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Save Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog >
    </div >
  )
}
