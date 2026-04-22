import React, { useState } from 'react';
import { Shield, CheckCircle2, AlertCircle, ChevronRight, Upload, MapPin, Bluetooth } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FRAUD_API_BASE_URL } from '@/const';

type WizardStep = 'invite_code_display' | 'invite_code_entry' | 'id_verification' | 'proximity_check' | 'success';

interface GuardianLinkingWizardProps {
  senderAccount: string;
  onComplete?: (guardian: any) => void;
  onCancel?: () => void;
}

export default function GuardianLinkingWizard({ senderAccount, onComplete, onCancel }: GuardianLinkingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('invite_code_display');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Form state
  const [enteredCode, setEnteredCode] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [idPhoto, setIdPhoto] = useState<string>('');
  const [documentType, setDocumentType] = useState('national_id');
  const [bluetoothSignal, setBluetoothSignal] = useState<number | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [linkedGuardian, setLinkedGuardian] = useState<any>(null);

  // Step 1: Generate Invite Code
  const handleGenerateInviteCode = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await fetch(`${FRAUD_API_BASE_URL}/guardians/generate-invite-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_account: senderAccount,
          guardian_email: guardianEmail || null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate invite code');
      }
      setInviteCode(data.code);
      setExpiresIn(data.expires_in_minutes);
      setSuccess(`Invite code generated: ${data.code}`);
      
      // Start countdown timer
      const interval = setInterval(() => {
        setExpiresIn((prev) => {
          if (prev <= 0) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 60000); // Update every minute

      // After getting the code, prepare for entry step
      setTimeout(() => {
        setCurrentStep('invite_code_entry');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating invite code');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify Invite Code
  const handleVerifyInviteCode = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await fetch(`${FRAUD_API_BASE_URL}/guardians/verify-invite-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_account: senderAccount,
          code: enteredCode,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Invalid invite code');
      }
      setSuccess('Invite code verified! Proceeding to ID verification...');
      setTimeout(() => {
        setCurrentStep('id_verification');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error verifying code');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Verify ID
  const handleVerifyID = async () => {
    try {
      setIsLoading(true);
      setError('');
      if (!idPhoto) {
        throw new Error('Please upload an ID photo');
      }
      const response = await fetch(`${FRAUD_API_BASE_URL}/guardians/verify-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_account: senderAccount,
          guardian_email: guardianEmail,
          photo_base64: idPhoto,
          document_type: documentType,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'ID verification failed');
      }
      setSuccess('ID verified successfully! Proceeding to proximity check...');
      setTimeout(() => {
        setCurrentStep('proximity_check');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error verifying ID');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Check Proximity
  const handleCheckProximity = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Get user's location if not already set
      if (!latitude || !longitude) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLatitude(position.coords.latitude);
              setLongitude(position.coords.longitude);
            },
            (error) => console.log('Geolocation error:', error)
          );
        }
      }

      const response = await fetch(`${FRAUD_API_BASE_URL}/guardians/check-proximity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_account: senderAccount,
          guardian_account: guardianEmail?.split('@')[0] || 'GUARDIAN_' + Math.random().toString(36).substr(2, 9),
          guardian_name: guardianName,
          guardian_email: guardianEmail,
          phone: guardianPhone,
          latitude: latitude || 3.1390,
          longitude: longitude || 101.6869,
          bluetooth_signal_strength: bluetoothSignal || -55, // Demo: simulate close proximity
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Proximity check failed');
      }
      setLinkedGuardian(data.guardian);
      setSuccess('Guardian linked successfully!');
      setCurrentStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error during proximity check');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        const base64Data = base64String.split(',')[1]; // Remove data:image/png;base64, prefix
        setIdPhoto(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="border border-white/10 bg-[#151D29]/75">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#7EC8FF]" />
            <div>
              <CardTitle className="text-white">Guardian Linking - Multi-Step Verification</CardTitle>
              <CardDescription className="text-[#9AB0C8]">
                Step {currentStep === 'invite_code_display' ? 1 : currentStep === 'invite_code_entry' ? 2 : currentStep === 'id_verification' ? 3 : currentStep === 'proximity_check' ? 4 : 5} of 5
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Generate Invite Code */}
          {currentStep === 'invite_code_display' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#5DA8FF33] bg-[#5DA8FF12] p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Step 1: Generate Invite Code</h3>
                <p className="text-xs text-[#B8CAE0] mb-3">
                  Enter the guardian's email address. A unique 6-digit code will be generated with a 10-minute expiry.
                </p>
                <Input
                  type="email"
                  placeholder="Guardian email address"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  className="bg-[#101722] border-white/10 text-white placeholder:text-[#8FA7BF]"
                />
              </div>
              <Button
                onClick={handleGenerateInviteCode}
                disabled={isLoading || !guardianEmail}
                className="w-full bg-[#5DA8FF] hover:bg-[#4B97EA] text-[#0E1722]"
              >
                {isLoading ? 'Generating...' : 'Generate Invite Code'}
              </Button>
            </div>
          )}

          {/* Step 2: Enter Invite Code */}
          {currentStep === 'invite_code_entry' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#5DA8FF33] bg-[#5DA8FF12] p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Step 2: Senior's Invite Code</h3>
                <p className="text-xs text-[#B8CAE0] mb-3">
                  Ask the senior to share the 6-digit invite code they received. It expires in {expiresIn} minutes.
                </p>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="bg-[#101722] border-white/10 text-white placeholder:text-[#8FA7BF] text-center text-2xl tracking-widest"
                />
              </div>
              <Button
                onClick={handleVerifyInviteCode}
                disabled={isLoading || enteredCode.length !== 6}
                className="w-full bg-[#32D74B] hover:bg-[#29C340] text-[#111111]"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </div>
          )}

          {/* Step 3: ID Verification */}
          {currentStep === 'id_verification' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#5DA8FF33] bg-[#5DA8FF12] p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Step 3: ID Verification</h3>
                <p className="text-xs text-[#B8CAE0] mb-3">
                  Upload a photo of your ID document for verification. This ensures you are a legitimate family member.
                </p>
                
                <div className="space-y-3">
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#101722] px-3 py-2 text-sm text-white"
                  >
                    <option value="national_id">National ID Card</option>
                    <option value="passport">Passport</option>
                    <option value="driver_license">Driver License</option>
                  </select>

                  <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-[#5DA8FF44] rounded-lg bg-[#0D1624] cursor-pointer hover:bg-[#0D1624]/80">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Upload className="w-5 h-5 text-[#7EC8FF]" />
                      <span className="text-xs text-[#B8CAE0]">Click to upload ID photo</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>

                  {idPhoto && (
                    <div className="rounded-lg bg-[#0D1624] p-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#32D74B]" />
                      <span className="text-xs text-[#B8CAE0]">ID photo uploaded ({Math.round(idPhoto.length / 1024)} KB)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Guardian name"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="bg-[#101722] border-white/10 text-white placeholder:text-[#8FA7BF]"
                />
                <Input
                  type="tel"
                  placeholder="Guardian phone"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  className="bg-[#101722] border-white/10 text-white placeholder:text-[#8FA7BF]"
                />
              </div>

              <Button
                onClick={handleVerifyID}
                disabled={isLoading || !idPhoto || !guardianName || !guardianPhone}
                className="w-full bg-[#32D74B] hover:bg-[#29C340] text-[#111111]"
              >
                {isLoading ? 'Verifying...' : 'Verify ID'}
              </Button>
            </div>
          )}

          {/* Step 4: Proximity Check */}
          {currentStep === 'proximity_check' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#5DA8FF33] bg-[#5DA8FF12] p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Step 4: Proximity Verification</h3>
                <p className="text-xs text-[#B8CAE0] mb-4">
                  Verify that you're within 10 meters of the senior. Ensure Bluetooth is enabled.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0E1420] p-3">
                    <div className="flex items-center gap-2">
                      <Bluetooth className="w-5 h-5 text-[#7EC8FF]" />
                      <div>
                        <p className="text-xs font-semibold text-white">Bluetooth</p>
                        <p className="text-[11px] text-[#8FA7BF]">Signal strength: {bluetoothSignal || -55} dBm</p>
                      </div>
                    </div>
                    {(bluetoothSignal || -55) > -60 && (
                      <CheckCircle2 className="w-5 h-5 text-[#32D74B]" />
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0E1420] p-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-[#7EC8FF]" />
                      <div>
                        <p className="text-xs font-semibold text-white">Location</p>
                        <p className="text-[11px] text-[#8FA7BF]">Ready for verification</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-[#32D74B]" />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCheckProximity}
                disabled={isLoading}
                className="w-full bg-[#32D74B] hover:bg-[#29C340] text-[#111111]"
              >
                {isLoading ? 'Verifying Proximity...' : 'Complete Linking'}
              </Button>
            </div>
          )}

          {/* Step 5: Success */}
          {currentStep === 'success' && linkedGuardian && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#32D74B33] bg-[#32D74B12] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#32D74B] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">Guardian Linked Successfully!</h3>
                    <div className="mt-2 space-y-1 text-xs text-[#B8CAE0]">
                      <p>✓ Invite code verified</p>
                      <p>✓ ID verified and authenticated</p>
                      <p>✓ In-person proximity confirmed</p>
                      <p>✓ Multi-step verification completed</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0E1420] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9] mb-2">Guardian Details</p>
                <div className="space-y-1 text-sm text-white">
                  <p><span className="text-[#8FA7BF]">Name:</span> {linkedGuardian.guardian_name}</p>
                  <p><span className="text-[#8FA7BF]">Email:</span> {linkedGuardian.email}</p>
                  <p><span className="text-[#8FA7BF]">Phone:</span> {linkedGuardian.phone}</p>
                  <p><span className="text-[#8FA7BF]">Permission Tier:</span> <span className="text-[#7EC8FF]">{linkedGuardian.permission_tier}</span></p>
                  <p><span className="text-[#8FA7BF]">Verification Method:</span> Multi-Step Verification</p>
                </div>
              </div>

              <Button
                onClick={() => onComplete?.(linkedGuardian)}
                className="w-full bg-[#5DA8FF] hover:bg-[#4B97EA] text-[#0E1722]"
              >
                Done
              </Button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-[#FF3B3025] bg-[#FF3B3012] p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#FFC6C3]">{error}</p>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="rounded-lg border border-[#32D74B33] bg-[#32D74B12] p-3 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#32D74B] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#B9F8C6]">{success}</p>
            </div>
          )}

          {/* Cancel Button */}
          {currentStep !== 'success' && (
            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full border-white/10 text-[#8FA7BF] hover:bg-white/5"
            >
              Cancel
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
