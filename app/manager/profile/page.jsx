"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Mail, 
  Shield,
  Calendar, 
  Edit,
  Save,
  X,
  Lock,
  Building2,
  Users,
  CheckCircle
} from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"
import { format } from "date-fns"

export default function ManagerProfilePage() {
  const router = useRouter()
  
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalBusinessOwners: 0,
  })
  
  const [editMode, setEditMode] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    name: "",
  })

  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    const current = localStorage.getItem("currentEmployee")
    if (!current) {
      safeRedirect(router, "/admin/login")
      return
    }

    const emp = JSON.parse(current)
    if (emp.role !== "manager") {
      alert("Unauthorized. Manager access required.")
      safeRedirect(router, "/admin/login")
      return
    }

    setCurrentUser(emp)
    setEditedProfile({
      name: emp.name || "Super Manager",
    })
    
    loadStats()
  }, [router])

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }

  const loadStats = async () => {
    setLoading(true)
    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    try {
      const response = await fetch(`${base}/api/manager/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        const organizations = data.organizations || []

        setStats({
          totalOrganizations: organizations.length,
          activeOrganizations: organizations.filter((o) => o.isActive).length,
          totalBusinessOwners: organizations.length,
        })
      }
    } catch (error) {
      console.error("Failed to load stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = () => {
    // Update localStorage (in real app, you'd call backend)
    const updatedUser = { ...currentUser, name: editedProfile.name }
    localStorage.setItem("currentEmployee", JSON.stringify(updatedUser))
    setCurrentUser(updatedUser)
    setEditMode(false)
    alert("✅ Profile updated successfully!")
  }

  const handleCancelEdit = () => {
    setEditedProfile({
      name: currentUser.name || "Super Manager",
    })
    setEditMode(false)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("❌ New passwords don't match!")
      return
    }

    if (passwordData.newPassword.length < 6) {
      alert("❌ Password must be at least 6 characters")
      return
    }

    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    try {
      const response = await fetch(`${base}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (response.ok) {
        alert("✅ Password changed successfully!")
        setShowPasswordChange(false)
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      } else {
        const data = await response.json()
        alert(`❌ ${data.error || "Failed to change password"}`)
      }
    } catch (error) {
      console.error("Change password error:", error)
      alert("❌ Network error")
    }
  }

  const getInitials = (name) => {
    if (!name) return "MG"
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

  if (loading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
            <p className="text-sm text-muted-foreground">
              Manage your account information and preferences
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Column - Profile Card */}
          <Card className="md:col-span-1">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle>{currentUser.name || "Super Manager"}</CardTitle>
              <CardDescription>{currentUser.email}</CardDescription>
              <div className="mt-3">
                <Badge variant="default" className="px-3 py-1">
                  <Shield className="mr-1 h-3 w-3" />
                  Manager
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Member since {formatDate(currentUser.createdAt || new Date())}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>System Administrator</span>
                </div>
              </div>

              <Separator />

              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/manager/dashboard")}
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Right Column - Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal details
                  </CardDescription>
                </div>
                {!editMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveProfile}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    {editMode ? (
                      <Input
                        id="name"
                        value={editedProfile.name}
                        onChange={(e) =>
                          setEditedProfile((s) => ({
                            ...s,
                            name: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{currentUser.name || "Super Manager"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {currentUser.email}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Manager (System Administrator)
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Management Statistics</CardTitle>
                <CardDescription>
                  Overview of organizations under your management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Total Organizations
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-base">
                    {stats.totalOrganizations}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">
                      Active Organizations
                    </span>
                  </div>
                  <Badge variant="default" className="text-base bg-green-600">
                    {stats.activeOrganizations}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Business Owners
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-base">
                    {stats.totalBusinessOwners}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Manage your password and security settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showPasswordChange ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordChange(true)}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">
                        Current Password
                      </Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData((s) => ({
                            ...s,
                            currentPassword: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData((s) => ({
                            ...s,
                            newPassword: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData((s) => ({
                            ...s,
                            confirmPassword: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowPasswordChange(false)
                          setPasswordData({
                            currentPassword: "",
                            newPassword: "",
                            confirmPassword: "",
                          })
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Update Password</Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Access Info Card */}
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Manager Privileges
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      As a system manager, you have the highest level of access. You can approve 
                      new organizations, manage business owner accounts, and view aggregate 
                      statistics across all organizations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
