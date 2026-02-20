import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Shield, Mail, Lock, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { loginUser } from "@/lib/auth"
import AuthLayout from "@/components/layout/AuthLayout"

export default function SystemAdminLoginPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const result = await loginUser(email, password)

            if (!result.success) {
                setError(result.error || "Login failed")
                setLoading(false)
                return
            }

            if (result.user.role !== "system_admin") {
                setError("Access denied. System Admin privileges required.")
                setLoading(false)
                return
            }

            navigate("/system-admin/dashboard")
        } catch (error) {
            console.error("Login error:", error)
            setError(error.message || "Login failed. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout
            title="System Admin"
            subtitle="Sign in to access the management console"
            role="system_admin"
        >
            {error && (
                <Alert variant="destructive" className="mb-4 bg-red-50 text-red-900 border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                                required
                                disabled={loading}
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

                <div className="text-center">
                    <p className="text-xs text-slate-400">Restricted access — authorized personnel only</p>
                </div>
            </div>
        </AuthLayout>
    )
}
