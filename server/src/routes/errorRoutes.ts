/**
 * ==============================================================================
 * BACKEND ERROR & DIAGNOSTIC ROUTER (/error & /api/error)
 * ==============================================================================
 * Professional live diagnostic dashboard and JSON telemetry endpoint.
 * Real-time monitoring for Database (Prisma), Auth (JWT/OAuth), Gemini AI,
 * Redis, RAG Vector Store, and System Health.
 */

import { Router, Request, Response } from "express";
import { DiagnosticService, ErrorCategory } from "../services/diagnosticService";

const router = Router();

// GET /error or /api/error
router.get("/", async (req: Request, res: Response) => {
  try {
    const category = req.query.category as ErrorCategory | undefined;
    const diagnostics = await DiagnosticService.getFullDiagnostics();

    // Support JSON format via query param or Accept header
    const wantsJson = req.query.format === "json" || (!req.accepts("html") && req.accepts("json"));

    if (wantsJson) {
      if (category) {
        return res.json({
          ...diagnostics,
          recentErrors: DiagnosticService.getLogs(category),
        });
      }
      return res.json(diagnostics);
    }

    // Render professional HTML dashboard
    const host = req.headers.host || "localhost:5000";
    const html = renderDashboardHtml(diagnostics, host, category);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    console.error("Diagnostic route failure:", error);
    res.status(500).json({ error: "Failed to generate diagnostic report", details: (error as Error).message });
  }
});

// POST /error/clear - Clear error log buffer
router.post("/clear", (_req: Request, res: Response) => {
  DiagnosticService.clearLogs();
  res.json({ success: true, message: "Error log buffer cleared successfully." });
});

// Helper: Generate self-contained, sleek Dark Mode HTML Dashboard
function renderDashboardHtml(
  data: Awaited<ReturnType<typeof DiagnosticService.getFullDiagnostics>>,
  host: string,
  selectedCategory?: ErrorCategory
): string {
  const isHealthy = data.overallStatus === "healthy";
  const isDegraded = data.overallStatus === "degraded";

  const statusColor = isHealthy ? "#10b981" : isDegraded ? "#f59e0b" : "#ef4444";
  const statusBg = isHealthy ? "rgba(16, 185, 129, 0.1)" : isDegraded ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)";
  const statusBorder = isHealthy ? "rgba(16, 185, 129, 0.3)" : isDegraded ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)";
  const statusText = isHealthy ? "ALL SYSTEMS OPERATIONAL" : isDegraded ? "SYSTEM DEGRADED" : "CRITICAL SERVICE ISSUES";

  const errors = selectedCategory
    ? data.recentErrors.filter((e) => e.category === selectedCategory)
    : data.recentErrors;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LangGPT Backend Diagnostic & Error Logs (${host})</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2310b981'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/></svg>">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f2937;
      --card-hover: #1e293b;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --text-dim: #6b7280;
      --accent: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --info: #3b82f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 24px;
      line-height: 1.5;
    }
    .container { max-width: 1300px; margin: 0 auto; }
    
    /* Header */
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 24px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #10b981, #059669);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 20px;
      color: #fff;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
    }
    .brand-title { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .brand-sub { font-size: 13px; color: var(--text-muted); }
    
    .header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 9999px;
      background: ${statusBg};
      border: 1px solid ${statusBorder};
      color: ${statusColor};
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${statusColor};
      box-shadow: 0 0 10px ${statusColor};
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn:hover { background: var(--card-hover); border-color: #374151; }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.15); border-color: var(--danger); color: #fca5a5; }

    /* Probes Grid */
    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .probes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-col;
      gap: 10px;
      transition: border-color 0.15s ease;
    }
    .card:hover { border-color: #374151; }
    .card-head { display: flex; justify-content: space-between; align-items: flex-start; }
    .card-title { font-size: 15px; font-weight: 600; }
    .probe-status {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }
    .status-healthy { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .status-degraded { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .status-down { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .card-msg { font-size: 13px; color: var(--text-muted); word-break: break-word; }
    .card-details {
      margin-top: 6px;
      padding: 8px 10px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 6px;
      font-family: monospace;
      font-size: 11px;
      color: #94a3b8;
    }
    .card-tip {
      margin-top: 6px;
      padding: 8px 10px;
      background: rgba(245, 158, 11, 0.08);
      border-left: 3px solid var(--warning);
      border-radius: 4px;
      font-size: 12px;
      color: #fde68a;
    }

    /* Logs Section */
    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    .tab {
      padding: 6px 12px;
      border-radius: 8px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .tab:hover, .tab.active { background: #1e293b; color: #fff; border-color: #3b82f6; }
    .badge-count {
      background: #374151;
      color: #fff;
      padding: 1px 6px;
      border-radius: 9999px;
      font-size: 10px;
      margin-left: 4px;
    }

    .error-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
    .error-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 16px;
      transition: border-color 0.15s;
    }
    .error-card:hover { border-color: #374151; }
    .error-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 8px;
    }
    .pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }
    .pill-database { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .pill-auth { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
    .pill-ai_model { background: rgba(236, 72, 153, 0.15); color: #f472b6; }
    .pill-redis { background: rgba(234, 88, 12, 0.15); color: #fb923c; }
    .pill-rag { background: rgba(20, 184, 166, 0.15); color: #2dd4bf; }
    .pill-system { background: rgba(107, 114, 128, 0.15); color: #9ca3af; }

    .severity-critical { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .severity-error { background: rgba(244, 63, 94, 0.2); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); }
    .severity-warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }

    .error-time { font-size: 12px; color: var(--text-dim); }
    .error-msg { font-size: 14px; font-weight: 600; color: #f3f4f6; margin-bottom: 8px; word-break: break-word; }
    .error-suggestion {
      background: rgba(16, 185, 129, 0.08);
      border-left: 3px solid var(--accent);
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      color: #6ee7b7;
      margin-bottom: 8px;
    }
    
    .stack-toggle {
      background: none;
      border: none;
      color: #60a5fa;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 0;
    }
    .stack-trace {
      margin-top: 8px;
      padding: 12px;
      background: #05070d;
      border: 1px solid #1e293b;
      border-radius: 6px;
      font-family: monospace;
      font-size: 11px;
      color: #fca5a5;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 250px;
      overflow-y: auto;
      display: none;
    }

    .empty-state {
      padding: 40px 20px;
      text-align: center;
      background: var(--card-bg);
      border: 1px dashed var(--card-border);
      border-radius: 12px;
      color: var(--text-muted);
    }
    .empty-icon { font-size: 32px; margin-bottom: 8px; }

    /* Environment Audit Table */
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th {
      background: rgba(0,0,0,0.3);
      text-align: left;
      padding: 12px 16px;
      color: var(--text-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--card-border);
    }
    td { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    tr:last-child td { border-bottom: none; }
    .font-mono { font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header>
      <div class="brand">
        <div class="brand-icon">⚡</div>
        <div>
          <div class="brand-title">LangGPT Backend Health & Error Telemetry</div>
          <div class="brand-sub">Public Diagnostic Console &bull; Host: <strong>${host}</strong></div>
        </div>
      </div>

      <div class="header-actions">
        <div class="status-badge">
          <span class="status-dot"></span>
          <span>${statusText}</span>
        </div>
        <button class="btn" id="refreshBtn" onclick="location.reload()">
          🔄 Refresh
        </button>
        <button class="btn" id="autoToggleBtn" onclick="toggleAutoRefresh()">
          ⏱️ Auto: <span id="autoState">ON (10s)</span>
        </button>
        <a href="/error?format=json" class="btn" target="_blank">
          📄 JSON View
        </a>
        <button class="btn btn-danger" onclick="clearLogs()">
          🗑️ Clear Logs
        </button>
      </div>
    </header>

    <!-- Service Probes -->
    <div class="section-title">
      <span>Service Probes & Resource Status</span>
      <span style="font-size: 12px; text-transform: none; color: var(--text-dim);">Live latency & configuration validation</span>
    </div>
    
    <div class="probes-grid">
      ${data.probes
        .map(
          (probe) => `
        <div class="card">
          <div class="card-head">
            <div class="card-title">${probe.name}</div>
            <span class="probe-status status-${probe.status}">
              ${probe.status}
            </span>
          </div>
          <div class="card-msg">${probe.message}</div>
          ${
            probe.details
              ? `<div class="card-details">${Object.entries(probe.details)
                  .map(([k, v]) => `<div><strong>${k}:</strong> ${Array.isArray(v) ? v.join(", ") : v}</div>`)
                  .join("")}</div>`
              : ""
          }
          ${probe.troubleshooting ? `<div class="card-tip">💡 <strong>Action:</strong> ${probe.troubleshooting}</div>` : ""}
        </div>
      `
        )
        .join("")}
    </div>

    <!-- Error Logs Section -->
    <div class="section-title">
      <span>Recent Backend Errors (${errors.length})</span>
      <span style="font-size: 12px; text-transform: none; color: var(--text-dim);">Last 100 captured ring-buffer events</span>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <a href="/error" class="tab ${!selectedCategory ? "active" : ""}">
        All <span class="badge-count">${data.errorCounts.total}</span>
      </a>
      <a href="/error?category=DATABASE" class="tab ${selectedCategory === "DATABASE" ? "active" : ""}">
        Database <span class="badge-count">${data.errorCounts.database}</span>
      </a>
      <a href="/error?category=AUTH" class="tab ${selectedCategory === "AUTH" ? "active" : ""}">
        Auth <span class="badge-count">${data.errorCounts.auth}</span>
      </a>
      <a href="/error?category=AI_MODEL" class="tab ${selectedCategory === "AI_MODEL" ? "active" : ""}">
        AI Models <span class="badge-count">${data.errorCounts.aiModel}</span>
      </a>
      <a href="/error?category=REDIS" class="tab ${selectedCategory === "REDIS" ? "active" : ""}">
        Redis <span class="badge-count">${data.errorCounts.redis}</span>
      </a>
      <a href="/error?category=SYSTEM" class="tab ${selectedCategory === "SYSTEM" ? "active" : ""}">
        System <span class="badge-count">${data.errorCounts.system}</span>
      </a>
    </div>

    <!-- Error Cards List -->
    <div class="error-list">
      ${
        errors.length === 0
          ? `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <div style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 4px;">
            No Recent Errors
          </div>
          <div>All backend sub-services are executing within normal operational limits.</div>
        </div>
      `
          : errors
              .map(
                (err) => `
        <div class="error-card">
          <div class="error-card-header">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="pill pill-${err.category.toLowerCase()}">${err.category}</span>
              <span class="pill severity-${err.severity.toLowerCase()}">${err.severity}</span>
              ${err.method ? `<span class="pill" style="background:#1e293b; color:#93c5fd;">${err.method} ${err.endpoint || ""}</span>` : ""}
            </div>
            <div class="error-time">${new Date(err.timestamp).toLocaleTimeString()} &bull; ${new Date(err.timestamp).toLocaleDateString()}</div>
          </div>
          
          <div class="error-msg">${escapeHtml(err.message)}</div>
          
          ${err.suggestion ? `<div class="error-suggestion">💡 <strong>Troubleshooting Recommendation:</strong> ${escapeHtml(err.suggestion)}</div>` : ""}

          ${
            err.stack
              ? `
            <button class="stack-toggle" onclick="toggleStack('${err.id}')">
              &plus; View Stack Trace
            </button>
            <div id="stack-${err.id}" class="stack-trace">${escapeHtml(err.stack)}</div>
          `
              : ""
          }
        </div>
      `
              )
              .join("")
      }
    </div>

    <!-- Environment Audit Table -->
    <div class="section-title">
      <span>Environment Configuration Audit</span>
      <span style="font-size: 12px; text-transform: none; color: var(--text-dim);">Secrets automatically masked for security</span>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Value (Masked)</th>
            <th>Audit Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.environmentAudit
            .map(
              (env) => `
            <tr>
              <td class="font-mono"><strong>${env.key}</strong></td>
              <td class="font-mono" style="color: #94a3b8;">${env.value}</td>
              <td>
                <span class="pill status-${env.status === "ok" ? "healthy" : env.status === "warning" ? "degraded" : "down"}">
                  ${env.status.toUpperCase()}
                </span>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    let autoRefresh = true;
    let timer = null;

    function toggleAutoRefresh() {
      autoRefresh = !autoRefresh;
      document.getElementById('autoState').innerText = autoRefresh ? 'ON (10s)' : 'PAUSED';
      if (autoRefresh) startTimer();
      else clearInterval(timer);
    }

    function startTimer() {
      clearInterval(timer);
      timer = setInterval(() => {
        if (autoRefresh) location.reload();
      }, 10000);
    }
    startTimer();

    function toggleStack(id) {
      const el = document.getElementById('stack-' + id);
      if (el) {
        const isHidden = el.style.display === 'none' || !el.style.display;
        el.style.display = isHidden ? 'block' : 'none';
      }
    }

    async function clearLogs() {
      if (!confirm("Clear all captured error logs in this session?")) return;
      try {
        const res = await fetch('/error/clear', { method: 'POST' });
        if (res.ok) location.reload();
      } catch (e) {
        alert("Failed to clear logs: " + e.message);
      }
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default router;
