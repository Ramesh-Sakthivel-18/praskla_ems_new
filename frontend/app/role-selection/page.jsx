import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, User, Building2, Lock, ChevronRight } from "lucide-react"
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
      label: "Continue as Admin",
      color: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-500",
      lightBg: "bg-blue-50"
    },
    {
      icon: User,
      title: "Employee",
      description: "Track your attendance, view hours, and apply for leave",
      path: "/employee/login",
      label: "Continue as Employee",
      color: "from-sky-500 to-blue-500",
      iconBg: "bg-sky-500",
      lightBg: "bg-sky-50"
    },
    {
      icon: Building2,
      title: "Business Owner",
      description: "Configure your organization, admins, and employees",
      path: "/business-owner/login",
      label: "Continue as Owner",
      color: "from-indigo-500 to-blue-600",
      iconBg: "bg-indigo-500",
      lightBg: "bg-indigo-50"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 sm:p-4 flex-shrink-0">
        <button
          onClick={() => safeRedirect(navigate, "/")}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors px-3 py-2 rounded-full hover:bg-blue-50 bg-white/80 border border-slate-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="m15 18-6-6 6-6" /></svg>
          <span>Back to Home</span>
        </button>
        <button
          onClick={() => safeRedirect(navigate, "/system-admin/login")}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors px-3 py-2 rounded-full hover:bg-blue-50 bg-white/80 border border-slate-100"
        >
          <Lock className="w-3 h-3" />
          <span>System Admin</span>
        </button>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="w-full max-w-md mx-auto sm:max-w-4xl space-y-6 sm:space-y-8 pt-4 sm:pt-8">
          {/* Branding */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg shadow-blue-200">
                <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">Select Your Role</h1>
            <p className="text-sm text-slate-400">Choose how you'd like to sign in</p>
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
            {roles.map((role) => (
              <button
                key={role.title}
                className="group relative w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 overflow-hidden active:scale-[0.98]"
                onClick={() => safeRedirect(navigate, role.path)}
              >
                {/* Top accent bar */}
                <div className={`h-1 w-full bg-gradient-to-r ${role.color}`} />

                <div className="p-5 sm:p-6 space-y-3 sm:space-y-4">
                  {/* Icon */}
                  <div className={`inline-flex p-2.5 rounded-xl ${role.lightBg}`}>
                    <role.icon className={`w-6 h-6 text-blue-600`} />
                  </div>

                  {/* Text */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{role.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{role.description}</p>
                  </div>

                  {/* CTA */}
                  <div className={`flex items-center justify-between w-full py-2.5 px-4 rounded-xl bg-gradient-to-r ${role.color} text-white text-sm font-medium shadow-sm`}>
                    <span>{role.label}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 py-3 text-center text-xs text-slate-300 safe-bottom">
        &copy; {new Date().getFullYear()} Employee Management System
      </div>
    </div>
  )
}
