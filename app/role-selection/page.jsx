import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, User, Building2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { safeRedirect } from "@/lib/redirectUtils"

export default function RoleSelectionPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Select Your Role</h1>
          <p className="text-muted-foreground">Choose how you want to access the system</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Admin */}
          <Card
            className="border-2 hover:border-primary transition-all cursor-pointer"
            onClick={() => safeRedirect(navigate, "/admin/login")}
          >
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-primary/10 rounded-xl">
                  <Shield className="w-12 h-12 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Admin</CardTitle>
              <CardDescription className="text-base">
                Manage employees, track attendance, and handle leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                size="lg"
                onClick={() => safeRedirect(navigate, "/admin/login")}
              >
                Continue as Admin
              </Button>
            </CardContent>
          </Card>

          {/* Employee */}
          <Card
            className="border-2 hover:border-accent transition-all cursor-pointer"
            onClick={() => safeRedirect(navigate, "/employee/login")}
          >
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-accent/10 rounded-xl">
                  <User className="w-12 h-12 text-accent" />
                </div>
              </div>
              <CardTitle className="text-2xl">Employee</CardTitle>
              <CardDescription className="text-base">
                Track your attendance, view hours, and apply for leave
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                size="lg"
                variant="secondary"
                onClick={() => safeRedirect(navigate, "/employee/login")}
              >
                Continue as Employee
              </Button>
            </CardContent>
          </Card>

          {/* Business Owner */}
          <Card
            className="border-2 hover:border-purple-500 transition-all cursor-pointer"
            onClick={() => safeRedirect(navigate, "/business-owner/register")}
          >
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-purple-50 rounded-xl">
                  <Building2 className="w-12 h-12 text-purple-600" />
                </div>
              </div>
              <CardTitle className="text-2xl">Business Owner</CardTitle>
              <CardDescription className="text-base">
                Configure your organization, admins, and employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={() => safeRedirect(navigate, "/business-owner/register")}
              >
                Continue as Business Owner
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
