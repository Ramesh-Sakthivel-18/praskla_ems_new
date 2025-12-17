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
import { UserPlus, Edit, Trash2, Eye } from "lucide-react"
import { auth } from "@/lib/firebaseClient"
import { safeRedirect } from "@/lib/redirectUtils"

export default function AdminEmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [token, setToken] = useState("")
  const [employeesLoading, setEmployeesLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    department: "",
    role: "employee",
    password: "",
    workingType: "full-time" // Add the missing required field
  })

  useEffect(() => {
    console.log('👥 AdminEmployees: Component mounted');
    
    // Check authentication
    if (!localStorage.getItem("adminLoggedIn")) {
      console.log('⚠️ AdminEmployees: Not logged in, redirecting to login');
      safeRedirect(router, "/admin/login")
      return
    }

    const loadEmployees = async () => {
      console.log('🔄 AdminEmployees: loadEmployees() - Loading employees...');
      setEmployeesLoading(true);
      
      try {
        // Get fresh token from Firebase if available
        let freshToken = localStorage.getItem("firebaseToken");
        console.log('🔑 AdminEmployees: Using stored token, length:', freshToken?.length || 0);
        
        if (auth && auth.currentUser) {
          try {
            console.log('🔄 AdminEmployees: Refreshing Firebase token...');
            freshToken = await auth.currentUser.getIdToken(true); // Force refresh
            localStorage.setItem("firebaseToken", freshToken);
            console.log('✅ AdminEmployees: Token refreshed, length:', freshToken.length);
          } catch (refreshError) {
            console.error('❌ AdminEmployees: Token refresh failed:', refreshError);
            console.error('❌ AdminEmployees: Token refresh error stack:', refreshError.stack);
          }
        } else {
          console.log('⚠️ AdminEmployees: Firebase auth not available');
        }
        
        if (!freshToken) {
          console.log('⚠️ AdminEmployees: No token available, checking Firebase user');
          
          // Try to get token from Firebase user if available
          if (auth && auth.currentUser) {
            try {
              console.log('🔄 AdminEmployees: Getting token from Firebase user...');
              freshToken = await auth.currentUser.getIdToken();
              localStorage.setItem("firebaseToken", freshToken);
              console.log('✅ AdminEmployees: Got token from Firebase user, length:', freshToken.length);
            } catch (refreshError) {
              console.error('❌ AdminEmployees: Token refresh failed:', refreshError);
              console.error('❌ AdminEmployees: Token refresh error stack:', refreshError.stack);
            }
          } else {
            console.log('⚠️ AdminEmployees: No Firebase user found, checking localStorage');
            // Try to get token from localStorage as last resort
            const storedToken = localStorage.getItem("firebaseToken");
            if (storedToken) {
              console.log('🔁 AdminEmployees: Trying stored token...');
              freshToken = storedToken;
            } else {
              console.log('⚠️ AdminEmployees: No stored token found');
            }
          }
        }
        
        if (!freshToken) {
          console.log('❌ AdminEmployees: No valid token found, redirecting to login');
          localStorage.removeItem("adminLoggedIn");
          localStorage.removeItem("firebaseToken");
          safeRedirect(router, "/admin/login");
          return;
        }
        
        console.log('🔗 AdminEmployees: Fetching employees from API...');
        const getApiBase = () => {
          const env = process.env.NEXT_PUBLIC_API_URL || ''
          if (!env) return 'http://localhost:3000'
          if (env.includes('5001')) return 'http://localhost:3000'
          return env
        }
        let response = await fetch(`${getApiBase()}/api/admin/employees`, {
          headers: {
            'Authorization': `Bearer ${freshToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📊 AdminEmployees: API response status:', response.status);
        
        // If unauthorized, try to refresh token and retry once
        if (response.status === 401) {
          console.log('⚠️ AdminEmployees: Unauthorized, trying token refresh...');
          
          if (auth && auth.currentUser) {
            try {
              console.log('🔄 AdminEmployees: Refreshing token for retry...');
              const newToken = await auth.currentUser.getIdToken(true); // Force refresh
              localStorage.setItem("firebaseToken", newToken);
              console.log('✅ AdminEmployees: Token refreshed for retry, length:', newToken.length);
              
              // Retry the request with new token
              response = await fetch(`${getApiBase()}/api/admin/employees`, {
                headers: {
                  'Authorization': `Bearer ${newToken}`,
                  'Content-Type': 'application/json'
                }
              });
              
              console.log('📊 AdminEmployees: Retry API response status:', response.status);
            } catch (refreshError) {
              console.error('❌ AdminEmployees: Token refresh failed:', refreshError);
              console.error('❌ AdminEmployees: Token refresh error stack:', refreshError.stack);
            }
          } else {
            console.log('⚠️ AdminEmployees: No Firebase user found, checking localStorage');
            // Try to get token from localStorage as last resort
            const storedToken = localStorage.getItem("firebaseToken");
            if (storedToken) {
              console.log('🔁 AdminEmployees: Trying stored token...');
              response = await fetch(`${getApiBase()}/api/admin/employees`, {
                headers: {
                  'Authorization': `Bearer ${storedToken}`,
                  'Content-Type': 'application/json'
                }
              });
              console.log('📊 AdminEmployees: Stored token API response status:', response.status);
            } else {
              console.log('⚠️ AdminEmployees: No stored token found');
            }
          }
        } else {
          console.log('⚠️ AdminEmployees: Firebase auth not available');
        }

        if (response.ok) {
          const data = await response.json();
          console.log('✅ AdminEmployees: Received employee data:', data.length, 'employees');
          
          // Filter only active employees
          const activeEmployees = data.filter(emp => emp.isActive !== false);
          console.log('🔍 AdminEmployees: Filtered active employees:', activeEmployees.length);
          setEmployees(activeEmployees);
        } else {
          console.error('❌ AdminEmployees: API error response:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('❌ AdminEmployees: Error details:', errorText);
          
          // If still unauthorized after refresh attempt, redirect to login
          if (response.status === 401) {
            console.log('🔗 AdminEmployees: Unauthorized, redirecting to login');
            localStorage.removeItem("adminLoggedIn");
            localStorage.removeItem("firebaseToken");
            safeRedirect(router, "/admin/login");
          }
        }
      } catch (error) {
        console.error('❌ AdminEmployees: Network error:', error);
      } finally {
        setEmployeesLoading(false);
      }
    };

    console.log('👤 AdminEmployees: Current user:', auth.currentUser ? 'exists' : 'null');
    
    // Listen for auth state changes and refresh token (if Firebase is available)
    let unsubscribe = () => {};
    if (auth) {
      console.log('👂 AdminEmployees: Setting up auth state listener');
      // Note: We're not setting up a real listener here since we're handling token refresh manually
    }
    
    // Load existing token if available
    console.log('🔍 AdminEmployees: Checking for stored token');
    const storedToken = localStorage.getItem("firebaseToken")
    if (storedToken) {
      console.log('✅ AdminEmployees: Found stored token, length:', storedToken.length);
      setToken(storedToken)
    } else {
      console.log('⚠️ AdminEmployees: No stored token found');
    }
    
    // If we have auth but no user, try to load employees anyway (might work with stored token)
    if (auth && !auth.currentUser && storedToken) {
      console.log('🔄 AdminEmployees: No current user but have stored token, loading employees');
      loadEmployees();
    } else {
      loadEmployees();
    }
    
    return () => {
      console.log('🧹 AdminEmployees: Cleaning up auth listener');
      unsubscribe()
    }
  }, [router])
  
  useEffect(() => {
    console.log('🔄 AdminEmployees: Token effect triggered, token:', !!token);
    if (token) {
      console.log('✅ AdminEmployees: Token available, loading employees');
    }
  }, [token]);

  useEffect(() => {
    console.log('🔍 AdminEmployees: Filtering employees, searchTerm:', searchTerm, 'employees:', employees.length);
    const filtered = employees.filter(employee =>
      (employee.name && employee.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (employee.email && employee.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (employee.position && employee.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (employee.department && employee.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    console.log('✅ AdminEmployees: Filtered employees:', filtered.length);
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('📝 AdminEmployees: handleSubmit() - Form submitted');
    console.log('🔐 AdminEmployees: Token available:', !!token);

    if (!token) {
      console.log('❌ AdminEmployees: No token available');
      alert('Authentication error. Please log in again.');
      safeRedirect(router, "/admin/login");
      return;
    }

    try {
      console.log('🔗 AdminEmployees: Sending employee data to API...');
      console.log('📝 AdminEmployees: Form data:', formData);
      
      const getApiBase = () => {
        const env = process.env.NEXT_PUBLIC_API_URL || ''
        if (!env) return 'http://localhost:3000'
        if (env.includes('5001')) return 'http://localhost:3000'
        return env
      }
      const url = editingId 
        ? `${getApiBase()}/api/admin/employees/${editingId}`
        : `${getApiBase()}/api/admin/employees`;
        
      console.log('🔗 AdminEmployees: API endpoint:', url);
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      console.log('📊 AdminEmployees: Save response status:', response.status);
      
      if (response.ok) {
        console.log('✅ AdminEmployees: Employee saved successfully');
        const updatedEmployee = await response.json();
        
        if (editingId) {
          // Update existing employee
          setEmployees(employees.map(emp => emp.id === editingId ? updatedEmployee : emp));
        } else {
          // Add new employee
          setEmployees([...employees, updatedEmployee]);
        }
        
        // Reset form
        setEditingId(null);
        setFormData({
          name: "",
          email: "",
          position: "",
          department: "",
          role: "employee",
          password: "",
          workingType: "full-time" // Add workingType field
        });

        alert(editingId ? 'Employee updated successfully!' : 'Employee created successfully!');
      } else {
        console.error('❌ AdminEmployees: Failed to save employee:', response.status);
        const errorData = await response.json();
        console.error('❌ AdminEmployees: Error response:', errorData);
        alert(errorData.error || `Failed to ${editingId ? 'update' : 'create'} employee`);
      }
    } catch (error) {
      console.error('❌ AdminEmployees: Network error during save:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleEdit = (employee) => {
    console.log('✏️ AdminEmployees: Editing employee:', employee.id);
    setEditingId(employee.id);
    setFormData({
      name: employee.name,
      email: employee.email,
      position: employee.position,
      department: employee.department,
      role: employee.role,
      password: "", // Don't prefill password
      workingType: employee.workingType || "full-time" // Add workingType field
    });
  };

  const handleDelete = async (id) => {
    console.log('🗑️ AdminEmployees: Deleting employee:', id);
    
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      console.log('↩️ AdminEmployees: Delete cancelled by user');
      return;
    }

    try {
      console.log('🔗 AdminEmployees: Sending delete request to API...');
      const getApiBaseDel = () => {
        const env = process.env.NEXT_PUBLIC_API_URL || ''
        if (!env) return 'http://localhost:3000'
        if (env.includes('5001')) return 'http://localhost:3000'
        return env
      }
      const response = await fetch(`${getApiBaseDel()}/api/admin/employees/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📊 AdminEmployees: Delete response status:', response.status);
      
      if (response.ok) {
        console.log('✅ AdminEmployees: Employee deleted successfully');
        setEmployees(employees.filter(emp => emp.id !== id));
        alert('Employee deleted successfully!');
      } else {
        console.error('❌ AdminEmployees: Failed to delete employee:', response.status);
        const errorData = await response.json()
        alert(errorData.error || 'Failed to delete employee');
      }
    } catch (error) {
      console.error('❌ AdminEmployees: Network error during delete:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleViewDetails = (employee) => {
    console.log('👁️ AdminEmployees: Viewing employee details:', employee.id);
    // Implementation for viewing employee details would go here
    alert(`Viewing details for ${employee.name}\nRole: ${employee.role}\nDepartment: ${employee.department}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminNavbar />

      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">Employee Management</h2>
            <p className="text-muted-foreground mt-1">Add, edit, and manage employee accounts</p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Employee List</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingId(null);
                      setFormData({
                        name: "",
                        email: "",
                        position: "",
                        department: "",
                        role: "employee",
                        password: "",
                        workingType: "full-time" // Add workingType field
                      });
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
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          value={formData.position}
                          onChange={(e) => setFormData({...formData, position: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={formData.department}
                          onChange={(e) => setFormData({...formData, department: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
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
                        <Label htmlFor="workingType">Working Type</Label>
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
                        <Label htmlFor="password">{editingId ? 'New Password (optional)' : 'Password'}</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          required={!editingId}
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
                <div className="text-center py-8">
                  <p>Loading employees...</p>
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
                      <TableHead>Status</TableHead>
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
                          <Badge variant="outline">Active</Badge>
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
