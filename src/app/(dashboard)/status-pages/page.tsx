"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Plus, ExternalLink, Loader2, Settings } from "lucide-react";

interface StatusPage {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  template: string;
  customDomain: string | null;
  _count: { components: number; subscribers: number };
}

export default function StatusPagesPage() {
  const [pages, setPages] = useState<StatusPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "" });

  useEffect(() => {
    fetch("/api/status-pages")
      .then(r => r.json())
      .then(d => { setPages(d.statusPages || []); setLoading(false); });
  }, []);

  async function createPage(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/status-pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      setPages(p => [data.statusPage, ...p]);
      setShowCreate(false);
      setForm({ title: "", slug: "" });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Status Pages</h1>
          <p className="text-muted-foreground">Public status pages for your users</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Status Page
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No status pages yet</h3>
            <p className="text-muted-foreground text-sm mb-6 text-center max-w-sm">
              Create a public status page to communicate system status to your users.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Status Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {pages.map((page) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{page.title}</h3>
                    <p className="text-sm text-muted-foreground">/status/{page.slug}</p>
                  </div>
                  <Badge variant={page.isPublished ? "default" : "secondary"}>
                    {page.isPublished ? "Published" : "Draft"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span>{page._count.components} components</span>
                  <span>{page._count.subscribers} subscribers</span>
                  <span>{page.template} theme</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/status-pages/${page.id}/builder`}>
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/status/${page.slug}`} target="_blank">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Status Page</DialogTitle>
          </DialogHeader>
          <form onSubmit={createPage} className="space-y-4">
            <div className="space-y-2">
              <Label>Page Title</Label>
              <Input
                placeholder="My Company Status"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">/status/</span>
                <Input
                  placeholder="my-company"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
