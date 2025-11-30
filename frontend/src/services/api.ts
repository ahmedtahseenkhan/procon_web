const base = import.meta.env.VITE_API_BASE_URL || ''
function authHeader(): Record<string, string> {
  const t = localStorage.getItem('token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}
export async function getDevices() {
  const r = await fetch(`${base}/api/devices`, { headers: { ...authHeader() } })
  if (!r.ok) throw new Error('error')
  return r.json()
}
export async function getEvents() {
  const r = await fetch(`${base}/api/events`, { headers: { ...authHeader() } })
  if (!r.ok) throw new Error('error')
  return r.json()
}

export async function getUsers() {
  const response = await fetch(`${base}/api/users`, { headers: authHeader() })
  if (!response.ok) throw new Error('Failed to fetch users')
  return response.json()
}

export async function createUser(userData: any) {
  const response = await fetch(`${base}/api/users`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  })
  if (!response.ok) throw new Error('Failed to create user')
  return response.json()
}

export async function updateUser(userId: string, userData: any) {
  const response = await fetch(`${base}/api/users/${userId}`, {
    method: 'PUT',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  })
  if (!response.ok) throw new Error('Failed to update user')
  return response.json()
}

export async function deleteUser(userId: string) {
  const response = await fetch(`${base}/api/users/${userId}`, {
    method: 'DELETE',
    headers: authHeader()
  })
  if (!response.ok) throw new Error('Failed to delete user')
  return response.json()
}

export async function exportReport(format: string, options: any) {
  const query = new URLSearchParams({
    format,
    dateRange: options.dateRange,
    machineFilter: options.machineFilter,
    groupFilter: options.groupFilter
  }).toString();

  const response = await fetch(`${base}/api/reports/export?${query}`, {
    headers: authHeader()
  });

  if (!response.ok) throw new Error('Failed to export report');

  return response.blob();
}

export async function sendDeviceCommand(deviceId: string, action: string) {
  const response = await fetch(`${base}/api/devices/${deviceId}/command`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
  if (!response.ok) throw new Error('Failed to send command');
  return response.json();
}

export async function acknowledgeEvent(eventUuid: string) {
  const response = await fetch(`${base}/api/events/${eventUuid}/ack`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  if (!response.ok) throw new Error('Failed to acknowledge event');
  return response.json();
}

export async function getDashboardStats(filters?: any) {
  const params = new URLSearchParams();
  if (filters?.dateRange) params.append("dateRange", filters.dateRange);
  if (filters?.groupFilter) params.append("groupFilter", filters.groupFilter);
  if (filters?.severityFilter) params.append("severityFilter", filters.severityFilter);

  const response = await fetch(`${base}/api/dashboard/stats?${params.toString()}`, {
    headers: authHeader(),
  });
  if (!response.ok) throw new Error('Failed to fetch dashboard stats');
  return response.json();
}
