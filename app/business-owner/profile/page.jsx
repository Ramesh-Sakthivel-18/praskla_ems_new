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
  Building2, 
  Calendar, 
  Shield,
  Edit,
  Save,
  X,
  Lock,
  Phone,
  Briefcase
} from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"
import { format } from "date-fns"

export default function BusinessOwnerProfilePage() {
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
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
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

    setCurrentUser(emp)
    setEditedProfile({
      name: emp.name || "",
      phone: emp.phone || "",
      department: emp.department || "",
      position: emp.position || "Business Owner",
    })
    
    loadOrganizationDetails(emp)
  }, [router])

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }

  const loadOrganizationDetails = async (user) => {
    setLoading(true)
    const token = localStorage.getItem("firebaseToken")
    const base = getApiBase()

    try {
      // Get organization details
      const orgRes = await fetch(`${base}/api/manager/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (orgRes.ok) {
        const data = await orgRes.json()
        const orgs = data.organizations || []
        const myOrg = orgs.find((o) => o.id === user.organizationId)
        setOrganization(myOrg || null)
      }
    } catch (error) {
      console.error("Failed to load organization:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    const token = localStorage.getItem("firebaseToken")
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

        // Update localStorage
        const updatedUser = { ...currentUser, ...updatedEmployee }
        localStorage.setItem("currentEmployee", JSON.stringify(updatedUser))
        setCurrentUser(updatedUser)

        setEditMode(false)
        alert("✅ Profile updated successfully!")
      } else {
        alert("❌ Failed to update profile")
      }
    } catch (error) {
      console.error("Save profile error:", error)
      alert("❌ Network error")
    }
  }

  const handleCancelEdit = () => {
    setEditedProfile({
      name: currentUser.name || "",
      phone: currentUser.phone || "",
      department: currentUser.department || "",
      position: currentUser.position || "Business Owner",
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
      // Note: You'll need to add this endpoint to your backend
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
    if (!name) return "BO"
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
              <CardTitle>{currentUser.name}</CardTitle>
              <CardDescription>{currentUser.email}</CardDescription>
              <div className="mt-3">
                <Badge variant="secondary" className="px-3 py-1">
                  <Shield className="mr-1 h-3 w-3" />
                  Business Owner
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Member since {formatDate(currentUser.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{organization?.name || "Organization"}</span>
                </div>
              </div>

              <Separator />

              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/business-owner/dashboard")}
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
                <div className="grid gap-4 md:grid-cols-2">
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
                        <span>{currentUser.name}</span>
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
                    <Label htmlFor="phone">Phone Number</Label>
                    {editMode ? (
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter phone number"
                        value={editedProfile.phone}
                        onChange={(e) =>
                          setEditedProfile((s) => ({
                            ...s,
                            phone: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{currentUser.phone || "Not provided"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    {editMode ? (
                      <Input
                        id="position"
                        placeholder="Your position"
                        value={editedProfile.position}
                        onChange={(e) =>
                          setEditedProfile((s) => ({
                            ...s,
                            position: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {currentUser.position || "Business Owner"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="department">Department</Label>
                    {editMode ? (
                      <Input
                        id="department"
                        placeholder="Department"
                        value={editedProfile.department}
                        onChange={(e) =>
                          setEditedProfile((s) => ({
                            ...s,
                            department: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {currentUser.department || "Not specified"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Details */}
            {organization && (
              <Card>
                <CardHeader>
                  <CardTitle>Organization Details</CardTitle>
                  <CardDescription>
                    Information about your organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Organization Name
                    </span>
                    <span className="font-medium">{organization.name}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Admins
                    </span>
                    <Badge variant="secondary">
                      {organization.adminCount}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Employees
                    </span>
                    <Badge variant="secondary">
                      {organization.employeeCount}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <Badge
                      variant={
                        organization.isActive ? "default" : "secondary"
                      }
                    >
                      {organization.isActive ? "Active" : "Pending Approval"}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Created On
                    </span>
                    <span className="text-sm">
                      {formatDate(organization.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

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
          </div>
        </div>
      </div>
    </div>
  )
}
