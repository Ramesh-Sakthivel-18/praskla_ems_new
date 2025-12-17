"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { EmployeeSidebar } from "@/components/employee-sidebar"
import { EmployeeNavbar } from "@/components/employee-navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"
import { getValidIdToken } from "@/lib/firebaseClient"

export default function ApplyLeavePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
    leaveType: "Vacation"
  })
  const [myRequests, setMyRequests] = useState([])

  useEffect(() => {
    try {
      if (!localStorage.getItem("employeeLoggedIn")) {
        safeRedirect(router, "/employee/login")
      }
    } catch {}
    loadMyRequests()
  }, [])

  const getApiBase = () => {
    const env = process.env.NEXT_PUBLIC_API_URL || ''
    if (!env) return 'http://localhost:3000'
    if (env.includes('5001')) return 'http://localhost:3000'
    return env
  }

  const loadMyRequests = async () => {
    const token = await getValidIdToken()
    if (!token) return
    try {
      const response = await fetch(`${getApiBase()}/api/leave/my-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        const requestsArray = Array.isArray(data) ? data : (data.requests || [])
        setMyRequests(requestsArray)
      }
    } catch (error) {
      console.error('Error loading leave requests:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const token = await getValidIdToken()
    if (!token) return

    try {
      const response = await fetch(`${getApiBase()}/api/leave/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert('Leave application submitted successfully!')
        setFormData({
          startDate: "",
          endDate: "",
          reason: "",
          leaveType: "Vacation"
        })
        loadMyRequests()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to submit leave application')
      }
    } catch (error) {
      console.error('Error submitting leave application:', error)
      alert('Error submitting leave application')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <EmployeeSidebar />
      <EmployeeNavbar />

      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">Apply for Leave</h2>
            <p className="text-muted-foreground mt-1">Submit a new leave request</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Leave Application Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leaveType">Leave Type</Label>
                  <select
                    id="leaveType"
                    className="w-full p-2 border rounded"
                    value={formData.leaveType}
                    onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                  >
                    <option value="Vacation">Vacation</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Personal">Personal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    placeholder="Please provide a brief reason for your leave request"
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  Submit Leave Request
                </Button>
              </form>
          </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>My Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {myRequests && myRequests.length > 0 ? (
                <div className="space-y-3">
                  {myRequests.map((req) => (
                    <div key={req.id} className="flex justify-between items-center border rounded p-3">
                      <div>
                        <div className="font-medium">
                          {req.startDate ? new Date(req.startDate).toLocaleDateString() : 'N/A'} - {req.endDate ? new Date(req.endDate).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {req.leaveType} • {req.days || 0} days
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {req.reason || 'No reason provided'}
                        </div>
                      </div>
                      <div className={`text-sm px-2 py-1 rounded ${req.status === 'Approved' ? 'bg-green-600 text-white' : req.status === 'Rejected' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                        {req.status || 'Pending'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  No leave requests submitted yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
