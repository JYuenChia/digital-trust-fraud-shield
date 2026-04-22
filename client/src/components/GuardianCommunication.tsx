import React, { useState } from 'react';
import { Mic, Store, Trash2, Plus, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FRAUD_API_BASE_URL } from '@/const';

interface GuardianCommunicationProps {
  guardianAccount: string;
  senderAccount: string;
  guardianName?: string;
}

export default function GuardianCommunication({
  guardianAccount,
  senderAccount,
  guardianName = 'Guardian',
}: GuardianCommunicationProps) {
  const [tab, setTab] = useState<'voice' | 'merchants'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('');
  const [messageUrl, setMessageUrl] = useState('');
  const [trustedMerchants, setTrustedMerchants] = useState<any[]>([]);
  const [newMerchantId, setNewMerchantId] = useState('');
  const [newMerchantName, setNewMerchantName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Voice Message Handlers
  const handleRecordVoiceMessage = async () => {
    try {
      setIsLoading(true);
      setError('');
      if (!voiceMessage && !messageUrl) {
        throw new Error('Please provide a message or voice file');
      }

      const response = await fetch(
        `${FRAUD_API_BASE_URL}/guardians/${guardianAccount}/voice-message/record`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_account: senderAccount,
            message_text: voiceMessage,
            message_url: messageUrl,
            triggered_by: 'TRANSACTION_BLOCKED',
          }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to record voice message');
      }
      setSuccess('Voice message recorded! Will be played when blocking transactions.');
      setVoiceMessage('');
      setMessageUrl('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error recording message');
    } finally {
      setIsLoading(false);
    }
  };

  // Trusted Merchant Handlers
  const handleAddTrustedMerchant = async () => {
    try {
      setIsLoading(true);
      setError('');
      if (!newMerchantId || !newMerchantName) {
        throw new Error('Please enter merchant ID and name');
      }

      const response = await fetch(
        `${FRAUD_API_BASE_URL}/guardians/${guardianAccount}/trusted-recipients/add`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchant_id: newMerchantId,
            merchant_name: newMerchantName,
            sender_account: senderAccount,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to add merchant');
      }
      setTrustedMerchants([
        ...trustedMerchants,
        {
          merchant_id: newMerchantId,
          merchant_name: newMerchantName,
        },
      ]);
      setNewMerchantId('');
      setNewMerchantName('');
      setSuccess(`"${newMerchantName}" added to trusted merchants!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding merchant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTrustedMerchant = async (merchantId: string) => {
    try {
      setIsLoading(true);
      setError('');
      const response = await fetch(
        `${FRAUD_API_BASE_URL}/guardians/${guardianAccount}/trusted-recipients/${merchantId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to remove merchant');
      }
      setTrustedMerchants(trustedMerchants.filter((m) => m.merchant_id !== merchantId));
      setSuccess(`Merchant removed from trusted list`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing merchant');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card className="border border-white/10 bg-[#151D29]/75">
        <CardHeader>
          <CardTitle className="text-white text-lg">Guardian Communication Center</CardTitle>
          <CardDescription className="text-[#9AB0C8]">
            Record voice warnings and manage trusted merchants for {guardianName}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10">
            <button
              onClick={() => setTab('voice')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                tab === 'voice'
                  ? 'text-white border-[#5DA8FF]'
                  : 'text-[#8FA7BF] border-transparent hover:text-white'
              }`}
            >
              <Mic className="w-4 h-4 inline mr-2" />
              Voice Messages
            </button>
            <button
              onClick={() => setTab('merchants')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                tab === 'merchants'
                  ? 'text-white border-[#5DA8FF]'
                  : 'text-[#8FA7BF] border-transparent hover:text-white'
              }`}
            >
              <Store className="w-4 h-4 inline mr-2" />
              Trusted Merchants
            </button>
          </div>

          {/* Voice Messages Tab */}
          {tab === 'voice' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#5DA8FF33] bg-[#5DA8FF12] p-4">
                <h4 className="text-sm font-semibold text-white mb-2">Record Voice Warning</h4>
                <p className="text-xs text-[#B8CAE0] mb-3">
                  When you block a transaction, the senior will hear your voice message. This builds trust better than a generic system alert.
                </p>
                <p className="text-[11px] text-[#8FA7BF] italic">
                  Example: "Hey Dad, I blocked this because it looks like a scam. Let's talk first."
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9] block mb-2">
                    Message Text
                  </label>
                  <textarea
                    value={voiceMessage}
                    onChange={(e) => setVoiceMessage(e.target.value)}
                    placeholder="What would you like to say when blocking a transaction?"
                    rows={4}
                    className="w-full rounded-lg border border-white/10 bg-[#101722] px-3 py-2 text-sm text-white placeholder:text-[#8FA7BF] resize-none"
                  />
                </div>

                <div className="rounded-lg border border-[#FF9F0A33] bg-[#FF9F0A12] p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-[#FFD39F] flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[#FFD6BF]">
                    <p className="font-semibold mb-1">Natural & Personal</p>
                    <p>Keep it friendly and conversational. This helps the senior understand your concerns better.</p>
                  </div>
                </div>

                <Button
                  onClick={handleRecordVoiceMessage}
                  disabled={isLoading || !voiceMessage}
                  className="w-full bg-[#5DA8FF] hover:bg-[#4B97EA] text-[#0E1722]"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Record Voice Message
                    </>
                  )}
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
            </div>
          )}

          {/* Trusted Merchants Tab */}
          {tab === 'merchants' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#5DA8FF33] bg-[#5DA8FF12] p-4">
                <h4 className="text-sm font-semibold text-white mb-2">Guardian Vouched Merchants</h4>
                <p className="text-xs text-[#B8CAE0] mb-3">
                  Add merchants you trust. Once approved, future transactions to these merchants will have reduced friction for the senior user.
                </p>
                <p className="text-[11px] text-[#8FA7BF] italic">
                  Example: "FreshMart", "Local Clinic", etc.
                </p>
              </div>

              {/* Existing Trusted Merchants */}
              {trustedMerchants.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9]">
                    Trusted Merchants ({trustedMerchants.length})
                  </p>
                  {trustedMerchants.map((merchant) => (
                    <div key={merchant.merchant_id} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0E1420] p-3">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#7EC8FF]" />
                        <div>
                          <p className="text-sm font-semibold text-white">{merchant.merchant_name}</p>
                          <p className="text-[11px] text-[#8FA7BF]">{merchant.merchant_id}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRemoveTrustedMerchant(merchant.merchant_id)}
                        disabled={isLoading}
                        size="sm"
                        variant="ghost"
                        className="text-[#FF3B30] hover:bg-[#FF3B3012]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Merchant */}
              <div className="space-y-3 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9]">Add New Merchant</p>
                <Input
                  type="text"
                  placeholder="Merchant ID (e.g., M12345)"
                  value={newMerchantId}
                  onChange={(e) => setNewMerchantId(e.target.value)}
                  className="bg-[#101722] border-white/10 text-white placeholder:text-[#8FA7BF]"
                />
                <Input
                  type="text"
                  placeholder="Merchant Name (e.g., FreshMart Pop-up)"
                  value={newMerchantName}
                  onChange={(e) => setNewMerchantName(e.target.value)}
                  className="bg-[#101722] border-white/10 text-white placeholder:text-[#8FA7BF]"
                />
                <Button
                  onClick={handleAddTrustedMerchant}
                  disabled={isLoading || !newMerchantId || !newMerchantName}
                  className="w-full bg-[#32D74B] hover:bg-[#29C340] text-[#111111]"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Trusted List
                    </>
                  )}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
