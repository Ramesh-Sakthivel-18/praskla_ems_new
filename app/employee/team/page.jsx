import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
    Users,
    Clock,
    FileText,
    CheckCircle2,
    XCircle,
    User,
    Calendar,
    ArrowRight,
    RefreshCw
} from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { getValidIdToken } from "@/lib/firebaseClient"
import { safeRedirect } from "@/lib/redirectUtils"

const getApiBase = () => import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function TeamDashboard() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [currentUser, setCurrentUser] = useState(null)

    // Auth Check
    useEffect(() => {
        if (!isAuthenticated()) {
            safeRedirect(navigate, "/employee/login")
            return
        }
        const user = getCurrentUser()
        if (!user || user.role !== 'employee') {
            safeRedirect(navigate, "/employee/login")
            return
        }
        setCurrentUser(user)
    }, [navigate])

    // Single useQuery for all team data (cached — no reload on navigation)
    const { data: teamData = {}, isLoading: loading, error: queryError } = useQuery({
        queryKey: ['team-dashboard'],
        queryFn: async () => {
            const token = await getValidIdToken()
            if (!token) throw new Error("Authentication failed")
            const base = getApiBase()
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }

            // Fetch all 3 endpoints in parallel
            const [membersRes, attendanceRes, leavesRes] = await Promise.all([
                fetch(`${base}/api/team/members`, { headers }),
                fetch(`${base}/api/team/attendance`, { headers }),
                fetch(`${base}/api/team/leaves/pending`, { headers })
            ])

            const result = {
                members: [],
                attendance: [],
                pendingLeaves: []
            }

            if (membersRes.ok) {
                const data = await membersRes.json()
                result.members = data.members || []
            }
            if (attendanceRes.ok) {
                const data = await attendanceRes.json()
                result.attendance = data.attendance || []
            }
            if (leavesRes.ok) {
                const data = await leavesRes.json()
                result.pendingLeaves = data.leaves || []
            }

            return result
        },
        enabled: !!currentUser,
    })

    const teamMembers = teamData.members || []
    const attendance = teamData.attendance || []
    const pendingLeaves = teamData.pendingLeaves || []

    const getInitials = (name) => {
        if (!name) return "EM"
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'present': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
            case 'absent': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            case 'late': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
            case 'half-day': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
        }
    }

    // Calculate summary stats
    const totalMembers = teamMembers.length
    const presentCount = attendance.filter(a => a.attendance?.isPresent).length
    const pendingLeaveCount = pendingLeaves.length

    if (!currentUser) return null

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        My Team
                    </h1>
                    <p className="text-muted-foreground">
                        Manage your direct reports, attendance, and leave requests.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['team-dashboard'] })}
                        disabled={loading}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Users className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{loading ? '—' : totalMembers}</div>
                        <p className="text-xs text-muted-foreground">
                            Direct reports
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <Clock className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">
                            {loading ? '—' : <>{presentCount} <span className="text-sm font-normal text-muted-foreground">/ {totalMembers}</span></>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            On-time: {loading ? '—' : attendance.filter(a => a.attendance?.status === 'present').length}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <FileText className="h-4 w-4 text-amber-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-700">{loading ? '—' : pendingLeaveCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Require approval
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="members" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="members">Team Members</TabsTrigger>
                    <TabsTrigger value="leaves">
                        Pending Leaves
                        {pendingLeaveCount > 0 && (
                            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-200">
                                {pendingLeaveCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Team Members List */}
                <TabsContent value="members" className="space-y-4">
                    {loading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map(i => (
                                <Card key={i} className="animate-pulse">
                                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : teamMembers.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <Users className="h-10 w-10 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium">No team members</h3>
                                <p className="text-muted-foreground">You don't have any direct reports assigned yet.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {teamMembers.map((member) => {
                                const memberAttendance = attendance.find(a => a.user?.id === member.id)?.attendance
                                const status = memberAttendance?.status || 'absent'

                                return (
                                    <Card key={member.id} className="hover:shadow-lg transition-shadow">
                                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={member.avatar} alt={member.name} />
                                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold">
                                                    {getInitials(member.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 overflow-hidden">
                                                <CardTitle className="text-base truncate">{member.name}</CardTitle>
                                                <CardDescription className="truncate">{member.position || 'Employee'}</CardDescription>
                                            </div>
                                            <Badge variant="outline" className={getStatusColor(status)}>
                                                {status.toUpperCase()}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-sm text-muted-foreground space-y-1">
                                                <div className="flex justify-between">
                                                    <span>Check In:</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-200">
                                                        {memberAttendance?.checkIn ? new Date(memberAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Check Out:</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-200">
                                                        {memberAttendance?.checkOut ? new Date(memberAttendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t flex justify-end">
                                                <Button variant="ghost" size="sm" className="h-8" onClick={() => navigate('/employee/team/attendance')}>
                                                    View History
                                                    <ArrowRight className="ml-1 h-3 w-3" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* Pending Leaves List */}
                <TabsContent value="leaves" className="space-y-4">
                    {loading ? (
                        <Card className="animate-pulse">
                            <CardContent className="py-8">
                                <div className="space-y-4">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto" />
                                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mx-auto" />
                                </div>
                            </CardContent>
                        </Card>
                    ) : pendingLeaves.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium">No pending requests</h3>
                                <p className="text-muted-foreground">All leave requests have been reviewed.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {pendingLeaves.map((leave) => (
                                <Card key={leave.id} className="hover:shadow-lg transition-shadow">
                                    <CardContent className="flex items-center justify-between p-6">
                                        <div className="flex items-start gap-4">
                                            <Avatar className="h-10 w-10 mt-1">
                                                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-bold">
                                                    {getInitials(leave.userName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h4 className="font-semibold">{leave.userName}</h4>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                    <Badge variant="outline" className="text-xs">
                                                        {leave.leaveType}
                                                    </Badge>
                                                    <span>•</span>
                                                    <span>{leave.days} days</span>
                                                    <span>•</span>
                                                    <span>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</span>
                                                </div>
                                                {leave.reason && (
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
                                                        "{leave.reason}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                onClick={() => navigate(`/employee/team/leaves?id=${leave.id}&action=reject`)}
                                            >
                                                Reject
                                            </Button>
                                            <Button
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                onClick={() => navigate(`/employee/team/leaves?id=${leave.id}&action=approve`)}
                                            >
                                                Approve
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
