"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, FileText, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { safeRedirect } from "@/lib/redirectUtils"
import { getValidIdToken } from "@/lib/firebaseClient"

export default function EmployeeLeavePage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("my-requests")
    const [myRequests, setMyRequests] = useState([])
    const [formData, setFormData] = useState({
        startDate: "",
        endDate: "",
        reason: "",
        leaveType: "vacation"
    })
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!localStorage.getItem("currentUser")) {
            safeRedirect(router, "/employee/login")
            return
        }
        loadData()
    }, [])

    const getApiBase = () => {
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
    }

    const loadData = async () => {
        setLoading(true)
        const token = await getValidIdToken()
        if (!token) {
            setLoading(false)
            return
        }

        try {
            const response = await fetch(`${getApiBase()}/leave/my-leaves`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const result = await response.json()
                // Backend returns { success: true, count: N, data: [...] }
                const leaves = result.data || result.requests || (Array.isArray(result) ? result : [])
                setMyRequests(leaves)
            } else {
                console.error('Failed to load leaves:', response.status)
            }
        } catch (error) {
            console.error('Error loading leaves:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        const token = await getValidIdToken()
        if (!token) return

        try {
            const response = await fetch(`${getApiBase()}/leave/apply`, {
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
                    leaveType: "vacation"
                })
                setActiveTab("my-requests")
                loadData()
            } else {
                const errorData = await response.json()
                alert(errorData.error || 'Failed to submit application')
            }
        } catch (error) {
            console.error('Error submitting:', error)
            alert('Network error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleCancel = async (leaveId) => {
        if (!confirm("Are you sure you want to cancel this leave request?")) return

        const token = await getValidIdToken()
        if (!token) return

        try {
            const response = await fetch(`${getApiBase()}/leave/${leaveId}`, {
                method: 'DELETE', // Assuming backend supports DELETE /leave/:id for cancellation
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                loadData()
            } else {
                alert('Failed to cancel leave')
            }
        } catch (error) {
            console.error('Error cancelling:', error)
        }
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Approved':
                return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>
            case 'Rejected':
                return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-none"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>
            default:
                return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Leave Requests
                </h1>
                <p className="text-muted-foreground mt-1">
                    Apply for new leave or view your request history
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="my-requests">My Requests</TabsTrigger>
                    <TabsTrigger value="apply">Apply for Leave</TabsTrigger>
                </TabsList>

                <TabsContent value="my-requests" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Request History</CardTitle>
                            <CardDescription>View the status of your leave applications</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8 text-muted-foreground">Loading...</div>
                            ) : myRequests.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                    <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                                    <p className="text-slate-500 font-medium">No leave requests found</p>
                                    <Button variant="link" onClick={() => setActiveTab("apply")} className="text-emerald-600 mt-2">
                                        Apply for your first leave
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {myRequests.map((req) => (
                                        <div
                                            key={req.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow gap-4"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-lg">{req.leaveType}</span>
                                                    {getStatusBadge(req.status)}
                                                </div>
                                                <div className="flex items-center text-sm text-muted-foreground gap-4">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {format(new Date(req.startDate), "MMM d")} - {format(new Date(req.endDate), "MMM d, yyyy")}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{req.days} days</span>
                                                </div>
                                                {req.reason && (
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded mt-2">
                                                        "{req.reason}"
                                                    </p>
                                                )}
                                                {req.rejectionReason && (
                                                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1 flex items-start gap-2">
                                                        <AlertCircle className="w-4 h-4 mt-0.5" />
                                                        Note: {req.rejectionReason}
                                                    </p>
                                                )}
                                            </div>

                                            {req.status === 'Pending' && (
                                                <div className="flex gap-2">
                                                    {/* Edit could be added here */}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                        onClick={() => handleCancel(req.id)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="apply">
                    <Card>
                        <CardHeader>
                            <CardTitle>New Leave Application</CardTitle>
                            <CardDescription>Submit a new request for approval</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate">Start Date</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            required
                                            className="focus-visible:ring-emerald-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate">End Date</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            required
                                            className="focus-visible:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="leaveType">Leave Type</Label>
                                    <select
                                        id="leaveType"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.leaveType}
                                        onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                                    >
                                        <option value="vacation">Vacation</option>
                                        <option value="sick">Sick Leave</option>
                                        <option value="casual">Casual</option>
                                        <option value="emergency">Emergency</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reason">Reason / Comments</Label>
                                    <Textarea
                                        id="reason"
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        placeholder="Please provide a reason for your leave..."
                                        required
                                        className="min-h-[100px] focus-visible:ring-emerald-500"
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('my-requests')}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px]">
                                        {submitting ? "Submitting..." : "Submit Request"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
