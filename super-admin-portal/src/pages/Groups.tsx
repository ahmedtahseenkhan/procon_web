import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getGenericGroups, createGenericGroup, updateGenericGroup, deleteGenericGroup } from "../services/api";
import { Layers, Edit2, Trash2, Plus } from "lucide-react";

export default function Groups() {
    const navigate = useNavigate();
    const token = localStorage.getItem('superAdminToken');

    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

    // Form
    const [groupForm, setGroupForm] = useState({
        name: "",
        description: ""
    });

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetchGroups();
    }, [token]);

    const fetchGroups = async () => {
        try {
            const res = await getGenericGroups(token!);
            setGroups(res.groups || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && editingGroupId) {
                await updateGenericGroup(token!, editingGroupId, groupForm);
            } else {
                await createGenericGroup(token!, groupForm);
            }
            setShowModal(false);
            setGroupForm({ name: "", description: "" });
            setIsEditing(false);
            setEditingGroupId(null);
            fetchGroups();
        } catch (err) { alert("Failed to save group"); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this group?")) return;
        try {
            await deleteGenericGroup(token!, id);
            fetchGroups();
        } catch (err) { alert("Failed to delete group"); }
    };

    const openEditModal = (group: any) => {
        setGroupForm({
            name: group.name,
            description: group.description || ""
        });
        setEditingGroupId(group.group_id);
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
                        <Layers className="text-emerald-500" size={32} />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
                            <p className="text-gray-500">Manage generic groups for device association.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setGroupForm({ name: "", description: "" });
                            setIsEditing(false);
                            setEditingGroupId(null);
                            setShowModal(true);
                        }}
                        className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-emerald-700 transition font-medium flex items-center gap-2"
                    >
                        <Plus size={20} /> Create Group
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-[#F9FAFB]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Group Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {groups.map(g => (
                                <tr key={g.group_id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{g.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{g.description}</td>
                                    <td className="px-6 py-4 text-sm font-medium flex items-center gap-3">
                                        <button
                                            onClick={() => openEditModal(g)}
                                            className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1"
                                        >
                                            <Edit2 size={16} /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(g.group_id)}
                                            className="text-red-500 hover:text-red-700 flex items-center gap-1"
                                        >
                                            <Trash2 size={16} /> Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {groups.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-500">No generic groups defined.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-[500px] max-h-[90vh] overflow-y-auto transform transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Group' : 'Create Group'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <form onSubmit={handleCreateOrUpdate} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                                <input
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none"
                                    value={groupForm.name}
                                    onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                                    required
                                    placeholder="e.g. VIP Devices"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none"
                                    value={groupForm.description}
                                    onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
                                    placeholder="Optional description"
                                />
                            </div>

                            <div className="sticky bottom-0 bg-white flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium shadow-sm">
                                    {isEditing ? 'Update Group' : 'Create Group'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
