"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { EmployeeSidebar } from "@/components/employee-sidebar"
import { EmployeeNavbar } from "@/components/employee-navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, User, Calendar, Building } from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"

export default function EmployeeProfilePage() {
  const router = useRouter()
  const [employeeData, setEmployeeData] = useState({
    name: "",
    email: "",
    position: "",
    department: "",
    hireDate: ""
  })
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("employeeLoggedIn")) {
      safeRedirect(router, "/employee/login")
    }
    loadEmployeeData()
  }, [router])

  const loadEmployeeData = async () => {
    // In a real app, you would fetch this data from an API
    // For now, we'll use mock data
    const currentEmployee = JSON.parse(localStorage.getItem("currentEmployee") || "{}")
    setEmployeeData({
      name: currentEmployee.name || "John Doe",
      email: currentEmployee.email || "john.doe@company.com",
      position: currentEmployee.position || "Software Engineer",
      department: currentEmployee.department || "Engineering",
      hireDate: currentEmployee.hireDate || "2023-01-15"
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // In a real app, you would send this data to an API
    alert('Profile updated successfully!')
    setIsEditing(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <EmployeeSidebar />
      <EmployeeNavbar />

      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">My Profile</h2>
            <p className="text-muted-foreground mt-1">View and manage your profile information</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src="/placeholder-user.jpg" />
                    <AvatarFallback className="text-2xl">
                      {employeeData.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline" className="mt-4" disabled>
                    Change Photo
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={employeeData.name}
                            onChange={(e) => setEmployeeData({...employeeData, name: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Mail className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={employeeData.email}
                            onChange={(e) => setEmployeeData({...employeeData, email: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Building className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="position">Position</Label>
                          <Input
                            id="position"
                            value={employeeData.position}
                            onChange={(e) => setEmployeeData({...employeeData, position: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Building className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="department">Department</Label>
                          <Input
                            id="department"
                            value={employeeData.department}
                            onChange={(e) => setEmployeeData({...employeeData, department: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Calendar className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="hireDate">Hire Date</Label>
                          <Input
                            id="hireDate"
                            type="date"
                            value={employeeData.hireDate}
                            onChange={(e) => setEmployeeData({...employeeData, hireDate: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button type="submit">Save Changes</Button>
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium">{employeeData.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email Address</p>
                        <p className="font-medium">{employeeData.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Building className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Position</p>
                        <p className="font-medium">{employeeData.position}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Building className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Department</p>
                        <p className="font-medium">{employeeData.department}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Hire Date</p>
                        <p className="font-medium">
                          {employeeData.hireDate 
                            ? new Date(employeeData.hireDate).toLocaleDateString() 
                            : "Not specified"}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}