import { useState, useEffect } from "react";
import { getCompanies, createCompany, deleteCompany } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Trash2 } from 'lucide-react';

interface Company {
    company_id: string;
    name: string;
    org_id: string;
    created_at: string;
}

export default function Dashboard() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        org_id: "",
        admin_username: "",
        admin_email: "",
        admin_password: ""
    });
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('superAdminToken');
        if (!token) {
            navigate('/login');
            return;
        }
        fetchCompanies(token);
    }, [navigate]);

    const fetchCompanies = async (token: string) => {
        try {
            const res = await getCompanies(token);
            setCompanies(res.companies || []);
        } catch (error) {
            console.error("Error fetching companies:", error);
            if (error instanceof Error && error.message.includes('auth')) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('superAdminToken');
        if (!token) return;

        setIsSubmitting(true);
        try {
            await createCompany(token, formData);
            setShowModal(false);
            setFormData({ name: "", org_id: "", admin_username: "", admin_email: "", admin_password: "" });
            fetchCompanies(token);
            alert("Company onboarded successfully! Device data is being fetched in the background.");
        } catch (error) {
            console.error("Error creating company:", error);
            alert("Failed. Org ID might be duplicate.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCompany = async (companyId: string) => {
        const token = localStorage.getItem('superAdminToken');
        if (!token) return;

        const confirmed = window.confirm('Delete this company and all its data?');
        if (!confirmed) return;

        try {
            await deleteCompany(token, companyId);
            await fetchCompanies(token);
        } catch (error) {
            console.error('Error deleting company:', error);
            alert('Failed to delete company.');
        }
    };

    if (loading) return <div className="text-emerald-600 font-medium">Loading...</div>;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="bg-white rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">Company Management</h2>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition shadow-sm"
                    >
                        + New Company
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-[#F9FAFB]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Org ID</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created At</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {companies.map((company) => (
                                <tr key={company.company_id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{company.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{company.org_id || company.company_id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                            Active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(company.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => navigate(`/companies/${company.company_id}`)}
                                                className="text-emerald-600 hover:text-emerald-800 font-semibold"
                                            >
                                                Manage
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCompany(company.company_id)}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition"
                                                type="button"
                                            >
                                                <Trash2 size={16} />
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {companies.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">No companies found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">Onboard New Company</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[rgb(16, 185, 129)]/20 focus:border-[rgb(16, 185, 129)]"
                                        required
                                        placeholder="Acme Corp"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Org ID</label>
                                    <input
                                        type="text"
                                        value={formData.org_id}
                                        onChange={(e) => setFormData({ ...formData, org_id: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[rgb(16, 185, 129)]/20 focus:border-[rgb(16, 185, 129)]"
                                        required
                                        placeholder="123456"
                                    />
                                </div>
                            </div>

                            <div className="bg-emerald-50/50 p-4 rounded-lg space-y-3 border border-emerald-100 mt-2">
                                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">Initial Admin Account</h4>
                                <input
                                    type="text"
                                    placeholder="Admin Username"
                                    value={formData.admin_username}
                                    onChange={(e) => setFormData({ ...formData, admin_username: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-[rgb(16, 185, 129)]"
                                    required
                                />
                                <input
                                    type="email"
                                    placeholder="Admin Email"
                                    value={formData.admin_email}
                                    onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-[rgb(16, 185, 129)]"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Initial Password"
                                    value={formData.admin_password}
                                    onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-[rgb(16, 185, 129)]"
                                    required
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition shadow-sm ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmitting ? 'Onboarding...' : 'Onboard Company'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
