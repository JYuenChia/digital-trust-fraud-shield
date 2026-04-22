import React, { useState } from 'react';
import { FileText, Send, Download, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FRAUD_API_BASE_URL } from '@/const';

interface ForensicReportViewProps {
  guardianAccount: string;
  senderAccount: string;
  transactionHash?: string;
  recipientAccount?: string;
  recipientName?: string;
  amount?: number;
  currency?: string;
  mlReasonCode?: string;
  riskScore?: number;
  onReportGenerated?: (report: any) => void;
}

type AuthorityChannel = 'mcmc' | 'google_safe_browsing' | 'pdrm';

const AUTHORITIES = {
  mcmc: {
    name: 'MCMC',
    fullName: 'Malaysian Communications and Multimedia Commission',
    description: 'Report to MCMC for telecommunications fraud',
    icon: '🛡️',
  },
  google_safe_browsing: {
    name: 'Google Safe Browsing',
    fullName: 'Google Safe Browsing Database',
    description: 'Add malicious URL to Google\'s blocklist',
    icon: '🚫',
  },
  pdrm: {
    name: 'PDRM SemakMule',
    fullName: 'Royal Malaysia Police (SemakMule Platform)',
    description: 'File police report for investigation',
    icon: '👮',
  },
};

export default function ForensicReportView({
  guardianAccount,
  senderAccount,
  transactionHash = 'TXN-ABC123DEF456',
  recipientAccount = 'SCAMMER_001',
  recipientName = 'Unknown Recipient',
  amount = 5000,
  currency = 'MYR',
  mlReasonCode = 'qr_phishing_pattern_89',
  riskScore = 0.87,
  onReportGenerated,
}: ForensicReportViewProps) {
  const [report, setReport] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [submittedChannels, setSubmittedChannels] = useState<Set<AuthorityChannel>>(new Set());
  const [fraudDescription, setFraudDescription] = useState('');

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      setError('');
      const response = await fetch(
        `${FRAUD_API_BASE_URL}/guardians/${guardianAccount}/forensic-report/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_account: senderAccount,
            transaction_hash: transactionHash,
            recipient_account: recipientAccount,
            recipient_name: recipientName,
            amount: amount,
            currency: currency,
            merchant_id: recipientAccount.startsWith('M') ? recipientAccount : null,
            ip_address: '203.0.113.45',
            device_info: 'iPhone iOS 17.3.1',
            ml_reason_code: mlReasonCode,
            risk_score: riskScore,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate report');
      }
      setReport(data.report);
      setSuccess('Forensic report generated successfully!');
      onReportGenerated?.(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitToAuthority = async (channel: AuthorityChannel) => {
    try {
      setIsSubmitting(channel);
      setError('');
      const endpoint =
        channel === 'mcmc'
          ? 'submit-report/mcmc'
          : channel === 'google_safe_browsing'
            ? 'submit-report/google-safe-browsing'
            : 'submit-report/pdrm';

      const response = await fetch(`${FRAUD_API_BASE_URL}/guardians/${guardianAccount}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: report?.report_id,
          sender_account: senderAccount,
          fraud_description: fraudDescription || `Scam via ${recipientName}`,
          amount: amount,
          recipient_account: recipientAccount,
          url_or_qr: `qr:${transactionHash}`,
          threat_type: 'PHISHING',
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit report');
      }

      setSubmittedChannels(new Set([...submittedChannels, channel]));
      setSuccess(`Report submitted to ${AUTHORITIES[channel].name} successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error submitting report');
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleDownloadPDF = () => {
    // In production, generate actual PDF
    const pdfContent = JSON.stringify(report, null, 2);
    const blob = new Blob([pdfContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forensic-report-${report?.report_id}.json`;
    a.click();
  };

  return (
    <div className="w-full space-y-4">
      {/* Generate Report Card */}
      <Card className="border border-white/10 bg-[#151D29]/75">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#FF3B30]" />
            <div>
              <CardTitle className="text-white">Forensic Report Generator</CardTitle>
              <CardDescription className="text-[#9AB0C8]">
                Generate AI-powered evidence report with transaction details, IP logs, and ML analysis
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!report ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-[#0E1420] p-4 space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9] block mb-2">
                    Fraud Description
                  </label>
                  <textarea
                    value={fraudDescription}
                    onChange={(e) => setFraudDescription(e.target.value)}
                    placeholder="Describe what happened and how you identified this as fraud..."
                    rows={4}
                    className="w-full rounded-lg border border-white/10 bg-[#101722] px-3 py-2 text-sm text-white placeholder:text-[#8FA7BF] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-white/10 bg-[#0E1420] p-3">
                    <p className="text-[11px] text-[#8FA7BF]">Transaction Hash</p>
                    <p className="text-white font-mono text-xs mt-1">{transactionHash}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-[#0E1420] p-3">
                    <p className="text-[11px] text-[#8FA7BF]">Risk Score</p>
                    <p className="text-white font-semibold mt-1">{Math.round(riskScore * 100)}%</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-[#0E1420] p-3">
                    <p className="text-[11px] text-[#8FA7BF]">Amount</p>
                    <p className="text-white font-semibold mt-1">{currency} {amount.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-[#0E1420] p-3">
                    <p className="text-[11px] text-[#8FA7BF]">Recipient</p>
                    <p className="text-white font-mono text-xs mt-1">{recipientAccount}</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="w-full bg-[#FF3B30] hover:bg-[#E6352B] text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Forensic Report
                  </>
                )}
              </Button>
            </div>
          ) : (
            // Report Generated View
            <div className="space-y-4">
              <div className="rounded-lg border border-[#32D74B33] bg-[#32D74B12] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#32D74B] flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white text-sm">Report Generated</h4>
                    <p className="text-[11px] text-[#B8CAE0] mt-1">Report ID: {report.report_id}</p>
                  </div>
                </div>
              </div>

              {/* Report Details */}
              <div className="rounded-lg border border-white/10 bg-[#0E1420] p-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9] mb-2">Transaction</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p className="text-[#8FA7BF]">Hash: <span className="text-white font-mono">{report.transaction.hash}</span></p>
                    <p className="text-[#8FA7BF]">Amount: <span className="text-white">{report.transaction.currency} {report.transaction.amount}</span></p>
                    <p className="text-[#8FA7BF]">Recipient: <span className="text-white font-mono text-[10px]">{report.transaction.recipient_account}</span></p>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9] mb-2">ML Analysis</p>
                  <div className="space-y-1 text-xs">
                    <p className="text-[#8FA7BF]">Reason Code: <span className="text-white">{report.ml_analysis.reason_code}</span></p>
                    <p className="text-[#8FA7BF]">Risk Score: <span className="text-white font-semibold">{Math.round(report.ml_analysis.risk_score * 100)}%</span></p>
                    <p className="text-[#8FA7BF]">Confidence: <span className="text-white">{Math.round(report.ml_analysis.confidence * 100)}%</span></p>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9] mb-2">Fraud Patterns Detected</p>
                  <ul className="text-[11px] text-[#B8CAE0] space-y-1">
                    {report.ml_analysis.fraud_patterns_detected.map((pattern: string, idx: number) => (
                      <li key={idx}>• {pattern}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Export Options */}
              <div className="flex gap-2">
                <Button
                  onClick={handleDownloadPDF}
                  variant="outline"
                  className="flex-1 border-white/10 text-[#8FA7BF] hover:bg-white/5"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download as JSON
                </Button>
                <Button
                  onClick={() => setReport(null)}
                  variant="outline"
                  className="flex-1 border-white/10 text-[#8FA7BF] hover:bg-white/5"
                >
                  Generate New
                </Button>
              </div>
            </div>
          )}

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
        </CardContent>
      </Card>

      {/* Submit to Authorities */}
      {report && (
        <Card className="border border-white/10 bg-[#151D29]/75">
          <CardHeader>
            <CardTitle className="text-white text-lg">Submit Report to Authorities</CardTitle>
            <CardDescription className="text-[#9AB0C8]">
              Send forensic report to relevant authorities for investigation
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {Object.entries(AUTHORITIES).map(([channel, authority]) => (
              <button
                key={channel}
                onClick={() => handleSubmitToAuthority(channel as AuthorityChannel)}
                disabled={isSubmitting !== null || submittedChannels.has(channel as AuthorityChannel)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  submittedChannels.has(channel as AuthorityChannel)
                    ? 'border-[#32D74B33] bg-[#32D74B12]'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{authority.icon}</span>
                    <div>
                      <h4 className={`font-semibold text-sm ${submittedChannels.has(channel as AuthorityChannel) ? 'text-[#32D74B]' : 'text-white'}`}>
                        {authority.fullName}
                      </h4>
                      <p className="text-xs text-[#8FA7BF] mt-1">{authority.description}</p>
                    </div>
                  </div>
                  {submittedChannels.has(channel as AuthorityChannel) ? (
                    <CheckCircle2 className="w-5 h-5 text-[#32D74B] flex-shrink-0 mt-1" />
                  ) : (
                    <Send className="w-5 h-5 text-[#8FA7BF] flex-shrink-0 mt-1" />
                  )}
                </div>

                {!submittedChannels.has(channel as AuthorityChannel) && (
                  <Button
                    onClick={() => handleSubmitToAuthority(channel as AuthorityChannel)}
                    disabled={isSubmitting !== null}
                    size="sm"
                    className="mt-2 w-full bg-[#5DA8FF] hover:bg-[#4B97EA] text-[#0E1722]"
                  >
                    {isSubmitting === channel ? (
                      <>
                        <Loader className="w-3 h-3 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 mr-2" />
                        Submit Report
                      </>
                    )}
                  </Button>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
