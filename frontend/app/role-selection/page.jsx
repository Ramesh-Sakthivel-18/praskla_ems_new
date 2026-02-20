import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, User, Building2, Lock } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { safeRedirect } from "@/lib/redirectUtils"

export default function RoleSelectionPage() {
  const navigate = useNavigate()

  const roles = [
    {
      icon: Shield,
      title: "Admin",
      description: "Manage employees, track attendance, and handle leave requests",
      path: "/admin/login",
      label: "Continue as Admin"
    },
    {
      icon: User,
      title: "Employee",
      description: "Track your attendance, view hours, and apply for leave",
      path: "/employee/login",
      label: "Continue as Employee"
    },
    {
      icon: Building2,
      title: "Business Owner",
      description: "Configure your organization, admins, and employees",
      path: "/business-owner/login",
      label: "Continue as Owner"
    }
  ]

  return (
    <div className="h-screen overflow-hidden bg-white flex flex-col">
      <div className="flex justify-between p-4 flex-shrink-0">
        <button
          onClick={() => safeRedirect(navigate, "/")}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-md hover:bg-blue-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="m15 18-6-6 6-6" /></svg>
          <span>Back to Home</span>
        </button>
        <button
          onClick={() => safeRedirect(navigate, "/system-admin/login")}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-md hover:bg-blue-50"
        >
          <Lock className="w-3 h-3" />
          <span>System Admin</span>
        </button>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-4xl space-y-6 sm:space-y-10">
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-3 sm:mb-4">
              <div className="p-2.5 sm:p-3 bg-blue-600 rounded-xl shadow-lg">
                <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Employee Management System</h1>
            <p className="text-sm sm:text-base text-slate-500">Select your role to continue</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {roles.map((role) => (
              <Card
                key={role.title}
                className="group relative overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer flex flex-col"
                onClick={() => safeRedirect(navigate, role.path)}
              >
                <div className="absolute inset-0 bg-blue-50/0 group-hover:bg-blue-50/30 transition-colors duration-200" />
                <CardHeader className="text-center pb-3 relative flex-1">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-200">
                      <role.icon className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors duration-200" />
                    </div>
                  </div>
                  <CardTitle className="text-lg font-bold text-slate-900">{role.title}</CardTitle>
                  <CardDescription className="text-sm mt-1.5 text-slate-500">
                    {role.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative mt-auto pt-0">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all"
                    size="default"
                    onClick={(e) => {
                      e.stopPropagation();
                      safeRedirect(navigate, role.path);
                    }}
                  >
                    {role.label}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 py-4 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Employee Management System
      </div>
    </div>
  )
}
