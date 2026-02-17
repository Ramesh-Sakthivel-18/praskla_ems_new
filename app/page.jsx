import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Users, Clock, BarChart3 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { safeRedirect } from "@/lib/redirectUtils"

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center space-y-12">
          <div className="text-center space-y-6 max-w-3xl">
            <div className="flex justify-center mb-6">
              <img src="/placeholder-logo.png" alt="Company Logo" className="h-24 w-auto" />
            </div>
            <h1 className="text-5xl font-bold text-balance text-foreground">Employee Attendance Management System</h1>
            <p className="text-xl text-muted-foreground text-pretty leading-relaxed">
              Streamline your workforce management with our comprehensive attendance tracking solution. Perfect for
              modern offices and remote teams.
            </p>
            <div className="pt-4">
              <Button size="lg" className="text-lg px-8 py-6" onClick={() => safeRedirect(navigate, "/role-selection")}>
                Get Started
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl pt-8">
            <Card className="border-2">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <Users className="w-8 h-8 text-accent" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg">Employee Management</h3>
                <p className="text-sm text-muted-foreground">Add, edit, and manage employee records with ease</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <Clock className="w-8 h-8 text-accent" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg">Time Tracking</h3>
                <p className="text-sm text-muted-foreground">Accurate check-in/out and break time monitoring</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <BarChart3 className="w-8 h-8 text-accent" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg">Analytics & Reports</h3>
                <p className="text-sm text-muted-foreground">Comprehensive insights into workforce productivity</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}