import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { format, subDays } from "date-fns";
import { CheckCircle2, AlertCircle, AlertTriangle, Clock } from "lucide-react";
import { SubscribeForm } from "@/components/status-page/subscribe-form";

export const revalidate = 60;

interface Props {
  params: { slug: string };
}

function StatusDot({ status }: { status: string | null }) {
  if (status === "UP") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (status === "DOWN") return <AlertCircle className="h-5 w-5 text-red-500" />;
  if (status === "DEGRADED") return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  return <Clock className="h-5 w-5 text-gray-400" />;
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "UP") return <span className="text-sm font-medium text-green-600">Operational</span>;
  if (status === "DOWN") return <span className="text-sm font-medium text-red-600">Down</span>;
  if (status === "DEGRADED") return <span className="text-sm font-medium text-yellow-600">Degraded</span>;
  return <span className="text-sm font-medium text-gray-500">No data</span>;
}

function UptimeBar({ days }: { days: { date: Date; uptimePercent: number }[] }) {
  const today = new Date();
  const bars = Array.from({ length: 90 }, (_, i) => {
    const date = subDays(today, 89 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const found = days.find((d) => format(d.date, "yyyy-MM-dd") === dateStr);
    return { date, uptime: found?.uptimePercent ?? null };
  });

  return (
    <div className="flex gap-px h-8 items-end">
      {bars.map((bar, i) => {
        let bg = "bg-gray-200";
        if (bar.uptime !== null) {
          if (bar.uptime >= 99) bg = "bg-green-500";
          else if (bar.uptime >= 90) bg = "bg-yellow-400";
          else bg = "bg-red-500";
        }
        return (
          <div
            key={i}
            title={`${format(bar.date, "MMM d")}: ${bar.uptime !== null ? `${bar.uptime.toFixed(1)}%` : "No data"}`}
            className={`flex-1 rounded-sm ${bg}`}
            style={{ height: `${bar.uptime !== null ? Math.max(20, bar.uptime) : 20}%` }}
          />
        );
      })}
    </div>
  );
}

export default async function StatusPagePublic({ params }: Props) {
  const statusPage = await db.statusPage.findUnique({
    where: { slug: params.slug },
    include: {
      components: {
        orderBy: [{ displayOrder: "asc" }],
        include: {
          monitor: {
            select: { id: true, name: true, status: true },
          },
        },
      },
    },
  });

  if (!statusPage || !statusPage.isPublished) notFound();

  // Fetch active incidents for the team
  const activeIncidents = await db.incident.findMany({
    where: {
      monitor: { teamId: statusPage.teamId },
      status: { not: "RESOLVED" },
    },
    include: {
      monitor: { select: { name: true } },
      updates: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Fetch recent resolved incidents (last 14 days)
  const recentIncidents = await db.incident.findMany({
    where: {
      monitor: { teamId: statusPage.teamId },
      status: "RESOLVED",
      createdAt: { gte: subDays(new Date(), 14) },
    },
    include: {
      monitor: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Gather monitor IDs for uptime data
  const monitorIds = statusPage.components
    .filter((c) => c.monitorId)
    .map((c) => c.monitorId as string);

  // Fetch 90-day uptime data for all monitors
  const uptimeData = await db.uptimeDaily.findMany({
    where: {
      monitorId: { in: monitorIds },
      date: { gte: subDays(new Date(), 90) },
    },
    orderBy: { date: "asc" },
  });

  // Group uptime data by monitorId
  const uptimeByMonitor: Record<string, { date: Date; uptimePercent: number }[]> = {};
  for (const row of uptimeData) {
    if (!uptimeByMonitor[row.monitorId]) uptimeByMonitor[row.monitorId] = [];
    uptimeByMonitor[row.monitorId].push({ date: row.date, uptimePercent: row.uptimePercent });
  }

  // Compute overall system status
  const allStatuses = statusPage.components.map((c) => c.monitor?.status ?? null);
  const hasDown = allStatuses.some((s) => s === "DOWN");
  const hasDegraded = allStatuses.some((s) => s === "DEGRADED");
  const overallStatus = hasDown ? "DOWN" : hasDegraded ? "DEGRADED" : "UP";

  // Group components by groupName
  const groups: Record<string, typeof statusPage.components> = {};
  for (const comp of statusPage.components) {
    const group = comp.groupName || "Services";
    if (!groups[group]) groups[group] = [];
    groups[group].push(comp);
  }

  const brandColor = statusPage.brandColor || "#6366f1";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="py-12 text-center" style={{ backgroundColor: brandColor }}>
        {statusPage.logoUrl && (
          <img src={statusPage.logoUrl} alt="Logo" className="h-12 mx-auto mb-4 object-contain" />
        )}
        <h1 className="text-3xl font-bold text-white">{statusPage.title}</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Overall status banner */}
        <div
          className={`rounded-xl p-5 flex items-center gap-4 ${
            overallStatus === "UP"
              ? "bg-green-50 border border-green-200"
              : overallStatus === "DOWN"
              ? "bg-red-50 border border-red-200"
              : "bg-yellow-50 border border-yellow-200"
          }`}
        >
          <StatusDot status={overallStatus} />
          <div>
            <p className="font-semibold text-lg">
              {overallStatus === "UP"
                ? "All systems operational"
                : overallStatus === "DOWN"
                ? "Service disruption detected"
                : "Some systems degraded"}
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: {format(new Date(), "MMM d, yyyy HH:mm")} UTC
            </p>
          </div>
        </div>

        {/* Active incidents */}
        {activeIncidents.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Active Incidents</h2>
            {activeIncidents.map((incident) => (
              <div key={incident.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-red-800">{incident.title}</p>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full capitalize">
                    {incident.status.toLowerCase().replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-red-600 mt-1">Affected: {incident.monitor?.name}</p>
                {incident.updates[0] && (
                  <p className="text-sm text-red-700 mt-2 italic">
                    {incident.updates[0].message}
                  </p>
                )}
                <p className="text-xs text-red-500 mt-2">
                  Started {format(incident.createdAt, "MMM d, HH:mm")} UTC
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Component groups */}
        {Object.entries(groups).map(([groupName, components]) => (
          <div key={groupName} className="bg-white rounded-xl border divide-y">
            <div className="px-5 py-3">
              <h2 className="font-semibold text-gray-700">{groupName}</h2>
            </div>
            {components.map((comp) => {
              const monitorDays = comp.monitorId ? (uptimeByMonitor[comp.monitorId] ?? []) : [];
              const avg30 =
                monitorDays.length > 0
                  ? monitorDays
                      .slice(-30)
                      .reduce((sum, d) => sum + d.uptimePercent, 0) /
                    Math.min(monitorDays.slice(-30).length, 30)
                  : null;

              return (
                <div key={comp.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusDot status={comp.monitor?.status ?? null} />
                      <span className="font-medium">{comp.name}</span>
                    </div>
                    <StatusBadge status={comp.monitor?.status ?? null} />
                  </div>
                  {monitorDays.length > 0 && (
                    <>
                      <UptimeBar days={monitorDays} />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>90 days ago</span>
                        <span>
                          {avg30 !== null ? `${avg30.toFixed(2)}% uptime` : ""}
                        </span>
                        <span>Today</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Recent incident history */}
        {recentIncidents.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Incident History (14 days)</h2>
            {recentIncidents.map((incident) => (
              <div key={incident.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{incident.title}</p>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Resolved
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {incident.monitor?.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(incident.createdAt, "MMM d, HH:mm")} UTC
                  {incident.resolvedAt &&
                    ` → ${format(incident.resolvedAt, "MMM d, HH:mm")} UTC`}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* No incidents */}
        {activeIncidents.length === 0 && recentIncidents.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No incidents in the last 14 days.
          </div>
        )}

        {/* Subscribe */}
        <SubscribeForm statusPageId={statusPage.id} />

        <p className="text-center text-xs text-gray-400 pb-4">
          Powered by API Monitor
        </p>
      </div>
    </div>
  );
}
