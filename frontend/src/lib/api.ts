const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';
const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
const REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'kms-realm';
const CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'kms-frontend-client';

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000 - 10000;
  } catch {
    return true;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = sessionStorage.getItem('kms_refresh_token');
  if (!refreshToken) return null;

  try {
    const res = await fetch(
      `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: CLIENT_ID,
          refresh_token: refreshToken,
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      sessionStorage.setItem('kms_access_token', data.access_token);
      if (data.refresh_token) {
        sessionStorage.setItem('kms_refresh_token', data.refresh_token);
      }
      return data.access_token;
    }
  } catch {
    // Silent refresh failed
  }
  return null;
}

async function getOrRefreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  let token = sessionStorage.getItem('kms_access_token');
  if (token && !isJwtExpired(token)) {
    return token;
  }
  return await refreshAccessToken();
}

async function trySilentRefresh(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = sessionStorage.getItem('kms_refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      sessionStorage.setItem('kms_access_token', data.access_token);
      if (data.refresh_token) {
        sessionStorage.setItem('kms_refresh_token', data.refresh_token);
      }
      return data.access_token;
    }
  } catch {
    // ignore
  }
  return null;
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const isAuthEndpoint = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/forgot-password');

  // Attach Keycloak Bearer token if present in session storage
  if (!isAuthEndpoint && typeof window !== 'undefined') {
    const token = await getOrRefreshAccessToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (response.status === 401 && !isRetry && !isAuthEndpoint && typeof window !== 'undefined') {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return fetchApi<T>(endpoint, options, true);
    }
    sessionStorage.removeItem('kms_access_token');
    sessionStorage.removeItem('kms_refresh_token');
    document.cookie = 'kms_auth_present=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = errorText || response.statusText;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.message) errorMsg = parsed.message;
      else if (parsed.error_description) errorMsg = parsed.error_description;
      else if (parsed.error) errorMsg = parsed.error;
    } catch {}
    throw new Error(errorMsg);
  }

  // Return empty response for 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const kmsApi = {
  // Auth
  auth: {
    login: (username: string, password: string) =>
      fetchApi<{ status: string; access_token?: string; refresh_token?: string; username?: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    forgotPassword: (emailOrUsername: string) =>
      fetchApi<{ message: string; status: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ emailOrUsername }),
      }),
    changePassword: (currentPassword: string, newPassword: string, confirmPassword?: string) =>
      fetchApi<{ message: string; status: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      }),
    forcedPasswordChange: (data: {
      username: string;
      currentPassword: string;
      newPassword: string;
      confirmPassword?: string;
    }) =>
      fetchApi<{ message: string; status: string }>('/auth/forced-password-change', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Health
  getHealthStatus: () => fetchApi<{ status: string; service: string }>('/health'),

  // Users Profile
  getCurrentUser: () => fetchApi<{ id?: string; username: string; email: string; fullName: string; department?: string; roles: string[] }>('/users/me'),
  getMyApprovals: () => fetchApi<any[]>('/users/me/approvals'),

  // Departments & Categories Active Lookup
  departments: {
    getActive: () => fetchApi<Array<{ id: string; name: string; code: string; isActive?: boolean }>>('/departments/active'),
  },
  documentTypes: {
    getActive: () => fetchApi<Array<{ id: string; name: string; description?: string; isActive?: boolean }>>('/document-types/active'),
  },

  // Documents
  documents: {
    list: (
      page = 0,
      size = 10,
      filters?: { departmentId?: string; docTypeId?: string; confidentiality?: string }
    ) => {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (filters?.departmentId) params.set('departmentId', filters.departmentId);
      if (filters?.docTypeId) params.set('docTypeId', filters.docTypeId);
      if (filters?.confidentiality && filters.confidentiality !== 'ALL') params.set('confidentiality', filters.confidentiality);
      return fetchApi<any>(`/documents?${params.toString()}`);
    },
    mine: (page = 0, size = 20) => fetchApi<any>(`/documents/mine?page=${page}&size=${size}`),
    recent: (limit = 20) => fetchApi<any[]>(`/documents/recent?limit=${limit}`),
    recycleBin: () => fetchApi<any[]>(`/documents/recycle-bin?page=0&size=100`),
    getMetadata: (id: string) => fetchApi<any>(`/documents/${id}/metadata`),
    putMetadata: (id: string, values: Record<string, string>) =>
      fetchApi<any>(`/documents/${id}/metadata`, { method: 'PUT', body: JSON.stringify(values) }),
    getById: (id: string) => fetchApi<any>(`/documents/${id}`),
    upload: async (formData: FormData) => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) {
        let errText = '';
        try {
          errText = await res.text();
        } catch {
          errText = res.statusText;
        }
        throw new Error(`Upload failed [${res.status}]: ${errText || res.statusText || 'Server Error'}`);
      }
      return res.json();
    },
    bulkUpload: async (formData: FormData) => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/documents/bulk-upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) {
        let errText = '';
        try {
          errText = await res.text();
        } catch {
          errText = res.statusText;
        }
        throw new Error(`Bulk upload failed [${res.status}]: ${errText || res.statusText || 'Server Error'}`);
      }
      return res.json();
    },
    createArticle: (payload: {
      title: string;
      category: string;
      knowledgeType: string;
      confidentialityLevel: string;
      reviewFrequencyDays: number;
      executiveSummary: string;
      tags: string;
      content: string;
      isDraft: boolean;
      departmentCode?: string;
    }) => fetchApi<any>('/documents/articles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    uploadMedia: async (formData: FormData) => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/documents/media-upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error(`Media upload failed: ${res.statusText}`);
      return res.json();
    },
    bulk: (payload: { operation: string; documentIds: string[]; targetFolderId?: string; tags?: string[]; confidentialityLevel?: string }) => fetchApi<any>('/documents/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    desktopOpen: (id: string) => fetchApi<{ documentId: string; fileName: string; extension: string; protocolUri: string; downloadUrl: string; openMethod: string }>(`/documents/${id}/desktop-open`),
    getTextContent: (id: string) => fetchApi<{ fileName: string; paragraphs: string[] }>(`/documents/${id}/text`),
    desktopCheckIn: async (id: string, formData: FormData) => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/documents/${id}/desktop-checkin`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error(`Desktop check-in failed: ${res.statusText}`);
      return res.json();
    },
    delete: (id: string) => fetchApi<void>(`/documents/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<void>(`/documents/${id}/restore`, { method: 'POST' }),
    getVersions: (id: string) => fetchApi<any[]>(`/documents/${id}/versions`),
    downloadUrl: (id: string, disposition: 'inline' | 'attachment' = 'attachment') =>
      `${API_BASE_URL}/documents/${id}/download?disposition=${disposition}`,
    downloadBlob: async (id: string, disposition: 'inline' | 'attachment' = 'attachment') => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
      const res = await fetch(`${API_BASE_URL}/documents/${id}/download?disposition=${disposition}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        let detail = res.statusText;
        try {
          const text = await res.text();
          detail = JSON.parse(text)?.message || text || detail;
        } catch {
          /* keep statusText */
        }
        throw new Error(`Preview/download failed [${res.status}]: ${detail}`);
      }
      return res.blob();
    },
    getComments: (id: string) => fetchApi<any[]>(`/documents/${id}/comments`),
    addComment: (id: string, text: string) => fetchApi<any>(`/documents/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: text }),
    }),
    getFavoriteStatus: (id: string) => fetchApi<{ favorited: boolean }>(`/documents/${id}/favorite/status`),
    toggleFavorite: (id: string) => fetchApi<{ favorited: boolean }>(`/documents/${id}/favorite/toggle`, { method: 'POST' }),
    getFavorites: () => fetchApi<any[]>('/documents/favorites'),
    getSharedWithMe: () => fetchApi<any[]>('/documents/shared-with-me'),
    getLockStatus: (id: string) => fetchApi<any>(`/documents/${id}/lock-status`),
    checkout: (id: string) => fetchApi<any>(`/documents/${id}/checkout`, { method: 'POST' }),
    checkin: async (id: string, formData: FormData) => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/documents/${id}/checkin`, { method: 'POST', headers, body: formData });
      if (!res.ok) throw new Error(`Check-in failed: ${res.statusText}`);
      return res.json();
    },
    unlock: (id: string) => fetchApi<any>(`/documents/${id}/unlock`, { method: 'POST' }),
    getShareLinks: (id: string) => fetchApi<any[]>(`/documents/${id}/share-links`),
    createShareLink: (id: string, payload: { expiryHours?: number; password?: string }) =>
      fetchApi<any>(`/documents/${id}/share-link`, { method: 'POST', body: JSON.stringify(payload) }),
  },

  // FR-26: Subscriptions
  subscriptions: {
    getDocStatus: (documentId: string) => fetchApi<{ subscribed: boolean; subscriptionId?: string; notifyVersions?: boolean; notifyComments?: boolean; notifyShares?: boolean }>(`/documents/${documentId}/subscribe/status`),
    subscribeDoc: (documentId: string, prefs?: { notifyVersions?: boolean; notifyComments?: boolean; notifyShares?: boolean }) =>
      fetchApi<{ subscribed: boolean; subscriptionId: string; notifyVersions: boolean; notifyComments: boolean; notifyShares: boolean }>(`/documents/${documentId}/subscribe`, { method: 'POST', body: JSON.stringify(prefs || {}) }),
    unsubscribeDoc: (documentId: string) => fetchApi<{ subscribed: boolean }>(`/documents/${documentId}/subscribe`, { method: 'DELETE' }),
    getFolderStatus: (folderId: string) => fetchApi<{ subscribed: boolean; subscriptionId?: string; notifyVersions?: boolean; notifyComments?: boolean; notifyShares?: boolean }>(`/folders/${folderId}/subscribe/status`),
    subscribeFolder: (folderId: string, prefs?: { notifyVersions?: boolean; notifyComments?: boolean; notifyShares?: boolean }) =>
      fetchApi<{ subscribed: boolean; subscriptionId: string; notifyVersions: boolean; notifyComments: boolean; notifyShares: boolean }>(`/folders/${folderId}/subscribe`, { method: 'POST', body: JSON.stringify(prefs || {}) }),
    unsubscribeFolder: (folderId: string) => fetchApi<{ subscribed: boolean }>(`/folders/${folderId}/subscribe`, { method: 'DELETE' }),
  },

  // Folders
  folders: {
    list: () => fetchApi<any[]>('/folders'),
    getById: (id: string) => fetchApi<any>(`/folders/${id}`),
    create: (payload: { name: string; parentId?: string; departmentId?: string; confidentialityLevel?: string }) =>
      fetchApi<any>('/folders', { method: 'POST', body: JSON.stringify(payload) }),
  },

  // FR-17 Access control (folder + document ACLs)
  permissions: {
    getSubjects: () => fetchApi<{
      users: Array<{ id: string; label: string; active: boolean }>;
      groups: Array<{ id: string; label: string }>;
      roles: string[];
      permissionLevels: string[];
    }>('/permissions/subjects'),
    listFolder: (folderId: string) => fetchApi<any[]>(`/folders/${folderId}/permissions`),
    grantFolder: (folderId: string, payload: { subjectType: string; subjectId: string; permissionLevel: string }) =>
      fetchApi<any>(`/folders/${folderId}/permissions`, { method: 'POST', body: JSON.stringify(payload) }),
    revokeFolder: (folderId: string, permissionId: string) =>
      fetchApi<void>(`/folders/${folderId}/permissions/${permissionId}`, { method: 'DELETE' }),
    listDocument: (documentId: string) => fetchApi<any[]>(`/documents/${documentId}/permissions`),
    grantDocument: (documentId: string, payload: { subjectType: string; subjectId: string; permissionLevel: string }) =>
      fetchApi<any>(`/documents/${documentId}/permissions`, { method: 'POST', body: JSON.stringify(payload) }),
    revokeDocument: (documentId: string, permissionId: string) =>
      fetchApi<void>(`/documents/${documentId}/permissions/${permissionId}`, { method: 'DELETE' }),
  },

  // Search
  search: {
    quick: (query: string) => fetchApi<any>(`/search/quick?q=${encodeURIComponent(query)}`),
    advanced: (
      query: string,
      filters?: {
        docTypeId?: string;
        deptId?: string;
        confidentiality?: string;
        authorId?: string;
        dateFrom?: string;
        dateTo?: string;
      }
    ) =>
      fetchApi<any>(`/search/advanced`, {
        method: 'POST',
        body: JSON.stringify({
          query,
          docTypeId: filters?.docTypeId || undefined,
          deptId: filters?.deptId || undefined,
          confidentiality: filters?.confidentiality && filters.confidentiality !== 'ALL' ? filters.confidentiality : undefined,
          authorId: filters?.authorId || undefined,
          dateFrom: filters?.dateFrom || undefined,
          dateTo: filters?.dateTo || undefined,
        }),
      }),
  },

  // Governance & Compliance
  governance: {
    getRetentionPolicies: () => fetchApi<any[]>('/governance/retention'),
    getRetentionCandidates: () => fetchApi<any[]>('/governance/retention/candidates'),
    createRetentionPolicy: (payload: { name: string; description?: string; documentTypeId?: string; retentionDays: number; dispositionAction?: string }) =>
      fetchApi<any>('/governance/retention', { method: 'POST', body: JSON.stringify(payload) }),
    updateRetentionPolicy: (id: string, payload: Record<string, unknown>) =>
      fetchApi<any>(`/governance/retention/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteRetentionPolicy: (id: string) => fetchApi<void>(`/governance/retention/${id}`, { method: 'DELETE' }),
    getLegalHolds: () => fetchApi<any[]>('/governance/legal-holds'),
    createLegalHold: (caseNumber: string, title: string, description: string) => fetchApi<any>('/governance/legal-holds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ caseNumber, title, description }).toString(),
    }),
    releaseLegalHold: (id: string) => fetchApi<any>(`/governance/legal-holds/${id}/release`, { method: 'PUT' }),
    getHoldItems: (id: string) => fetchApi<any[]>(`/governance/legal-holds/${id}/items`),
    addDocumentToHold: (id: string, documentId: string) => fetchApi<any>(`/governance/legal-holds/${id}/items`, {
      method: 'POST',
      body: JSON.stringify({ documentId }),
    }),
    removeDocumentFromHold: (id: string, documentId: string) =>
      fetchApi<void>(`/governance/legal-holds/${id}/items/${documentId}`, { method: 'DELETE' }),
    getAuditLogs: (page = 0, size = 20) => fetchApi<any>(`/governance/audit-logs?page=${page}&size=${size}`),
    exportAuditLogsUrl: `${API_BASE_URL}/governance/audit-logs/export`,
  },

  // Administration
  admin: {
    getSummary: () => fetchApi<{ totalUsers: number; totalDocuments: number; storageQuotaUsedBytes: number }>('/admin/summary'),
    getUsers: () => fetchApi<any[]>('/admin/users'),
    createUser: (payload: { username: string; email: string; roleName: string; departmentId?: string; temporaryPassword?: string; firstName?: string; lastName?: string }) =>
      fetchApi<any>('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
    resetUserPassword: (id: string, password: string, temporary = true) =>
      fetchApi<{ message: string; username: string }>(`/admin/users/${id}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ password, temporary: String(temporary) }),
      }),
    getIdentityProviderHealth: () => fetchApi<{ enabled: boolean; baseUrl: string; realm: string; status: string; error?: string }>(
      '/admin/identity-provider/health'),
    updateUser: (id: string, payload: Record<string, string>) =>
      fetchApi<any>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    activateUser: (id: string) => fetchApi<any>(`/admin/users/${id}/activate`, { method: 'PUT' }),
    deactivateUser: (id: string) => fetchApi<any>(`/admin/users/${id}/deactivate`, { method: 'PUT' }),
    changeUserRole: (id: string, roleName: string) =>
      fetchApi<any>(`/admin/users/${id}/roles`, { method: 'PUT', body: JSON.stringify({ roleName }) }),
    deleteUser: (id: string) => fetchApi<any>(`/admin/users/${id}`, { method: 'DELETE' }),
    searchUsers: (q: string) => fetchApi<any[]>(`/admin/users/search?q=${encodeURIComponent(q)}`),
    getRoles: () => fetchApi<Array<{ name: string; description: string; userCount: number }>>('/admin/roles'),

    // Departments & quotas (FR-27)
    getDepartments: () => fetchApi<any[]>('/admin/departments'),
    searchDepartments: (q: string) => fetchApi<any[]>(`/admin/departments/search?q=${encodeURIComponent(q)}`),
    createDepartment: (payload: { name: string; code: string; storageQuotaBytes?: number }) =>
      fetchApi<any>('/admin/departments', { method: 'POST', body: JSON.stringify(payload) }),
    updateDepartment: (id: string, payload: { name?: string; code?: string; storageQuotaBytes?: number; isActive?: boolean }) =>
      fetchApi<any>(`/admin/departments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    activateDepartment: (id: string) => fetchApi<any>(`/admin/departments/${id}/activate`, { method: 'PUT' }),
    deactivateDepartment: (id: string) => fetchApi<any>(`/admin/departments/${id}/deactivate`, { method: 'PUT' }),
    deleteDepartment: (id: string) => fetchApi<void>(`/admin/departments/${id}`, { method: 'DELETE' }),

    // Document types & Categories (FR-06)
    getDocumentTypes: () => fetchApi<any[]>('/admin/document-types'),
    searchDocumentTypes: (q: string) => fetchApi<any[]>(`/admin/document-types/search?q=${encodeURIComponent(q)}`),
    createDocumentType: (payload: { name: string; description?: string }) =>
      fetchApi<any>('/admin/document-types', { method: 'POST', body: JSON.stringify(payload) }),
    updateDocumentType: (id: string, payload: { name?: string; description?: string; isActive?: boolean }) =>
      fetchApi<any>(`/admin/document-types/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    activateDocumentType: (id: string) => fetchApi<any>(`/admin/document-types/${id}/activate`, { method: 'PUT' }),
    deactivateDocumentType: (id: string) => fetchApi<any>(`/admin/document-types/${id}/deactivate`, { method: 'PUT' }),
    deleteDocumentType: (id: string) => fetchApi<void>(`/admin/document-types/${id}`, { method: 'DELETE' }),
    listTypeFields: (typeId: string) => fetchApi<any[]>(`/admin/document-types/${typeId}/fields`),
    createTypeField: (typeId: string, payload: { fieldKey: string; label?: string; dataType?: string; required?: boolean }) =>
      fetchApi<any>(`/admin/document-types/${typeId}/fields`, { method: 'POST', body: JSON.stringify(payload) }),
    deleteTypeField: (typeId: string, fieldId: string) =>
      fetchApi<void>(`/admin/document-types/${typeId}/fields/${fieldId}`, { method: 'DELETE' }),

    // Approval workflow templates (FR-25)
    listApprovalTemplates: () => fetchApi<any[]>('/admin/approval-templates'),
    createApprovalTemplate: (payload: { name: string; description?: string; documentTypeId?: string; isActive?: boolean; approverIds: string[] }) =>
      fetchApi<any>('/admin/approval-templates', { method: 'POST', body: JSON.stringify(payload) }),
    updateApprovalTemplate: (id: string, payload: Record<string, unknown>) =>
      fetchApi<any>(`/admin/approval-templates/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteApprovalTemplate: (id: string) => fetchApi<void>(`/admin/approval-templates/${id}`, { method: 'DELETE' }),

    // Taxonomy / tags (FR-03)
    getTags: () => fetchApi<any[]>('/admin/taxonomy/tags'),
    createTag: (payload: { name: string; category?: string }) =>
      fetchApi<any>('/admin/taxonomy/tags', { method: 'POST', body: JSON.stringify(payload) }),
    updateTag: (id: string, payload: { name?: string; category?: string }) =>
      fetchApi<any>(`/admin/taxonomy/tags/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteTag: (id: string) => fetchApi<void>(`/admin/taxonomy/tags/${id}`, { method: 'DELETE' }),

    // Groups (FR-27)
    getGroups: () => fetchApi<any[]>('/admin/groups'),
    createGroup: (payload: { name: string; departmentId?: string }) =>
      fetchApi<any>('/admin/groups', { method: 'POST', body: JSON.stringify(payload) }),
    updateGroup: (id: string, payload: { name?: string; departmentId?: string }) =>
      fetchApi<any>(`/admin/groups/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteGroup: (id: string) => fetchApi<void>(`/admin/groups/${id}`, { method: 'DELETE' }),
    listGroupMembers: (id: string) => fetchApi<any[]>(`/admin/groups/${id}/members`),
    addGroupMember: (id: string, userId: string) =>
      fetchApi<void>(`/admin/groups/${id}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
    removeGroupMember: (id: string, userId: string) =>
      fetchApi<void>(`/admin/groups/${id}/members/${userId}`, { method: 'DELETE' }),

    // System configuration (FR-27)
    getSettings: () => fetchApi<any[]>('/admin/settings'),
    updateSettings: (payload: Record<string, string>) =>
      fetchApi<any[]>('/admin/settings', { method: 'PUT', body: JSON.stringify(payload) }),

    // Storage integrity
    getStorageStats: () => fetchApi<{
      totalObjects: number;
      totalBytes: number;
      orphanedObjects: number;
      duplicateChecksums: Array<{ checksumSha256: string; copies: number; wastedBytes: number }>;
    }>('/admin/storage/stats'),
    getStorageObjects: (limit = 50) => fetchApi<any[]>(`/admin/storage/objects?limit=${limit}`),

    // IT security monitoring (FR-22)
    getSecurityEvents: (page = 0, size = 25, filters?: { action?: string; user?: string; from?: string; to?: string }) => {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (filters?.action) params.set('action', filters.action);
      if (filters?.user) params.set('user', filters.user);
      if (filters?.from) params.set('from', filters.from);
      if (filters?.to) params.set('to', filters.to);
      return fetchApi<any>(`/admin/security/events?${params.toString()}`);
    },
    forwardToSiem: () => fetchApi<{ status: string; forwarded?: number; watermark?: string; hint?: string }>(
      '/admin/security/siem/forward', { method: 'POST' }),
    sendTestEmail: (to: string) =>
      fetchApi<{ status: string; detail?: string }>('/admin/mail/test', { method: 'POST', body: JSON.stringify({ to }) }),
    getBackupStatus: () => fetchApi<{
      databaseName: string;
      databaseSizePretty: string;
      databaseSizeBytes: number;
      documentCount: number;
      lastBackupAt: string;
      backupLocation: string;
      backupScript: string;
    }>('/admin/backup/status'),
    getOcrJobs: (limit = 50) => fetchApi<{ pendingCount: number; jobs: any[] }>(`/admin/ocr/jobs?limit=${limit}`),
    purgeRecycleBin: (days?: number) =>
      fetchApi<{ purged: number; skippedOnLegalHold: number; retentionDays: number }>(
        `/admin/recycle-bin/purge${days ? `?days=${days}` : ''}`, { method: 'POST' }),

    // Reports (FR-30 / FR-31)
    getStorageGrowthReport: (months = 12) => fetchApi<any>(`/admin/reports/storage-growth?months=${months}`),
    getActiveUsersReport: (days = 30, limit = 15) => fetchApi<any>(`/admin/reports/active-users?days=${days}&limit=${limit}`),
    getTopSearchesReport: (days = 30, limit = 10) => fetchApi<any>(`/admin/reports/top-searches?days=${days}&limit=${limit}`),
    getStaleContentReport: (days = 365, limit = 100) => fetchApi<any>(`/admin/reports/stale-content?days=${days}&limit=${limit}`),

    // Manual retention disposition run (FR-28)
    runRetentionDispositions: () => fetchApi<{ archived: number; purged: number; reviewFlagged: number; skippedOnLegalHold: number }>(
      '/admin/retention/run', { method: 'POST' }),

    // Approval workflow actions (FR-25)
    getPendingApprovals: () => fetchApi<any[]>('/admin/approvals/pending'),
    decideApproval: (workflowId: string, stepId: string, decision: string, comments?: string) =>
      fetchApi<any>(`/admin/approvals/${workflowId}/steps/${stepId}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision, comments }),
      }),
  },

  // Knowledge Transfer
  knowledgeTransfer: {
    listCases: (params?: { employeeId?: string; managerId?: string; successorId?: string; departmentId?: string; status?: string; search?: string; page?: number; size?: number; sort?: string }) => {
      const q = new URLSearchParams();
      if (params?.employeeId) q.set('employeeId', params.employeeId);
      if (params?.managerId) q.set('managerId', params.managerId);
      if (params?.successorId) q.set('successorId', params.successorId);
      if (params?.departmentId) q.set('departmentId', params.departmentId);
      if (params?.status && params.status !== 'ALL') q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.page !== undefined) q.set('page', String(params.page));
      if (params?.size !== undefined) q.set('size', String(params.size));
      if (params?.sort) q.set('sort', params.sort);
      return fetchApi<any>(`/knowledge-transfer/cases?${q.toString()}`);
    },
    createCase: (payload: { title: string; employeeId: string; reasonType: string; priority?: string; notes?: string; startDate?: string; expectedCompletionDate?: string; managerId?: string; hrRepId?: string; successorId?: string; departmentId?: string }) =>
      fetchApi<any>('/knowledge-transfer/cases', { method: 'POST', body: JSON.stringify(payload) }),
    getCase: (id: string) => fetchApi<any>(`/knowledge-transfer/cases/${id}`),
    updateCase: (id: string, payload: Record<string, any>) =>
      fetchApi<any>(`/knowledge-transfer/cases/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    assignSuccessor: (caseId: string, successorId: string) =>
      fetchApi<any>(`/knowledge-transfer/cases/${caseId}/successor`, { method: 'POST', body: JSON.stringify({ successorId }) }),
    getPlan: (caseId: string) => fetchApi<any>(`/knowledge-transfer/cases/${caseId}/plan`),
    savePlan: (caseId: string, payload: Record<string, any>) =>
      fetchApi<any>(`/knowledge-transfer/cases/${caseId}/plan`, { method: 'PUT', body: JSON.stringify(payload) }),
    getChecklist: (caseId: string) => fetchApi<any[]>(`/knowledge-transfer/cases/${caseId}/checklist`),
    addChecklistItem: (caseId: string, payload: { itemName: string; category?: string; status?: string; notes?: string; assignedToId?: string }) =>
      fetchApi<any>(`/knowledge-transfer/cases/${caseId}/checklist`, { method: 'POST', body: JSON.stringify(payload) }),
    updateChecklistItem: (itemId: string, payload: { itemName?: string; status?: string; notes?: string; category?: string; assignedToId?: string }) =>
      fetchApi<any>(`/knowledge-transfer/checklist/${itemId}`, { method: 'PUT', body: JSON.stringify(payload) }),
    listSubmissions: (caseId: string) => fetchApi<any[]>(`/knowledge-transfer/cases/${caseId}/submissions`),
    submitKnowledge: (caseId: string, payload: { title: string; content: string; category?: string; documentId?: string }) =>
      fetchApi<any>(`/knowledge-transfer/cases/${caseId}/submissions`, { method: 'POST', body: JSON.stringify(payload) }),
    validateKnowledge: (submissionId: string, payload: { status: string; reviewComments?: string }) =>
      fetchApi<any>(`/knowledge-transfer/submissions/${submissionId}/validate`, { method: 'PUT', body: JSON.stringify(payload) }),
    listSessions: (caseId: string) => fetchApi<any[]>(`/knowledge-transfer/cases/${caseId}/sessions`),
    scheduleSession: (caseId: string, payload: { title: string; scheduledAt: string; locationOrLink?: string; meetingNotes?: string; attendeeIds?: string[]; recordingDocumentId?: string }) =>
      fetchApi<any>(`/knowledge-transfer/cases/${caseId}/sessions`, { method: 'POST', body: JSON.stringify(payload) }),
    updateSession: (sessionId: string, payload: Record<string, any>) =>
      fetchApi<any>(`/knowledge-transfer/sessions/${sessionId}`, { method: 'PUT', body: JSON.stringify(payload) }),
    getClearance: (caseId: string) => fetchApi<any>(`/knowledge-transfer/cases/${caseId}/clearance`),
    completeTransfer: (caseId: string, payload?: { notes?: string }) =>
      fetchApi<any>(`/knowledge-transfer/cases/${caseId}/complete`, { method: 'POST', body: JSON.stringify(payload || {}) }),
  },

  // HR / Employee Management
  hr: {
    listEmployees: (params?: { query?: string; departmentId?: string; status?: string; managerId?: string; page?: number; size?: number; sort?: string }) => {
      const q = new URLSearchParams();
      if (params?.query) q.set('query', params.query);
      if (params?.departmentId) q.set('departmentId', params.departmentId);
      if (params?.status && params.status !== 'ALL') q.set('status', params.status);
      if (params?.managerId) q.set('managerId', params.managerId);
      if (params?.page !== undefined) q.set('page', String(params.page));
      if (params?.size !== undefined) q.set('size', String(params.size));
      if (params?.sort) q.set('sort', params.sort);
      return fetchApi<any>(`/hr/employees?${q.toString()}`);
    },
    getEmployee: (id: string) => fetchApi<any>(`/hr/employees/${id}`),
    updateEmployee: (id: string, payload: Record<string, any>) =>
      fetchApi<any>(`/hr/employees/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    getEmployeeKnowledge: (id: string) => fetchApi<any>(`/hr/employees/${id}/knowledge`),
  },

  // Notifications
  notifications: {
    list: (params?: { unreadOnly?: boolean; page?: number; size?: number }) => {
      const q = new URLSearchParams();
      if (params?.unreadOnly !== undefined) q.set('unreadOnly', String(params.unreadOnly));
      if (params?.page !== undefined) q.set('page', String(params.page));
      if (params?.size !== undefined) q.set('size', String(params.size));
      return fetchApi<{
        content: Array<{
          id: string;
          title: string;
          message: string;
          isRead: boolean;
          readAt?: string;
          createdAt: string;
          eventType?: string;
          targetType?: string;
          targetId?: string;
          actionUrl?: string;
        }>;
        totalElements: number;
        totalPages: number;
      }>(`/notifications?${q.toString()}`);
    },
    getUnreadCount: () =>
      fetchApi<{ unreadCount: number }>('/notifications/unread-count').then(
        (data: any) => ({ unreadCount: typeof data === 'number' ? data : (data?.unreadCount ?? data?.count ?? 0) })
      ),
    markRead: (id: string) => fetchApi<void>(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => fetchApi<void>('/notifications/read-all', { method: 'PUT' }),
  },

  // Blogs
  blogs: {
    getPublished: (page = 0, size = 10, search?: string, category?: string) => {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      return fetchApi<any>(`/blogs?${params.toString()}`);
    },
    getMyBlogs: (page = 0, size = 10) =>
      fetchApi<any>(`/blogs/my-blogs?page=${page}&size=${size}`),
    getById: (id: string) => fetchApi<any>(`/blogs/${id}`),
    create: (data: { title: string; content: string; category?: string; coverImageUrl?: string; status?: string }) =>
      fetchApi<any>('/blogs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { title?: string; content?: string; category?: string; coverImageUrl?: string; status?: string }) =>
      fetchApi<any>(`/blogs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/blogs/${id}`, { method: 'DELETE' }),
    togglePublish: (id: string) => fetchApi<any>(`/blogs/${id}/publish`, { method: 'PUT' }),
    uploadCoverImage: async (file: File) => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/blogs/cover-image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }
      const data = await res.json();
      const imageUrl = data.url || data.mediaUrl || '';
      return { mediaUrl: imageUrl, url: imageUrl };
    },
  },

  // Discussions
  discussions: {
    getTopics: (page = 0, size = 10, search?: string, status?: string) => {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      return fetchApi<any>(`/discussions?${params.toString()}`);
    },
    getTopicDetail: (id: string) => fetchApi<any>(`/discussions/${id}`),
    createTopic: (data: { title: string; description: string }) =>
      fetchApi<any>('/discussions', { method: 'POST', body: JSON.stringify(data) }),
    addReply: (topicId: string, data: { content: string; parentReplyId?: string }) =>
      fetchApi<any>(`/discussions/${topicId}/replies`, { method: 'POST', body: JSON.stringify(data) }),
    setStatus: (topicId: string, status: 'OPEN' | 'CLOSED') =>
      fetchApi<any>(`/discussions/${topicId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    deleteTopic: (topicId: string) => fetchApi<void>(`/discussions/${topicId}`, { method: 'DELETE' }),
    deleteReply: (topicId: string, replyId: string) => fetchApi<void>(`/discussions/${topicId}/replies/${replyId}`, { method: 'DELETE' }),
  },
};

