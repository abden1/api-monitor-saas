"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { getStatusBg } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

interface Incident {
  id: string;
  title: string;
  status: string;
  autoCreated: boolean;
  createdAt: string;
  resolvedAt: string | null;
  monitor: { id: string; name: string; url: string } | null;
  updates: Array<{ id: string; message: string; status: string; createdAt: string }>;
  _count: { updates: number };
}

const STATUS_LABELS: Record<string, string> = {
  INVESTIGATING: "Investigating",
  IDENTIFIED: "Identified",
  MONITORING: "Monitoring",
  RESOLVED: "Resolved",
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("active");
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "INVESTIGATING",
    message: "",
  });

  async function loadIncidents() {
    setLoading(true);
    const url = filter === "active"
      ? "/api/incidents?status=INVESTIGATING&status=IDENTIFIED&status=MONITORING"
      : "/api/incidents";
    const res = await fetch("/api/incidents" + (filter === "active" ? "" : "?limit=50"));
    const data = await res.json();
    setIncidents(data.incidents || []);
    setLoading(false);
  }

  useEffect(() => { loadIncidents(); }, [filter]);

  async function createIncident(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setCreating(false);
    if (res.ok) {
      setShowCreate(false);
      setForm({ title: "", description: "", status: "INVESTIGATING", message: "" });
      loadIncidents();
    }
  }

  const activeIncidents = incidents.filter(i => i.status !== "RESOLVED");
  const resolvedIncidents = incidents.filter(i => i.status === "RESOLVED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incidents</h1>
          <p className="text-muted-foreground">{activeIncidents.length} active incident{activeIncidents.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <button
              className={`px-3 py-2 text-sm ${filter === "active" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              onClick={() => setFilter("active")}
            >
              Active
            </button>
            <button
              className={`px-3 py-2 text-sm ${filter === "all" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Incident
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : incidents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No incidents</h3>
            <p className="text-muted-foreground text-sm">All systems are operational.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <Card key={incident.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                    incident.status === "RESOLVED" ? "text-green-500" : "text-red-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/incidents/${incident.id}`}
                      className="font-semibold hover:text-primary transition-colors"
                    >
                      {incident.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge className={getStatusBg(incident.status)} variant="outline">
                        {STATUS_LABELS[incident.status] || incident.status}
                      </Badge>
                      {incident.autoCreated && (
                        <Badge variant="outline" className="text-xs">Auto</Badge>
                      )}
                      {incident.monitor && (
                        <span className="text-xs text-muted-foreground">
                          Monitor: {incident.monitor.name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                      </span>
                      {incident.resolvedAt && (
                        <span className="text-xs text-green-600">
                          Resolved {formatDistanceToNow(new Date(incident.resolvedAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0">
                    {incident._count.updates} update{incident._count.updates !== 1 ? "s" : ""}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Incident Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Incident</DialogTitle>
          </DialogHeader>
          <form onSubmit={createIncident} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Database connection issues"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                  <SelectItem value="IDENTIFIED">Identified</SelectItem>
                  <SelectItem value="MONITORING">Monitoring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Update Message</Label>
              <Textarea
                placeholder="We are currently investigating..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Incident
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
