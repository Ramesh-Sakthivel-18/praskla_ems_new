"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Mail,
  Building2,
  Calendar,
  Shield,
  Edit,
  Save,
  X,
  Lock,
  Phone,
  Briefcase,
  ArrowLeft,
  RefreshCw,
  Users,
  Eye,
  EyeOff
} from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"
import { format } from "date-fns"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { getValidIdToken } from "@/lib/firebaseClient"

export default function AdminProfilePage() {
  const router = useRouter()

  const [currentUser, setCurrentUser] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)

  const [editMode, setEditMode] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    name: "",
    phone: "",
    department: "",
    position: "",
  })

  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Auth Check
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/admin/login")
      return
    }

    const emp = getCurrentUser()
    if (!emp || (emp.role !== "admin" && emp.role !== "system_admin")) {
      router.push("/admin/login")
      return
    }

    setCurrentUser(emp)
    setEditedProfile({
      name: emp.name || "",
      phone: emp.phone || "",
      department: emp.department || "",
      position: emp.position || "Admin",
    })

    loadOrganizationDetails(emp)
  }, [router])

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }

  const loadOrganizationDetails = async (user) => {
    setLoading(true)
    const token = await getValidIdToken()
    const base = getApiBase()

    if (!token) {
      setLoading(false)
      return
    }

    try {
      const orgRes = await fetch(`${base}/api/admin/organization`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (orgRes.ok) {
        const data = await orgRes.json()
        setOrganization(data)
      }
    } catch (error) {
      console.error("Failed to load organization:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    const token = await getValidIdToken()
    const base = getApiBase()

    try {
      const response = await fetch(`${base}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editedProfile),
      })

      if (response.ok) {
        const data = await response.json()
        const updatedEmployee = data.employee
        const updatedUser = { ...currentUser, ...updatedEmployee }
        // Update both session storage and state
        localStorage.setItem("currentUser", JSON.stringify(updatedUser))
        setCurrentUser(updatedUser)
        setEditMode(false)
        alert("Profile updated successfully!")
      } else {
        alert("Failed to update profile")
      }
    } catch (error) {
      console.error("Save profile error:", error)
      alert("Network error")
    }
  }

  const handleCancelEdit = () => {
    setEditedProfile({
      name: currentUser.name || "",
      phone: currentUser.phone || "",
      department: currentUser.department || "",
      position: currentUser.position || "Admin",
    })
    setEditMode(false)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords don't match!")
      return
    }

    if (passwordData.newPassword.length < 6) {
      alert("Password must be at least 6 characters")
      return
    }

    const token = await getValidIdToken()
    const base = getApiBase()

    try {
      const response = await fetch(`${base}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (response.ok) {
        alert("Password changed successfully!")
        setShowPasswordChange(false)
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      } else {
        const data = await response.json()
        alert(`${data.error || "Failed to change password"}`)
      }
    } catch (error) {
      console.error("Change password error:", error)
      alert("Network error")
    }
  }

  const getInitials = (name) => {
    if (!name) return "AD"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "MMMM dd, yyyy")
    } catch {
      return "N/A"
    }
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 animate-in fade-in-50 duration-500">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Header */}
        <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGM0LjQxOCAwIDgtMy41ODIgOC04cy0zLjU4Mi04LTgtOC04IDMuNTgyLTggOCAzLjU4MiA4IDggOHoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-4 border-white/20 shadow-xl">
                <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                  {getInitials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{currentUser.name}</h1>
                <p className="text-blue-100">{currentUser.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className="bg-white/20 text-white border-0">
                    <Shield className="mr-1 h-3 w-3" />
                    {currentUser.role === 'admin' ? 'Administrator' : 'System Admin'}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              onClick={() => router.push("/admin/dashboard")}
              className="bg-white text-blue-700 hover:bg-blue-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Column - Quick Info */}
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Member since</p>
                    <p className="font-medium">{formatDate(currentUser.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                    <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Organization</p>
                    <p className="font-medium">{organization?.name || "Loading..."}</p>
                  </div>
                </div>
                {organization && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                      <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Staff</p>
                      <p className="font-medium">{organization.employeeCount || 0} employees</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Column */}
          <div className="md:col-span-2 space-y-6">
            {/* Profile Information */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </div>
                {!editMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                    className="bg-white dark:bg-gray-800"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveProfile} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    {editMode ? (
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="name"
                          value={editedProfile.name}
                          onChange={(e) => setEditedProfile((s) => ({ ...s, name: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{currentUser.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex items-center gap-3 rounded-lg border bg-gray-100 dark:bg-gray-800 px-4 py-3">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-muted-foreground">{currentUser.email}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    {editMode ? (
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="Enter phone number"
                          value={editedProfile.phone}
                          onChange={(e) => setEditedProfile((s) => ({ ...s, phone: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{currentUser.phone || "Not provided"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    {editMode ? (
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="position"
                          placeholder="Your position"
                          value={editedProfile.position}
                          onChange={(e) => setEditedProfile((s) => ({ ...s, position: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        <span>{currentUser.position || "Admin"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="department">Department</Label>
                    {editMode ? (
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="department"
                          placeholder="Department"
                          value={editedProfile.department}
                          onChange={(e) => setEditedProfile((s) => ({ ...s, department: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span>{currentUser.department || "Not specified"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-600" />
                  Security
                </CardTitle>
                <CardDescription>Manage your password and security settings</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {!showPasswordChange ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordChange(true)}
                    className="border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                  >
                    <Lock className="mr-2 h-4 w-4 text-red-600" />
                    Change Password
                  </Button>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData((s) => ({ ...s, currentPassword: e.target.value }))}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData((s) => ({ ...s, newPassword: e.target.value }))}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData((s) => ({ ...s, confirmPassword: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowPasswordChange(false)
                          setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-gradient-to-r from-red-600 to-orange-600 text-white">
                        Update Password
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}