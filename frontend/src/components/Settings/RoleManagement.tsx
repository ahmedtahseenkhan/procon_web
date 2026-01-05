import { useState, useEffect } from "react";
import { getRoles, getGroups, createRole, updateRole } from "../../services/api";
import CustomSelect from "../Layout/CustomSelect";

interface DeviceGroup {
    group_id: string;
    name: string;
}

interface Role {
    role_id: string;
    role_name: string;
    description: string;
    permissions: any;
    device_groups: string[]; // List of group_ids
}

const PERMISSIONS_LIST = [
    { key: "manage_users", label: "Manage Users" },
    { key: "manage_devices", label: "Manage Devices" },
    { key: "view_reports", label: "View Reports" },
    { key: "send_commands", label: "Send Commands" },
];

function RoleManagement() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [groups, setGroups] = useState<DeviceGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    const [formData, setFormData] = useState({
        role_name: "",
        description: "",
        permissions: {} as Record<string, boolean>,
        device_group_ids: [] as string[],
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [rolesRes, groupsRes] = await Promise.all([getRoles(), getGroups()]);
            setRoles(rolesRes.roles || []);
            setGroups(groupsRes || []);
        } catch (error) {
            console.error("Error fetching role data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setFormData({
            role_name: role.role_name,
            description: role.description || "",
            permissions: role.permissions || {},
            device_group_ids: role.device_groups || [],
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRole) {
                await updateRole(editingRole.role_id, formData);
            } else {
                await createRole(formData);
            }
            setShowModal(false);
            setEditingRole(null);
            setFormData({ role_name: "", description: "", permissions: {}, device_group_ids: [] });
            fetchData();
        } catch (error) {
            console.error("Error saving role:", error);
            alert("Failed to save role");
        }
    };

    const togglePermission = (key: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [key]: !prev.permissions[key]
            }
        }));
    };

    if (loading) return <div>Loading roles...</div>;

    const groupOptions = groups.map(g => g.name);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    Create New Role
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group Scopes</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {roles.map((role) => (
                            <tr key={role.role_id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{role.role_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.description}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {Object.keys(role.permissions || {}).filter(k => role.permissions[k]).length} enabled
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {role.device_groups && role.device_groups.length > 0
                                        ? role.device_groups.map(gid => groups.find(g => g.group_id === gid)?.name).join(', ')
                                        : 'All Groups'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <button onClick={() => handleEdit(role)} className="text-primary-600 hover:text-primary-900">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">{editingRole ? "Edit Role" : "Create Role"}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role Name</label>
                                <input
                                    type="text"
                                    value={formData.role_name}
                                    onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                                <div className="space-y-2">
                                    {PERMISSIONS_LIST.map((perm) => (
                                        <label key={perm.key} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={!!formData.permissions[perm.key]}
                                                onChange={() => togglePermission(perm.key)}
                                                className="rounded border-gray-300 text-primary-600"
                                            />
                                            <span className="text-sm text-gray-700">{perm.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Group Scope</label>
                                <CustomSelect
                                    options={groupOptions}
                                    value={formData.device_group_ids.map(id => groups.find(g => g.group_id === id)?.name || "")}
                                    multiSelect={true}
                                    onChange={(selectedNames) => {
                                        const ids = (Array.isArray(selectedNames) ? selectedNames : [selectedNames])
                                            .map(name => groups.find(g => g.name === name)?.group_id)
                                            .filter(Boolean) as string[];
                                        setFormData({ ...formData, device_group_ids: ids });
                                    }}
                                />
                                <p className="text-xs text-gray-500 mt-1">Select groups visible to this role. Empty = All Groups (or No Groups depending on policy).</p>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RoleManagement;
