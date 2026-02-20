import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function AuthLayout({ children, title, subtitle, role = "employee" }) {
    const getRoleBadge = () => {
        switch (role) {
            case "admin":
                return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold uppercase tracking-wide">Admin Portal</span>;
            case "business_owner":
                return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-semibold uppercase tracking-wide">Business Owner</span>;
            default:
                return <span className="bg-slate-100 text-slate-800 text-xs px-2 py-1 rounded-full font-semibold uppercase tracking-wide">Employee Portal</span>;
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 dark:bg-slate-900">
            {/* Left Column - Branding (Hidden on Mobile) */}
            <div className="hidden lg:flex flex-col justify-between bg-blue-600 p-12 text-white relative overflow-hidden">
                {/* Abstract Background Pattern */}
                <div className="absolute inset-0 bg-blue-600">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10"
                        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}>
                    </div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-50 translate-x-1/2 translate-y-1/2"></div>
                    <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/2"></div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                            <Building2 className="h-8 w-8 text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">HIKVISION EMS</span>
                    </div>
                    <h1 className="text-5xl font-bold leading-tight mb-6">
                        Manage your workforce with precision.
                    </h1>
                    <p className="text-blue-100 text-lg max-w-md leading-relaxed">
                        Streamline attendance, leave requests, and team management in one unified platform. Designed for modern enterprises.
                    </p>
                </div>

                <div className="relative z-10 text-sm text-blue-200">
                    &copy; {new Date().getFullYear()} Hikvision EMS. All rights reserved.
                </div>
            </div>

            {/* Right Column - Auth Form */}
            <div className="flex items-center justify-center p-6 sm:p-12 lg:p-24 relative">
                <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    {/* Mobile Logo (Visible only on mobile) */}
                    <div className="lg:hidden flex justify-center mb-6">
                        <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                            <Building2 className="h-8 w-8 text-white" />
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <div className="flex justify-center mb-4">
                            {getRoleBadge()}
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {title}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            {subtitle}
                        </p>
                    </div>

                    <div className="mt-8">
                        {children}
                    </div>

                    <div className="mt-6 text-center text-sm">
                        <Link to="/role-selection" className="font-medium text-blue-600 hover:text-blue-500 hover:underline transition-all">
                            Change Role
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
