"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminNavbar } from "@/components/admin-navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Edit, Trash2, Eye, Building2, RefreshCw } from "lucide-react"
import { auth } from "@/lib/firebaseClient"
import { safeRedirect } from "@/lib/redirectUtils"

export default function AdminEmployeesPage() {
  const router = useRouter()
  const [currentAdmin, setCurrentAdmin] = useState(null) // ✅ Store current admin
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [token, setToken] = useState("")
  const [employeesLoading, setEmployeesLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false) // ✅ Control dialog state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    department: "",
    role: "employee",
    password: "",
    workingType: "full-time",
    salary: "" // ✅ Add salary field
  })

  useEffect(() => {
    console.log('👥 AdminEmployees: Component mounted');
    
    // ✅ Get current admin from localStorage
    const currentEmployee = localStorage.getItem("currentEmployee")
    if (!currentEmployee) {
      console.log('⚠️ AdminEmployees: No current employee found, redirecting to login');
      safeRedirect(router, "/admin/login")
      return
    }

    const admin = JSON.parse(currentEmployee)
    if (admin.role !== "admin") {
      console.log('⚠️ AdminEmployees: Not an admin, redirecting');
      alert("Unauthorized. Admin access required.")
      safeRedirect(router, "/role-selection")
      return
    }

    console.log('✅ Admin logged in:', admin.email)
    console.log('🏢 Organization ID:', admin.organizationId)
    setCurrentAdmin(admin) // ✅ Store admin info

    const loadEmployees = async () => {
      console.log("=".repeat(50))
      console.log('🔄 AdminEmployees: Loading employees for organization:', admin.organizationId)
      console.log("=".repeat(50))
      setEmployeesLoading(true)
      
      try {
        // Get fresh token
        let freshToken = localStorage.getItem("firebaseToken")
        console.log('🔑 AdminEmployees: Using token, length:', freshToken?.length || 0)
        
        if (auth && auth.currentUser) {
          try {
            freshToken = await auth.currentUser.getIdToken(true)
            localStorage.setItem("firebaseToken", freshToken)
            console.log('✅ AdminEmployees: Token refreshed')
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError)
          }
        }
        
        if (!freshToken) {
          console.log('❌ AdminEmployees: No valid token found')
          localStorage.removeItem("adminLoggedIn")
          localStorage.removeItem("firebaseToken")
          safeRedirect(router, "/admin/login")
          return
        }
        
        setToken(freshToken)
        
        const getApiBase = () => {
          return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
        }
        
        console.log('🔗 AdminEmployees: Fetching from:', `${getApiBase()}/api/admin/employees`)
        let response = await fetch(`${getApiBase()}/api/admin/employees`, {
          headers: {
            'Authorization': `Bearer ${freshToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        console.log('📊 AdminEmployees: API response status:', response.status)
        
        // Retry with token refresh if unauthorized
        if (response.status === 401 && auth && auth.currentUser) {
          console.log('⚠️ Unauthorized, retrying with fresh token...')
          const newToken = await auth.currentUser.getIdToken(true)
          localStorage.setItem("firebaseToken", newToken)
          setToken(newToken)
          
          response = await fetch(`${getApiBase()}/api/admin/employees`, {
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json'
            }
          })
          console.log('📊 Retry response status:', response.status)
        }

        if (response.ok) {
          const data = await response.json()
          console.log('📊 Total employees from backend:', data.length)
          
          // ✅ Log all employees with their organization IDs
          console.log('📋 ALL EMPLOYEES FROM BACKEND:')
          data.forEach((emp, index) => {
            console.log(`   ${index + 1}. ${emp.name} (${emp.email})`)
            console.log(`      - Role: ${emp.role}`)
            console.log(`      - OrgID: ${emp.organizationId || "❌ MISSING"}`)
          })
          
          // ✅ Filter employees by organization ID
          const orgEmployees = data.filter(emp => 
            emp.organizationId === admin.organizationId
          )
          
          console.log('✅ Filtered employees for this organization:', orgEmployees.length)
          console.log('📋 ORGANIZATION EMPLOYEES:')
          orgEmployees.forEach((emp, index) => {
            console.log(`   ${index + 1}. ${emp.name} (${emp.email}) - ${emp.role}`)
          })
          
          // Check for employees from wrong organization
          const wrongOrg = data.filter(emp => 
            emp.organizationId && emp.organizationId !== admin.organizationId
          )
          if (wrongOrg.length > 0) {
            console.warn('⚠️ Found employees from other organizations:', wrongOrg.length)
          }
          
          console.log("=".repeat(50))
          setEmployees(orgEmployees)
          
        } else {
          console.error('❌ API error:', response.status, response.statusText)
          const errorText = await response.text()
          console.error('❌ Error details:', errorText)
          
          if (response.status === 401) {
            localStorage.removeItem("adminLoggedIn")
            localStorage.removeItem("firebaseToken")
            localStorage.removeItem("currentEmployee")
            safeRedirect(router, "/admin/login")
          }
        }
      } catch (error) {
        console.error('❌ Network error:', error)
      } finally {
        setEmployeesLoading(false)
      }
    }

    loadEmployees()
  }, [router])

  useEffect(() => {
    console.log('🔍 Filtering employees, searchTerm:', searchTerm)
    const filtered = employees.filter(employee =>
      (employee.name && employee.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (employee.email && employee.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (employee.position && employee.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (employee.department && employee.department.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    console.log('✅ Filtered results:', filtered.length)
    setFilteredEmployees(filtered)
  }, [searchTerm, employees])

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log('📝 Form submitted')

    if (!token) {
      alert('Authentication error. Please log in again.')
      safeRedirect(router, "/admin/login")
      return
    }

    if (!currentAdmin || !currentAdmin.organizationId) {
      alert('❌ Organization ID not found. Please log in again.')
      safeRedirect(router, "/admin/login")
      return
    }

    try {
      // ✅ Include organizationId in the request
      const employeeData = {
        ...formData,
        organizationId: currentAdmin.organizationId // ✅ IMPORTANT
      }
      
      console.log('📝 Creating/updating employee with data:', {
        ...employeeData,
        password: employeeData.password ? '***' : undefined
      })
      
      const getApiBase = () => {
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      }
      
      const url = editingId 
        ? `${getApiBase()}/api/admin/employees/${editingId}`
        : `${getApiBase()}/api/admin/employees`
        
      console.log('🔗 API endpoint:', url)
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(employeeData)
      })

      console.log('📊 Response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        const savedEmployee = result.employee || result
        
        console.log('✅ Employee saved:', savedEmployee)
        
        if (editingId) {
          setEmployees(employees.map(emp => 
            emp.id === editingId ? savedEmployee : emp
          ))
        } else {
          setEmployees([...employees, savedEmployee])
        }
        
        // Reset form and close dialog
        setEditingId(null)
        setDialogOpen(false)
        setFormData({
          name: "",
          email: "",
          position: "",
          department: "",
          role: "employee",
          password: "",
          workingType: "full-time",
          salary: ""
        })

        alert(editingId ? 'Employee updated successfully!' : 'Employee created successfully!')
      } else {
        const errorData = await response.json()
        console.error('❌ Save error:', errorData)
        alert(errorData.error || `Failed to ${editingId ? 'update' : 'create'} employee`)
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      alert('Network error. Please try again.')
    }
  }

  const handleEdit = (employee) => {
    console.log('✏️ Editing employee:', employee.id)
    setEditingId(employee.id)
    setFormData({
      name: employee.name,
      email: employee.email,
      position: employee.position,
      department: employee.department,
      role: employee.role,
      password: "",
      workingType: employee.workingType || "full-time",
      salary: employee.salary || ""
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id) => {
    console.log('🗑️ Deleting employee:', id)
    
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return
    }

    try {
      const getApiBase = () => {
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      }
      
      const response = await fetch(`${getApiBase()}/api/admin/employees/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('📊 Delete response:', response.status)
      
      if (response.ok) {
        console.log('✅ Employee deleted')
        setEmployees(employees.filter(emp => emp.id !== id))
        alert('Employee deleted successfully!')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to delete employee')
      }
    } catch (error) {
      console.error('❌ Delete error:', error)
      alert('Network error. Please try again.')
    }
  }

  const handleViewDetails = (employee) => {
    console.log('👁️ Viewing employee:', employee.id)
    alert(
      `Employee Details:\n\n` +
      `Name: ${employee.name}\n` +
      `Email: ${employee.email}\n` +
      `Position: ${employee.position}\n` +
      `Department: ${employee.department}\n` +
      `Role: ${employee.role}\n` +
      `Working Type: ${employee.workingType || 'N/A'}\n` +
      `Organization ID: ${employee.organizationId || 'N/A'}`
    )
  }

  if (!currentAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminNavbar />

      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">Employee Management</h2>
            <p className="text-muted-foreground mt-1">Add, edit, and manage employee accounts</p>
            {currentAdmin.organizationId && (
              <Badge variant="outline" className="mt-2">
                <Building2 className="mr-1 h-3 w-3" />
                Org ID: {currentAdmin.organizationId.substring(0, 12)}...
              </Badge>
            )}
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Employee List ({filteredEmployees.length})</span>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingId(null)
                      setFormData({
                        name: "",
                        email: "",
                        position: "",
                        department: "",
                        role: "employee",
                        password: "",
                        workingType: "full-time",
                        salary: ""
                      })
                      setDialogOpen(true)
                    }}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingId ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="john@example.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="position">Position *</Label>
                        <Input
                          id="position"
                          value={formData.position}
                          onChange={(e) => setFormData({...formData, position: e.target.value})}
                          placeholder="Software Engineer"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department *</Label>
                        <Input
                          id="department"
                          value={formData.department}
                          onChange={(e) => setFormData({...formData, department: e.target.value})}
                          placeholder="IT"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="salary">Salary</Label>
                        <Input
                          id="salary"
                          value={formData.salary}
                          onChange={(e) => setFormData({...formData, salary: e.target.value})}
                          placeholder="50000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role *</Label>
                        <select
                          id="role"
                          className="w-full p-2 border rounded"
                          value={formData.role}
                          onChange={(e) => setFormData({...formData, role: e.target.value})}
                        >
                          <option value="employee">Employee</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="workingType">Working Type *</Label>
                        <select
                          id="workingType"
                          className="w-full p-2 border rounded"
                          value={formData.workingType}
                          onChange={(e) => setFormData({...formData, workingType: e.target.value})}
                        >
                          <option value="full-time">Full-time</option>
                          <option value="part-time">Part-time</option>
                          <option value="contract">Contract</option>
                          <option value="intern">Intern</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">
                          {editingId ? 'New Password (leave blank to keep current)' : 'Password *'}
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          placeholder="Minimum 6 characters"
                          required={!editingId}
                          minLength={6}
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        {editingId ? 'Update Employee' : 'Create Employee'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              {employeesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="ml-3 text-sm text-muted-foreground">Loading employees...</p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No employees found matching your search.' : 'No employees in your organization yet.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>
                          <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'}>
                            {employee.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewDetails(employee)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => handleEdit(employee)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(employee.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
    </div>
  )
}
