"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { auth, signInWithCustomToken } from "@/lib/firebaseClient"
import { safeRedirect } from "@/lib/redirectUtils"

export default function BusinessOwnerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    console.log("🔐 BO Login: Starting login process", email)

    if (!email || !password) {
      alert("Please enter both email and password")
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      )

      console.log("📊 BO Login: Response status:", response.status)

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `Login failed with status ${response.status}` }
        }
        console.error("❌ BO Login: Login failed:", errorData)
        const errorMessage =
          errorData?.error || errorData?.message || `Login failed (Status: ${response.status})`
        alert(errorMessage)
        setLoading(false)
        return
      }

      const data = await response.json()
      console.log("✅ BO Login: Login successful")
      console.log("👤 BO Login: Employee data:", data.employee)

      // Only allow business_owner here
      if (data.employee.role !== "business_owner") {
        alert("This login is only for Business Owners. Please use the correct login page.")
        setLoading(false)
        return
      }

      // Handle Firebase custom token → ID token
      let idToken = data.customToken

      if (auth) {
        try {
          const userCredential = await signInWithCustomToken(auth, data.customToken)
          console.log("🔥 BO Login: Firebase authentication successful")
          idToken = await userCredential.user.getIdToken()
          console.log("🎟️ BO Login: Firebase ID token obtained")
        } catch (firebaseError) {
          console.warn(
            "⚠️ BO Login: Firebase authentication failed, using custom token:",
            firebaseError?.message
          )
        }
      } else {
        console.warn("⚠️ BO Login: Firebase not available, using custom token")
      }

      // Store authentication data
      localStorage.setItem("adminLoggedIn", "true") // reuse same flag as admin
      localStorage.setItem("firebaseToken", idToken)
      localStorage.setItem("currentEmployee", JSON.stringify(data.employee))
      console.log("💾 BO Login: Stored auth data in localStorage")

      // Redirect to Business Owner Dashboard
      safeRedirect(router, "/business-owner/dashboard")
    } catch (error) {
      console.error("❌ BO Login: Network error:", error)
      alert("Network error. Please check if the backend is running.")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-purple-50 rounded-xl">
              <Building2 className="w-12 h-12 text-purple-600" />
            </div>
          </div>
          <CardTitle className="text-3xl">Business Owner Login</CardTitle>
          <CardDescription>Login to manage your organization and admins</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@company.com"
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
