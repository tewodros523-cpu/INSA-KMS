'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Modal } from '@/src/components/ui/Modal';
import { Table } from '@/src/components/ui/Table';
import { LoadingState } from '@/src/components/ui/States';
import { Badge } from '@/src/components/ui/Badge';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import {
  Users,
  Search,
  Filter,
  Pencil,
  GitPullRequestArrow,
  UserCheck,
  Building,
  Briefcase,
  Phone,
  Mail,
  ShieldCheck,
  ArrowRight,
  UserX,
  Clock,
  Plus
} from 'lucide-react';

interface Employee {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  employmentStatus: string;
  employeeNumber?: string;
  hireDate?: string;
  roleName: string;
  isActive: boolean;
  department?: { id: string; name: string; code: string };
  manager?: { id: string; username: string; fullName: string; email: string };
}

export default function HrEmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('');

  // Edit HR Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [formFullName, setFormFullName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [formDeptId, setFormDeptId] = useState('');
  const [formManagerId, setFormManagerId] = useState('');
  const [formEmpNumber, setFormEmpNumber] = useState('');
  const [formHireDate, setFormHireDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Quick Initiate Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferEmp, setTransferEmp] = useState<Employee | null>(null);
  const [transferTitle, setTransferTitle] = useState('');
  const [transferReason, setTransferReason] = useState('RESIGNATION');
  const [transferPriority, setTransferPriority] = useState('MEDIUM');
  const [transferExpectedDate, setTransferExpectedDate] = useState('');
  const [transferSuccessorId, setTransferSuccessorId] = useState('');
  const [isInitiatingTransfer, setIsInitiatingTransfer] = useState(false);

  const loadEmployees = useCallback(() => {
    setIsLoading(true);
    setError(null);
    kmsApi.hr.listEmployees({
      query: search || undefined,
      departmentId: deptFilter || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      size: 50,
      sort: 'username,asc',
    })
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.content ?? [];
        setEmployees(list);
      })
      .catch((err) => setError(err.message || 'Failed to load employees'))
      .finally(() => setIsLoading(false));
  }, [search, deptFilter, statusFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    kmsApi.departments.getActive().then(setDepartments).catch(() => {});
    kmsApi.admin.getUsers().then(setAllUsers).catch(() => {});
  }, []);

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setFormFullName(emp.fullName || '');
    setFormPhone(emp.phone || '');
    setFormJobTitle(emp.jobTitle || '');
    setFormStatus(emp.employmentStatus || 'ACTIVE');
    setFormDeptId(emp.department?.id || '');
    setFormManagerId(emp.manager?.id || '');
    setFormEmpNumber(emp.employeeNumber || '');
    setFormHireDate(emp.hireDate || '');
    setIsEditModalOpen(true);
  };

  const handleSaveHrProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    setIsSaving(true);
    setError(null);
    try {
      await kmsApi.hr.updateEmployee(editingEmp.id, {
        fullName: formFullName.trim() || undefined,
        phone: formPhone.trim() || undefined,
        jobTitle: formJobTitle.trim() || undefined,
        employmentStatus: formStatus,
        departmentId: formDeptId || '',
        managerId: formManagerId || '',
        employeeNumber: formEmpNumber.trim() || undefined,
        hireDate: formHireDate || undefined,
      });

      setNotice(`HR profile for ${editingEmp.username} updated successfully.`);
      setIsEditModalOpen(false);
      loadEmployees();
    } catch (err: any) {
      setError(err.message || 'Failed to update employee HR profile');
    } finally {
      setIsSaving(false);
    }
  };

  const openQuickTransfer = (emp: Employee) => {
    setTransferEmp(emp);
    setTransferTitle(`Knowledge Handover - ${emp.fullName || emp.username}`);
    setTransferReason('RESIGNATION');
    setTransferPriority('MEDIUM');
    setTransferExpectedDate('');
    setTransferSuccessorId('');
    setIsTransferModalOpen(true);
  };

  const handleQuickInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferEmp) return;
    setIsInitiatingTransfer(true);
    try {
      const created = await kmsApi.knowledgeTransfer.createCase({
        title: transferTitle.trim(),
        employeeId: transferEmp.id,
        reasonType: transferReason,
        priority: transferPriority,
        expectedCompletionDate: transferExpectedDate || undefined,
        successorId: transferSuccessorId || undefined,
        departmentId: transferEmp.department?.id,
        managerId: transferEmp.manager?.id,
      });

      setNotice('Knowledge Transfer Case initiated.');
      setIsTransferModalOpen(false);
      if (created?.id) {
        router.push(`/knowledge-transfer/${created.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate transfer case');
    } finally {
      setIsInitiatingTransfer(false);
    }
  };

  // Metrics
  const totalCount = employees.length;
  const activeCount = employees.filter(e => e.employmentStatus === 'ACTIVE').length;
  const leaveCount = employees.filter(e => e.employmentStatus === 'ON_LEAVE').length;
  const exitCount = employees.filter(e => e.employmentStatus === 'RESIGNED' || e.employmentStatus === 'TERMINATED' || e.employmentStatus === 'RETIRED' || e.employmentStatus === 'TRANSFERRED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge label="Active" variant="green" />;
      case 'ON_LEAVE': return <Badge label="On Leave" variant="amber" />;
      case 'TRANSFERRED': return <Badge label="Transferred" variant="blue" />;
      case 'RESIGNED': return <Badge label="Resigned" variant="red" />;
      case 'TERMINATED': return <Badge label="Terminated" variant="red" />;
      case 'RETIRED': return <Badge label="Retired" variant="slate" />;
      default: return <Badge label={status} variant="slate" />;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'HR & Employee Management' }]} />
            <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
              <Users className="w-7 h-7 text-indigo-600" />
              HR & Employee Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage organization employee directory, department assignments, job positions, employment statuses, and knowledge handovers.
            </p>
          </div>

          <Link href="/knowledge-transfer">
            <Button variant="secondary" className="flex items-center gap-2">
              <GitPullRequestArrow className="w-4 h-4 text-indigo-600" />
              View Transfer Cases
            </Button>
          </Link>
        </div>

        {/* Notices */}
        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {/* Scorecard Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">On Leave</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{leaveCount}</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Exits & Transitions</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{exitCount}</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
              <UserX className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, username, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="TRANSFERRED">Transferred</option>
                <option value="RESIGNED">Resigned</option>
                <option value="TERMINATED">Terminated</option>
                <option value="RETIRED">Retired</option>
              </select>
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12"><LoadingState message="Loading employee directory..." /></div>
          ) : employees.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-700">No employees found</h3>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search query or department filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Position / Title</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Manager</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <Link href={`/hr/employees/${emp.id}`} className="font-semibold text-gray-900 hover:text-indigo-600">
                          {emp.fullName || emp.username}
                        </Link>
                        <div className="text-xs text-gray-500 mt-0.5">
                          @{emp.username} {emp.employeeNumber ? `• ID: ${emp.employeeNumber}` : ''}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {emp.department ? (
                          <span className="font-medium text-gray-800">{emp.department.name}</span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Unassigned</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {emp.jobTitle ? (
                          <span>{emp.jobTitle}</span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Not specified</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {getStatusBadge(emp.employmentStatus)}
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {emp.manager ? (
                          <div className="text-xs font-medium text-gray-800">
                            {emp.manager.fullName || emp.manager.username}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-gray-600">
                        <div>{emp.email}</div>
                        {emp.phone && <div className="text-gray-400 mt-0.5">{emp.phone}</div>}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Edit HR Profile"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openQuickTransfer(emp)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                            title="Initiate Knowledge Transfer"
                          >
                            <GitPullRequestArrow className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/hr/employees/${emp.id}`}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="View Knowledge Profile"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit HR Profile Modal */}
      {isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit HR Profile: ${editingEmp?.username}`}
        >
          <form onSubmit={handleSaveHrProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Employee Full Name"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+251 91 123 4567"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Department</label>
                <select
                  value={formDeptId}
                  onChange={(e) => setFormDeptId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Job Position / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Lead System Architect"
                  value={formJobTitle}
                  onChange={(e) => setFormJobTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Employment Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_LEAVE">ON LEAVE</option>
                  <option value="TRANSFERRED">TRANSFERRED</option>
                  <option value="RESIGNED">RESIGNED</option>
                  <option value="TERMINATED">TERMINATED</option>
                  <option value="RETIRED">RETIRED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Direct Manager</label>
                <select
                  value={formManagerId}
                  onChange={(e) => setFormManagerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None / Executive</option>
                  {allUsers.filter(u => u.id !== editingEmp?.id).map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName || u.username} ({u.username})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Employee Number</label>
                <input
                  type="text"
                  placeholder="EMP-10024"
                  value={formEmpNumber}
                  onChange={(e) => setFormEmpNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Hire Date</label>
                <input
                  type="date"
                  value={formHireDate}
                  onChange={(e) => setFormHireDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                {isSaving ? 'Saving...' : 'Save HR Profile'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Quick Initiate Transfer Modal */}
      {isTransferModalOpen && (
        <Modal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          title={`Initiate Knowledge Transfer: ${transferEmp?.fullName || transferEmp?.username}`}
        >
          <form onSubmit={handleQuickInitiateTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Case Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={transferTitle}
                onChange={(e) => setTransferTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Reason / Event Type</label>
                <select
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="RESIGNATION">Resignation</option>
                  <option value="TRANSFER">Internal Transfer</option>
                  <option value="RETIREMENT">Retirement</option>
                  <option value="TERMINATION">Termination</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Priority</label>
                <select
                  value={transferPriority}
                  onChange={(e) => setTransferPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Successor / Knowledge Receiver</label>
                <select
                  value={transferSuccessorId}
                  onChange={(e) => setTransferSuccessorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Assign Later / None</option>
                  {allUsers.filter(u => u.id !== transferEmp?.id).map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName || u.username} ({u.username})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Expected Completion Date</label>
                <input
                  type="date"
                  value={transferExpectedDate}
                  onChange={(e) => setTransferExpectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={() => setIsTransferModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isInitiatingTransfer} className="bg-indigo-600 hover:bg-indigo-700">
                {isInitiatingTransfer ? 'Initiating...' : 'Create Case & Go to Workspace'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
