"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, ExternalLink, Plus, Trash2, Loader2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Monitor {
  id: string;
  name: string;
  url: string;
  status: string;
}

interface Component {
  id?: string;
  name: string;
  monitorId: string | null;
  groupName: string;
  displayOrder: number;
  showUptime: boolean;
}

interface PageData {
  id: string;
  title: string;
  slug: string;
  description: string;
  brandColor: string;
  template: string;
  isPublished: boolean;
  customDomain: string | null;
  components: (Component & { monitor?: Monitor | null })[];
}

export default function StatusPageBuilder() {
  const params = useParams();
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [saving, setSaving] = useState(false);
  const [components, setComponents] = useState<Component[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/status-pages/${params.id}`).then(r => r.json()),
      fetch("/api/monitors").then(r => r.json()),
    ]).then(([pageData, monitorsData]) => {
      setPage(pageData.statusPage);
      setComponents(pageData.statusPage?.components || []);
      setMonitors(monitorsData.monitors || []);
    });
  }, [params.id]);

  async function save() {
    if (!page) return;
    setSaving(true);
    await fetch(`/api/status-pages/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...page, components }),
    });
    setSaving(false);
  }

  async function togglePublish() {
    if (!page) return;
    const newPublished = !page.isPublished;
    setPage(p => p ? { ...p, isPublished: newPublished } : p);
    await fetch(`/api/status-pages/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: newPublished }),
    });
  }

  function addComponent() {
    setComponents(c => [...c, {
      name: "New Component",
      monitorId: null,
      groupName: "Services",
      displayOrder: c.length,
      showUptime: true,
    }]);
  }

  function removeComponent(idx: number) {
    setComponents(c => c.filter((_, i) => i !== idx));
  }

  function updateComponent(idx: number, field: keyof Component, value: string | boolean | null) {
    setComponents(c => c.map((comp, i) => i === idx ? { ...comp, [field]: value } : comp));
  }

  if (!page) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/status-pages"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{page.title}</h1>
            <p className="text-muted-foreground text-sm">/status/{page.slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/status/${page.slug}`} target="_blank">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Link>
          </Button>
          <Button
            variant={page.isPublished ? "destructive" : "default"}
            size="sm"
            onClick={togglePublish}
          >
            {page.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Page Settings */}
        <Card>
          <CardHeader><CardTitle>Page Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Page Title</Label>
              <Input value={page.title} onChange={e => setPage(p => p ? { ...p, title: e.target.value } : p)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={page.description}
                onChange={e => setPage(p => p ? { ...p, description: e.target.value } : p)}
                placeholder="System status for..."
              />
            </div>
            <div className="space-y-2">
              <Label>Brand Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={page.brandColor}
                  onChange={e => setPage(p => p ? { ...p, brandColor: e.target.value } : p)}
                  className="h-10 w-10 rounded cursor-pointer border border-input"
                />
                <Input
                  value={page.brandColor}
                  onChange={e => setPage(p => p ? { ...p, brandColor: e.target.value } : p)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={page.template} onValueChange={v => setPage(p => p ? { ...p, template: v } : p)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIGHT">Light</SelectItem>
                  <SelectItem value="DARK">Dark</SelectItem>
                  <SelectItem value="MINIMAL">Minimal</SelectItem>
                  <SelectItem value="DETAILED">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Custom Domain</Label>
              <Input
                value={page.customDomain || ""}
                onChange={e => setPage(p => p ? { ...p, customDomain: e.target.value || null } : p)}
                placeholder="status.yourcompany.com"
              />
              <p className="text-xs text-muted-foreground">Point a CNAME to our servers to use a custom domain</p>
            </div>
          </CardContent>
        </Card>

        {/* Components */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Components</CardTitle>
            <Button size="sm" variant="outline" onClick={addComponent}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {components.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No components yet. Add components to display on your status page.
              </p>
            ) : (
              components.map((comp, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={comp.name}
                      onChange={e => updateComponent(idx, "name", e.target.value)}
                      placeholder="Component name"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeComponent(idx)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Monitor</Label>
                      <Select
                        value={comp.monitorId || "none"}
                        onValueChange={v => updateComponent(idx, "monitorId", v === "none" ? null : v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (manual)</SelectItem>
                          {monitors.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Group</Label>
                      <Input
                        value={comp.groupName}
                        onChange={e => updateComponent(idx, "groupName", e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Services"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
