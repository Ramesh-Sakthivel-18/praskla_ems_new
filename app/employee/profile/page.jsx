import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User, Mail, Phone, MapPin, Building, Calendar,
  Lock, Save, Loader2, AlertCircle, UserCog
} from "lucide-react"
import { format } from "date-fns"
import { safeRedirect } from "@/lib/redirectUtils"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { getValidIdToken } from "@/lib/firebaseClient"

export default function EmployeeProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [currentUser, setCurrentUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [loading, setLoading] = useState(true)

  // Profile Data
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    position: "",
    department: "",
    hireDate: "",
    salary: "",
    managerName: ""
  })

  // Password Change
  const [passData, setPassData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  useEffect(() => {
    if (!isAuthenticated()) {
      safeRedirect(navigate, "/employee/login")
      return
    }
    loadProfile()
  }, [])

  const getApiBase = () => {
    return import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  }

  const loadProfile = async () => {
    setLoading(true)
    const token = await getValidIdToken()
    if (!token) return

    try {
      // Get expanded profile info
      const response = await fetch(`${getApiBase()}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const user = data.user || {}
        setCurrentUser(user)
        setProfileData({
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          address: user.address || "",
          position: user.position || "Employee",
          department: user.department || "General",
          hireDate: user.createdAt || "",
          salary: user.salary ? `₹${user.salary.toLocaleString()}` : "Not specified",
          managerName: user.managerName || ""
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const token = await getValidIdToken()

    try {
      const response = await fetch(`${getApiBase()}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: profileData.phone,
          address: profileData.address,
          // Employees typically can't change their own Name/Email/Position without HR approval
          // So we restrict edits to contact info
        })
      })

      if (response.ok) {
        const data = await response.json()
        const updatedEmployee = data.employee || {}

        // Update local state directly instead of full reload
        setProfileData(prev => ({
          ...prev,
          phone: updatedEmployee.phone || prev.phone,
          address: updatedEmployee.address || prev.address
        }))

        // Also update localStorage for persistence across navigation
        const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
        localStorage.setItem('currentUser', JSON.stringify({
          ...storedUser,
          phone: updatedEmployee.phone,
          address: updatedEmployee.address
        }))

        alert('Profile updated successfully')
      } else {
        const err = await response.json()
        alert(`Failed to update: ${err.error}`)
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passData.newPassword !== passData.confirmPassword) {
      alert("New passwords do not match")
      return
    }

    setSaving(true)
    const token = await getValidIdToken()

    try {
      const response = await fetch(`${getApiBase()}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword: passData.currentPassword,
          newPassword: passData.newPassword
        })
      })

      if (response.ok) {
        alert('Password changed successfully')
        setPassData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      } else {
        const err = await response.json()
        alert(`Failed to change password: ${err.error}`)
      }
    } catch (error) {
      console.error('Password error:', error)
      alert('Network error')
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (name) => {
    if (!name) return "EM"
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Sidebar / User Card */}
        <Card className="w-full md:w-80 shadow-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Avatar className="h-32 w-32 border-4 border-emerald-100 mb-4">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-3xl font-bold">
                {getInitials(profileData.name)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold text-center">{profileData.name}</h2>
            <p className="text-muted-foreground text-center mb-4">{profileData.position}</p>

            <div className="w-full space-y-3 mt-4 pt-4 border-t">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-emerald-600" />
                <span className="truncate">{profileData.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building className="h-4 w-4 text-emerald-600" />
                <span>{profileData.department}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span>Joined {profileData.hireDate && !isNaN(new Date(profileData.hireDate).getTime()) ? format(new Date(profileData.hireDate), "MMM yyyy") : "N/A"}</span>
              </div>
              {profileData.managerName && (
                <div className="flex items-center gap-3 text-sm">
                  <UserCog className="h-4 w-4 text-emerald-600" />
                  <span>Manager: <strong>{profileData.managerName}</strong></span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="flex-1 w-full">
          <h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-100">My Profile</h1>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="details">Personal Details</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Manage your contact information. Some fields are read-only.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name (Read-Only)</Label>
                        <div className="flex items-center px-3 py-2 border rounded-md bg-slate-50 text-slate-500">
                          <User className="h-4 w-4 mr-2" />
                          {profileData.name}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Email (Read-Only)</Label>
                        <div className="flex items-center px-3 py-2 border rounded-md bg-slate-50 text-slate-500">
                          <Mail className="h-4 w-4 mr-2" />
                          {profileData.email}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={profileData.address}
                          onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                          placeholder="Enter your address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <div className="flex items-center px-3 py-2 border rounded-md bg-slate-50 text-slate-500">
                          <Building className="h-4 w-4 mr-2" />
                          {profileData.department}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Designation</Label>
                        <div className="flex items-center px-3 py-2 border rounded-md bg-slate-50 text-slate-500">
                          <Building className="h-4 w-4 mr-2" />
                          {profileData.position}
                        </div>
                      </div>
                      {profileData.managerName && (
                        <div className="space-y-2">
                          <Label>Reporting Manager</Label>
                          <div className="flex items-center px-3 py-2 border rounded-md bg-slate-50 text-slate-500">
                            <UserCog className="h-4 w-4 mr-2" />
                            {profileData.managerName}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Update your password and manage account security
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passData.currentPassword}
                        onChange={(e) => setPassData({ ...passData, currentPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passData.newPassword}
                        onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passData.confirmPassword}
                        onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>

                    <div className="pt-4">
                      <Button type="submit" disabled={saving} variant="destructive">
                        {saving ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}