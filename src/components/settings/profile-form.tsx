"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface Props {
  user: { id: string; name: string | null; email: string; timezone: string };
}

export function ProfileForm({ user }: Props) {
  const [name, setName] = useState(user.name || "");
  const [timezone, setTimezone] = useState(user.timezone || "UTC");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        timezone,
        ...(newPassword && { currentPassword, newPassword }),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessage("Profile updated successfully");
      setCurrentPassword("");
      setNewPassword("");
    } else {
      setMessage(data.error || "Failed to update profile");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="UTC" />
          </div>
          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium">Change Password</p>
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} />
            </div>
          </div>
          {message && (
            <p className={`text-sm ${message.includes("success") ? "text-green-600" : "text-destructive"}`}>
              {message}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
