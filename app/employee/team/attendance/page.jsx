import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
    Calendar as CalendarIcon,
    Search,
    Download,
    Filter,
    Clock,
    User,
    ArrowLeft
} from "lucide-react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { getValidIdToken } from "@/lib/firebaseClient"

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function TeamAttendancePage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [attendanceData, setAttendanceData] = useState([])
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const fetchAttendance = async () => {
            setLoading(true)
            try {
                const token = await getValidIdToken()
                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }

                const response = await fetch(`${API_URL}/team/attendance?date=${date}`, { headers })
                if (response.ok) {
                    const data = await response.json()
                    setAttendanceData(data.attendance || [])
                }
            } catch (error) {
                console.error("Failed to fetch team attendance:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchAttendance()
    }, [date])

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

    const filteredData = attendanceData.filter(item =>
        item.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/employee/team")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Team Attendance
                        </h1>
                        <p className="text-muted-foreground">
                            Monitor daily attendance for your team.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-auto"
                    />
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Attendance Records - {new Date(date).toLocaleDateString()}</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search employee..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Check In</TableHead>
                                    <TableHead>Check Out</TableHead>
                                    <TableHead>Total Hours</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No records found for this date.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((record) => (
                                        <TableRow key={record.user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={record.user.avatar} />
                                                        <AvatarFallback>{getInitials(record.user.name)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium">{record.user.name}</div>
                                                        <div className="text-xs text-muted-foreground">{record.user.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusColor(record.attendance?.status || 'absent')}>
                                                    {(record.attendance?.status || 'absent').toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {record.attendance?.checkIn
                                                    ? new Date(record.attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : '--:--'}
                                            </TableCell>
                                            <TableCell>
                                                {record.attendance?.checkOut
                                                    ? new Date(record.attendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : '--:--'}
                                            </TableCell>
                                            <TableCell>
                                                {record.attendance?.totalHours ? `${record.attendance.totalHours.toFixed(2)} hrs` : '--'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">
                                                    Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
