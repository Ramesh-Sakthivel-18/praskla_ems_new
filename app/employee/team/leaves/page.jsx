import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
    FileText,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ArrowLeft,
    Clock
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
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { getValidIdToken } from "@/lib/firebaseClient"
import { toast } from "sonner"

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function TeamLeavesPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [loading, setLoading] = useState(true)
    const [leaves, setLeaves] = useState([])
    const [selectedLeave, setSelectedLeave] = useState(null)
    const [action, setAction] = useState(null) // 'approve' or 'reject'
    const [comments, setComments] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)

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

    const fetchLeaves = async () => {
        setLoading(true)
        try {
            const token = await getValidIdToken()
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }

            // Fetch pending by default
            const response = await fetch(`${API_URL}/team/leaves/pending`, { headers })
            if (response.ok) {
                const data = await response.json()
                setLeaves(data.leaves || [])
            }
        } catch (error) {
            console.error("Failed to fetch team leaves:", error)
            toast.error("Failed to load leave requests")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLeaves()
    }, [])

    const handleAction = async () => {
        if (!selectedLeave || !action) return

        if (action === 'reject' && !comments.trim()) {
            toast.error("Please provide a reason for rejection")
            return
        }

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
                fetchLeaves() // Refresh list

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
        }
    }

    const openActionDialog = (leave, actionType) => {
        setSelectedLeave(leave)
        setAction(actionType)
        setComments("")
        setDialogOpen(true)
    }

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

    return (
        <div className="space-y-6">
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

            <Tabs defaultValue="pending">
                <TabsList>
                    <TabsTrigger value="pending">Pending Requests</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-6">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
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
                            {leaves.map((leave) => (
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
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-md mt-2 border border-slate-100 dark:border-slate-700">
                                                            "{leave.reason}"
                                                        </p>
                                                    )}
                                                    <div className="text-xs text-muted-foreground pt-1">
                                                        Applied on {new Date(leave.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>

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
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    onClick={() => openActionDialog(leave, 'approve')}
                                                >
                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    Approve
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <Clock className="h-10 w-10 mb-4" />
                            <h3 className="text-lg font-medium">Coming Soon</h3>
                            <p>History of approved/rejected leaves will be shown here.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{action === 'approve' ? 'Approve' : 'Reject'} Leave Request</DialogTitle>
                        <DialogDescription>
                            {action === 'approve'
                                ? `Are you sure you want to approve this leave request for ${selectedLeave?.userName}?`
                                : `Please provide a reason for rejecting this request for ${selectedLeave?.userName}.`
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Textarea
                            placeholder={action === 'approve' ? "Optional comments..." : "Reason for rejection (required)..."}
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            variant={action === 'reject' ? "destructive" : "default"}
                            className={action === 'approve' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                            onClick={handleAction}
                            disabled={loading || (action === 'reject' && !comments.trim())}
                        >
                            {loading ? "Processing..." : (action === 'approve' ? "Approve Request" : "Reject Request")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
