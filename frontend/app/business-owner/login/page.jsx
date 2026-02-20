import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  UserPlus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { loginUser, getRoleRedirectPath, isAuthenticated, getCurrentUser } from "@/lib/auth"
import AuthLayout from "@/components/layout/AuthLayout"
import GoogleLoginButton from "@/app/components/auth/GoogleLoginButton"

export default function BusinessOwnerLoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      const user = getCurrentUser()
      if (user && user.role === 'business_owner') {
        navigate(getRoleRedirectPath(user.role))
      }
    }
  }, [navigate])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError("")
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!formData.email || !formData.password) {
        throw new Error("Please enter both email and password")
      }

      const result = await loginUser(formData.email, formData.password, null, "business_owner")
      if (!result.success) {
        throw new Error(result.error || "Login failed")
      }
      navigate("/business-owner/dashboard")
    } catch (err) {
      console.error("Login Error:", err)
      if (err.message && err.message.includes("Access denied")) {
        setError("Access denied. This account is not a business owner account.")
      } else if (err.code === 'auth/invalid-credential') {
        setError("Invalid credentials. Please check your email and password.")
      } else {
        setError(err.message || "Failed to login. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Business Portal"
      subtitle="Manage your organization and employees"
      role="business_owner"
    >
      {error && (
        <Alert variant="destructive" className="mb-4 bg-red-50 text-red-900 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-5">
        <div>
          <GoogleLoginButton role="business_owner" />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="owner@company.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="pl-10 h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="pl-10 h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="pt-2">
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">
                New Organization?
              </span>
            </div>
          </div>

          <Link to="/business-owner/register">
            <Button
              variant="outline"
              className="w-full h-11 border-dashed border-2 border-slate-300 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all font-medium"
              type="button"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Register New Organization
            </Button>
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
