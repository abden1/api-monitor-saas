"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface Props {
  statusPageId: string;
}

export function SubscribeForm({ statusPageId }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/status-pages/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusPageId, email }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessage("Check your email to confirm your subscription.");
      setEmail("");
    } else {
      setMessage(data.error || "Failed to subscribe.");
    }
  }

  return (
    <div className="bg-white border rounded-xl p-6">
      <h2 className="font-semibold mb-1">Subscribe to Updates</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Get notified by email when incidents are created or resolved.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
        </Button>
      </form>
      {message && (
        <p className={`text-sm mt-2 ${message.includes("Check") ? "text-green-600" : "text-destructive"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
