import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
    FileText,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ArrowLeft,
    Clock,
    RefreshCw
} from "lucide-react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getValidIdToken } from "@/lib/firebaseClient"
import { toast } from "sonner"

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function TeamLeavesPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [searchParams] = useSearchParams()
    const [selectedLeave, setSelectedLeave] = useState(null)
    const [action, setAction] = useState(null)
    const [comments, setComments] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [processing, setProcessing] = useState(false)

    // React Query for team leaves data
    const { data: leaves = [], isLoading: loading } = useQuery({
        queryKey: ['team-leaves'],
        queryFn: async () => {
            const token = await getValidIdToken()
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
            const response = await fetch(`${API_URL}/team/leaves/pending`, { headers })
            if (!response.ok) throw new Error('Failed to fetch team leaves')
            const data = await response.json()
            return data.leaves || []
        },
    })

    const { data: historyLeaves = [], isLoading: historyLoading } = useQuery({
        queryKey: ['team-leaves', 'history'],
        queryFn: async () => {
            const token = await getValidIdToken()
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
            const response = await fetch(`${API_URL}/team/leaves/history`, { headers })
            if (!response.ok) throw new Error('Failed to fetch leave history')
            const data = await response.json()
            return data.leaves || []
        },
    })

    const getInitials = (name) => {
        if (!name) return "EM"
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    const getLeaveTypeColor = (type) => {
        switch (type) {
            case 'sick': return 'bg-red-100 text-red-800 border-red-200'
            case 'casual': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'vacation': return 'bg-green-100 text-green-800 border-green-200'
            default: return 'bg-slate-100 text-slate-800 border-slate-200'
        }
    }

    const renderLeaveCard = (leave, isHistory = false) => (
        <Card key={leave.id}>
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12 mt-1">
                            <AvatarFallback>{getInitials(leave.userName)}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{leave.userName}</h3>
                                <Badge variant="outline" className={getLeaveTypeColor(leave.leaveType)}>
                                    {leave.leaveType}
                                </Badge>
                                {isHistory && (
                                    <Badge variant="outline" className={leave.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                        {leave.status.toUpperCase()}
                                    </Badge>
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {leave.userEmail}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground border-l-2 pl-2 border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{leave.days} Day{leave.days > 1 ? 's' : ''}</span>
                                </div>
                                <div>•</div>
                                <div>
                                    {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                </div>
                            </div>
                            {leave.reason && (
                                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-md mt-2 border border-slate-100 dark:border-slate-700 italic">
                                    "{leave.reason}"
                                </p>
                            )}
                            {isHistory && leave.reviewComments && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    <span className="font-medium">Reviewer Note:</span> {leave.reviewComments}
                                </p>
                            )}
                            <div className="text-xs text-muted-foreground pt-1">
                                Applied on {new Date(leave.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    {!isHistory && (
                        <div className="flex gap-3 md:flex-col lg:flex-row md:min-w-[200px] justify-end">
                            <Button
                                variant="outline"
                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => openActionDialog(leave, 'reject')}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                            </Button>
                            <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => openActionDialog(leave, 'approve')}
                            >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Approve
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )

    // Check for URL params to open specific leave action
    useEffect(() => {
        const id = searchParams.get('id')
        const actionParam = searchParams.get('action')

        if (id && actionParam && leaves.length > 0) {
            const leave = leaves.find(l => l.id === id)
            if (leave) {
                openActionDialog(leave, actionParam)
            }
        }
    }, [searchParams, leaves])

    const handleApproveDirectly = async (leave) => {
        setProcessing(true)
        try {
            const token = await getValidIdToken()
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
            const response = await fetch(`${API_URL}/team/leaves/${leave.id}/approve`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ comments: '' })
            })
            if (response.ok) {
                toast.success('Leave request approved successfully')
                queryClient.invalidateQueries({ queryKey: ['team-leaves'] })
                queryClient.invalidateQueries({ queryKey: ['team-dashboard'] })
            } else {
                const errorData = await response.json()
                toast.error(errorData.error || 'Failed to approve request')
            }
        } catch (error) {
            console.error('Error approving leave:', error)
            toast.error('An error occurred')
        } finally {
            setProcessing(false)
        }
    }

    const handleAction = async () => {
        if (!selectedLeave || !action) return

        if (action === 'reject' && !comments.trim()) {
            toast.error("Please provide a reason for rejection")
            return
        }

        setProcessing(true)
        try {
            const token = await getValidIdToken()
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }

            const endpoint = `${API_URL}/team/leaves/${selectedLeave.id}/${action}`
            const body = { comments: comments }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            })

            if (response.ok) {
                toast.success(`Leave request ${action}ed successfully`)
                setDialogOpen(false)

                // Invalidate to refetch
                queryClient.invalidateQueries({ queryKey: ['team-leaves'] })
                queryClient.invalidateQueries({ queryKey: ['team-dashboard'] })

                // Clear URL params if present
                if (window.location.search) {
                    navigate('/employee/team/leaves', { replace: true })
                }
            } else {
                const errorData = await response.json()
                toast.error(errorData.error || `Failed to ${action} request`)
            }
        } catch (error) {
            console.error(`Error ${action}ing leave:`, error)
            toast.error("An error occurred")
        } finally {
            setProcessing(false)
        }
    }

    const openActionDialog = (leave, actionType) => {
        if (actionType === 'approve') {
            handleApproveDirectly(leave)
            return
        }
        setSelectedLeave(leave)
        setAction(actionType)
        setComments("")
        setDialogOpen(true)
    }


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/employee/team")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Leave Approvals
                        </h1>
                        <p className="text-muted-foreground">
                            Review and manage leave requests from your team.
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ['team-leaves'] })
                    }}
                    disabled={loading || historyLoading}
                >
                    <RefreshCw className={`h-4 w-4 ${loading || historyLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <Tabs defaultValue="pending">
                <TabsList>
                    <TabsTrigger value="pending">Pending Requests</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-6">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : leaves.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <CheckCircle2 className="h-12 w-12 mb-4 text-emerald-500" />
                                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">All caught up!</h3>
                                <p>There are no pending leave requests requiring your attention.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {leaves.map((leave) => renderLeaveCard(leave, false))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                    {historyLoading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : historyLeaves.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <Clock className="h-10 w-10 mb-4" />
                                <h3 className="text-lg font-medium">No History</h3>
                                <p>No approved or rejected leave requests found.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {historyLeaves.map((leave) => renderLeaveCard(leave, true))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Leave Request</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this request for {selectedLeave?.userName}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Textarea
                            placeholder="Reason for rejection (required)..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleAction}
                            disabled={processing || !comments.trim()}
                        >
                            {processing ? "Processing..." : "Reject Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
