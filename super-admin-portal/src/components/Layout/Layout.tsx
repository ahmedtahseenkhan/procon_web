import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Bell } from 'lucide-react';
import Sidebar from "./Sidebar";
import { getCompanies } from "../../services/api";

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [companyCount, setCompanyCount] = useState(0);
    const adminName = localStorage.getItem('superAdminName') || 'Admin';

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const token = localStorage.getItem('superAdminToken');
                if (token) {
                    const res = await getCompanies(token);
                    setCompanyCount(res.companies?.length || 0);
                }
            } catch (e) { console.error(e); }
        };
        fetchCount();
        // Poll every 30s or just once is fine. Let's do once for now.
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} />

            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/20 z-20 md:hidden ${sidebarOpen ? "block" : "hidden"}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Main Content */}
            <div className="md:ml-64 min-h-screen flex flex-col">
                {/* Top Header */}
                <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden text-gray-500"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <h1 className="text-xl font-bold text-gray-800">Super Admin Portal</h1>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Stats Example */}
                        <div className="hidden md:flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                            <div className="text-right">
                                <p className="text-xs text-gray-500 font-medium">Total Companies</p>
                                <p className="text-lg font-bold text-gray-900 leading-none">{companyCount}</p>
                            </div>
                            <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            </div>
                        </div>

                        {/* Notifications */}
                        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
                        </button>

                        {/* Profile */}
                        <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-gray-900">{adminName}</p>
                                <p className="text-xs text-gray-500">Super Admin</p>
                            </div>
                            <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm overflow-hidden">
                                {adminName.substring(0, 1).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
