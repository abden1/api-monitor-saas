"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Activity, Pause, Play, Trash2, Settings,
  ChevronRight, AlertTriangle, RefreshCw, Loader2
} from "lucide-react";
import { getStatusBg, getStatusDot, formatResponseTime } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Monitor {
  id: string;
  name: string;
  url: string;
  type: string;
  status: string;
  isActive: boolean;
  interval: number;
  lastCheckedAt: string | null;
  _count: { incidents: number };
}

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    url: "",
    type: "HTTP",
    method: "GET",
    expectedStatus: 200,
    timeout: 30000,
    interval: 60,
  });

  async function loadMonitors() {
    setLoading(true);
    const res = await fetch("/api/monitors");
    const data = await res.json();
    setMonitors(data.monitors || []);
    setLoading(false);
  }

  useEffect(() => { loadMonitors(); }, []);

  async function createMonitor(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    const res = await fetch("/api/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setError(data.error || "Failed to create monitor");
      return;
    }

    setShowCreate(false);
    setForm({ name: "", url: "", type: "HTTP", method: "GET", expectedStatus: 200, timeout: 30000, interval: 60 });
    loadMonitors();
  }

  async function togglePause(id: string) {
    await fetch(`/api/monitors/${id}/pause`, { method: "POST" });
    loadMonitors();
  }

  async function deleteMonitor(id: string) {
    if (!confirm("Are you sure you want to delete this monitor?")) return;
    await fetch(`/api/monitors/${id}`, { method: "DELETE" });
    loadMonitors();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitors</h1>
          <p className="text-muted-foreground">{monitors.length} monitor{monitors.length !== 1 ? "s" : ""} configured</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadMonitors}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Monitor
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : monitors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No monitors yet</h3>
            <p className="text-muted-foreground text-sm mb-6 text-center max-w-sm">
              Create your first monitor to start tracking uptime and response times.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first monitor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {monitors.map((monitor) => (
            <Card key={monitor.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`h-3 w-3 rounded-full flex-shrink-0 ${getStatusDot(monitor.status)} ${monitor.status === "DOWN" ? "animate-pulse" : ""}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/monitors/${monitor.id}`} className="font-semibold hover:text-primary transition-colors">
                        {monitor.name}
                      </Link>
                      <Badge variant="outline" className="text-xs font-normal">{monitor.type}</Badge>
                      {monitor._count.incidents > 0 && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {monitor._count.incidents} incident{monitor._count.incidents !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{monitor.url}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden md:block">
                      <Badge className={getStatusBg(monitor.status)} variant="outline">
                        {monitor.status}
                      </Badge>
                      {monitor.lastCheckedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(monitor.lastCheckedAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePause(monitor.id)}
                        title={monitor.isActive ? "Pause" : "Resume"}
                      >
                        {monitor.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/monitors/${monitor.id}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMonitor(monitor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Monitor Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Monitor</DialogTitle>
          </DialogHeader>
          <form onSubmit={createMonitor} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Monitor Name</Label>
                <Input
                  placeholder="My API"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>URL</Label>
                <Input
                  placeholder="https://api.example.com/health"
                  value={form.url}
                  onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HTTP">HTTP/HTTPS</SelectItem>
                    <SelectItem value="PING">Ping</SelectItem>
                    <SelectItem value="PORT">TCP Port</SelectItem>
                    <SelectItem value="DNS">DNS</SelectItem>
                    <SelectItem value="SSL">SSL Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={form.method} onValueChange={(v) => setForm(f => ({ ...f, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["GET", "POST", "PUT", "DELETE", "HEAD"].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expected Status Code</Label>
                <Input
                  type="number"
                  value={form.expectedStatus}
                  onChange={(e) => setForm(f => ({ ...f, expectedStatus: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Check Interval (seconds)</Label>
                <Select
                  value={String(form.interval)}
                  onValueChange={(v) => setForm(f => ({ ...f, interval: parseInt(v) }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="900">15 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Monitor
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
