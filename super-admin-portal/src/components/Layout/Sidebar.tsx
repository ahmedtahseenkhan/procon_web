import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Shield, LogOut, Layers } from 'lucide-react';
import rykenLogo from "../../assets/ryken-logo.png";

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
            <div className="h-16 flex items-center justify-center px-6 border-b border-gray-50">
                <div className="flex items-center gap-2">
                    <img src={rykenLogo} alt="Ryken Security" className="h-10 w-auto" />
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
