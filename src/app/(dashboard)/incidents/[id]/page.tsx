import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import { getStatusBg } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { IncidentUpdateForm } from "@/components/incidents/incident-update-form";

export default async function IncidentDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) redirect("/dashboard");

  const incident = await db.incident.findFirst({
    where: { id: params.id, teamId },
    include: {
      monitor: { select: { id: true, name: true, url: true } },
      updates: {
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!incident) notFound();

  const duration = incident.resolvedAt
    ? `${formatDistanceToNow(incident.createdAt)} (resolved)`
    : `Ongoing for ${formatDistanceToNow(incident.createdAt)}`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/incidents"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{incident.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={getStatusBg(incident.status)} variant="outline">
              {incident.status}
            </Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {duration}
            </span>
          </div>
        </div>
      </div>

      {incident.monitor && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Affected monitor</p>
            <Link href={`/monitors/${incident.monitor.id}`} className="font-medium hover:text-primary">
              {incident.monitor.name}
            </Link>
            <p className="text-xs text-muted-foreground">{incident.monitor.url}</p>
          </CardContent>
        </Card>
      )}

      {/* Update form */}
      {incident.status !== "RESOLVED" && (
        <IncidentUpdateForm incidentId={incident.id} currentStatus={incident.status} />
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Incident Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {incident.updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet</p>
          ) : (
            <div className="space-y-4">
              {incident.updates.map((update, i) => (
                <div key={update.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full border-2 mt-0.5 ${
                      update.status === "RESOLVED" ? "border-green-500 bg-green-500" :
                      update.status === "INVESTIGATING" ? "border-red-500 bg-red-500" :
                      "border-yellow-500 bg-yellow-500"
                    }`} />
                    {i < incident.updates.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getStatusBg(update.status)} variant="outline">
                        {update.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(update.createdAt), "MMM d, yyyy HH:mm")}
                      </span>
                      {update.createdBy && (
                        <span className="text-xs text-muted-foreground">
                          by {update.createdBy.name || update.createdBy.email}
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{update.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
