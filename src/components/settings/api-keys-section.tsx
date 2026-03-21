"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Key, Plus, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  plainKey?: string;
}

export function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  function loadKeys() {
    fetch("/api/api-keys")
      .then(r => r.json())
      .then(d => { setKeys(d.keys || []); setLoading(false); });
  }

  useEffect(() => { loadKeys(); }, []);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName, scopes: ["read"] }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      setNewKey(data.key.plainKey);
      setShowCreate(false);
      setNewKeyName("");
      loadKeys();
    }
  }

  async function deleteKey(id: string) {
    if (!confirm("Delete this API key?")) return;
    await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" });
    loadKeys();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          <CardTitle>API Keys</CardTitle>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Key
        </Button>
      </CardHeader>
      <CardContent>
        {newKey && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800 mb-2">
              Copy your API key now — it won't be shown again!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white p-2 rounded border border-green-200 truncate">
                {newKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { navigator.clipboard.writeText(newKey); }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-xs"
              onClick={() => setNewKey(null)}
            >
              I've saved my key
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No API keys yet. Create one to access the API programmatically.
          </p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{key.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs text-muted-foreground">{key.keyPrefix}...</code>
                    {key.scopes.map(s => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                  {key.lastUsedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last used: {format(new Date(key.lastUsedAt), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteKey(key.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
            </DialogHeader>
            <form onSubmit={createKey} className="space-y-4">
              <div className="space-y-2">
                <Label>Key Name</Label>
                <Input
                  placeholder="Production API"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Key
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
