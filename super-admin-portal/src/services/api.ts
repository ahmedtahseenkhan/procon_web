const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

export async function superAdminLogin(credentials: any) {
    const response = await fetch(`${base}/api/super-admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
}

export async function getCompanies(token: string) {
    const response = await fetch(`${base}/api/super-admin/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch companies');
    return response.json();
}

export async function createCompany(token: string, companyData: any) {
    const response = await fetch(`${base}/api/super-admin/companies`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(companyData)
    });
    if (!response.ok) throw new Error('Failed to create company');
    return response.json();
}

export async function deleteCompany(token: string, companyId: string) {
    const response = await fetch(`${base}/api/super-admin/companies/${companyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) throw new Error('Failed to delete company')
    return response.json()
}

export async function superAdminGetGroups(token: string, companyId: string) {
    const response = await fetch(`${base}/api/super-admin/companies/${companyId}/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch groups');
    return response.json();
}

export async function superAdminCreateGroup(token: string, companyId: string, name: string) {
    const response = await fetch(`${base}/api/super-admin/companies/${companyId}/groups`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    if (!response.ok) throw new Error('Failed to create group');
    return response.json();
}

export async function superAdminGetRoles(token: string, companyId: string) {
    const response = await fetch(`${base}/api/super-admin/companies/${companyId}/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch roles');
    return response.json();
}

export async function superAdminCreateRole(token: string, companyId: string, roleData: any) {
    const response = await fetch(`${base}/api/super-admin/companies/${companyId}/roles`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData)
    });
    if (!response.ok) throw new Error('Failed to create role');
    return response.json();
}

export async function superAdminGetGlobalRoles(token: string) {
    const response = await fetch(`${base}/api/super-admin/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch global roles');
    return response.json();
}

export async function superAdminCreateGlobalRole(token: string, roleData: any) {
    const response = await fetch(`${base}/api/super-admin/roles`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData)
    });
    if (!response.ok) throw new Error('Failed to create global role');
    return response.json();
}

export async function superAdminUpdateGlobalRole(token: string, roleId: string, roleData: any) {
    const response = await fetch(`${base}/api/super-admin/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData)
    });
    if (!response.ok) throw new Error('Failed to update global role');
    return response.json();
}

export async function superAdminGetDevices(token: string, companyId: string) {
    const response = await fetch(`${base}/api/super-admin/companies/${companyId}/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch devices');
    return response.json();
}
