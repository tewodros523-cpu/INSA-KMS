'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { LoadingState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { Settings, Save, RotateCcw, Database, Mail, Image, Video, FileText, Link2, RotateCw } from 'lucide-react';

interface SettingRow {
  settingKey: string;
  settingValue: string;
  description?: string | null;
  updatedAt: string;
}

const KEYCLOAK_KEYS = ['keycloak.server.url', 'keycloak.realm', 'keycloak.client.id'];
const REPOSITORY_KEYS = ['upload.max-file-size-mb', 'retention.default-days', 'recycle-bin.retention-days'];
const STORAGE_KEYS = ['storage.url.image', 'storage.url.video', 'storage.url.document'];

const STORAGE_PRESETS = {
  local: {
    label: 'Local Defaults',
    'storage.url.image': '/images',
    'storage.url.video': '/videos',
    'storage.url.document': '/api/v1/documents',
  },
  media_api: {
    label: 'Backend Media API',
    'storage.url.image': '/api/v1/documents/media',
    'storage.url.video': '/api/v1/documents/media',
    'storage.url.document': '/api/v1/documents',
  },
  cdn: {
    label: 'CDN Storage',
    'storage.url.image': 'https://cdn.enterprise.internal/images',
    'storage.url.video': 'https://cdn.enterprise.internal/videos',
    'storage.url.document': 'https://storage.enterprise.internal/documents',
  },
};

function isAbsoluteUrl(val: string) {
  return /^https?:\/\//i.test(val);
}

export default function AdminSystemSettingsPage() {
  const [settings, setSettings] = React.useState<SettingRow[]>([]);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [backup, setBackup] = React.useState<any>(null);
  const [testTo, setTestTo] = React.useState('');
  const [mailStatus, setMailStatus] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    kmsApi.admin.getBackupStatus().then(setBackup).catch(() => {});
    kmsApi.admin
      .getSettings()
      .then((data) => {
        const rows = data as SettingRow[];
        setSettings(rows);
        setValues(Object.fromEntries(rows.map((r) => [r.settingKey, r.settingValue])));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load system settings'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const isDirty = settings.some((s) => values[s.settingKey] !== s.settingValue);

  const applyPreset = (preset: keyof typeof STORAGE_PRESETS) => {
    const p = STORAGE_PRESETS[preset];
    setValues((prev) => ({
      ...prev,
      'storage.url.image': p['storage.url.image'],
      'storage.url.video': p['storage.url.video'],
      'storage.url.document': p['storage.url.document'],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setNotice(null);
    setError(null);
    try {
      const changed: Record<string, string> = {};
      settings.forEach((s) => {
        if (values[s.settingKey] !== s.settingValue) {
          changed[s.settingKey] = values[s.settingKey];
        }
      });
      // Also include storage keys that may not have a DB row yet but have been edited
      STORAGE_KEYS.forEach((key) => {
        if (!settings.find((s) => s.settingKey === key) && values[key] !== undefined) {
          changed[key] = values[key];
        }
      });
      if (Object.keys(changed).length === 0) {
        setNotice('No changes to save.');
        return;
      }
      const updated = await kmsApi.admin.updateSettings(changed);
      const rows = updated as SettingRow[];
      setSettings(rows);
      setValues(Object.fromEntries(rows.map((r) => [r.settingKey, r.settingValue])));
      setNotice(`${Object.keys(changed).length} setting(s) persisted successfully.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const renderGroup = (keys: string[]) => {
    const rows = settings.filter((s) => keys.includes(s.settingKey));
    const others = keys.length === 0 ? settings.filter((s) => ![...KEYCLOAK_KEYS, ...REPOSITORY_KEYS, ...STORAGE_KEYS].includes(s.settingKey)) : rows;
    return others.map((s) => (
      <Input
        key={s.settingKey}
        label={s.settingKey}
        value={values[s.settingKey] ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, [s.settingKey]: e.target.value }))}
        helperText={s.description || undefined}
      />
    ));
  };

  const uncategorised = settings.filter((s) => ![...KEYCLOAK_KEYS, ...REPOSITORY_KEYS, ...STORAGE_KEYS].includes(s.settingKey));

  const storageFields: { key: string; label: string; icon: React.ReactNode; placeholder: string }[] = [
    {
      key: 'storage.url.image',
      label: 'Image Storage URL',
      icon: <Image className="w-4 h-4 text-blue-500" />,
      placeholder: '/images  or  https://cdn.enterprise.internal/images',
    },
    {
      key: 'storage.url.video',
      label: 'Video Storage URL',
      icon: <Video className="w-4 h-4 text-violet-500" />,
      placeholder: '/videos  or  https://cdn.enterprise.internal/videos',
    },
    {
      key: 'storage.url.document',
      label: 'Document Storage URL',
      icon: <FileText className="w-4 h-4 text-emerald-500" />,
      placeholder: '/api/v1/documents  or  https://storage.enterprise.internal/docs',
    },
  ];

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5 max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'System Settings' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-700" />
              Global System Configuration & Keycloak Integration Parameters
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<RotateCcw className="w-4 h-4" />} onClick={load} disabled={isSaving}>
              Reload
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading system configuration..." />
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <Card title="Keycloak OIDC Security Connection Settings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderGroup(KEYCLOAK_KEYS)}</div>
              <div className="mt-4">
                <Input
                  label="Derived JWKS URI (read-only)"
                  value={`${values['keycloak.server.url'] ?? ''}/realms/${values['keycloak.realm'] ?? ''}/protocol/openid-connect/certs`}
                  readOnly
                />
              </div>
            </Card>

            <Card title="Repository & File System Limits">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderGroup(REPOSITORY_KEYS)}</div>
            </Card>

            {/* ── Storage & Media URL Configuration ───────────────────────── */}
            <Card title="Storage &amp; Media URL Configuration">
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Configure the base URL or server path used when storing and serving images, videos, and document files.
                Use a relative path (e.g.&nbsp;<code className="font-mono">/images</code>) for local file storage, or an
                absolute URL (e.g.&nbsp;<code className="font-mono">https://cdn.enterprise.internal/images</code>) for
                cloud/CDN storage. Changes take effect for all new uploads immediately after saving.
              </p>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2 mb-5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs font-medium text-slate-500 self-center mr-1">Quick presets:</span>
                {(Object.keys(STORAGE_PRESETS) as Array<keyof typeof STORAGE_PRESETS>).map((pk) => (
                  <button
                    key={pk}
                    type="button"
                    onClick={() => applyPreset(pk)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white hover:bg-slate-100 hover:border-slate-400 text-slate-700 transition-colors"
                  >
                    <RotateCw className="w-3 h-3" />
                    {STORAGE_PRESETS[pk].label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {storageFields.map(({ key, label, icon, placeholder }) => {
                  const currentVal = values[key] ?? settings.find((s) => s.settingKey === key)?.settingValue ?? '';
                  const isAbsolute = isAbsoluteUrl(currentVal);
                  return (
                    <div key={key} className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        {icon}
                        <span className="text-sm font-semibold text-slate-800">{label}</span>
                        <span
                          className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isAbsolute
                              ? 'bg-violet-100 text-violet-700 border border-violet-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <Link2 className="w-2.5 h-2.5" />
                          {isAbsolute ? 'Absolute URL' : 'Relative Path'}
                        </span>
                      </div>
                      <Input
                        label=""
                        value={currentVal}
                        onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        helperText={settings.find((s) => s.settingKey === key)?.description ?? undefined}
                      />
                      {/* Live sample preview */}
                      <div className="mt-2 px-3 py-2 rounded-md bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-medium text-slate-400 mb-0.5">Example resolved URL</p>
                        <p className="text-[11px] font-mono text-slate-700 break-all">
                          {currentVal
                            ? `${currentVal.replace(/\/$/, '')}/example-file${key === 'storage.url.image' ? '.png' : key === 'storage.url.video' ? '.mp4' : '.pdf'}`
                            : '— enter a URL above —'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {uncategorised.length > 0 && (
              <Card title="Additional Configuration Keys">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderGroup([])}</div>
              </Card>
            )}

            <Card title="Database Backup & Durability (NFR-06)">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-slate-500 font-medium flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-slate-400" /> Database</p>
                  <p className="font-bold text-slate-900 mt-1">{backup?.databaseName ?? '—'}</p>
                  <p className="font-mono text-[11px] text-slate-600">{backup?.databaseSizePretty ?? '—'}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{backup?.documentCount ?? 0} documents indexed</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Last Backup</p>
                  <p className="font-bold text-slate-900 mt-1 font-mono text-[11px]">
                    {(() => {
                      const raw = values['backup.last-run-at'] || backup?.lastBackupAt || '';
                      return raw ? new Date(raw).toLocaleString() : 'Never recorded';
                    })()}
                  </p>
                  <Input
                    label="Record backup timestamp"
                    type="datetime-local"
                    value={values['backup.last-run-at'] ? new Date(values['backup.last-run-at']).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, 'backup.last-run-at': e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                  />
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Location & Script</p>
                  <p className="font-mono text-[11px] text-slate-800 mt-1">{values['backup.location'] || backup?.backupLocation || './backups'}</p>
                  <p className="font-mono text-[11px] text-slate-600 mt-0.5">{backup?.backupScript ?? 'scripts/backup-database.ps1'}</p>
                  <Button variant="outline" size="sm" className="mt-2" icon={<RotateCcw className="w-4 h-4" />} onClick={load}>Refresh Status</Button>
                </div>
              </div>
            </Card>

            <Card title="Email Delivery Diagnostics (Section 7)">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <Input
                    label="Send test email to"
                    type="email"
                    placeholder="you@enterprise.internal"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    helperText="Requires KMS_SMTP_HOST environment configuration; otherwise sends are DISABLED and logged."
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Mail className="w-4 h-4" />}
                  disabled={!testTo.trim()}
                  onClick={async () => {
                    try {
                      const result = await kmsApi.admin.sendTestEmail(testTo.trim());
                      setMailStatus(`${result.status}${result.detail ? ' — ' + result.detail : ''}`);
                    } catch (err: unknown) {
                      setMailStatus(err instanceof Error ? err.message : 'Test failed');
                    }
                  }}
                >
                  Send Test
                </Button>
              </div>
              {mailStatus && (
                <p className="text-[11px] font-semibold mt-3 text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Result: {mailStatus}
                </p>
              )}
            </Card>
            <p className="text-[11px] text-kms-slate-500">
              Settings are persisted in the <span className="font-mono">system_settings</span> table and audit-logged
              under action <span className="font-mono">SETTINGS_UPDATED</span> (FR-22, FR-27).
            </p>
          </form>
        )}
      </div>
    </AppShell>
  );
}
