"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, TestTube, Bell, Loader2, Mail, MessageSquare, Webhook } from "lucide-react";

interface AlertChannel {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-4 w-4" />,
  SMS: <MessageSquare className="h-4 w-4" />,
  SLACK: <span className="text-xs font-bold">S</span>,
  DISCORD: <span className="text-xs font-bold">D</span>,
  PAGERDUTY: <span className="text-xs font-bold">PD</span>,
  OPSGENIE: <span className="text-xs font-bold">OG</span>,
  WEBHOOK: <Webhook className="h-4 w-4" />,
};

export default function AlertsPage() {
  const [channels, setChannels] = useState<AlertChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "EMAIL",
    name: "",
    config: {} as Record<string, string>,
  });

  function loadChannels() {
    fetch("/api/alerts/channels")
      .then(r => r.json())
      .then(d => { setChannels(d.channels || []); setLoading(false); });
  }

  useEffect(() => { loadChannels(); }, []);

  async function createChannel(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/alerts/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setCreating(false);
    if (res.ok) {
      setShowCreate(false);
      setForm({ type: "EMAIL", name: "", config: {} });
      loadChannels();
    }
  }

  async function testChannel(channelId: string) {
    setTesting(channelId);
    const res = await fetch("/api/alerts/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    });
    const data = await res.json();
    setTesting(null);
    alert(res.ok ? "Test alert sent successfully!" : `Error: ${data.error}`);
  }

  async function deleteChannel(id: string) {
    if (!confirm("Delete this alert channel?")) return;
    await fetch(`/api/alerts/channels/${id}`, { method: "DELETE" });
    loadChannels();
  }

  function getConfigFields(type: string) {
    switch (type) {
      case "EMAIL": return [{ key: "to", label: "Email Address", placeholder: "alerts@company.com" }];
      case "SMS": return [{ key: "to", label: "Phone Number", placeholder: "+1234567890" }];
      case "SLACK": return [{ key: "webhookUrl", label: "Webhook URL", placeholder: "https://hooks.slack.com/..." }];
      case "DISCORD": return [{ key: "webhookUrl", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/..." }];
      case "PAGERDUTY": return [{ key: "integrationKey", label: "Integration Key", placeholder: "Events API v2 key" }];
      case "OPSGENIE": return [{ key: "apiKey", label: "API Key", placeholder: "OpsGenie API key" }];
      case "WEBHOOK": return [
        { key: "url", label: "Webhook URL", placeholder: "https://your-webhook.com/endpoint" },
        { key: "secret", label: "Secret (optional)", placeholder: "HMAC signature secret" },
      ];
      default: return [];
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alert Channels</h1>
          <p className="text-muted-foreground">Configure where to send notifications</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Channel
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : channels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No alert channels</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Add channels to receive notifications when monitors go down.
            </p>
            <Button onClick={() => setShowCreate(true)}>Add your first channel</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {channels.map((channel) => (
            <Card key={channel.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {CHANNEL_ICONS[channel.type]}
                    </div>
                    <div>
                      <p className="font-medium">{channel.name}</p>
                      <p className="text-sm text-muted-foreground">{channel.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={channel.enabled ? "default" : "secondary"}>
                      {channel.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testChannel(channel.id)}
                    disabled={testing === channel.id}
                  >
                    {testing === channel.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    Test
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteChannel(channel.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Channel Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Alert Channel</DialogTitle>
          </DialogHeader>
          <form onSubmit={createChannel} className="space-y-4">
            <div className="space-y-2">
              <Label>Channel Type</Label>
              <Select
                value={form.type}
                onValueChange={v => setForm(f => ({ ...f, type: v, config: {} }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">SMS (Twilio)</SelectItem>
                  <SelectItem value="SLACK">Slack</SelectItem>
                  <SelectItem value="DISCORD">Discord</SelectItem>
                  <SelectItem value="PAGERDUTY">PagerDuty</SelectItem>
                  <SelectItem value="OPSGENIE">Opsgenie</SelectItem>
                  <SelectItem value="WEBHOOK">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel Name</Label>
              <Input
                placeholder="My Slack Channel"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            {getConfigFields(form.type).map(field => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  placeholder={field.placeholder}
                  value={(form.config[field.key] as string) || ""}
                  onChange={e => setForm(f => ({
                    ...f,
                    config: { ...f.config, [field.key]: e.target.value }
                  }))}
                  required={field.key !== "secret"}
                />
              </div>
            ))}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Channel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
