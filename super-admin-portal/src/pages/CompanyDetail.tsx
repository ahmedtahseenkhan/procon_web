import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    superAdminGetDevices,
    getGenericGroups, superAdminUpdateDevice,
    superAdminGetCompanyUsers,
    superAdminCreateCompanyUser,
    superAdminUpdateCompanyUser,
    superAdminGetGlobalRoles
} from "../services/api";

// Helper Interface
interface Group { group_id: string; name: string; }
interface Device {
    device_id: string;
    serial_number: string;
    nickname: string;
    status: string;
    is_online: boolean;
    group_id?: string;
}

interface CompanyUser {
    user_id: string;
    username: string;
    email: string;
    role_name: string;
    is_active: boolean;
    created_at?: string;
    last_login?: string;
}

interface CompanyRole {
    role_id: string;
    role_name: string;
}

export default function CompanyDetail() {
    const { companyId } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('superAdminToken');

    const [genericGroups, setGenericGroups] = useState<Group[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [users, setUsers] = useState<CompanyUser[]>([]);
    const [roles, setRoles] = useState<CompanyRole[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'users' | 'devices'>('devices');

    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRoleName, setNewRoleName] = useState('');

    // Device editing state
    const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        if (companyId) fetchData();
    }, [companyId, token]);

    const fetchData = async () => {
        try {
            const [genRes, dRes, uRes, rRes] = await Promise.all([
                getGenericGroups(token!),
                superAdminGetDevices(token!, companyId!),
                superAdminGetCompanyUsers(token!, companyId!),
                superAdminGetGlobalRoles(token!)
            ]);
            setGenericGroups(genRes.groups || []);
            setDevices(dRes.devices || []);
            setUsers(uRes.users || []);
            setRoles(rRes.roles || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignGroup = async (deviceId: string) => {
        try {
            await superAdminUpdateDevice(token!, companyId!, deviceId, { group_id: selectedGroupId || null });
            setEditingDeviceId(null);
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to assign group");
        }
    };

    const handleCreateUser = async () => {
        try {
            await superAdminCreateCompanyUser(token!, companyId!, {
                username: newUsername,
                email: newEmail,
                password: newPassword,
                role_name: newRoleName
            });
            setNewUsername('');
            setNewEmail('');
            setNewPassword('');
            setNewRoleName('');
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to create user');
        }
    };

    const handleUpdateUser = async (userId: string, data: Partial<Pick<CompanyUser, 'role_name' | 'is_active'>>) => {
        try {
            await superAdminUpdateCompanyUser(token!, companyId!, userId, data);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to update user');
        }
    };

    if (loading) return <div className="p-8 text-emerald-600">Loading...</div>;

    // Combine company-specific groups and generic groups for the dropdown if needed, 
    // or just use generic groups as requested ("groups are generic we just associated device with these groups").
    // The previous implementation had company specific groups. 
    // Based on "in super admin panel there is a section to add groups... groups are generic", 
    // I should probably focus on generic groups for assignment.
    // However, to avoid breaking existing functionality, I will show both or just generic if that's the intention.
    // Let's assume the dropdown should show ALL available groups (Generic + Company Specific if any).
    // Actually, the prompt says "groups are generic we just associated device with these groups", implying we might be moving away from company-specific groups or just using generic ones.
    // Let's list Generic Groups in the dropdown.

    const allGroups = [...genericGroups];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <button onClick={() => navigate('/dashboard')} className="text-gray-500 mb-4 hover:text-gray-700">&larr; Back to Dashboard</button>
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Company</h1>

                <div className="mb-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('devices')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'devices'
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Devices
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'users'
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Users
                        </button>
                    </nav>
                </div>

                {activeTab === 'users' && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Users</h2>

                        <div className="bg-white rounded-lg shadow p-4 mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Add User</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <input
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                    placeholder="Username"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                />
                                <input
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                    placeholder="Email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                />
                                <input
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                    placeholder="Password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <select
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                >
                                    <option value="">Select Role</option>
                                    {roles.map((r) => (
                                        <option key={r.role_id} value={r.role_name}>{r.role_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mt-3">
                                <button
                                    type="button"
                                    onClick={handleCreateUser}
                                    className="px-4 py-2 rounded bg-emerald-600 text-white text-sm"
                                >
                                    Create User
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow overflow-visible">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((u) => (
                                        <tr key={u.user_id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.username}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{u.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <select
                                                    className="border border-gray-300 rounded p-1 text-sm w-48"
                                                    value={u.role_name || ''}
                                                    onChange={(e) => handleUpdateUser(u.user_id, { role_name: e.target.value })}
                                                >
                                                    <option value="">Select Role</option>
                                                    {roles.map((r) => (
                                                        <option key={r.role_id} value={r.role_name}>{r.role_name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={!!u.is_active}
                                                    onChange={(e) => handleUpdateUser(u.user_id, { is_active: e.target.checked })}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No users found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'devices' && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Devices & Group Assignment</h2>
                        <div className="bg-white rounded-lg shadow overflow-visible">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Info</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Group</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {devices.map(d => {
                                        const isEditing = editingDeviceId === d.device_id;
                                        return (
                                            <tr key={d.device_id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{d.nickname || 'Unnamed'}</div>
                                                    <div className="text-sm text-gray-500">{d.serial_number}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {isEditing ? (
                                                        <select
                                                            className="border border-gray-300 rounded p-1 text-sm w-48"
                                                            value={selectedGroupId}
                                                            onChange={e => setSelectedGroupId(e.target.value)}
                                                        >
                                                            <option value="">-- No Group --</option>
                                                            {allGroups.map(g => (
                                                                <option key={g.group_id} value={g.group_id}>{g.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className={d.group_id ? "text-emerald-600 font-medium" : "text-gray-400"}>
                                                            {allGroups.find(g => g.group_id === d.group_id)?.name || '-'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${d.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {d.is_online ? 'Online' : 'Offline'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    {isEditing ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleAssignGroup(d.device_id)}
                                                                className="text-emerald-600 hover:text-emerald-900"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingDeviceId(null)}
                                                                className="text-gray-500 hover:text-gray-700"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setEditingDeviceId(d.device_id);
                                                                setSelectedGroupId(d.group_id || "");
                                                            }}
                                                            className="text-indigo-600 hover:text-indigo-900"
                                                        >
                                                            Assign Group
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {devices.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No devices found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
