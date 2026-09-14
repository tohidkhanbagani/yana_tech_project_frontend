/**
 * ==========================================================================
 * YANA OS - AI Agent Studio & MCP Tool Invocation Interface (PRB-087)
 * Enterprise Production-Grade Architecture (Linear / Cursor / Claude Standard)
 * ==========================================================================
 */

(function () {
  // --- Persistent Storage Keys & Global Config ---
  const STORAGE_KEY_SESSIONS = "yana_admin_ai_sessions_v2";
  const STORAGE_KEY_CURRENT_SESSION = "yana_admin_ai_active_session_id_v2";

  // Production configuration hook (ready for live backend plug-in)
  window.YANA_AI_CONFIG = {
    mode: "simulated", // 'simulated' | 'live'
    apiEndpoint: "/api/v1/agent/chat",
    wsEndpoint: "/api/v1/agent/ws",
    version: "3.0.0-pro"
  };

  // --- Internal Section State ---
  const chatState = {
    sessions: [],
    activeSessionId: null,
    activePersona: "sentinel", // 'sentinel' | 'srs_auditor' | 'finance' | 'attendance'
    mcpToolsEnabled: true,
    isGenerating: false,
    searchFilter: "",
    sidebarOpen: true
  };

  // --- Available Personas ---
  const PERSONAS = {
    sentinel: {
      id: "sentinel",
      name: "Yana Sentinel",
      role: "LangGraph Multi-Agent Supervisor",
      model: "Claude 3.5 Sonnet",
      badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
      avatarBg: "bg-gradient-to-tr from-indigo-600 to-purple-600",
      avatarIcon: "shield-alert",
      description: "Autonomous supervisor orchestrating RAG pipelines, timesheet audits, and system sentinels."
    },
    srs_auditor: {
      id: "srs_auditor",
      name: "SRS & Timesheet Auditor",
      role: "Deliverable Quality & Fraud Sentinel",
      model: "Claude 3.5 Sonnet",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      avatarBg: "bg-gradient-to-tr from-emerald-600 to-teal-600",
      avatarIcon: "file-check-2",
      description: "Cross-checks employee task logs against 1M+ SRS document chunks and Git commit hashes."
    },
    finance: {
      id: "finance",
      name: "Financial Operations Controller",
      role: "Cash Flow & Receivables Auditor",
      model: "Claude 3.5 Haiku",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      avatarBg: "bg-gradient-to-tr from-amber-600 to-orange-600",
      avatarIcon: "calculator",
      description: "Monitors client billing cycles, automated receivable generation, and payroll protection margins."
    },
    attendance: {
      id: "attendance",
      name: "Attendance & HR Compliance Agent",
      role: "Biometric & Leave Anomaly Sentinel",
      model: "Claude 3.5 Haiku",
      badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      avatarBg: "bg-gradient-to-tr from-rose-600 to-pink-600",
      avatarIcon: "user-check",
      description: "Analyzes biometric punch logs, unapproved half-days, and enforces dynamic attendance penalties."
    }
  };

  // --- Quick Prompt Suggestions ---
  const PROMPT_SUGGESTIONS = [
    {
      title: "Audit Timesheets vs SRS",
      desc: "Compare today's employee deliverables against SRS milestones.",
      prompt: "Audit today's submitted timesheet task deliverables against the project Software Requirements Specifications (SRS). Flag any vague entries or missing commits.",
      icon: "git-pull-request",
      color: "border-indigo-200 hover:border-indigo-500 bg-indigo-50/30"
    },
    {
      title: "Attendance Deficit & Penalties",
      desc: "Identify unapproved half-days and late arrivals.",
      prompt: "Query all active attendance logs this week for deficit hours, unapproved half-days, and calculate dynamic salary deductions.",
      icon: "alert-triangle",
      color: "border-amber-200 hover:border-amber-500 bg-amber-50/30"
    },
    {
      title: "Pending Client Receivables",
      desc: "Audit upcoming billing schedules & overdue payments.",
      prompt: "Check all active client project receivables, identify overdue payment milestones, and prepare client notification drafts.",
      icon: "receipt",
      color: "border-emerald-200 hover:border-emerald-500 bg-emerald-50/30"
    },
    {
      title: "Mailjet DNS & Pooler Health",
      desc: "Verify domain DKIM/SPF and Postgres connection pool.",
      prompt: "Inspect Mailjet Send API v3.1 DNS health for yanatechnology.com and verify the Supabase transaction pooler port 6543 connection saturation.",
      icon: "cpu",
      color: "border-purple-200 hover:border-purple-500 bg-purple-50/30"
    }
  ];

  // =========================================================================
  // 1. Token Estimation Utility
  // =========================================================================
  function estimateTokens(text) {
    if (!text) return 0;
    const clean = String(text).trim();
    if (!clean) return 0;
    // High-fidelity token heuristic: ~3.8 characters per token in standard LLMs
    return Math.max(1, Math.ceil(clean.length / 3.8));
  }

  // =========================================================================
  // 2. Session Storage & Lifecycle
  // =========================================================================
  function loadSessionsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
      chatState.sessions = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(chatState.sessions)) chatState.sessions = [];
    } catch (e) {
      console.warn("Could not load AI chat sessions:", e);
      chatState.sessions = [];
    }

    // Retain all non-empty sessions, and at most ONE empty session
    const nonEmpty = chatState.sessions.filter((s) => s.messages && s.messages.length > 0);
    const firstEmpty = chatState.sessions.find((s) => !s.messages || s.messages.length === 0);
    if (firstEmpty) {
      chatState.sessions = [firstEmpty, ...nonEmpty];
    } else if (nonEmpty.length > 0) {
      chatState.sessions = nonEmpty;
    }

    if (chatState.sessions.length === 0) {
      createNewSession("Executive AI Copilot Session");
    } else {
      const savedActive = localStorage.getItem(STORAGE_KEY_CURRENT_SESSION);
      const exists = chatState.sessions.some((s) => s.id === savedActive);
      chatState.activeSessionId = exists ? savedActive : chatState.sessions[0].id;
    }
  }

  function saveSessionsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(chatState.sessions));
      if (chatState.activeSessionId) {
        localStorage.setItem(STORAGE_KEY_CURRENT_SESSION, chatState.activeSessionId);
      }
    } catch (e) {
      console.error("Failed saving AI chat sessions:", e);
    }
  }

  function getActiveSession() {
    return chatState.sessions.find((s) => s.id === chatState.activeSessionId) || null;
  }

  function createNewSession(title = "New Agent Task") {
    const id = "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const newSession = {
      id,
      title,
      persona: chatState.activePersona,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };
    chatState.sessions.unshift(newSession);
    chatState.activeSessionId = id;
    saveSessionsToStorage();
    renderChatInterface();
    return newSession;
  }

  window.handleNewAIChatSession = function () {
    const s = getActiveSession();
    if (s && (!s.messages || s.messages.length === 0)) {
      // Current chat has no messages yet. Do not spam duplicate empty sessions!
      const popover = document.getElementById("ai-history-popover");
      if (popover) popover.classList.add("hidden");
      const inputEl = document.getElementById("ai-chat-input");
      if (inputEl) inputEl.focus();
      if (typeof showToast === "function") showToast("Already on a fresh conversation", "info");
      return;
    }
    const popover = document.getElementById("ai-history-popover");
    if (popover) popover.classList.add("hidden");
    createNewSession("New Agent Task");
  };

  window.switchAIChatSession = function (sessionId) {
    if (chatState.isGenerating) return;
    chatState.activeSessionId = sessionId;
    saveSessionsToStorage();
    const popover = document.getElementById("ai-history-popover");
    if (popover) popover.classList.add("hidden");
    renderChatInterface();
  };

  window.deleteAIChatSession = function (sessionId, event) {
    if (event) event.stopPropagation();
    if (chatState.isGenerating) return;
    chatState.sessions = chatState.sessions.filter((s) => s.id !== sessionId);
    if (chatState.sessions.length === 0) {
      createNewSession("New Agent Task");
    } else if (chatState.activeSessionId === sessionId) {
      chatState.activeSessionId = chatState.sessions[0].id;
    }
    saveSessionsToStorage();
    renderChatInterface();
  };

  window.clearActiveChatMessages = function () {
    const s = getActiveSession();
    if (!s) return;
    if (confirm("Are you sure you want to clear all messages in this session?")) {
      s.messages = [];
      s.updatedAt = new Date().toISOString();
      saveSessionsToStorage();
      renderChatInterface();
    }
  };

  window.exportActiveChatSession = function (format = "markdown") {
    const s = getActiveSession();
    if (!s || !s.messages.length) {
      if (typeof showToast === "function") showToast("No messages to export", "info");
      return;
    }

    let content = "";
    let filename = `yana_ai_session_${s.id}`;

    if (format === "json") {
      content = JSON.stringify(s, null, 2);
      filename += ".json";
    } else {
      content = `# ${s.title}\n*Exported from Yana OS AI Agent Studio on ${new Date().toLocaleString()}*\n*Persona: ${PERSONAS[s.persona]?.name || s.persona}*\n\n---\n\n`;
      s.messages.forEach((m) => {
        const sender = m.role === "user" ? "👤 Administrator" : "🤖 Yana AI Agent";
        content += `### ${sender} (${new Date(m.timestamp).toLocaleTimeString()})\n`;
        if (m.tokens) {
          content += `*Token Accounting: ${m.tokens.total} tokens (in: ${m.tokens.prompt}, out: ${m.tokens.completion}) | Latency: ${m.latencyMs || 0}ms*\n\n`;
        }
        if (m.toolCalls && m.toolCalls.length) {
          content += `#### Invoked MCP Tools:\n`;
          m.toolCalls.forEach((t) => {
            content += `- **${t.name}** [Status: ${t.status} | Latency: ${t.latencyMs || 0}ms]\n`;
            content += `  - Input: \`${JSON.stringify(t.input)}\`\n`;
            content += `  - Output: \`${JSON.stringify(t.output)}\`\n\n`;
          });
        }
        content += `${m.content}\n\n---\n\n`;
      });
      filename += ".md";
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showToast === "function") showToast("Chat session exported successfully", "success");
  };

  // =========================================================================
  // 3. Formatting & Markdown Parser
  // =========================================================================
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function syntaxHighlightJson(jsonObj) {
    if (typeof jsonObj !== "string") {
      jsonObj = JSON.stringify(jsonObj, null, 2);
    }
    jsonObj = escapeHtml(jsonObj);
    return jsonObj.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function (match) {
        let cls = "json-number";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "json-key font-semibold";
          } else {
            cls = "json-string";
          }
        } else if (/true|false/.test(match)) {
          cls = "json-boolean font-semibold";
        } else if (/null/.test(match)) {
          cls = "json-null italic";
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }

  function renderMarkdownToHtml(markdownText) {
    if (!markdownText) return "";
    let text = markdownText;

    // Code blocks
    text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function (_, lang, code) {
      const codeId = "code_" + Math.random().toString(36).substring(2, 8);
      const cleanCode = escapeHtml(code.trim());
      return `
        <div class="my-3 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-sm">
          <div class="flex items-center justify-between px-3 py-1.5 bg-slate-900 text-slate-400 text-[11px] font-mono border-b border-slate-800">
            <span class="font-bold text-indigo-400 uppercase">${lang || "CODE"}</span>
            <button onclick="window.copyAICodeBlock('${codeId}')" class="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-[10px] font-sans px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700">
              <i data-lucide="copy" class="w-3 h-3"></i> <span id="label-${codeId}">Copy Code</span>
            </button>
          </div>
          <pre class="p-3 text-xs font-mono text-slate-200 overflow-x-auto"><code id="${codeId}">${cleanCode}</code></pre>
        </div>`;
    });

    // Markdown tables
    text = text.replace(/((?:\|[^\n]+\|\r?\n)+)/g, function (match) {
      const rows = match.trim().split("\n").map((r) => r.trim());
      if (rows.length < 2) return match;
      let html = '<div class="overflow-x-auto my-3 rounded-md border border-slate-200 shadow-2xs"><table class="w-full text-left text-xs border-collapse">';
      rows.forEach((row, idx) => {
        if (/^\|[-:| ]+\|$/.test(row)) return;
        const cols = row.split("|").slice(1, -1).map((c) => c.trim());
        if (idx === 0) {
          html += '<thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200"><tr>';
          cols.forEach((c) => (html += `<th class="px-3 py-2 text-[11px] uppercase tracking-wider">${c}</th>`));
          html += "</tr></thead><tbody>";
        } else {
          html += '<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">';
          cols.forEach((c) => (html += `<td class="px-3 py-2 text-slate-700">${c}</td>`));
          html += "</tr>";
        }
      });
      html += "</tbody></table></div>";
      return html;
    });

    // Headings
    text = text.replace(/^#### (.*$)/gim, '<h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 mt-3 mb-1.5">$1</h4>');
    text = text.replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-slate-900 mt-3 mb-1.5 flex items-center gap-1.5"><span class="w-1.5 h-3.5 bg-indigo-600 rounded-full inline-block"></span>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2 class="text-base font-black text-slate-900 mt-4 mb-2">$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1 class="text-lg font-black text-slate-900 mt-4 mb-2">$1</h1>');

    // Bold & Italics
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>');

    // Blockquotes & Callouts
    text = text.replace(/^> \[!WARNING\] (.*$)/gim, '<div class="ai-callout ai-callout-warning"><i data-lucide="alert-triangle" class="w-4 h-4 shrink-0 text-amber-600 mt-0.5"></i><div><strong class="block font-bold mb-0.5">Warning Alert</strong>$1</div></div>');
    text = text.replace(/^> \[!NOTE\] (.*$)/gim, '<div class="ai-callout ai-callout-info"><i data-lucide="info" class="w-4 h-4 shrink-0 text-blue-600 mt-0.5"></i><div><strong class="block font-bold mb-0.5">System Notice</strong>$1</div></div>');
    text = text.replace(/^> \[!SUCCESS\] (.*$)/gim, '<div class="ai-callout ai-callout-success"><i data-lucide="check-circle-2" class="w-4 h-4 shrink-0 text-emerald-600 mt-0.5"></i><div><strong class="block font-bold mb-0.5">Verified Success</strong>$1</div></div>');
    text = text.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-indigo-600 bg-slate-50 text-slate-600 px-3 py-1.5 my-2 rounded-r text-xs italic">$1</blockquote>');

    // Bullet & numbered lists
    text = text.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-700 text-xs my-0.5">$1</li>');
    text = text.replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-slate-700 text-xs my-0.5">$1</li>');

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 text-[11px] font-mono font-semibold bg-slate-100 text-indigo-700 rounded border border-slate-200">$1</code>');

    // Paragraph line breaks
    text = text.replace(/\n\n+/g, "</p><p class='mb-2 text-xs text-slate-700 leading-relaxed'>");
    text = `<p class='mb-2 text-xs text-slate-700 leading-relaxed'>${text}</p>`;

    return text;
  }

  window.copyAICodeBlock = function (codeId) {
    const el = document.getElementById(codeId);
    if (!el) return;
    navigator.clipboard.writeText(el.innerText).then(() => {
      const label = document.getElementById("label-" + codeId);
      if (label) {
        label.innerText = "✓ Copied!";
        setTimeout(() => (label.innerText = "Copy Code"), 2000);
      }
    });
  };

  window.copyAIMessageContent = function (msgId) {
    const s = getActiveSession();
    if (!s) return;
    const msg = s.messages.find((m) => m.id === msgId);
    if (msg && msg.content) {
      navigator.clipboard.writeText(msg.content).then(() => {
        if (typeof showToast === "function") showToast("Message copied to clipboard", "success");
      });
    }
  };

  window.toggleMCPPayloadAccordion = function (accordionId) {
    const el = document.getElementById(accordionId);
    const chevron = document.getElementById("chev-" + accordionId);
    if (el) {
      el.classList.toggle("hidden");
      if (chevron) {
        chevron.classList.toggle("rotate-180");
      }
    }
  };

  // =========================================================================
  // 4. Simulated Production Agentic Workflows & MCP Telemetry
  // =========================================================================
  function formulateAgentWorkflow(userQuery) {
    const q = userQuery.toLowerCase();

    // SCENARIO 1: SRS & Timesheet Deliverables Audit
    if (q.includes("srs") || q.includes("timesheet") || q.includes("audit") || q.includes("commit") || q.includes("deliverable")) {
      return {
        thinking: "Analyzing active employee timesheet submissions, pulling task ledger entries, and executing hybrid BM25 + HNSW vector similarity search against indexed SRS modules.",
        tools: [
          {
            name: "mcp::yana-postgres-mcp::query_timesheet_deliverables",
            server: "yana-postgres-mcp",
            input: {
              filter_date: new Date().toISOString().slice(0, 10),
              status_filter: "SUBMITTED",
              include_task_work_types: ["Backend", "Frontend", "Full Stack"],
              limit: 25
            },
            output: {
              status: "success",
              records_scanned: 18,
              unreviewed_deliverables: 4,
              sample_entries: [
                {
                  employee: "Tohid Bagani",
                  project: "Yana OS Core Engine",
                  task: "Mailjet Delivery Failure DMARC Policy Rejection & Granular Message Status Handling",
                  hours_logged: 8.5,
                  work_type: "Backend",
                  git_commit: "9f8b41a"
                },
                {
                  employee: "sample.employee.2",
                  project: "Client Accounts Billing Portal",
                  task: "Investigating customer subscription reconciliation edge cases",
                  hours_logged: 6.0,
                  work_type: "Frontend",
                  git_commit: "NONE_SPECIFIED"
                }
              ]
            }
          },
          {
            name: "mcp::srs-rag-service::audit_timesheets_against_srs",
            server: "srs-rag-service",
            input: {
              project_slug: "yana-os-core",
              srs_document_hash: "sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              vector_store: "Supabase pgvector (1M Doc Partition)",
              similarity_threshold: 0.82,
              audit_criteria: ["Deliverable Specificity", "Faked Work Anomaly Check", "Repo Commit Verification"]
            },
            output: {
              compliance_index: 92.4,
              verified_count: 17,
              anomalies_detected: 1,
              fraud_risk_score: "LOW",
              findings: [
                {
                  employee: "sample.employee.2",
                  severity: "MEDIUM",
                  clause_match: "SRS Module 4.3 (Financial Reconciliation)",
                  issue: "Logged 6.0 hours on generic 'investigation' without associated milestone repository commit or ticket linkage."
                }
              ]
            }
          }
        ],
        responseMarkdown: `### 📋 Executive Timesheet Deliverables & SRS Audit Report

I have executed a multi-agent audit pipeline connecting **\`yana-postgres-mcp\`** and the **\`srs-rag-service\`** across today's timesheet logs (**${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}**).

#### Key Execution Telemetry
| Metric | Audit Result | Status |
| :--- | :--- | :--- |
| **Total Timesheet Entries** | 18 Daily Submissions | Verified |
| **SRS Requirement Alignment** | 92.4% Compliance Score | High Assurance |
| **Git Commit Backlink Integrity** | 17 of 18 Linked | 94.4% |
| **Flagged Anomalies** | 1 Discrepancy Found | Medium Priority |

#### Flagged Task Log Anomaly
> [!WARNING] **Missing Deliverable Verification on \`sample.employee.2\`**
> - **Logged Task**: *"Investigating customer subscription reconciliation edge cases"* (6.0 hrs)
> - **SRS Discrepancy**: While SRS Section 4.3 mandates concrete staging test proofs for billing cycle fixes, no GitHub PR reference or commit hash was registered with this record.

#### Recommended Administrative Actions
1. **Automated Follow-up**: Issue an in-app ping to \`sample.employee.2\` requesting the milestone repository commit hash.
2. **Batch Approval**: All other 17 timesheet logs passed biometric punch validation and SRS technical deliverable matching.`
      };
    }

    // SCENARIO 2: Biometric Attendance & Deficit Penalties
    if (q.includes("attendance") || q.includes("penalty") || q.includes("half day") || q.includes("deficit") || q.includes("biometric") || q.includes("check in")) {
      return {
        thinking: "Querying attendance punch telemetry, calculating expected monthly working hours versus actual punch durations, and evaluating approved half-day leave waivers.",
        tools: [
          {
            name: "mcp::attendance-sentinel::query_attendance_anomalies",
            server: "attendance-sentinel",
            input: {
              evaluation_window: "Current Billing Month",
              enforce_penalty_settings: true,
              penalty_rates: { late_arrival: 100, unapproved_half_day: 250, unexcused_absence: 500 }
            },
            output: {
              evaluated_employees: 14,
              present_count: 11,
              late_arrivals: 2,
              unapproved_half_days: 1,
              total_penalties_inr: 450,
              flagged_records: [
                { employee_name: "Rahul Verma", status: "Late", check_in: "10:48 AM", expected: "09:30 AM", penalty: 100 },
                { employee_name: "Sneha Patel", status: "Half Day", hours_worked: 4.2, approved_leave_found: false, penalty: 250 },
                { employee_name: "Karan Johar", status: "Late", check_in: "10:15 AM", expected: "09:30 AM", penalty: 100 }
              ]
            }
          }
        ],
        responseMarkdown: `### ⏱️ Biometric Attendance & Dynamic Penalty Evaluation

I have queried the attendance logs via **\`attendance-sentinel\`** applying the dynamic rate matrix configured in **PRB-082**.

#### Attendance Health Summary
- **Total Evaluated Workforce**: 14 Employees
- **Punctuality Benchmark**: 78.5% on-time arrivals
- **Active Penalties Assessed**: **₹450.00** total deductions across 3 personnel

#### Itemized Penalty Breakdown
| Employee Name | Event | Actual Time | Policy Rule | Deduction |
| :--- | :--- | :--- | :--- | :--- |
| **Rahul Verma** | Late Arrival | 10:48 AM Check-in | Grace period 9:45 AM exceeded | ₹100.00 |
| **Sneha Patel** | Half Day | 4.2 Hours Logged | Zero approved leave found | ₹250.00 |
| **Karan Johar** | Late Arrival | 10:15 AM Check-in | Grace period 9:45 AM exceeded | ₹100.00 |

> [!NOTE] **Guaranteed Monthly Base Protection Safeguard**
> Under Yana OS payroll policy, dynamic deductions will automatically deduct from the employee's gross pay slip while strictly respecting the base salary floor. Approved casual/sick leaves automatically waive the ₹250 unapproved half-day charge.`
      };
    }

    // SCENARIO 3: Client Receivables & Cash Flow
    if (q.includes("client") || q.includes("receivable") || q.includes("billing") || q.includes("invoice") || q.includes("payment") || q.includes("money") || q.includes("cash")) {
      return {
        thinking: "Inspecting client account ledgers, recurring project billing schedules, and automated receivable notification states.",
        tools: [
          {
            name: "mcp::financial-ledger::fetch_pending_receivables",
            server: "financial-ledger",
            input: {
              status: "pending_and_overdue",
              include_auto_generated: true,
              advance_due_cycles: false
            },
            output: {
              total_pending_count: 5,
              total_pending_amount_inr: 340000.0,
              overdue_amount_inr: 85000.0,
              critical_items: [
                {
                  client: "Apex Global FinTech",
                  project: "Banking Microservices Migration",
                  item_name: "Sprint 4 Milestone Retainer",
                  amount: 85000.0,
                  due_date: "2026-09-08",
                  overdue_days: 4
                },
                {
                  client: "Starlight Media",
                  project: "OTT Platform Video Transcoding",
                  item_name: "Monthly Cloud Infrastructure Maintenance",
                  amount: 45000.0,
                  due_date: "2026-09-15",
                  overdue_days: 0
                }
              ]
            }
          }
        ],
        responseMarkdown: `### 💰 Client Accounts & Cash Flow Receivables Audit

I pulled the real-time project receivables ledger via **\`mcp::financial-ledger\`**.

#### Cash Flow Status
- **Total Outstanding Receivables**: **₹3,40,000.00** across 5 active billing milestones.
- **Overdue Invoices (>3 Days)**: **₹85,000.00** requiring immediate administrative contact.

\`\`\`text
Overdue Critical Client: Apex Global FinTech
Milestone Item: Sprint 4 Milestone Retainer (₹85,000.00)
Due Date: Sep 08, 2026 [4 Days Overdue]
\`\`\`

#### Recommended Next Steps
1. **Trigger Client Reminder**: Dispatch payment nudge via Mailjet billing template to Apex Global finance liaison.
2. **Schedule Next Cycle**: Once marked as received, Yana OS will automatically advance the billing date to the next monthly cycle.`
      };
    }

    // SCENARIO 4: Mailjet DNS, SMTP & Database Pooler Health
    if (q.includes("mailjet") || q.includes("dns") || q.includes("dmarc") || q.includes("dkim") || q.includes("database") || q.includes("pool") || q.includes("server") || q.includes("health")) {
      return {
        thinking: "Inspecting Mailjet REST API v3.1 DNS health parameters for yanatechnology.com and polling Supabase PgBouncer transaction port saturation.",
        tools: [
          {
            name: "mcp::mailjet-delivery::check_domain_dns_health",
            server: "mailjet-delivery",
            input: {
              domain_name: "yanatechnology.com",
              dns_id: "4758893104",
              check_spf: true,
              check_dkim: true
            },
            output: {
              dns_status: "HEALTHY",
              dkim_status: "OK",
              spf_status: "OK",
              dmarc_policy: "REJECT (Strict)",
              cached_at: new Date().toISOString()
            }
          },
          {
            name: "mcp::database-inspector::check_connection_pool",
            server: "database-inspector",
            input: {
              host: "aws-0-ap-south-1.pooler.supabase.com",
              port: 6543,
              mode: "transaction"
            },
            output: {
              active_connections: 8,
              max_pool_size: 100,
              utilization_pct: 8.0,
              waiting_queries: 0,
              connection_starvation_risk: "NONE"
            }
          }
        ],
        responseMarkdown: `### 🛡️ Infrastructure Health & Mailjet DNS Diagnostics

I probed the live communication relays and database connection layer via **\`mailjet-delivery\`** and **\`database-inspector\`**.

#### Live Diagnostic Verdicts
| Subsystem | Target Endpoint | Health Status | Telemetry |
| :--- | :--- | :--- | :--- |
| **Mailjet Domain DNS** | \`yanatechnology.com\` | 🟢 Verified OK | DKIM: OK / SPF: OK / DMARC: Strict |
| **PgBouncer Pooler** | Port \`6543\` (Transaction) | 🟢 Optimal | 8/100 Active (8% Saturation) |
| **SMTP Delivery Relay** | Mailjet v3.1 API | 🟢 Active | Zero Bounces in Last 24h |

> [!SUCCESS] **System Integrity Normal**
> All outbound employee payroll statements and automated billing notices have 100% inbox deliverability with zero Google SMTP DMARC rejection risks.`
      };
    }

    // DEFAULT: General Administrative & Technical Assistant
    return {
      thinking: "Synthesizing executive response using operational context from active state memory and system configuration.",
      tools: [
        {
          name: "mcp::yana-system-agent::query_context",
          server: "yana-system-agent",
          input: {
            admin_user: window.state?.user?.sub || "SystemAdmin",
            active_view: window.state?.adminView || "dashboard",
            query_scope: "General Administrative Prompt"
          },
          output: {
            auth_level: window.state?.user?.access_level || "SystemAdmin",
            active_projects_count: window.state?.allProjects?.length || 8,
            active_employees_count: window.state?.allEmployees?.length || 14
          }
        }
      ],
      responseMarkdown: `I have received your instruction: **"${escapeHtml(userQuery)}"**.

As the **${PERSONAS[chatState.activePersona]?.name}**, I have initialized the simulated agentic loop and verified your executive credentials.

#### How I Can Assist You in Production:
- **SRS Quality & Anti-Slacking Audits**: Link task deliverables to GitHub commits and flag vague logs.
- **Biometric Attendance Analysis**: Spot late arrivals and apply dynamic salary deductions.
- **Financial Receivables Management**: Monitor pending client billing cycles and automate invoice reminders.
- **Infrastructure Telemetry**: Track Mailjet DKIM/SPF health and Supabase database connection pooler performance.

Try selecting one of the suggested prompts or give me a specific employee, project, or date range to analyze!`
    };
  }

  // =========================================================================
  // 5. Message Submission & Streaming Simulation
  // =========================================================================
  async function submitUserMessage(userPromptText) {
    if (!userPromptText || !userPromptText.trim() || chatState.isGenerating) return;

    const s = getActiveSession();
    if (!s) return;

    const userText = userPromptText.trim();
    const userTokens = estimateTokens(userText);
    const userMsgId = "msg_user_" + Date.now();
    const assistantMsgId = "msg_ai_" + (Date.now() + 1);

    // 1. Append User Message with Token Accounting
    s.messages.push({
      id: userMsgId,
      role: "user",
      content: userText,
      timestamp: new Date().toISOString(),
      tokens: {
        prompt: userTokens,
        completion: 0,
        total: userTokens
      }
    });

    if (s.messages.length === 1) {
      s.title = userText.length > 32 ? userText.substring(0, 32) + "..." : userText;
    }

    s.updatedAt = new Date().toISOString();
    saveSessionsToStorage();
    renderChatInterface();

    const inputEl = document.getElementById("ai-chat-input");
    if (inputEl) {
      inputEl.value = "";
      inputEl.style.height = "auto";
    }

    // 2. Prepare Assistant Message
    chatState.isGenerating = true;
    updateGenerationControls();

    const startTime = Date.now();
    const workflow = formulateAgentWorkflow(userText);
    const estimatedCompletionTokens = estimateTokens(workflow.responseMarkdown);

    const assistantMsg = {
      id: assistantMsgId,
      role: "assistant",
      persona: chatState.activePersona,
      content: "",
      thinking: workflow.thinking,
      toolCalls: [],
      timestamp: new Date().toISOString(),
      isStreaming: true,
      tokens: {
        prompt: userTokens + 32, // System prompt + context overhead
        completion: 0,
        total: userTokens + 32
      },
      latencyMs: 0
    };
    s.messages.push(assistantMsg);
    renderMessagesList();
    scrollToChatBottom();

    // 3. Step-by-Step Tool Execution Simulation
    if (chatState.mcpToolsEnabled && workflow.tools && workflow.tools.length) {
      for (let i = 0; i < workflow.tools.length; i++) {
        if (!chatState.isGenerating) break;

        const toolDef = workflow.tools[i];
        const toolStartTime = Date.now();
        const toolCallObj = {
          id: "tool_" + Date.now() + "_" + i,
          name: toolDef.name,
          server: toolDef.server,
          input: toolDef.input,
          output: null,
          status: "calling",
          startTime: toolStartTime,
          latencyMs: null
        };
        assistantMsg.toolCalls.push(toolCallObj);
        renderMessagesList();
        scrollToChatBottom();

        // Realistic delay (350ms - 650ms)
        await new Promise((r) => setTimeout(r, 350 + Math.random() * 300));

        if (!chatState.isGenerating) break;

        toolCallObj.status = "completed";
        toolCallObj.output = toolDef.output;
        toolCallObj.latencyMs = Date.now() - toolStartTime;
        renderMessagesList();
        scrollToChatBottom();
      }
    }

    // 4. Token Streaming Simulation
    const fullContent = workflow.responseMarkdown;
    let currentIdx = 0;
    const chunkSize = 5;
    const speedMs = 12;

    while (currentIdx < fullContent.length && chatState.isGenerating) {
      currentIdx = Math.min(fullContent.length, currentIdx + chunkSize);
      assistantMsg.content = fullContent.substring(0, currentIdx);
      renderAssistantStreamingContent(assistantMsgId, assistantMsg.content);
      scrollToChatBottom();
      await new Promise((r) => setTimeout(r, speedMs));
    }

    // 5. Finalize Metrics & Telemetry
    const totalDurationMs = Date.now() - startTime;
    assistantMsg.isStreaming = false;
    assistantMsg.content = fullContent;
    assistantMsg.latencyMs = totalDurationMs;
    assistantMsg.tokens.completion = estimatedCompletionTokens;
    assistantMsg.tokens.total = assistantMsg.tokens.prompt + estimatedCompletionTokens;

    chatState.isGenerating = false;
    saveSessionsToStorage();
    renderChatInterface();
  }

  window.stopAIGeneration = function () {
    if (!chatState.isGenerating) return;
    chatState.isGenerating = false;
    const s = getActiveSession();
    if (s && s.messages.length) {
      const last = s.messages[s.messages.length - 1];
      if (last.role === "assistant" && last.isStreaming) {
        last.isStreaming = false;
        last.content += "\n\n*[Generation cancelled by administrator]*";
      }
    }
    saveSessionsToStorage();
    renderChatInterface();
    if (typeof showToast === "function") showToast("AI generation stopped", "info");
  };

  function updateGenerationControls() {
    const btnSend = document.getElementById("ai-btn-send");
    const btnStop = document.getElementById("ai-btn-stop");
    if (btnSend && btnStop) {
      if (chatState.isGenerating) {
        btnSend.classList.add("hidden");
        btnStop.classList.remove("hidden");
      } else {
        btnSend.classList.remove("hidden");
        btnStop.classList.add("hidden");
      }
    }
  }

  function scrollToChatBottom() {
    const container = document.getElementById("ai-chat-messages-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function renderAssistantStreamingContent(msgId, content) {
    const bodyEl = document.getElementById("ai-msg-body-" + msgId);
    if (bodyEl) {
      bodyEl.innerHTML = renderMarkdownToHtml(content) + `<span class="ai-streaming-cursor"></span>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  // =========================================================================
  // 6. DOM Layout Templates: Clean Studio with Chatbar Connectors & Model Selector
  // =========================================================================
  function getAdminAIChatTemplate() {
    const currentPersona = PERSONAS[chatState.activePersona] || PERSONAS.sentinel;
    const activeSession = getActiveSession();
    const sessionTitle = activeSession?.title || "Executive AI Copilot Session";

    return `
      <div class="ai-chat-root flex flex-col w-full h-full bg-white relative overflow-hidden">
        <!-- Clean Minimal Upper Ribbon -->
        <header class="h-11 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
          <!-- Left: Session Title / Identifier -->
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-2xs shrink-0">
              <i data-lucide="bot" class="w-3.5 h-3.5"></i>
            </div>
            <div class="flex items-center gap-2 min-w-0">
              <h2 class="text-xs font-bold text-slate-800 tracking-tight truncate max-w-[200px] sm:max-w-md" id="ai-active-session-title">
                ${escapeHtml(sessionTitle)}
              </h2>
            </div>
          </div>

          <!-- Right: Session History & New Chat -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- History Dropdown Popover Button -->
            <div class="relative" id="ai-history-dropdown-wrapper">
              <button
                type="button"
                onclick="window.toggleAIHistoryPopover(event)"
                title="View Past Chat Sessions"
                id="ai-history-menu-btn"
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
              >
                <i data-lucide="history" class="w-3.5 h-3.5 text-slate-500"></i>
                <span class="hidden sm:inline">History</span>
                <span class="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-bold" id="ai-history-count-badge">
                  ${chatState.sessions.length}
                </span>
              </button>

              <!-- History Popover -->
              <div id="ai-history-popover" class="hidden absolute right-0 mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95">
                <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <i data-lucide="message-square" class="w-3.5 h-3.5 text-indigo-600"></i> Past Conversations
                  </span>
                  <button type="button" onclick="window.handleNewAIChatSession()" class="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                    + New
                  </button>
                </div>

                <div class="relative mb-2">
                  <i data-lucide="search" class="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"></i>
                  <input
                    type="text"
                    placeholder="Filter past chats..."
                    id="ai-search-sessions"
                    oninput="window.handleSearchAISessions(this.value)"
                    class="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div class="max-h-64 overflow-y-auto ai-chat-scroll space-y-1" id="ai-sessions-list">
                  <!-- Injected via renderSessionsList() -->
                </div>
              </div>
            </div>

            <!-- New Chat Button -->
            <button
              type="button"
              onclick="window.handleNewAIChatSession()"
              title="Start New Agent Task"
              class="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>New Chat</span>
            </button>
          </div>
        </header>

        <!-- Chat Messages Scrollable Area -->
        <div id="ai-chat-messages-container" class="flex-1 overflow-y-auto ai-chat-scroll p-4 md:p-6 space-y-6">
          <!-- Messages Dynamically Injected Here -->
        </div>

        <!-- Bottom Floating Command Dock (Chat Bar with Integrated Connectors & Model Selector) -->
        <div class="p-4 pb-6 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none z-10">
          <div class="max-w-3xl mx-auto pointer-events-auto">
            <!-- Composer Form -->
            <form id="ai-chat-input-form" onsubmit="window.handleAIChatSubmit(event)" class="relative bg-white border border-slate-300 rounded-2xl shadow-md focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/15 transition-all p-3 flex flex-col">
              <textarea
                id="ai-chat-input"
                rows="1"
                placeholder="Ask ${currentPersona.name}... (e.g., &quot;Audit today's timesheets against SRS requirements&quot;)"
                onkeydown="window.handleAIChatKeydown(event)"
                oninput="window.autoResizeAIChatTextarea(this)"
                class="w-full px-1.5 py-1 bg-transparent border-none text-xs text-slate-900 placeholder-slate-400 outline-none resize-none max-h-36 leading-relaxed"
              ></textarea>

              <!-- Bottom Bar inside Composer (Claude & Gemini Style) -->
              <div class="flex items-center justify-between pt-2 border-t border-slate-100 mt-1 px-1">
                <!-- Left: Tools & MCP Connectors Umbrella (Claude Image 3 / Gemini Image 4) -->
                <div class="flex items-center gap-2">
                  <!-- Connectors & Tools Button -->
                  <div class="relative" id="ai-tools-menu-container">
                    <button
                      type="button"
                      id="ai-tools-menu-btn"
                      onclick="window.toggleAIToolsMenu(event)"
                      title="MCP Connectors, Tools & Utilities"
                      class="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors text-xs font-medium cursor-pointer shadow-2xs"
                    >
                      <i data-lucide="plus" class="w-3.5 h-3.5 text-indigo-600"></i>
                      <span class="text-[11px] font-semibold text-slate-700">Tools</span>
                      <span class="w-1.5 h-1.5 rounded-full ${chatState.mcpToolsEnabled ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                    </button>

                    <!-- Upward Flyout Popover Menu for Tools & Connectors -->
                    <div id="ai-tools-menu" class="hidden absolute left-0 bottom-full mb-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
                      <!-- MCP Master Switch Header -->
                      <div class="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <i data-lucide="cpu" class="w-4 h-4 text-indigo-600"></i>
                          <span class="text-xs font-bold text-slate-900">MCP Connectors</span>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" id="ai-mcp-toggle-switch" onchange="window.toggleMCPTools(this.checked)" ${chatState.mcpToolsEnabled ? 'checked' : ''} class="sr-only peer">
                          <div class="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <!-- Connected MCP Hubs -->
                      <div class="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Active Connectors (4)</div>
                        <div class="space-y-1">
                          <div class="flex items-center justify-between text-[11px] text-slate-700">
                            <span class="flex items-center gap-1.5 font-mono"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>postgres-mcp</span>
                            <span class="text-[9px] text-slate-400">Database & Timesheets</span>
                          </div>
                          <div class="flex items-center justify-between text-[11px] text-slate-700">
                            <span class="flex items-center gap-1.5 font-mono"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>srs-rag-service</span>
                            <span class="text-[9px] text-slate-400">SRS Chunks & Commits</span>
                          </div>
                          <div class="flex items-center justify-between text-[11px] text-slate-700">
                            <span class="flex items-center gap-1.5 font-mono"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>mailjet-service</span>
                            <span class="text-[9px] text-slate-400">DNS & Email Health</span>
                          </div>
                          <div class="flex items-center justify-between text-[11px] text-slate-700">
                            <span class="flex items-center gap-1.5 font-mono"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>attendance-sentinel</span>
                            <span class="text-[9px] text-slate-400">Biometric Anomalies</span>
                          </div>
                        </div>
                      </div>

                      <!-- Session Actions inside Umbrella -->
                      <div class="p-1 space-y-0.5">
                        <button type="button" onclick="window.exportActiveChatSession('markdown')" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-2 cursor-pointer transition-colors">
                          <i data-lucide="download" class="w-3.5 h-3.5 text-slate-500"></i>
                          <span>Export Chat (Markdown)</span>
                        </button>
                        <button type="button" onclick="window.exportActiveChatSession('json')" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-2 cursor-pointer transition-colors">
                          <i data-lucide="file-json" class="w-3.5 h-3.5 text-slate-500"></i>
                          <span>Export Trace (JSON)</span>
                        </button>
                        <button type="button" onclick="window.clearActiveChatMessages()" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 text-xs flex items-center gap-2 cursor-pointer transition-colors">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5 text-rose-500"></i>
                          <span>Clear Messages in Session</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Live Token Preview -->
                  <span class="text-[11px] text-slate-400 font-mono" id="ai-input-token-preview">~0 tokens</span>
                </div>

                <!-- Right: Model / Supervisor Selector (Claude Image 5) + Send Button -->
                <div class="flex items-center gap-2">
                  <!-- Model Selector Pill in Chat Bar -->
                  <div class="relative" id="ai-chatbar-model-container">
                    <button
                      type="button"
                      id="ai-chatbar-model-btn"
                      onclick="window.toggleAIChatbarModelMenu(event)"
                      title="Choose AI Supervisor & Model"
                      class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-800 transition-all text-xs font-semibold cursor-pointer shadow-2xs"
                    >
                      <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span id="ai-chatbar-persona-name" class="truncate max-w-[130px] sm:max-w-none">${currentPersona.name}</span>
                      <span class="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hidden sm:inline" id="ai-chatbar-persona-model">
                        ${currentPersona.model}
                      </span>
                      <i data-lucide="chevron-up" class="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150" id="ai-chatbar-model-chevron"></i>
                    </button>

                    <!-- Upward Flyout Popover Menu for Models -->
                    <div id="ai-chatbar-model-menu" class="hidden absolute right-0 bottom-full mb-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
                      <div class="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select AI Supervisor & Model</span>
                        <span class="text-[10px] font-mono text-indigo-600 font-semibold">Claude Ready</span>
                      </div>

                      <div class="p-1 space-y-1">
                        ${Object.values(PERSONAS).map(p => `
                          <button
                            type="button"
                            onclick="window.selectAIPersona('${p.id}')"
                            class="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer ${chatState.activePersona === p.id ? 'bg-indigo-50/50 border border-indigo-100' : 'border border-transparent'}"
                          >
                            <div class="w-6 h-6 rounded-md ${p.avatarBg} text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              <i data-lucide="${p.avatarIcon}" class="w-3.5 h-3.5"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                              <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-slate-900 truncate">${p.name}</span>
                                <span class="text-[9px] font-mono px-1 py-0.2 rounded border ${p.badgeColor}">${p.model}</span>
                              </div>
                              <p class="text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-2">${p.description}</p>
                            </div>
                            ${chatState.activePersona === p.id ? '<i data-lucide="check" class="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-1"></i>' : ''}
                          </button>
                        `).join('')}
                      </div>
                    </div>
                  </div>

                  <!-- Stop Generation Button -->
                  <button
                    type="button"
                    id="ai-btn-stop"
                    onclick="stopAIGeneration()"
                    class="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer hidden"
                  >
                    <i data-lucide="square" class="w-3 h-3"></i> Stop
                  </button>

                  <!-- Send Button -->
                  <button
                    type="submit"
                    id="ai-btn-send"
                    class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>Send</span> <i data-lucide="arrow-up" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 7. Component Rendering & Message Layout
  // =========================================================================
  function renderChatInterface() {
    const currentPersona = PERSONAS[chatState.activePersona] || PERSONAS.sentinel;
    const activeSession = getActiveSession();

    // Sync session title in header
    const titleEl = document.getElementById("ai-active-session-title");
    if (titleEl) titleEl.innerText = activeSession?.title || "AI Agent Studio";

    // Sync chatbar persona display
    const chatbarNameEl = document.getElementById("ai-chatbar-persona-name");
    if (chatbarNameEl) chatbarNameEl.innerText = currentPersona.name;
    const chatbarModelEl = document.getElementById("ai-chatbar-persona-model");
    if (chatbarModelEl) chatbarModelEl.innerText = currentPersona.model;

    // Sync input placeholder with persona name
    const inputEl = document.getElementById("ai-chat-input");
    if (inputEl && !inputEl.value) {
      inputEl.placeholder = `Ask ${currentPersona.name}... (e.g., "Audit today's timesheets against SRS requirements")`;
    }

    // Sync MCP toggle switch
    const mcpSwitch = document.getElementById("ai-mcp-toggle-switch");
    if (mcpSwitch) mcpSwitch.checked = chatState.mcpToolsEnabled;

    renderSessionsList();
    renderMessagesList();
    updateGenerationControls();
    scrollToChatBottom();
    if (window.lucide) lucide.createIcons();
  }

  function renderSessionsList() {
    const listEl = document.getElementById("ai-sessions-list");
    if (!listEl) return;

    const filtered = chatState.sessions.filter((s) => {
      if (!chatState.searchFilter) return true;
      return s.title.toLowerCase().includes(chatState.searchFilter.toLowerCase());
    });

    const countBadge = document.getElementById("ai-history-count-badge");
    if (countBadge) countBadge.innerText = chatState.sessions.length;

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="p-3 text-center text-slate-400 text-xs italic">
          No conversations found
        </div>`;
      return;
    }

    listEl.innerHTML = filtered
      .map((s) => {
        const isActive = s.id === chatState.activeSessionId;
        const count = s.messages ? s.messages.length : 0;
        return `
        <div onclick="switchAIChatSession('${s.id}')" class="ai-session-item group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
          isActive ? "bg-indigo-50/80 text-indigo-950 font-semibold border border-indigo-200/80" : "text-slate-700 hover:bg-slate-50 border border-transparent"
        }">
          <div class="flex items-center gap-2 min-w-0 pr-2">
            <i data-lucide="message-square" class="w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}"></i>
            <div class="min-w-0">
              <p class="text-xs font-medium truncate leading-tight">${escapeHtml(s.title)}</p>
              <p class="text-[9px] font-mono ${isActive ? "text-indigo-600" : "text-slate-400"} mt-0.5">
                ${count} msg${count === 1 ? "" : "s"} • ${new Date(s.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          </div>
          <button onclick="deleteAIChatSession('${s.id}', event)" title="Delete session" class="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 text-slate-400 transition-opacity cursor-pointer">
            <i data-lucide="x" class="w-3 h-3"></i>
          </button>
        </div>`;
      })
      .join("");
  }

  function renderEmptyHeroState() {
    let cardsHtml = "";
    PROMPT_SUGGESTIONS.forEach((p, idx) => {
      cardsHtml += `
        <div onclick="window.useAIPromptSuggestionByIndex(${idx})" class="ai-hero-card ${p.color} flex items-start gap-3">
          <div class="p-2 rounded-md bg-white border border-slate-200/80 shadow-2xs shrink-0 mt-0.5">
            <i data-lucide="${p.icon}" class="w-4 h-4 text-indigo-600"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-slate-900">${p.title}</h4>
            <p class="text-[11px] text-slate-500 leading-snug mt-0.5">${p.desc}</p>
          </div>
        </div>`;
    });

    return `
      <div class="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-8 px-4">
        <div class="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md mb-3">
          <i data-lucide="sparkles" class="w-6 h-6 text-indigo-400"></i>
        </div>
        <h2 class="text-lg font-black text-slate-900 tracking-tight mb-1">Yana AI Agent Studio</h2>
        <p class="text-xs text-slate-500 max-w-md leading-relaxed mb-6">
          Autonomous intelligence copilot with Model Context Protocol (MCP) tool execution, timesheet deliverables audits, and biometric attendance anomaly detection.
        </p>

        <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
          ${cardsHtml}
        </div>
      </div>`;
  }

  function renderUserMessage(m) {
    const avatarLetter = (window.state?.user?.sub || "A").charAt(0).toUpperCase();
    const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const promptTokens = m.tokens ? m.tokens.prompt : estimateTokens(m.content);

    return `
      <div class="flex justify-end ai-msg-row group max-w-3xl mx-auto w-full">
        <div class="flex items-start gap-2.5 max-w-xl">
          <div class="ai-msg-actions self-center">
            <button onclick="copyAIMessageContent('${m.id}')" title="Copy message" class="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <div class="ai-user-bubble px-4 py-3">
            <p class="text-xs leading-relaxed">${escapeHtml(m.content)}</p>
            <div class="flex items-center justify-end gap-2 mt-1.5 pt-1 border-t border-slate-800/60">
              <span class="ai-telemetry-badge ai-telemetry-badge-user">⚡ ${promptTokens} tokens</span>
              <span class="text-[9px] text-slate-400 font-mono">${timeStr}</span>
            </div>
          </div>

          <div class="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs">
            ${avatarLetter}
          </div>
        </div>
      </div>`;
  }

  function renderToolCallsBlock(toolCalls) {
    if (!toolCalls || !toolCalls.length) return "";
    let html = `
      <div class="space-y-1.5 my-2">
        <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <i data-lucide="cpu" class="w-3 h-3 text-indigo-600"></i> Model Context Protocol (MCP) Trace
        </div>`;
    toolCalls.forEach((t) => {
      html += renderMCPToolCard(t);
    });
    html += `</div>`;
    return html;
  }

  function renderMCPToolCard(tool) {
    const isSuccess = tool.status === "completed";
    const accordionId = "accordion_" + tool.id;
    return `
      <div class="mcp-trace-container">
        <div class="mcp-trace-header" onclick="toggleMCPPayloadAccordion('${accordionId}')">
          <div class="flex items-center gap-2 min-w-0 pr-2">
            <span class="w-2 h-2 rounded-full ${isSuccess ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}"></span>
            <code class="text-[11px] font-mono font-bold text-slate-800 truncate">${escapeHtml(tool.name)}</code>
            <span class="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
              ${escapeHtml(tool.server)}
            </span>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${isSuccess ? "mcp-trace-badge-success" : "mcp-trace-badge-running"}">
              ${isSuccess ? `✓ Success (${tool.latencyMs || 120}ms)` : "Executing..."}
            </span>
            <i data-lucide="chevron-down" id="chev-${accordionId}" class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200"></i>
          </div>
        </div>

        <div id="${accordionId}" class="p-2.5 bg-slate-950 border-t border-slate-800 space-y-2 hidden">
          <div>
            <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>ARGUMENTS (JSON)</span>
              <button onclick="navigator.clipboard.writeText('${escapeHtml(JSON.stringify(tool.input))}')" class="text-indigo-400 hover:text-white transition-colors cursor-pointer">
                Copy
              </button>
            </div>
            <pre class="mcp-terminal-box"><code>${syntaxHighlightJson(tool.input)}</code></pre>
          </div>

          ${
            tool.output
              ? `
          <div>
            <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>RETURN PAYLOAD (JSON)</span>
              <button onclick="navigator.clipboard.writeText('${escapeHtml(JSON.stringify(tool.output))}')" class="text-emerald-400 hover:text-white transition-colors cursor-pointer">
                Copy
              </button>
            </div>
            <pre class="mcp-terminal-box"><code>${syntaxHighlightJson(tool.output)}</code></pre>
          </div>`
              : ""
          }
        </div>
      </div>`;
  }

  function renderAssistantMessage(m) {
    const persona = PERSONAS[m.persona || chatState.activePersona] || PERSONAS.sentinel;
    const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Telemetry calculations
    const promptTok = m.tokens?.prompt || 18;
    const completionTok = m.tokens?.completion || estimateTokens(m.content);
    const totalTok = promptTok + completionTok;
    const durationSec = (m.latencyMs ? (m.latencyMs / 1000) : 1.15).toFixed(2);
    const tokPerSec = Math.round(completionTok / (m.latencyMs ? (m.latencyMs / 1000) : 1.15)) || 34;

    const thinkingHtml = m.thinking
      ? `
      <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
        <i data-lucide="brain" class="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5"></i>
        <div class="leading-relaxed"><strong class="font-bold text-slate-700">Reasoning Trace:</strong> ${escapeHtml(m.thinking)}</div>
      </div>`
      : "";

    const toolsHtml = renderToolCallsBlock(m.toolCalls);
    const bodyContent = m.content
      ? renderMarkdownToHtml(m.content)
      : m.isStreaming
      ? '<span class="ai-thinking-dots"><span></span><span></span><span></span></span>'
      : "";

    return `
      <div class="flex justify-start ai-msg-row group max-w-3xl mx-auto w-full">
        <div class="flex items-start gap-3 w-full">
          <div class="w-7 h-7 rounded-lg ${persona.avatarBg} text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
            <i data-lucide="${persona.avatarIcon}" class="w-4 h-4"></i>
          </div>

          <div class="flex-1 min-w-0 space-y-2">
            <!-- Header Metadata -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-900">${persona.name}</span>
                <span class="text-[9px] font-mono px-1.5 py-0.2 rounded border ${persona.badgeColor}">
                  ${persona.model}
                </span>
              </div>
              <span class="text-[10px] text-slate-400 font-mono">${timeStr}</span>
            </div>

            ${thinkingHtml}
            ${toolsHtml}

            <!-- Primary Message Content -->
            <div class="ai-assistant-body bg-white border border-slate-200 rounded-xl p-4 shadow-2xs ai-markdown-content" id="ai-msg-body-${m.id}">
              ${bodyContent}
            </div>

            <!-- Granular Token & Performance Telemetry Ribbon -->
            <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div class="flex items-center flex-wrap gap-1.5">
                <span class="ai-telemetry-badge" title="Response Latency">
                  <i data-lucide="clock" class="w-3 h-3 text-indigo-500"></i> ${durationSec}s
                </span>
                <span class="ai-telemetry-badge" title="Total Tokens (Input + Output)">
                  <i data-lucide="bar-chart-2" class="w-3 h-3 text-emerald-600"></i> ${totalTok} tok (in: ${promptTok} • out: ${completionTok})
                </span>
                <span class="ai-telemetry-badge hidden sm:inline-flex" title="Generation Throughput">
                  <i data-lucide="gauge" class="w-3 h-3 text-purple-600"></i> ${tokPerSec} tok/s
                </span>
              </div>

              <!-- Action Toolbar -->
              <div class="flex items-center gap-2 text-[11px] text-slate-400">
                <button onclick="copyAIMessageContent('${m.id}')" title="Copy text" class="hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer">
                  <i data-lucide="copy" class="w-3 h-3"></i> Copy
                </button>
                <span class="text-slate-200">•</span>
                <button onclick="window.rateAIMessage('${m.id}', 'up')" title="Helpful" class="hover:text-emerald-600 flex items-center gap-1 transition-colors cursor-pointer">
                  <i data-lucide="thumbs-up" class="w-3 h-3"></i>
                </button>
                <button onclick="window.rateAIMessage('${m.id}', 'down')" title="Unhelpful" class="hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer">
                  <i data-lucide="thumbs-down" class="w-3 h-3"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderMessagesList() {
    const container = document.getElementById("ai-chat-messages-container");
    if (!container) return;

    const s = getActiveSession();
    if (!s || !s.messages || s.messages.length === 0) {
      container.innerHTML = renderEmptyHeroState();
      return;
    }

    container.innerHTML = s.messages
      .map((m) => {
        return m.role === "user" ? renderUserMessage(m) : renderAssistantMessage(m);
      })
      .join("");
  }

  // =========================================================================
  // 8. Event Handlers & Global Hooks
  // =========================================================================
  window.handleAIChatSubmit = function (event) {
    if (event) event.preventDefault();
    const inputEl = document.getElementById("ai-chat-input");
    if (inputEl) {
      submitUserMessage(inputEl.value);
    }
  };

  window.handleAIChatKeydown = function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      window.handleAIChatSubmit();
    }
  };

  window.autoResizeAIChatTextarea = function (el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";

    // Update live token preview
    const preview = document.getElementById("ai-input-token-preview");
    if (preview) {
      const tok = estimateTokens(el.value);
      preview.innerText = `~${tok} tokens`;
    }
  };

  window.useAIPromptSuggestionByIndex = function (index) {
    const p = PROMPT_SUGGESTIONS[index];
    if (!p) return;
    const inputEl = document.getElementById("ai-chat-input");
    if (inputEl) {
      inputEl.value = p.prompt;
      window.autoResizeAIChatTextarea(inputEl);
      submitUserMessage(p.prompt);
    }
  };

  window.selectAIPersona = function (personaId) {
    chatState.activePersona = personaId;
    const s = getActiveSession();
    if (s) s.persona = personaId;
    saveSessionsToStorage();

    // Close chatbar model menu
    const menu = document.getElementById("ai-chatbar-model-menu");
    if (menu) menu.classList.add("hidden");
    const chev = document.getElementById("ai-chatbar-model-chevron");
    if (chev) chev.classList.remove("rotate-180");

    renderChatInterface();
    if (typeof showToast === "function") {
      showToast(`Switched active supervisor to ${PERSONAS[personaId]?.name}`, "info");
    }
  };

  window.setAIPersona = window.selectAIPersona;

  window.toggleAIChatbarModelMenu = function (event) {
    if (event) event.stopPropagation();
    const modelMenu = document.getElementById("ai-chatbar-model-menu");
    const toolsMenu = document.getElementById("ai-tools-menu");
    const historyPopover = document.getElementById("ai-history-popover");
    if (toolsMenu) toolsMenu.classList.add("hidden");
    if (historyPopover) historyPopover.classList.add("hidden");

    if (modelMenu) {
      const isHidden = modelMenu.classList.contains("hidden");
      modelMenu.classList.toggle("hidden", !isHidden);
      const chev = document.getElementById("ai-chatbar-model-chevron");
      if (chev) chev.classList.toggle("rotate-180", isHidden);
      if (isHidden && window.lucide) lucide.createIcons();
    }
  };

  window.toggleAIToolsMenu = function (event) {
    if (event) event.stopPropagation();
    const toolsMenu = document.getElementById("ai-tools-menu");
    const modelMenu = document.getElementById("ai-chatbar-model-menu");
    const historyPopover = document.getElementById("ai-history-popover");
    if (modelMenu) modelMenu.classList.add("hidden");
    if (historyPopover) historyPopover.classList.add("hidden");

    if (toolsMenu) {
      const isHidden = toolsMenu.classList.contains("hidden");
      toolsMenu.classList.toggle("hidden", !isHidden);
      if (isHidden && window.lucide) lucide.createIcons();
    }
  };

  window.toggleAIPersonaMenu = function (event) {
    // Retained as alias for toggleAIChatbarModelMenu
    window.toggleAIChatbarModelMenu(event);
  };

  window.toggleAIHistoryPopover = function (event) {
    if (event) event.stopPropagation();
    const popover = document.getElementById("ai-history-popover");
    const modelMenu = document.getElementById("ai-chatbar-model-menu");
    const toolsMenu = document.getElementById("ai-tools-menu");
    if (modelMenu) modelMenu.classList.add("hidden");
    if (toolsMenu) toolsMenu.classList.add("hidden");

    if (popover) {
      const isHidden = popover.classList.contains("hidden");
      popover.classList.toggle("hidden", !isHidden);
      if (isHidden) {
        renderSessionsList();
        if (window.lucide) lucide.createIcons();
      }
    }
  };

  window.toggleMCPTools = function (checked) {
    chatState.mcpToolsEnabled = checked;
    const mcpSwitch = document.getElementById("ai-mcp-toggle-switch");
    if (mcpSwitch) mcpSwitch.checked = checked;
    if (typeof showToast === "function") {
      showToast(`MCP tool execution ${checked ? "enabled" : "disabled"}`, "info");
    }
  };

  window.handleSearchAISessions = function (query) {
    chatState.searchFilter = query;
    renderSessionsList();
    if (window.lucide) lucide.createIcons();
  };

  window.toggleAIChatSidebar = function () {
    window.toggleAIHistoryPopover();
  };

  window.rateAIMessage = function (msgId, direction) {
    if (typeof showToast === "function") {
      showToast(direction === "up" ? "Feedback recorded: Helpful ✓" : "Feedback recorded: Unhelpful", "success");
    }
  };

  // Close menus when clicking outside
  document.addEventListener("click", function (e) {
    const toolsContainer = document.getElementById("ai-tools-menu-container");
    const toolsMenu = document.getElementById("ai-tools-menu");
    if (toolsMenu && !toolsContainer?.contains(e.target)) {
      toolsMenu.classList.add("hidden");
    }

    const modelContainer = document.getElementById("ai-chatbar-model-container");
    const modelMenu = document.getElementById("ai-chatbar-model-menu");
    if (modelMenu && !modelContainer?.contains(e.target)) {
      modelMenu.classList.add("hidden");
      const chev = document.getElementById("ai-chatbar-model-chevron");
      if (chev) chev.classList.remove("rotate-180");
    }

    const historyWrapper = document.getElementById("ai-history-dropdown-wrapper");
    const historyPopover = document.getElementById("ai-history-popover");
    if (historyPopover && !historyWrapper?.contains(e.target)) {
      historyPopover.classList.add("hidden");
    }
  });

  // Global Template & Initializer Hook
  window.getAdminAIChatTemplate = getAdminAIChatTemplate;

  window.initAdminAIChat = function () {
    loadSessionsFromStorage();
    renderChatInterface();
  };
})();
