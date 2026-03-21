import Link from "next/link";
import { Activity, Bell, BarChart3, Globe, Shield, Zap, ArrowRight, CheckCircle } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-7 w-7 text-blue-400" />
            <span className="text-xl font-bold">API Monitor</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/status/demo" className="hover:text-white transition-colors">Status Page Demo</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Start for free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-700/50 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
          <Zap className="h-3.5 w-3.5" />
          Now with multi-region monitoring
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Know when your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            APIs go down
          </span>{" "}
          before your users do
        </h1>
        <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
          Monitor API endpoints, track uptime SLAs, and publish beautiful status pages.
          Get instant alerts via email, SMS, Slack, and more.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            Start monitoring for free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/status/demo"
            className="inline-flex items-center gap-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            View demo status page
          </Link>
        </div>
        <p className="mt-6 text-sm text-slate-500">No credit card required · Free plan includes 5 monitors</p>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-700/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "99.9%", label: "Average uptime tracked" },
              { value: "< 30s", label: "Alert delivery time" },
              { value: "5 regions", label: "Global monitoring" },
              { value: "10+ channels", label: "Notification options" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything you need to monitor your APIs</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            From basic uptime checks to advanced SSL monitoring and custom status pages.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: <Activity className="h-6 w-6 text-blue-400" />,
              title: "Multi-type Monitoring",
              desc: "HTTP, PING, TCP port, DNS lookup, SSL certificate checks from 5 global regions.",
            },
            {
              icon: <Bell className="h-6 w-6 text-purple-400" />,
              title: "Smart Alerting",
              desc: "Email, SMS, Slack, Discord, PagerDuty, Opsgenie. Maintenance windows to silence noise.",
            },
            {
              icon: <Globe className="h-6 w-6 text-green-400" />,
              title: "Status Pages",
              desc: "Beautiful public status pages with custom domains, branding, and incident management.",
            },
            {
              icon: <BarChart3 className="h-6 w-6 text-yellow-400" />,
              title: "Uptime Analytics",
              desc: "90-day uptime history, response time trends, SLA reports, and regional latency.",
            },
            {
              icon: <Shield className="h-6 w-6 text-red-400" />,
              title: "SSL Monitoring",
              desc: "Auto-detect SSL certificates, track expiry dates, get warned before they expire.",
            },
            {
              icon: <Zap className="h-6 w-6 text-cyan-400" />,
              title: "REST API",
              desc: "Full API access to all your monitoring data. Integrate with your existing toolchain.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600 transition-colors"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              name: "Free",
              price: "$0",
              features: ["5 monitors", "1 status page", "1-min checks", "Email alerts", "30-day data"],
              cta: "Get started",
              highlight: false,
            },
            {
              name: "Starter",
              price: "$19/mo",
              features: ["20 monitors", "3 status pages", "30-sec checks", "All alert channels", "60-day data"],
              cta: "Start trial",
              highlight: false,
            },
            {
              name: "Pro",
              price: "$49/mo",
              features: ["100 monitors", "10-sec checks", "SMS alerts", "Multi-region", "90-day data", "API access"],
              cta: "Start trial",
              highlight: true,
            },
            {
              name: "Enterprise",
              price: "$149/mo",
              features: ["Unlimited monitors", "White-label", "Priority support", "1-year data", "SLA reports"],
              cta: "Contact us",
              highlight: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 border ${
                plan.highlight
                  ? "bg-blue-600 border-blue-500"
                  : "bg-slate-800/50 border-slate-700/50"
              }`}
            >
              <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
              <div className="text-3xl font-bold mb-6">{plan.price}</div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle className={`h-4 w-4 flex-shrink-0 ${plan.highlight ? "text-blue-200" : "text-green-400"}`} />
                    <span className={plan.highlight ? "text-blue-100" : "text-slate-300"}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`block text-center py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  plan.highlight
                    ? "bg-white text-blue-600 hover:bg-blue-50"
                    : "bg-slate-700 hover:bg-slate-600 text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400 text-sm">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-blue-400" />
            <span className="font-semibold text-white">API Monitor</span>
          </div>
          <p>© {new Date().getFullYear()} API Monitor. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
