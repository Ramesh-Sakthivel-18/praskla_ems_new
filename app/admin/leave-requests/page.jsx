"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminNavbar } from "@/components/admin-navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"
import { safeRedirect } from "@/lib/redirectUtils"

export default function LeaveRequestsPage() {
  const router = useRouter()
  const [leaveRequests, setLeaveRequests] = useState([])

  useEffect(() => {
    if (!localStorage.getItem("adminLoggedIn")) {
      safeRedirect(router, "/admin/login")
    }
    loadLeaveRequests()
  }, [router])

  const loadLeaveRequests = async () => {
    const token = localStorage.getItem("firebaseToken")
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/leave/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Ensure data is an array
        const requestsArray = Array.isArray(data) ? data : (data.requests || [])
        setLeaveRequests(requestsArray)
      } else {
        // Handle error by setting empty array
        setLeaveRequests([])
        console.error('Failed to load leave requests:', response.status)
      }
    } catch (error) {
      console.error('Error loading leave requests:', error)
      // Set empty array on error to prevent UI issues
      setLeaveRequests([])
    }
  }

  const handleUpdateStatus = async (id, status) => {
    const token = localStorage.getItem("firebaseToken")
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/leave/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        loadLeaveRequests()
      }
    } catch (error) {
      console.error('Error updating leave request:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminNavbar />

      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">Leave Requests</h2>
            <p className="text-muted-foreground mt-1">Manage employee leave requests</p>
          </div>

          <div className="space-y-4">
            {leaveRequests && leaveRequests.length > 0 ? (
              leaveRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{request.employeeName || 'Unknown Employee'}</h3>
                        <p className="text-muted-foreground">{request.reason || 'No reason provided'}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span>
                            {request.startDate ? new Date(request.startDate).toLocaleDateString() : 'N/A'} - 
                            {request.endDate ? new Date(request.endDate).toLocaleDateString() : 'N/A'}
                          </span>
                          <span>{request.days || 0} days</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={
                          request.status === 'Approved' ? 'default' :
                          request.status === 'Rejected' ? 'destructive' : 'secondary'
                        }>
                          {request.status || 'Pending'}
                        </Badge>
                        {request.status === 'Pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleUpdateStatus(request.id, 'Approved')}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUpdateStatus(request.id, 'Rejected')}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    No leave requests found.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
