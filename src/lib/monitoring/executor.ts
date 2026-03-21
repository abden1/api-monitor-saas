import axios from "axios";
import * as net from "net";
import * as dns from "dns";
import * as tls from "tls";
import { promisify } from "util";
import { exec } from "child_process";
import type { Monitor } from "@prisma/client";
import { safeDecryptJson } from "@/lib/encryption";

const execAsync = promisify(exec);
const dnsResolve = promisify(dns.resolve);

export interface CheckResult {
  status: "UP" | "DOWN" | "DEGRADED";
  responseTime: number | null;
  statusCode: number | null;
  errorMessage: string | null;
  sslInfo?: {
    expiresAt: Date | null;
    issuer: string | null;
    subject: string | null;
    isValid: boolean;
    isSelfSigned: boolean;
    daysUntilExpiry: number | null;
  };
}

interface MonitorConfig {
  id: string;
  url: string;
  type: string;
  method: string;
  headers: string | null;
  body: string | null;
  expectedStatus: number;
  expectedContent: string | null;
  contentType: string | null;
  timeout: number;
  responseTimeThreshold: number;
}

export async function executeCheck(monitor: MonitorConfig): Promise<CheckResult> {
  const start = Date.now();

  try {
    switch (monitor.type) {
      case "HTTP":
        return await checkHttp(monitor, start);
      case "PING":
        return await checkPing(monitor.url, monitor.timeout);
      case "PORT": {
        const parsed = parsePortUrl(monitor.url);
        return await checkPort(parsed.host, parsed.port, monitor.timeout);
      }
      case "DNS":
        return await checkDns(monitor.url, monitor.timeout);
      case "SSL":
        return await checkSsl(monitor.url, monitor.timeout);
      case "KEYWORD":
        return await checkHttp(monitor, start, true);
      default:
        return await checkHttp(monitor, start);
    }
  } catch (err: unknown) {
    const responseTime = Date.now() - start;
    return {
      status: "DOWN",
      responseTime,
      statusCode: null,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkHttp(
  monitor: MonitorConfig,
  start: number,
  keywordOnly = false
): Promise<CheckResult> {
  const headers = safeDecryptJson<Record<string, string>>(monitor.headers) || {};
  const body = monitor.body ? safeDecryptJson(monitor.body) : undefined;

  let response;
  try {
    response = await axios({
      method: monitor.method.toLowerCase(),
      url: monitor.url,
      headers,
      data: body,
      timeout: monitor.timeout,
      validateStatus: () => true,
      maxRedirects: 5,
    });
  } catch (err: unknown) {
    const responseTime = Date.now() - start;
    return {
      status: "DOWN",
      responseTime,
      statusCode: null,
      errorMessage: err instanceof Error ? err.message : "Request failed",
    };
  }

  const responseTime = Date.now() - start;
  const statusCode = response.status;

  // Check status code
  if (statusCode !== monitor.expectedStatus) {
    return {
      status: "DOWN",
      responseTime,
      statusCode,
      errorMessage: `Expected status ${monitor.expectedStatus}, got ${statusCode}`,
    };
  }

  // Check response content
  if (monitor.expectedContent && !keywordOnly) {
    const responseBody = typeof response.data === "string"
      ? response.data
      : JSON.stringify(response.data);

    const contentMatch = validateContent(
      responseBody,
      monitor.expectedContent,
      monitor.contentType || "keyword"
    );

    if (!contentMatch) {
      return {
        status: "DOWN",
        responseTime,
        statusCode,
        errorMessage: `Content validation failed: expected "${monitor.expectedContent}"`,
      };
    }
  }

  // Check response time
  const isDegraded = responseTime > monitor.responseTimeThreshold;

  return {
    status: isDegraded ? "DEGRADED" : "UP",
    responseTime,
    statusCode,
    errorMessage: isDegraded
      ? `Response time ${responseTime}ms exceeds threshold ${monitor.responseTimeThreshold}ms`
      : null,
  };
}

function validateContent(
  body: string,
  expected: string,
  contentType: string
): boolean {
  switch (contentType) {
    case "keyword":
      return body.includes(expected);
    case "regex":
      return new RegExp(expected).test(body);
    case "jsonpath": {
      try {
        const json = JSON.parse(body);
        const [path, value] = expected.split("=").map((s) => s.trim());
        const parts = path.replace(/^\$\.?/, "").split(".");
        let current: unknown = json;
        for (const part of parts) {
          if (current === null || current === undefined) return false;
          current = (current as Record<string, unknown>)[part];
        }
        return value ? String(current) === value : current !== undefined;
      } catch {
        return false;
      }
    }
    default:
      return body.includes(expected);
  }
}

async function checkPing(
  url: string,
  timeout: number
): Promise<CheckResult> {
  const host = url.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  const start = Date.now();

  try {
    const isWindows = process.platform === "win32";
    const cmd = isWindows
      ? `ping -n 1 -w ${timeout} ${host}`
      : `ping -c 1 -W ${Math.ceil(timeout / 1000)} ${host}`;

    const { stdout } = await execAsync(cmd);
    const responseTime = Date.now() - start;

    const isSuccess = isWindows
      ? stdout.includes("Reply from") || stdout.includes("bytes=")
      : stdout.includes("1 packets transmitted, 1 received") ||
        stdout.includes("1 received");

    return {
      status: isSuccess ? "UP" : "DOWN",
      responseTime,
      statusCode: null,
      errorMessage: isSuccess ? null : "Ping failed",
    };
  } catch {
    const responseTime = Date.now() - start;
    // Fallback to TCP connect on port 80
    return checkPort(host, 80, timeout - responseTime);
  }
}

async function checkPort(
  host: string,
  port: number,
  timeout: number
): Promise<CheckResult> {
  const start = Date.now();

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const cleanup = (status: "UP" | "DOWN", error: string | null) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve({
        status,
        responseTime: Date.now() - start,
        statusCode: null,
        errorMessage: error,
      });
    };

    socket.setTimeout(timeout);
    socket.connect(port, host, () => cleanup("UP", null));
    socket.on("error", (err) => cleanup("DOWN", err.message));
    socket.on("timeout", () => cleanup("DOWN", `Connection timeout after ${timeout}ms`));
  });
}

function parsePortUrl(url: string): { host: string; port: number } {
  const cleaned = url.replace(/^tcp:\/\//, "");
  const [host, portStr] = cleaned.split(":");
  return { host: host || url, port: parseInt(portStr || "80") };
}

async function checkDns(url: string, timeout: number): Promise<CheckResult> {
  const host = url
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];

  const start = Date.now();

  const timer = setTimeout(() => {}, timeout);

  try {
    await dnsResolve(host);
    const responseTime = Date.now() - start;
    clearTimeout(timer);
    return {
      status: "UP",
      responseTime,
      statusCode: null,
      errorMessage: null,
    };
  } catch (err: unknown) {
    const responseTime = Date.now() - start;
    clearTimeout(timer);
    return {
      status: "DOWN",
      responseTime,
      statusCode: null,
      errorMessage: err instanceof Error ? err.message : "DNS resolution failed",
    };
  }
}

async function checkSsl(url: string, timeout: number): Promise<CheckResult> {
  const host = url
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];

  const start = Date.now();

  return new Promise((resolve) => {
    const socket = tls.connect(
      { host, port: 443, servername: host, timeout },
      () => {
        const responseTime = Date.now() - start;
        const cert = socket.getPeerCertificate();
        socket.destroy();

        if (!cert || !cert.valid_to) {
          resolve({
            status: "DOWN",
            responseTime,
            statusCode: null,
            errorMessage: "Could not retrieve SSL certificate",
          });
          return;
        }

        const expiresAt = new Date(cert.valid_to);
        const validFrom = new Date(cert.valid_from);
        const now = new Date();
        const daysUntilExpiry = Math.floor(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        const issuer = cert.issuer?.O || cert.issuer?.CN || null;
        const subject = cert.subject?.CN || null;
        const isSelfSigned = cert.issuer?.CN === cert.subject?.CN;

        const isExpired = expiresAt < now;
        const isNotYetValid = validFrom > now;

        resolve({
          status: isExpired || isNotYetValid ? "DOWN" : "UP",
          responseTime,
          statusCode: null,
          errorMessage: isExpired
            ? "SSL certificate has expired"
            : isNotYetValid
            ? "SSL certificate is not yet valid"
            : null,
          sslInfo: {
            expiresAt,
            issuer,
            subject,
            isValid: !isExpired && !isNotYetValid,
            isSelfSigned,
            daysUntilExpiry,
          },
        });
      }
    );

    socket.on("error", (err) => {
      resolve({
        status: "DOWN",
        responseTime: Date.now() - start,
        statusCode: null,
        errorMessage: err.message,
        sslInfo: {
          expiresAt: null,
          issuer: null,
          subject: null,
          isValid: false,
          isSelfSigned: false,
          daysUntilExpiry: null,
        },
      });
    });

    socket.setTimeout(timeout, () => {
      socket.destroy();
      resolve({
        status: "DOWN",
        responseTime: Date.now() - start,
        statusCode: null,
        errorMessage: "SSL check timed out",
      });
    });
  });
}

export async function executeCheckWithRetry(
  monitor: MonitorConfig,
  retries = 3
): Promise<CheckResult> {
  let lastResult: CheckResult | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    lastResult = await executeCheck(monitor);

    if (lastResult.status === "UP") {
      return lastResult;
    }

    if (attempt < retries) {
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return lastResult!;
}
