import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, XCircle, Loader2, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { FRAUD_API_BASE_URL } from "@/const";

export default function VerifyGuardian() {
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [status, setStatus] = useState<"entry" | "pending" | "accepted" | "rejected" | "error">("entry");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchInvite = async (targetToken: string) => {
    setLoading(true);
    setStatus("pending");
    setErrorMsg("");
    try {
      const response = await fetch(`${FRAUD_API_BASE_URL}/api/guardian/verify?token=${targetToken}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Invalid or expired invitation code.");
      }
      const data = await response.json();
      setInviteData(data);
      
      if (data.status === "ACCEPTED") setStatus("accepted");
      else if (data.status === "REJECTED") setStatus("rejected");
      else setStatus("pending"); // Show the details and Accept button
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "ACCEPT" | "REJECT") => {
    setProcessing(true);
    try {
      const response = await fetch(`${FRAUD_API_BASE_URL}/api/guardian/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: manualCode,
          action,
          guardian_name: inviteData?.guardian_name
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to process request.");
      }

      setStatus(action === "ACCEPT" ? "accepted" : "rejected");
      toast.success(action === "ACCEPT" ? "Guardian access granted!" : "Invitation declined.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Checking your code...</p>
      </div>
    );
  }

  // Success State
  if (status === "accepted") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md border-green-200 shadow-2xl animate-in zoom-in-95 duration-300">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-green-700">Link Successful!</CardTitle>
            <CardDescription className="text-lg">
              You are now a guardian for <strong>{inviteData?.sender_name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground py-6">
            <p>You will receive real-time fraud alerts via email if suspicious activity is detected.</p>
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100 flex items-start gap-3 text-left">
              <Shield className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">Your protection is now active. You can close this window at any time.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Declined State
  if (status === "rejected") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md border-slate-200 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-slate-500" />
            </div>
            <CardTitle className="text-2xl text-slate-700">Invitation Declined</CardTitle>
            <CardDescription>
              You have declined the request from <strong>{inviteData?.sender_name}</strong>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Pending State (Review invitation)
  if (status === "pending" && inviteData) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          <Card className="w-full max-w-lg border-none shadow-2xl overflow-hidden">
            <div className="h-2 bg-primary" />
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-3xl font-bold text-slate-800">Guardian Invitation</CardTitle>
              <CardDescription className="text-lg mt-2">
                <strong>{inviteData.sender_name}</strong> wants you to be their guardian
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 px-8 py-4">
              <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 space-y-3">
                <h4 className="font-bold text-amber-900 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> What is a Guardian?
                </h4>
                <p className="text-sm text-amber-800 leading-relaxed">
                  As a guardian, you'll receive instant alerts if {inviteData.sender_name} is targeted by a scam. 
                  You can help them review suspicious payments and provide a second layer of security for their account.
                </p>
              </div>
            </CardContent>
    
            <CardFooter className="flex flex-col gap-3 px-8 pb-10 pt-4">
              <Button 
                className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" 
                onClick={() => handleAction("ACCEPT")}
                disabled={processing}
              >
                {processing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Accept Invitation"}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full h-12 text-slate-500 hover:text-destructive hover:bg-destructive/5" 
                onClick={() => handleAction("REJECT")}
                disabled={processing}
              >
                Decline request
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
  }

  // Initial Entry or Error Screen
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md border-slate-200 shadow-xl overflow-hidden">
        <div className="h-2 bg-primary" />
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
          <CardDescription>
            {errorMsg ? <span className="text-destructive font-medium">{errorMsg}</span> : "Enter the 6-digit code from your invitation email."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="text"
            maxLength={6}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full h-16 text-center text-4xl font-bold tracking-[12px] border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0 outline-none transition-all"
          />
          <Button 
            className="w-full h-12 text-lg font-bold" 
            onClick={() => fetchInvite(manualCode)}
            disabled={manualCode.length !== 6}
          >
            Verify Invitation
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center border-t bg-slate-50 py-4">
          <p className="text-xs text-slate-400">Can't find the code? Check your spam folder.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
