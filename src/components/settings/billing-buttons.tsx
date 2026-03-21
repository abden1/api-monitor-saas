"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Props {
  currentPlan: string;
  hasSubscription: boolean;
}

export function BillingButtons({ currentPlan, hasSubscription }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleManage() {
    setLoading(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }

  async function handleUpgrade(plan: string) {
    setLoading(true);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }

  if (currentPlan === "FREE") {
    return (
      <div className="flex gap-2">
        <Button onClick={() => handleUpgrade("STARTER")} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Upgrade to Starter
        </Button>
        <Button variant="outline" onClick={() => handleUpgrade("PRO")} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Upgrade to Pro
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" onClick={handleManage} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Manage Subscription
    </Button>
  );
}
