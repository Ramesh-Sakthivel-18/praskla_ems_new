"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User } from "lucide-react"
import { useRouter } from "next/navigation"
import { auth, signInWithCustomToken } from "@/lib/firebaseClient"
import { safeRedirect } from "@/lib/redirectUtils"

export default function EmployeeLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    console.log('🔐 EmployeeLogin: Starting login process')
    console.log('📧 EmployeeLogin: Email:', email)

    if (!email || !password) {
      alert('Please enter both email and password')
      return
    }

    setLoading(true)
    console.log('🔗 EmployeeLogin: Sending login request to backend...')

    try {
      const getApiBase = () => {
        const env = process.env.NEXT_PUBLIC_API_URL || ''
        if (!env) return 'http://localhost:3000'
        if (env.includes('5001')) return 'http://localhost:3000'
        return env
      }
      const response = await fetch(`${getApiBase()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      console.log('📊 EmployeeLogin: Response status:', response.status)
      console.log('📊 EmployeeLogin: Response ok:', response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ EmployeeLogin: Login successful')
        console.log('👤 EmployeeLogin: Employee data:', data.employee)
        console.log('🔑 EmployeeLogin: Custom token received')

        // Check if the logged in user is an employee (not admin)
        if (data.employee.role === 'admin') {
          alert('Admin users should use the admin login page')
          setLoading(false)
          return
        }

        // Sign in to Firebase with the custom token (if Firebase is available)
        let idToken = data.customToken; // Fallback to custom token
        
        if (auth) {
          try {
            const userCredential = await signInWithCustomToken(auth, data.customToken)
            console.log('🔥 EmployeeLogin: Firebase authentication successful')
            
            // Get the ID token for API calls
            idToken = await userCredential.user.getIdToken()
            console.log('🎟️ EmployeeLogin: Firebase ID token obtained')
          } catch (firebaseError) {
            console.warn('⚠️ EmployeeLogin: Firebase authentication failed, using custom token:', firebaseError.message)
            // Continue with custom token as fallback
          }
        } else {
          console.warn('⚠️ EmployeeLogin: Firebase not available, using custom token')
        }

        // Store authentication data
        localStorage.setItem("employeeLoggedIn", "true")
        localStorage.setItem("firebaseToken", idToken)
        localStorage.setItem("currentEmployee", JSON.stringify(data.employee))

        console.log('💾 EmployeeLogin: Stored auth data in localStorage')
        console.log('🔄 EmployeeLogin: Redirecting to dashboard...')

        safeRedirect(router, "/employee/dashboard")
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          console.error('❌ EmployeeLogin: Failed to parse error response as JSON');
          errorData = { error: `Login failed with status ${response.status}` };
        }
        
        console.error('❌ EmployeeLogin: Login failed:', errorData);
        console.error('❌ EmployeeLogin: Response status:', response.status, response.statusText);
        
        const errorMessage = errorData?.error || errorData?.message || `Login failed (Status: ${response.status})`;
        alert(errorMessage);
      }
    } catch (error) {
      console.error('❌ EmployeeLogin: Network error:', error)
      alert('Network error. Please check if the backend is running.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-accent/10 rounded-xl">
              <User className="w-12 h-12 text-accent" />
            </div>
          </div>
          <CardTitle className="text-3xl">Employee Login</CardTitle>
          <CardDescription>Enter your credentials to access your dashboard</CardDescription>
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
            <p className="font-medium">For Employees:</p>
            <p>Use the email and password provided by your administrator</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@company.com"
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
