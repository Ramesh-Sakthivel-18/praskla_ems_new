import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, User, Building2, Lock } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { safeRedirect } from "@/lib/redirectUtils"

export default function RoleSelectionPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 animate-in fade-in-50 duration-500">
      <div className="w-full max-w-5xl space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Select Your Role</h1>
          <p className="text-lg text-slate-500">Choose how you want to access the Hikvision EMS</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Admin */}
          <Card
            className="group relative overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full flex flex-col"
            onClick={() => safeRedirect(navigate, "/admin/login")}
          >
            <div className="absolute inset-0 bg-blue-50/0 group-hover:bg-blue-50/50 transition-colors duration-200" />
            <CardHeader className="text-center pb-4 relative flex-1">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 group-hover:bg-white group-hover:border-blue-200 transition-all duration-200 shadow-sm">
                  <Shield className="w-10 h-10 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">Admin</CardTitle>
              <CardDescription className="text-sm mt-2 text-slate-500">
                Manage employees, track attendance, and handle leave requests
              </CardDescription>
            </CardHeader>
            <CardContent className="relative mt-auto">
              <Button
                className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-none"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  safeRedirect(navigate, "/admin/login");
                }}
              >
                Continue as Admin
              </Button>
            </CardContent>
          </Card>

          {/* Employee */}
          <Card
            className="group relative overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full flex flex-col"
            onClick={() => safeRedirect(navigate, "/employee/login")}
          >
            <div className="absolute inset-0 bg-blue-50/0 group-hover:bg-blue-50/50 transition-colors duration-200" />
            <CardHeader className="text-center pb-4 relative flex-1">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 group-hover:bg-white group-hover:border-blue-200 transition-all duration-200 shadow-sm">
                  <User className="w-10 h-10 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">Employee</CardTitle>
              <CardDescription className="text-sm mt-2 text-slate-500">
                Track your attendance, view hours, and apply for leave
              </CardDescription>
            </CardHeader>
            <CardContent className="relative mt-auto">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-none"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  safeRedirect(navigate, "/employee/login");
                }}
              >
                Continue as Employee
              </Button>
            </CardContent>
          </Card>

          {/* Business Owner */}
          <Card
            className="group relative overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full flex flex-col"
            onClick={() => safeRedirect(navigate, "/business-owner/register")}
          >
            <div className="absolute inset-0 bg-blue-50/0 group-hover:bg-blue-50/50 transition-colors duration-200" />
            <CardHeader className="text-center pb-4 relative flex-1">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 group-hover:bg-white group-hover:border-blue-200 transition-all duration-200 shadow-sm">
                  <Building2 className="w-10 h-10 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">Business Owner</CardTitle>
              <CardDescription className="text-sm mt-2 text-slate-500">
                Configure your organization, admins, and employees
              </CardDescription>
            </CardHeader>
            <CardContent className="relative mt-auto">
              <Button
                className="w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                size="lg"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  safeRedirect(navigate, "/business-owner/register");
                }}
              >
                Continue as Owner
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Admin Link */}
        <div className="flex justify-center pt-8 border-t border-slate-200">
          <button
            onClick={() => safeRedirect(navigate, "/system-admin/login")}
            className="group flex items-center gap-2 text-sm text-slate-400 hover:text-blue-600 transition-colors"
          >
            <Lock className="w-3 h-3 transition-transform group-hover:scale-110" />
            <span>System Administrator Login</span>
          </button>
        </div>
      </div>
    </div>
  )
}
