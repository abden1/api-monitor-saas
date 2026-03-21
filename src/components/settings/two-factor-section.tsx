"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2 } from "lucide-react";

interface Props {
  enabled: boolean;
}

export function TwoFactorSection({ enabled: initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function setupTotp() {
    setLoading(true);
    const res = await fetch("/api/user/2fa");
    const data = await res.json();
    setLoading(false);
    if (res.ok) setQrCode(data.qrCode);
  }

  async function verifyAndEnable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/user/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "enable" }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setEnabled(true);
      setQrCode(null);
      setToken("");
      setMessage("2FA enabled successfully");
    } else {
      setMessage(data.error || "Invalid token");
    }
  }

  async function disable() {
    if (!token) return;
    setLoading(true);
    const res = await fetch("/api/user/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "disable" }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setEnabled(false);
      setToken("");
      setMessage("2FA disabled");
    } else {
      setMessage(data.error || "Invalid token");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Two-Factor Authentication</CardTitle>
        </div>
        <Badge variant={enabled ? "default" : "secondary"}>
          {enabled ? "Enabled" : "Disabled"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {!enabled && !qrCode && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Add an extra layer of security to your account using an authenticator app.
            </p>
            <Button onClick={setupTotp} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set up 2FA
            </Button>
          </div>
        )}

        {qrCode && (
          <form onSubmit={verifyAndEnable} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app, then enter the code below.
            </p>
            <img src={qrCode} alt="2FA QR Code" className="border rounded-lg w-48 h-48" />
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input
                placeholder="000000"
                value={token}
                onChange={e => setToken(e.target.value)}
                maxLength={6}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enable 2FA
              </Button>
              <Button type="button" variant="outline" onClick={() => setQrCode(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {enabled && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              2FA is enabled. Enter your current code to disable it.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="000000"
                value={token}
                onChange={e => setToken(e.target.value)}
                maxLength={6}
                className="w-32"
              />
              <Button variant="destructive" onClick={disable} disabled={loading || !token}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Disable 2FA
              </Button>
            </div>
          </div>
        )}

        {message && (
          <p className={`text-sm ${message.includes("success") || message.includes("enabled") ? "text-green-600" : "text-destructive"}`}>
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
