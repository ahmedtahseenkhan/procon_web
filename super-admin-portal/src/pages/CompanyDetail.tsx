import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    superAdminGetGroups, superAdminCreateGroup, superAdminGetDevices
} from "../services/api";

// Helper Interface
interface Group { group_id: string; name: string; }
interface Device { device_id: string; serial_number: string; nickname: string; status: string; is_online: boolean; group_name: string; }

export default function CompanyDetail() {
    const { companyId } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('superAdminToken');

    const [groups, setGroups] = useState<Group[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    // Forms
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        if (companyId) fetchData();
    }, [companyId, token]);

    const fetchData = async () => {
        try {
            const [gRes, dRes] = await Promise.all([
                superAdminGetGroups(token!, companyId!),
                superAdminGetDevices(token!, companyId!)
            ]);
            setGroups(gRes.groups || []);
            setDevices(dRes.devices || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await superAdminCreateGroup(token!, companyId!, newGroupName);
            setShowGroupModal(false);
            setNewGroupName("");
            fetchData();
        } catch (err: any) {
            console.error(err);
            alert("Failed to create group: " + (err.message || "Unknown error"));
        }
    };

    if (loading) return <div className="p-8 text-emerald-600">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <button onClick={() => navigate('/dashboard')} className="text-gray-500 mb-4 hover:text-gray-700">&larr; Back to Dashboard</button>
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Company (ID: {companyId})</h1>

                {/* Groups Section */}
                <div className="mb-8">
                    <div className="flex justify-between mb-4">
                        <h2 className="text-xl font-semibold">Device Groups</h2>
                        <button onClick={() => setShowGroupModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded shadow hover:bg-emerald-700 transition">
                            + Add Group
                        </button>
                    </div>
                    <ul className="bg-white rounded-lg shadow divide-y overflow-hidden">
                        {groups.map(g => (
                            <li key={g.group_id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                <span className="font-medium text-gray-800">{g.name}</span>
                                <span className="text-gray-400 text-sm font-mono">{g.group_id}</span>
                            </li>
                        ))}
                        {groups.length === 0 && <li className="p-8 text-center text-gray-500">No groups found. Create one to get started.</li>}
                    </ul>
                </div>

                {/* Devices Section */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Devices</h2>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Info</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {devices.map(d => (
                                    <tr key={d.device_id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{d.nickname || 'Unnamed'}</div>
                                            <div className="text-sm text-gray-500">{d.serial_number}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {d.group_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${d.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {d.is_online ? 'Online' : 'Offline'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {devices.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-4 text-center text-gray-500">No devices synced yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create Group Modal */}
            {showGroupModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96 transform transition-all scale-100">
                        <h3 className="text-xl font-bold mb-4 text-gray-900">Create New Group</h3>
                        <form onSubmit={handleCreateGroup}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                                <input
                                    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                                    placeholder="e.g. North Region"
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowGroupModal(false)} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition">Create Group</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
