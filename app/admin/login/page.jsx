"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { auth, signInWithCustomToken } from "@/lib/firebaseClient"
import { safeRedirect } from "@/lib/redirectUtils"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
  e.preventDefault()
  console.log('🔐 AdminLogin: Starting login process')
  console.log('📧 AdminLogin: Email:', email)

  if (!email || !password) {
    alert('Please enter both email and password')
    return
  }

  setLoading(true)
  console.log('🔗 AdminLogin: Sending login request to backend...')

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }
    )

    console.log('📊 AdminLogin: Response status:', response.status)
    console.log('📊 AdminLogin: Response ok:', response.ok)

    if (response.ok) {
      const data = await response.json()
      console.log('✅ AdminLogin: Login successful')
      console.log('👤 AdminLogin: Employee data:', data.employee)
      console.log('🔑 AdminLogin: Custom token received')

      let idToken = data.customToken

      if (auth) {
        try {
          const userCredential = await signInWithCustomToken(auth, data.customToken)
          console.log('🔥 AdminLogin: Firebase authentication successful')
          idToken = await userCredential.user.getIdToken()
          console.log('🎟️ AdminLogin: Firebase ID token obtained')
        } catch (firebaseError) {
          console.warn('⚠️ AdminLogin: Firebase authentication failed, using custom token:', firebaseError.message)
        }
      } else {
        console.warn('⚠️ AdminLogin: Firebase not available, using custom token')
      }

      // Store authentication data
      localStorage.setItem('adminLoggedIn', 'true')
      localStorage.setItem('firebaseToken', idToken)
      localStorage.setItem('currentEmployee', JSON.stringify(data.employee))
      console.log('💾 AdminLogin: Stored auth data in localStorage')

      // ✅ ROLE-BASED REDIRECTS (NO extra redirect after this)
      if (data.employee.role === 'manager') {
        console.log('Manager login detected, redirecting to manager dashboard')
        safeRedirect(router, '/manager-dashboard')
        return
      }

      if (data.employee.role === 'admin') {
        console.log('Admin login detected, redirecting to admin dashboard')
        safeRedirect(router, '/admin/dashboard')
        return
      }

      // For any other role, block here
      alert('Employee users should use the employee login page')
      setLoading(false)
      return
    } else {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { error: `Login failed with status ${response.status}` }
      }
      console.error('❌ AdminLogin: Login failed:', errorData)
      const errorMessage =
        errorData?.error || errorData?.message || `Login failed (Status: ${response.status})`
      alert(errorMessage)
    }
  } catch (error) {
    console.error('❌ AdminLogin: Network error:', error)
    alert('Network error. Please check if the backend is running.')
  }

  setLoading(false)
}


  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-xl">
              <Shield className="w-12 h-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Admin Login</CardTitle>
          <CardDescription>Enter your credentials to access the admin panel</CardDescription>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
            <p className="font-medium">Default Admin Credentials:</p>
            <p>Email: admin@ems.com</p>
            <p>Password: admin123</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ems.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
