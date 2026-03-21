import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, CheckCircle2, Clock, Plus, TrendingUp } from "lucide-react";
import { getStatusBg, getStatusDot, formatResponseTime } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) redirect("/register");

  const [monitors, incidents, team] = await Promise.all([
    db.monitor.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
    }),
    db.incident.findMany({
      where: { teamId, status: { not: "RESOLVED" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { monitor: { select: { name: true } } },
    }),
    db.team.findUnique({ where: { id: teamId }, select: { plan: true, name: true } }),
  ]);

  const upCount = monitors.filter((m) => m.status === "UP").length;
  const downCount = monitors.filter((m) => m.status === "DOWN").length;
  const degradedCount = monitors.filter((m) => m.status === "DEGRADED").length;
  const overallHealth = monitors.length > 0
    ? Math.round((upCount / monitors.length) * 100)
    : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your monitoring infrastructure</p>
        </div>
        <Button asChild>
          <Link href="/monitors">
            <Plus className="h-4 w-4 mr-2" />
            Add Monitor
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Monitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{monitors.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{upCount} up, {downCount} down</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${overallHealth >= 99 ? "text-green-600" : overallHealth >= 90 ? "text-yellow-600" : "text-red-600"}`}>
              {overallHealth}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">monitors operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${incidents.length > 0 ? "text-red-600" : "text-green-600"}`}>
              {incidents.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{incidents.length === 0 ? "All clear!" : "requires attention"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold capitalize">{team?.plan?.toLowerCase() || "free"}</div>
            <Link href="/settings/billing" className="text-xs text-primary hover:underline mt-1 block">
              Upgrade plan
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monitor Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Monitor Status</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/monitors">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {monitors.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No monitors yet</p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/monitors">Create your first monitor</Link>
                </Button>
              </div>
            ) : (
              monitors.slice(0, 8).map((monitor) => (
                <Link
                  key={monitor.id}
                  href={`/monitors/${monitor.id}`}
                  className="flex items-center justify-between py-2 hover:bg-accent px-3 rounded-md -mx-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${getStatusDot(monitor.status)}`} />
                    <div>
                      <p className="text-sm font-medium">{monitor.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{monitor.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBg(monitor.status)} variant="outline">
                      {monitor.status}
                    </Badge>
                    {monitor.lastCheckedAt && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {formatDistanceToNow(monitor.lastCheckedAt, { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Active Incidents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Active Incidents</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/incidents">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidents.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active incidents</p>
                <p className="text-xs text-muted-foreground">All systems operational</p>
              </div>
            ) : (
              incidents.map((incident) => (
                <Link
                  key={incident.id}
                  href={`/incidents/${incident.id}`}
                  className="flex items-start gap-3 py-2 hover:bg-accent px-3 rounded-md -mx-3 transition-colors"
                >
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{incident.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getStatusBg(incident.status)}>
                        {incident.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(incident.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
