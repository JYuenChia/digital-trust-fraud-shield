import React, { useState } from 'react';
import { Lock, Users, Fingerprint, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FRAUD_API_BASE_URL } from '@/const';

interface GuestModeSetupProps {
  userAccount: string;
  onSuccess?: () => void;
}

export default function GuestModeSetup({ userAccount, onSuccess }: GuestModeSetupProps) {
  const [step, setStep] = useState<'master_pin_setup' | 'guest_profiles' | 'success'>('master_pin_setup');
  const [masterPin, setMasterPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [guestProfiles, setGuestProfiles] = useState<any[]>([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleSetupMasterPin = async () => {
    try {
      if (masterPin !== confirmPin) {
        setError('PINs do not match');
        return;
      }
      if (masterPin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }

      setIsLoading(true);
      setError('');
      const response = await fetch(`${FRAUD_API_BASE_URL}/user/settings/lock-guardian-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_account: userAccount,
          master_pin: masterPin,
          biometric_enabled: biometricEnabled,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to setup master PIN');
      }
      setSuccess('Master PIN set successfully!');
      setTimeout(() => {
        setStep('guest_profiles');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error setting up master PIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGuestProfile = async () => {
    try {
      if (!newProfileName.trim()) {
        setError('Profile name is required');
        return;
      }

      setIsLoading(true);
      setError('');
      const response = await fetch(`${FRAUD_API_BASE_URL}/user/guest-mode/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_account: userAccount,
          profile_name: newProfileName,
          master_pin: masterPin,
          restricted_features: [
            'guardian_link',
            'wallet_pin',
            'transaction_history',
            'account_settings',
          ],
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create guest profile');
      }
      setGuestProfiles([...guestProfiles, data]);
      setNewProfileName('');
      setSuccess(`Guest profile "${data.profile_name}" created successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating guest profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    setStep('success');
    onSuccess?.();
  };

  return (
    <div className="w-full space-y-4">
      {/* Step 1: Master PIN Setup */}
      {step === 'master_pin_setup' && (
        <Card className="border border-white/10 bg-[#151D29]/75">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-6 h-6 text-[#7EC8FF]" />
              <div>
                <CardTitle className="text-white">Setup Master PIN</CardTitle>
                <CardDescription className="text-[#9AB0C8]">
                  Lock guardian settings behind a secure PIN
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border border-[#FF9F0A33] bg-[#FF9F0A12] p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-[#FFD39F] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#FFD6BF]">
                <p className="font-semibold mb-1">Shared Device Protection</p>
                <p>Use a strong Master PIN to prevent guests from accessing your guardian settings and wallet controls.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9] block mb-2">
                  Master PIN (4+ digits)
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={10}
                  value={masterPin}
                  onChange={(e) => setMasterPin(e.target.value.replace(/\D/g, ''))}
                  className="bg-[#101722] border-white/10 text-white placeholder:text-[#8FA7BF]"
                  placeholder="Enter PIN"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9] block mb-2">
                  Confirm Master PIN
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={10}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="bg-[#101722] border-white/10 text-white placeholder:text-[#8FA7BF]"
                  placeholder="Re-enter PIN"
                />
              </div>

              <label className="flex items-center gap-2 p-3 rounded-lg border border-white/10 bg-[#0E1420] cursor-pointer hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={biometricEnabled}
                  onChange={(e) => setBiometricEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-sm font-semibold text-white">Enable Biometric Authentication</p>
                  <p className="text-xs text-[#8FA7BF]">Use fingerprint or face ID for faster access</p>
                </div>
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-[#FF3B3025] bg-[#FF3B3012] p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#FFC6C3]">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-[#32D74B33] bg-[#32D74B12] p-3 flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#32D74B] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#B9F8C6]">{success}</p>
              </div>
            )}

            <Button
              onClick={handleSetupMasterPin}
              disabled={isLoading || masterPin.length < 4 || masterPin !== confirmPin}
              className="w-full bg-[#5DA8FF] hover:bg-[#4B97EA] text-[#0E1722]"
            >
              {isLoading ? 'Setting up...' : 'Setup Master PIN'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Guest Profiles */}
      {step === 'guest_profiles' && (
        <Card className="border border-white/10 bg-[#151D29]/75">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-[#7EC8FF]" />
              <div>
                <CardTitle className="text-white">Create Guest Profiles</CardTitle>
                <CardDescription className="text-[#9AB0C8]">
                  Add profiles for family members or visitors
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border border-[#5DA8FF33] bg-[#5DA8FF12] p-4">
              <p className="text-xs font-semibold text-[#7EC8FF] mb-2">Guest Profile Features</p>
              <ul className="text-[11px] text-[#B8CAE0] space-y-1">
                <li>✓ Restricted access to wallet and guardian settings</li>
                <li>✓ Cannot view sensitive account information</li>
                <li>✓ Cannot modify security settings</li>
                <li>✓ Can use basic app features only</li>
                <li>✓ Easy profile switching with Master PIN</li>
              </ul>
            </div>

            {/* Existing Guest Profiles */}
            {guestProfiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9]">Active Guest Profiles</p>
                {guestProfiles.map((profile) => (
                  <div key={profile.guest_id} className="rounded-lg border border-white/10 bg-[#0E1420] p-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#8FA7BF]" />
                      <span className="text-sm font-semibold text-white">{profile.profile_name}</span>
                      <span className="text-[10px] text-[#8FA7BF] ml-auto">ID: {profile.guest_id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create New Guest Profile */}
            <div className="space-y-3 border-t border-white/10 pt-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9]">Add New Guest Profile</p>
              <Input
                type="text"
                placeholder="Profile name (e.g., Son, Daughter, Visitor)"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="bg-[#101722] border-white/10 text-white placeholder:text-[#8FA7BF]"
              />
              <Button
                onClick={handleCreateGuestProfile}
                disabled={isLoading || !newProfileName.trim()}
                className="w-full bg-[#32D74B] hover:bg-[#29C340] text-[#111111]"
              >
                {isLoading ? 'Creating...' : 'Create Guest Profile'}
              </Button>
            </div>

            {error && (
              <div className="rounded-lg border border-[#FF3B3025] bg-[#FF3B3012] p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#FFC6C3]">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-[#32D74B33] bg-[#32D74B12] p-3 flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#32D74B] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#B9F8C6]">{success}</p>
              </div>
            )}

            <Button
              onClick={handleComplete}
              className="w-full bg-[#5DA8FF] hover:bg-[#4B97EA] text-[#0E1722]"
            >
              Setup Complete
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Success */}
      {step === 'success' && (
        <Card className="border border-[#32D74B33] bg-[#32D74B12]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-[#32D74B]" />
              <div>
                <CardTitle className="text-white">Guest Mode Configured!</CardTitle>
                <CardDescription className="text-[#9AB0C8]">
                  Your device is now protected for shared use
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="rounded-lg border border-[#32D74B33] bg-[#32D74B12] p-4">
              <ul className="text-sm text-[#B9F8C6] space-y-2">
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>✓ Master PIN configured with biometric support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>✓ {guestProfiles.length} guest profile(s) created</span>
                </li>
                <li className="flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>✓ Guardian and wallet settings locked</span>
                </li>
                <li className="flex items-start gap-2">
                  <Fingerprint className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>✓ Biometric authentication enabled</span>
                </li>
              </ul>
            </div>

            <p className="text-xs text-[#8FA7BF] p-3 rounded-lg bg-[#0E1420] border border-white/10">
              Family members can now use guest profiles with limited access. They'll need the Master PIN to access your main account.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
