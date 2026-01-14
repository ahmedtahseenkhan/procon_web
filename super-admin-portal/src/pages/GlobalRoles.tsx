import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { superAdminGetGlobalRoles, superAdminCreateGlobalRole, superAdminUpdateGlobalRole } from "../services/api";
import { Shield, Edit2 } from "lucide-react";

const PERMISSIONS_LIST = [
    { key: "manage_users", label: "Manage Users" },
    { key: "manage_devices", label: "Manage Devices" },
    { key: "view_reports", label: "View Reports" },
    { key: "send_commands", label: "Send Commands" },
];

export default function GlobalRoles() {
    const navigate = useNavigate();
    const token = localStorage.getItem('superAdminToken');

    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

    // Form
    const [roleForm, setRoleForm] = useState({
        role_name: "",
        description: "",
        permissions: {} as Record<string, boolean>
    });

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetchRoles();
    }, [token]);

    const fetchRoles = async () => {
        try {
            const res = await superAdminGetGlobalRoles(token!);
            setRoles(res.roles || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && editingRoleId) {
                await superAdminUpdateGlobalRole(token!, editingRoleId, roleForm);
            } else {
                await superAdminCreateGlobalRole(token!, roleForm);
            }
            setShowModal(false);
            setRoleForm({ role_name: "", description: "", permissions: {} });
            setIsEditing(false);
            setEditingRoleId(null);
            fetchRoles();
        } catch (err) { alert("Failed to save role"); }
    };

    const togglePermission = (key: string) => {
        setRoleForm(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
        }));
    };

    const openEditModal = (role: any) => {
        setRoleForm({
            role_name: role.role_name,
            description: role.description || "",
            permissions: role.permissions || {}
        });
        setEditingRoleId(role.role_id);
        setIsEditing(true);
        setShowModal(true);
    };

    if (loading) return <div className="p-8 text-emerald-600">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <button onClick={() => navigate('/dashboard')} className="text-gray-500 mb-4 hover:text-gray-700">&larr; Back to Dashboard</button>

                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <Shield className="text-emerald-500" size={32} />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Global Roles</h1>
                            <p className="text-gray-500">Manage generic roles that apply across all organizations.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setRoleForm({ role_name: "", description: "", permissions: {} });
                            setIsEditing(false);
                            setEditingRoleId(null);
                            setShowModal(true);
                        }}
                        className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-emerald-700 transition font-medium"
                    >
                        + Create Global Role
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-[#F9FAFB]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Permissions</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {roles.map(r => (
                                <tr key={r.role_id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{r.role_name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{r.description}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="flex flex-wrap gap-2">
                                            {Object.keys(r.permissions || {}).filter(k => r.permissions[k]).map(k => (
                                                <span key={k} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                                    {PERMISSIONS_LIST.find(p => p.key === k)?.label || k}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                        <button
                                            onClick={() => openEditModal(r)}
                                            className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1"
                                        >
                                            <Edit2 size={16} /> Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {roles.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No global roles defined.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Role Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-[500px] transform transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Global Role' : 'Create Global Role'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <form onSubmit={handleCreateOrUpdate} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                                <input
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    value={roleForm.role_name}
                                    onChange={e => setRoleForm({ ...roleForm, role_name: e.target.value })}
                                    required
                                    placeholder="e.g. Manager"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    value={roleForm.description}
                                    onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                                    placeholder="Optional description"
                                />
                            </div>

                            {/* Permissions */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
                                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    {PERMISSIONS_LIST.map(p => {
                                        const isChecked = !!roleForm.permissions[p.key];
                                        return (
                                            <label key={p.key} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded transition">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                    checked={isChecked}
                                                    onChange={() => togglePermission(p.key)}
                                                />
                                                <span className="text-sm text-gray-700 font-medium">{p.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium shadow-sm">
                                    {isEditing ? 'Update Role' : 'Create Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
