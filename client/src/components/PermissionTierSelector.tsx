import React, { useState } from 'react';
import { Eye, Users, Lock, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FRAUD_API_BASE_URL } from '@/const';

interface PermissionTierSelectorProps {
  senderAccount: string;
  guardianAccount: string;
  currentTier?: string;
  guardianName?: string;
  onTierChanged?: (newTier: string) => void;
}

type PermissionTier = 'VIEW_ONLY' | 'CO_SIGNER' | 'FULL_PROTECTOR';

const TIER_DESCRIPTIONS = {
  VIEW_ONLY: {
    label: 'View Only (Monitor)',
    description: 'Guardian can only view transaction history and risk scores',
    icon: Eye,
    color: 'text-[#8FA7BF]',
    borderColor: 'border-[#8FA7BF33]',
    bgColor: 'bg-[#8FA7BF12]',
    capabilities: [
      '✓ View transaction history',
      '✓ See risk scores',
      '✓ Receive notifications',
      '✗ Cannot block transactions',
      '✗ Cannot approve transfers',
      '✗ Cannot freeze wallet',
    ],
  },
  CO_SIGNER: {
    label: 'Co-Signer (Flagged Only)',
    description: 'Guardian is notified and must approve when risk is 45-80%',
    icon: Users,
    color: 'text-[#FFD39F]',
    borderColor: 'border-[#FF9F0A33]',
    bgColor: 'bg-[#FF9F0A12]',
    capabilities: [
      '✓ View transaction history',
      '✓ See risk scores',
      '✓ Receive notifications',
      '✓ Approve flagged transactions',
      '✗ Cannot block transactions',
      '✗ Cannot freeze wallet',
    ],
  },
  FULL_PROTECTOR: {
    label: 'Full Protector',
    description: 'Guardian has full control to block/freeze in emergencies',
    icon: Lock,
    color: 'text-[#FF3B30]',
    borderColor: 'border-[#FF3B3033]',
    bgColor: 'bg-[#FF3B3012]',
    capabilities: [
      '✓ View transaction history',
      '✓ See risk scores',
      '✓ Receive notifications',
      '✓ Approve flagged transactions',
      '✓ Block any transaction',
      '✓ Freeze wallet in emergencies',
    ],
  },
};

export default function PermissionTierSelector({
  senderAccount,
  guardianAccount,
  currentTier = 'CO_SIGNER',
  guardianName,
  onTierChanged,
}: PermissionTierSelectorProps) {
  const [selectedTier, setSelectedTier] = useState<PermissionTier>(currentTier as PermissionTier);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleSetTier = async (tier: PermissionTier) => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      const response = await fetch(
        `${FRAUD_API_BASE_URL}/guardians/${senderAccount}/${guardianAccount}/permission-tier`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permission_tier: tier }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update permission tier');
      }
      setSelectedTier(tier);
      setSuccess(`Permission tier updated to ${TIER_DESCRIPTIONS[tier].label}`);
      onTierChanged?.(tier);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating permission tier');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card className="border border-white/10 bg-[#151D29]/75">
        <CardHeader>
          <CardTitle className="text-white text-lg">Guardian Permission Tier</CardTitle>
          <CardDescription className="text-[#9AB0C8]">
            {guardianName ? `Manage permissions for ${guardianName}` : 'Select the level of control this guardian should have'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Tier Options */}
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(TIER_DESCRIPTIONS).map(([tier, tierInfo]) => {
              const IconComponent = tierInfo.icon;
              const isSelected = selectedTier === tier;

              return (
                <button
                  key={tier}
                  onClick={() => handleSetTier(tier as PermissionTier)}
                  disabled={isLoading}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? `${tierInfo.borderColor} ${tierInfo.bgColor} border-opacity-100`
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <IconComponent className={`w-5 h-5 ${tierInfo.color} mt-0.5 flex-shrink-0`} />
                      <div>
                        <h4 className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-[#B8CAE0]'}`}>
                          {tierInfo.label}
                        </h4>
                        <p className="text-xs text-[#8FA7BF] mt-1">{tierInfo.description}</p>

                        {/* Capabilities List */}
                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
                          {tierInfo.capabilities.map((cap, idx) => (
                            <span key={idx} className={`text-[11px] ${cap.startsWith('✓') ? 'text-[#32D74B]' : 'text-[#8FA7BF]'}`}>
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-[#32D74B]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Warning for FULL_PROTECTOR */}
          {selectedTier === 'FULL_PROTECTOR' && (
            <div className="rounded-lg border border-[#FF9F0A33] bg-[#FF9F0A12] p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-[#FFD39F] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#FFD6BF]">
                <p className="font-semibold mb-1">Full Protector Tier</p>
                <p>This guardian can block any transaction and freeze the wallet. Use only for highly trusted family members.</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="rounded-lg border border-[#32D74B33] bg-[#32D74B12] p-3 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#32D74B] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#B9F8C6]">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-[#FF3B3025] bg-[#FF3B3012] p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#FFC6C3]">{error}</p>
            </div>
          )}

          {/* Permission Enforcement Info */}
          <div className="rounded-lg border border-[#5DA8FF33] bg-[#5DA8FF12] p-3">
            <p className="text-xs text-[#7EC8FF] font-semibold mb-2">Permission Enforcement</p>
            <ul className="text-[11px] text-[#B8CAE0] space-y-1">
              <li>✓ Backend enforces permission tier on all transaction decisions</li>
              <li>✓ Guardian can only perform actions their tier allows</li>
              <li>✓ All guardian actions are logged and auditable</li>
              <li>✓ Senior can change tier at any time</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
