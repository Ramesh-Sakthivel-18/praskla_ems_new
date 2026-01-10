"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { loginUser, getRoleRedirectPath } from "@/lib/auth"
import { safeRedirect } from "@/lib/redirectUtils"

export default function BusinessOwnerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    
    console.log('🔐 BusinessOwnerLogin: Starting login process')

    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setLoading(true)

    try {
      // Use centralized auth helper
      const result = await loginUser(email, password)

      if (result.success) {
        console.log('✅ BusinessOwnerLogin: Login successful, role:', result.user.role)

        // Check if user has correct role
        if (result.user.role === 'business_owner' || result.user.role === 'businessowner') {
          const redirectPath = getRoleRedirectPath(result.user.role)
          console.log('🚀 Redirecting to:', redirectPath)
          safeRedirect(router, redirectPath)
        } else {
          setError('Only business owners can access this page. Please use the appropriate login page.')
          setLoading(false)
        }
      } else {
        setError(result.error || 'Login failed')
        setLoading(false)
      }
    } catch (error) {
      console.error('❌ BusinessOwnerLogin: Unexpected error:', error)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-xl">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Business Owner Login</CardTitle>
          <CardDescription>Access your organization management dashboard</CardDescription>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
            <p className="font-medium">Sample Business Owner Credentials:</p>
            <p>Email: owner@democompany.com</p>
            <p>Password: password123</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@democompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
