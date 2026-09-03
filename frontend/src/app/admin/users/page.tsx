'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { Modal } from '@/src/components/ui/Modal';
import { kmsApi } from '@/src/lib/api';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit,
  UserCheck,
  UserX,
  Trash2,
  Shield,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface UserItem {
  id: string;
  username: string;
  email: string;
  roleName?: string;
  isActive?: boolean;
  department?: { id?: string; name: string; code?: string } | null;
  keycloakSub: string;
  createdAt: string;
}

const AVAILABLE_ROLES = [
  { value: 'ROLE_ADMIN', label: 'System Administrator (ROLE_ADMIN)' },
  { value: 'ROLE_CONTENT_OWNER', label: 'Content Owner / Manager (ROLE_CONTENT_OWNER)' },
  { value: 'ROLE_CONTRIBUTOR', label: 'Contributor (ROLE_CONTRIBUTOR)' },
  { value: 'ROLE_VIEWER', label: 'Viewer (ROLE_VIEWER)' },
  { value: 'ROLE_COMPLIANCE_OFFICER', label: 'Compliance / Records Officer (ROLE_COMPLIANCE_OFFICER)' },
  { value: 'ROLE_IT_SECURITY', label: 'IT Security Administrator (ROLE_IT_SECURITY)' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form State
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('ROLE_VIEWER');
  const [formDepartmentId, setFormDepartmentId] = useState('');
  const [formTempPassword, setFormTempPassword] = useState('');
  const [formResetPassword, setFormResetPassword] = useState('');
  const [formResetTemporary, setFormResetTemporary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async (query = '') => {
    setIsLoading(true);
    try {
      const data = query
        ? await kmsApi.admin.searchUsers(query)
        : await kmsApi.admin.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      console.error('[AdminUsersPage] Error fetching users:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load user directory';
      showNotification('error', msg.replace(/^API Error \[\d+\]:\s*/, ''));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    kmsApi.departments.getActive().then((list) => {
      setDepartments(list || []);
    }).catch((err) => {
      console.error('[AdminUsersPage] Error fetching active departments:', err);
    });
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchQuery);
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername || !formEmail) {
      showNotification('error', 'Username and email are required');
      return;
    }
    if (!formDepartmentId) {
      showNotification('error', 'Department selection is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await kmsApi.admin.createUser({
        username: formUsername,
        email: formEmail,
        roleName: formRole,
        departmentId: formDepartmentId,
        temporaryPassword: formTempPassword || undefined,
      });

      showNotification('success', `User '${formUsername}' created in Keycloak and KMS`);
      setIsCreateOpen(false);
      setFormUsername('');
      setFormEmail('');
      setFormRole('ROLE_VIEWER');
      setFormDepartmentId('');
      setFormTempPassword('');
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create user';
      showNotification('error', msg.replace(/^API Error \[\d+\]:\s*/, ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit User Handler
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await kmsApi.admin.updateUser(selectedUser.id, {
        username: formUsername,
        email: formEmail,
        roleName: formRole,
        departmentId: formDepartmentId,
      });

      showNotification('success', `User '${formUsername}' updated successfully`);
      setIsEditOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user';
      showNotification('error', msg.replace(/^API Error \[\d+\]:\s*/, ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Activate / Deactivate Handler
  const toggleUserStatus = async (user: UserItem) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    try {
      if (user.isActive) {
        await kmsApi.admin.deactivateUser(user.id);
      } else {
        await kmsApi.admin.activateUser(user.id);
      }
      showNotification('success', `User '${user.username}' ${action}d successfully`);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to ${action} user`;
      showNotification('error', msg.replace(/^API Error \[\d+\]:\s*/, ''));
    }
  };

  // Soft Delete Handler
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await kmsApi.admin.deleteUser(selectedUser.id);
      showNotification('success', `User '${selectedUser.username}' deleted/decoupled successfully`);
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      showNotification('error', msg.replace(/^API Error \[\d+\]:\s*/, ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    setFormUsername(user.username);
    setFormEmail(user.email);
    setFormRole(user.roleName || 'ROLE_VIEWER');
    setFormDepartmentId(user.department?.id || '');
    setIsEditOpen(true);
  };

  const openViewModal = (user: UserItem) => {
    setSelectedUser(user);
    setIsViewOpen(true);
  };

  const openDeleteModal = (user: UserItem) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const openResetPasswordModal = (user: UserItem) => {
    setSelectedUser(user);
    setFormResetPassword('');
    setFormResetTemporary(false);
    setIsResetPasswordOpen(true);
  };

  // Reset Password Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !formResetPassword) return;

    if (formResetPassword.length < 8) {
      showNotification('error', 'New password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await kmsApi.admin.resetUserPassword(
        selectedUser.id,
        formResetPassword,
        formResetTemporary
      );
      showNotification('success', res.message || `Password reset for '${selectedUser.username}'`);
      setIsResetPasswordOpen(false);
      setFormResetPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password';
      showNotification('error', msg.replace(/^API Error \[\d+\]:\s*/, ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Username',
      accessor: (u: UserItem) => (
        <span className="font-mono font-bold text-xs text-kms-slate-900">{u.username}</span>
      ),
    },
    {
      header: 'Email Address',
      accessor: (u: UserItem) => <span className="text-xs text-kms-slate-700">{u.email}</span>,
    },
    {
      header: 'Role',
      accessor: (u: UserItem) => (
        <Badge label={u.roleName || 'ROLE_VIEWER'} variant="blue" />
      ),
    },
    {
      header: 'Department',
      accessor: (u: UserItem) => (
        <span className="text-xs text-kms-slate-700 font-medium">
          {u.department ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-kms-slate-100 text-kms-slate-800 border border-kms-slate-200">
              {u.department.name}
            </span>
          ) : (
            <span className="text-kms-slate-400 italic">No department</span>
          )}
        </span>
      ),
    },
    {
      header: 'Keycloak Sub',
      accessor: (u: UserItem) => (
        <span className="font-mono text-[11px] text-blue-700 font-semibold">{u.keycloakSub}</span>
      ),
    },
    {
      header: 'Status',
      accessor: (u: UserItem) => (
        <Badge
          label={u.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
          variant={u.isActive !== false ? 'green' : 'red'}
        />
      ),
    },
    {
      header: 'Actions',
      accessor: (u: UserItem) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => openViewModal(u)}
            title="View User Details"
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<Edit className="w-3.5 h-3.5 text-blue-600" />}
            onClick={() => openEditModal(u)}
            title="Edit User & Roles"
          />
          <Button
            size="sm"
            variant="ghost"
            icon={
              u.isActive !== false ? (
                <UserX className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              )
            }
            onClick={() => toggleUserStatus(u)}
            title={u.isActive !== false ? 'Deactivate User' : 'Activate User'}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<KeyRound className="w-3.5 h-3.5 text-violet-600" />}
            onClick={() => openResetPasswordModal(u)}
            title="Reset Password"
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
            onClick={() => openDeleteModal(u)}
            title="Delete User"
          />
        </div>
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`p-3 rounded-md text-xs font-medium flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-red-50 border border-red-200 text-red-900'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Users & Directory' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-700" />
              Users & Keycloak Identity Directory
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => fetchUsers(searchQuery)}
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh Directory
            </Button>
            <Button
              onClick={() => {
                setFormUsername('');
                setFormEmail('');
                setFormRole('ROLE_VIEWER');
                setIsCreateOpen(true);
              }}
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
            >
              Create New User
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3.5 flex items-center gap-3 text-xs text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            Keycloak Realm <strong>kms-realm</strong> is authoritative for authentication. Accounts map to PostgreSQL via <code>keycloak_sub</code>. All CRUD actions generate immutable audit log records.
          </span>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-kms-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users by username or email address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-kms-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" variant="primary" size="sm">
            Search Directory
          </Button>
        </form>

        {/* Directory Table */}
        <Table
          columns={columns}
          data={users}
          keyExtractor={(item) => item.id}
          emptyText={isLoading ? 'Loading active directory users...' : 'No matching users found.'}
        />
      </div>

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Directory User"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Username *</label>
            <input
              type="text"
              required
              placeholder="e.g. john.doe"
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-kms-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              placeholder="e.g. john.doe@enterprise.internal"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-kms-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Assigned Role *</label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-kms-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Department *</label>
            <select
              value={formDepartmentId}
              onChange={(e) => setFormDepartmentId(e.target.value)}
              required
              className="w-full px-3 py-1.5 text-xs border border-kms-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a department...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Temporary Password</label>
            <input
              type="text"
              placeholder="min. 8 characters — user must change at first login"
              value={formTempPassword}
              onChange={(e) => setFormTempPassword(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-kms-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p className="text-[11px] text-kms-slate-500 mt-1">
              The account is provisioned in the Keycloak realm so the user can actually sign in (FR-18). Leave blank to
              create the account without credentials and set the password later.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-kms-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW USER MODAL */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="User Identity Profile Details"
      >
        {selectedUser && (
          <div className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-kms-slate-50 p-3 rounded-md border border-kms-slate-200">
              <div>
                <span className="font-semibold text-kms-slate-500 block">User ID</span>
                <span className="font-mono text-kms-slate-900">{selectedUser.id}</span>
              </div>
              <div>
                <span className="font-semibold text-kms-slate-500 block">Username</span>
                <span className="font-mono font-bold text-blue-700">{selectedUser.username}</span>
              </div>
              <div>
                <span className="font-semibold text-kms-slate-500 block">Email Address</span>
                <span className="text-kms-slate-900">{selectedUser.email}</span>
              </div>
              <div>
                <span className="font-semibold text-kms-slate-500 block">Status</span>
                <Badge
                  label={selectedUser.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                  variant={selectedUser.isActive !== false ? 'green' : 'red'}
                />
              </div>
              <div>
                <span className="font-semibold text-kms-slate-500 block">Role</span>
                <Badge label={selectedUser.roleName || 'ROLE_VIEWER'} variant="blue" />
              </div>
              <div>
                <span className="font-semibold text-kms-slate-500 block">Department</span>
                <span className="font-semibold text-kms-slate-800">
                  {selectedUser.department ? selectedUser.department.name : 'None'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-kms-slate-500 block">Keycloak Subject</span>
                <span className="font-mono text-kms-slate-700 text-[11px]">{selectedUser.keycloakSub}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-kms-slate-200">
              <Button variant="outline" size="sm" onClick={() => setIsViewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit User Metadata & Roles"
      >
        <form onSubmit={handleEditUser} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Username *</label>
            <input
              type="text"
              required
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-kms-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-kms-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Assigned Role *</label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-kms-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Department</label>
            <select
              value={formDepartmentId}
              onChange={(e) => setFormDepartmentId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-kms-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a department...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-kms-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE USER CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm User Soft-Delete & Identity Decoupling"
      >
        {selectedUser && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-900">
              <p className="font-semibold mb-1">Warning: User Deactivation & Decoupling</p>
              <p>
                Deactivating user <strong>{selectedUser.username}</strong> ({selectedUser.email}) will set <code>is_active = false</code> and prevent authentication. Document ownership and version history will be safely preserved.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-kms-slate-200">
              <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Soft Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isResetPasswordOpen}
        onClose={() => setIsResetPasswordOpen(false)}
        title="Reset User Password (Keycloak)"
      >
        <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
          {selectedUser && (
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-md text-violet-900 text-xs">
              <p className="font-semibold mb-1">Reset password for: {selectedUser.username}</p>
              <p>This will update the Keycloak credential for <strong>{selectedUser.email}</strong>.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-kms-slate-700 mb-1">New Password *</label>
            <input
              type="text"
              required
              minLength={8}
              placeholder="min. 8 characters"
              value={formResetPassword}
              onChange={(e) => setFormResetPassword(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-kms-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="reset-temporary"
              checked={formResetTemporary}
              onChange={(e) => setFormResetTemporary(e.target.checked)}
              className="w-4 h-4 rounded border-kms-slate-300"
            />
            <label htmlFor="reset-temporary" className="text-xs text-kms-slate-700 font-medium">
              Temporary — user must change at next login
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-kms-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsResetPasswordOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
