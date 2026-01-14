import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Shield, LogOut, Layers } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('superAdminName');
        navigate('/login');
    };

    const navItems = [
        { name: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/dashboard" },
        { name: "Global Roles", icon: <Shield size={20} />, path: "/roles" },
        { name: "Groups", icon: <Layers size={20} />, path: "/groups" },
    ];

    return (
        <aside
            className={`bg-white border-r border-gray-100 flex flex-col w-64 fixed h-full transition-transform z-30 ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                }`}
        >
            <div className="h-16 flex items-center px-6 border-b border-gray-50">
                <div className="flex items-center gap-2 text-emerald-500">
                    <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
                        <path d="M20 0C8.954 0 0 8.954 0 20s8.954 20 20 20 20-8.954 20-20S31.046 0 20 0zm0 36c-8.837 0-16-7.163-16-16S11.163 4 20 4s16 7.163 16 16-7.163 16-16 16z" fill="#10B981" />
                        <path d="M15 12h10c2.761 0 5 2.239 5 5s-2.239 5-5 5h-5v8h-5V12z" fill="#10B981" />
                    </svg>
                    <span className="text-xl font-bold tracking-tight text-emerald-500">Super Admin</span>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <button
                            key={item.name}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive
                                ? "bg-emerald-50 text-emerald-600 shadow-sm"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            {/* Icon Wrapper */}
                            <span className={`${isActive ? "text-emerald-500" : "text-gray-400"}`}>
                                {item.icon}
                            </span>
                            <span className="ml-3">{item.name}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-50">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                    <LogOut size={20} className="text-gray-400 group-hover:text-red-500" />
                    <span className="ml-3">Logout</span>
                </button>
            </div>
        </aside>
    );
}
