'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Info, Loader2, Mail, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { kmsApi } from '@/src/lib/api';

const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
const REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'kms-realm';
const CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'kms-frontend-client';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Forced Password Change modal states
  const [showForcedModal, setShowForcedModal] = useState(false);
  const [forcedUsername, setForcedUsername] = useState('');
  const [forcedCurrentPassword, setForcedCurrentPassword] = useState('');
  const [forcedNewPassword, setForcedNewPassword] = useState('');
  const [forcedConfirmPassword, setForcedConfirmPassword] = useState('');
  const [forcedLoading, setForcedLoading] = useState(false);
  const [forcedSuccess, setForcedSuccess] = useState<string | null>(null);
  const [forcedError, setForcedError] = useState<string | null>(null);

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const loginRes = await kmsApi.auth.login(username.trim(), password);

      if (loginRes.status === 'UPDATE_PASSWORD_REQUIRED') {
        setForcedUsername(username.trim());
        setForcedCurrentPassword(password);
        setForcedNewPassword('');
        setForcedConfirmPassword('');
        setForcedError(null);
        setForcedSuccess(null);
        setShowForcedModal(true);
        setIsLoading(false);
        return;
      }

      if (!loginRes.access_token) {
        throw new Error('Authentication failed. No access token received.');
      }

      const accessToken: string = loginRes.access_token;
      sessionStorage.setItem('kms_access_token', accessToken);
      if (loginRes.refresh_token) {
        sessionStorage.setItem('kms_refresh_token', loginRes.refresh_token);
      }
      document.cookie = 'kms_auth_present=true; path=/; samesite=lax';

      let redirectPath = '/library';
      try {
        const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          const roles: string[] = profile.roles || profile.realmRoles || [];
          if (
            roles.includes('ROLE_ADMIN') ||
            roles.includes('ROLE_SYSTEM_ADMINISTRATOR') ||
            roles.includes('SYSTEM_ADMINISTRATOR')
          ) {
            redirectPath = '/admin';
          }
        }
      } catch {
        // Default library redirect
      }

      window.location.href = redirectPath;
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      const message = rawMsg.replace(/^API Error \[\d+\]:\s*/, '');
      setErrorMessage(message);
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your username or registered email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await kmsApi.auth.forgotPassword(forgotIdentifier.trim());
      setForgotSuccess(res.message || 'Password reset email sent! Check your inbox.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send password reset email.';
      setForgotError(msg.replace(/^API Error \[\d+\]:\s*/, ''));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForcedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForcedError(null);
    setForcedSuccess(null);

    if (forcedNewPassword.length < 8) {
      setForcedError('New password must be at least 8 characters long.');
      return;
    }
    if (forcedNewPassword !== forcedConfirmPassword) {
      setForcedError('New password and confirmation do not match.');
      return;
    }
    if (forcedNewPassword === forcedCurrentPassword) {
      setForcedError('New password must be different from current password.');
      return;
    }

    setForcedLoading(true);
    try {
      const res = await kmsApi.auth.forcedPasswordChange({
        username: forcedUsername.trim(),
        currentPassword: forcedCurrentPassword,
        newPassword: forcedNewPassword,
        confirmPassword: forcedConfirmPassword,
      });

      setForcedSuccess('Password changed successfully! Signing in...');

      let accessToken = res.access_token;
      let refreshToken = res.refresh_token;

      // Fallback: If token was not in the change response, authenticate directly with the new password
      if (!accessToken) {
        const loginRes = await kmsApi.auth.login(forcedUsername.trim(), forcedNewPassword);
        accessToken = loginRes.access_token;
        refreshToken = loginRes.refresh_token;
      }

      if (accessToken) {
        sessionStorage.setItem('kms_access_token', accessToken);
        if (refreshToken) {
          sessionStorage.setItem('kms_refresh_token', refreshToken);
        }
        document.cookie = 'kms_auth_present=true; path=/; samesite=lax';

        let redirectPath = '/library';
        try {
          const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            const roles: string[] = profile.roles || profile.realmRoles || [];
            if (
              roles.includes('ROLE_ADMIN') ||
              roles.includes('ROLE_SYSTEM_ADMINISTRATOR') ||
              roles.includes('SYSTEM_ADMINISTRATOR')
            ) {
              redirectPath = '/admin';
            }
          }
        } catch {
          // Default library redirect
        }

        setTimeout(() => {
          setShowForcedModal(false);
          window.location.href = redirectPath;
        }, 500);
        return;
      }

      // If somehow no token, update inputs and close modal so user can sign in manually
      setUsername(forcedUsername.trim());
      setPassword(forcedNewPassword);
      setShowForcedModal(false);
      setErrorMessage('Password updated successfully. Please click Sign In.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password.';
      setForcedError(msg.replace(/^API Error \[\d+\]:\s*/, ''));
    } finally {
      setForcedLoading(false);
    }
  };

  const handleSsoRedirect = () => {
    setIsLoading(true);
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    const ssoUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20profile%20email`;
    window.location.href = ssoUrl;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-800">
      {/* Top Security Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-700" />
          <span>INSA Official System — Authorized Access Only</span>
        </div>
        <div className="text-slate-400 text-[11px] font-mono hidden md:block">
          Security Level: High (Keycloak OAuth 2.0 / OIDC)
        </div>
      </div>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center p-4 my-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header Branding */}
          <div className="p-8 bg-white border-b border-slate-100 text-center">
            <img
              src="/images/insalogo.png"
              alt="INSA"
              className="h-14 w-auto mx-auto mb-4 object-contain"
            />
            <h1 className="text-2xl font-black text-blue-900 tracking-tight">INSA KMS</h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
              INSA Knowledge Management System
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Welcome back</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sign in to continue</p>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-5">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleDirectSubmit} className="space-y-4">
              <Input
                label="Username / Email"
                type="text"
                placeholder="username or user@insa.gov.et"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white pr-10 text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-600"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotSuccess(null);
                    setForgotError(null);
                    setForgotIdentifier(username || '');
                  }}
                  className="text-xs text-blue-700 hover:text-blue-900 font-medium focus:outline-none hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-bold text-sm justify-center bg-blue-700 hover:bg-blue-800 text-white shadow-sm py-3 rounded-lg transition-colors"
                disabled={isLoading}
                icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {isLoading ? 'Signing in...' : 'SIGN IN'}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium tracking-wide">─ OR ─</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* SSO Button (opens Keycloak login page) */}
            <div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full font-semibold text-xs justify-center border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-900 py-3 rounded-lg transition-colors bg-white"
                onClick={handleSsoRedirect}
                disabled={isLoading}
                icon={
                  isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4 text-blue-700" />
                  )
                }
              >
                Sign in with INSA SSO
              </Button>
            </div>

            {/* Security Note */}
            <div className="pt-2 text-center text-[11px] text-slate-400 space-y-0.5">
              <div className="font-semibold text-slate-500">Secure authentication</div>
              <div>Protected by INSA</div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Mail className="w-5 h-5 text-blue-700" />
                <span>Reset Password</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter your registered username or email address. Keycloak will initiate password reset and send instructions to your inbox.
              </p>

              {forgotSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>{forgotSuccess}</div>
                </div>
              )}

              {forgotError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
                  <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>{forgotError}</div>
                </div>
              )}

              {!forgotSuccess && (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <Input
                    label="Username or Email"
                    type="text"
                    placeholder="e.g. user@kms.internal or username"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    required
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowForgotModal(false)}
                      disabled={forgotLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
                      disabled={forgotLoading}
                      icon={forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                    >
                      {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </div>
                </form>
              )}

              {forgotSuccess && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
                    onClick={() => setShowForgotModal(false)}
                  >
                    Done
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Forced Password Change Modal */}
      {showForcedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-900 text-white">
              <div className="flex items-center gap-2 font-bold text-base">
                <Lock className="w-5 h-5 text-blue-300" />
                <span>Password Change Required</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForcedModal(false)}
                className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-blue-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Your account requires a mandatory password update before continuing. Please create a new password below.
              </p>

              {forcedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>{forcedSuccess}</div>
                </div>
              )}

              {forcedError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
                  <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>{forcedError}</div>
                </div>
              )}

              {!forcedSuccess && (
                <form onSubmit={handleForcedSubmit} className="space-y-4">
                  <Input
                    label="Username / Email"
                    type="text"
                    value={forcedUsername}
                    onChange={(e) => setForcedUsername(e.target.value)}
                    required
                  />

                  <Input
                    label="Current / Assigned Password"
                    type="password"
                    placeholder="••••••••••••"
                    value={forcedCurrentPassword}
                    onChange={(e) => setForcedCurrentPassword(e.target.value)}
                    required
                  />

                  <Input
                    label="New Password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={forcedNewPassword}
                    onChange={(e) => setForcedNewPassword(e.target.value)}
                    required
                  />

                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="Re-enter new password"
                    value={forcedConfirmPassword}
                    onChange={(e) => setForcedConfirmPassword(e.target.value)}
                    required
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowForcedModal(false)}
                      disabled={forcedLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
                      disabled={forcedLoading}
                      icon={forcedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                    >
                      {forcedLoading ? 'Updating Password...' : 'Update Password & Sign In'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        <div className="font-semibold text-slate-700">INSA Knowledge Management System</div>
        <div className="text-[11px] text-slate-400 mt-0.5">&copy; 2026 INSA. All Rights Reserved.</div>
      </footer>
    </div>
  );
}

