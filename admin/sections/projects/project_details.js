// project_details.js

function getProjectCommandCenterTemplate() {
    const p = state.activeProject;
    const pTasks = state.allTasks.filter((t) => t.project_id === p.id);

    let statusColor = "bg-slate-500";
    if (p.status === "In Progress" || p.status === "Active")
    statusColor = "bg-blue-500";
    if (p.status === "At Risk") statusColor = "bg-amber-500";
    if (p.status === "Completed") statusColor = "bg-emerald-500";

    // Tab Navigation Builder
    const tabs = [
    { id: "overview", icon: "pie-chart", label: "Overview" },
    { id: "team", icon: "users", label: "Team & Assignments" },
    ...(p.project_type !== "Content" ? [{ id: "timeline", icon: "clock", label: "Timeline" }] : []),
    { id: "tasks", icon: "list-checks", label: "Task Ledger" },
    { id: "srs", icon: "file-text", label: "SRS & Docs" },
    { id: "expenses", icon: "dollar-sign", label: "Expenses" },
    { id: "payments", icon: "indian-rupee", label: "Payments" },
    { id: "checklists", icon: "shield-check", label: "Gatekeeper Config" },
    ];

    const tabsHtml = tabs
    .map(
        (t) => `
            <button onclick="switchProjectTab('${t.id}')" class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${state.activeProjectTab === t.id ? "border-brand-primary text-brand-primary" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}">
                <i data-lucide="${t.icon}" class="w-4 h-4"></i> ${t.label}
            </button>
        `,
    )
    .join("");

    let contentHtml = "";
    if (state.activeProjectTab === "overview")
    contentHtml = getProjectOverviewTab(p, pTasks);
    else if (state.activeProjectTab === "team")
    contentHtml = getProjectTeamTab(p);
    else if (state.activeProjectTab === "timeline")
    contentHtml = getProjectTimelineTab(p, pTasks);
    else if (state.activeProjectTab === "tasks")
    contentHtml = getProjectTasksTab(pTasks);
    else if (state.activeProjectTab === "srs")
    contentHtml = getProjectSRSTab(p);
    else if (state.activeProjectTab === "expenses")
    contentHtml = getProjectExpensesTab(p);
    else if (state.activeProjectTab === "payments")
    contentHtml = getProjectPaymentsTab(p);
    else if (state.activeProjectTab === "checklists")
    contentHtml = getProjectChecklistsTab(p);

    return `
            <div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <button onclick="closeProjectDetails()" aria-label="Back to projects list" class="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary cursor-pointer">
                        <i data-lucide="arrow-left" class="w-4.5 h-4.5 text-slate-600" aria-hidden="true"></i>
                    </button>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold text-slate-400 uppercase tracking-widest">Project Command Center</span>
                        <span class="relative flex h-2 w-2" title="Status: ${p.status}">
                            ${p.status === "In Progress" || p.status === "Active" ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${statusColor} opacity-75"></span>` : ""}
                            <span class="relative inline-flex rounded-full h-2 w-2 ${statusColor}"></span>
                        </span>
                    </div>
                </div>
                
                <div class="flex items-center gap-2">
                    <button onclick="event.stopPropagation(); exportProjectXLSX('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 text-brand-primary text-xs font-bold rounded-lg shadow-sm hover:bg-indigo-100 transition-colors flex items-center gap-1.5">
                        <i data-lucide="download" class="w-3.5 h-3.5"></i> Export Excel
                    </button>
                    <button onclick="event.stopPropagation(); openProjectModal('${p.id}')" class="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5">
                        <i data-lucide="edit" class="w-3.5 h-3.5"></i> Edit Settings
                    </button>
                    ${p.status === 'Planning' ? `
                    <button onclick="triggerProjectGatekeeper('${p.id}', 'START')" class="px-3.5 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
                        <i data-lucide="play" class="w-3.5 h-3.5"></i> Start Project
                    </button>` : ''}
                    ${p.status !== 'Completed' ? `
                    <button onclick="triggerProjectGatekeeper('${p.id}', 'END')" class="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
                        <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> End Project
                    </button>` : ''}
                </div>
            </div>

            <!-- Main Header: Project Profile & Scope Card -->
            <div class="mb-6 fade-in">
                <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div class="absolute -right-20 -top-20 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none"></div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 relative z-10">
                        <!-- Top Info: Name, Client, Manager -->
                        <div class="col-span-full border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 class="text-2xl font-black text-slate-800 tracking-tight">${p.name}</h2>
                                <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 mt-1">
                                    <span class="inline-flex items-center gap-1"><i data-lucide="briefcase" class="w-3.5 h-3.5 text-slate-400"></i> <strong class="text-slate-600">Client:</strong> ${p.client !== "N/A" ? p.client : "Internal / No Client"}</span>
                                    <span class="text-slate-300">•</span>
                                    <span class="inline-flex items-center gap-1"><i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i> <strong class="text-slate-600">Manager:</strong> ${p.manager || "Unassigned"}</span>
                                </div>
                            </div>
                            <div class="shrink-0 flex items-center gap-2">
                                <span class="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-bold text-brand-primary flex items-center gap-1.5">
                                    <span class="relative flex h-2 w-2">
                                        ${p.status === "In Progress" || p.status === "Active" ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${statusColor} opacity-75"></span>` : ""}
                                        <span class="relative inline-flex rounded-full h-2 w-2 ${statusColor}"></span>
                                    </span>
                                    ${p.status}
                                </span>
                                <span class="px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                    <i data-lucide="gauge" class="w-3.5 h-3.5"></i> Progress: ${p.progress || "0%"}
                                </span>
                            </div>
                        </div>

                        <!-- Description -->
                        <div class="col-span-full border-b border-slate-100 pb-3 flex items-start justify-between">
                            <div class="w-full">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Description & Scope</p>
                                <p class="text-sm text-slate-700 font-medium mt-1 leading-relaxed">${p.description && p.description !== "N/A" ? p.description : "No description provided for this project."}</p>
                            </div>
                        </div>

                        <!-- Platforms Grid / Column -->
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform(s)</p>
                            <div class="flex flex-wrap gap-1.5 mt-1.5">
                                ${(function () {
        const plats = p.project_platform && p.project_platform !== "N/A" ? p.project_platform.split(",").map(x => x.trim()).filter(Boolean) : ["Generic project"];
        return plats.map(plat => `
                                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-brand-primary shadow-sm">
                                            <i data-lucide="layers" class="w-3 h-3"></i> ${plat}
                                        </span>
                                    `).join("");
    })()}
                            </div>
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing & Cost Type</p>
                            <div class="flex items-center gap-2 mt-1.5">
                                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600">
                                    <i data-lucide="indian-rupee" class="w-3 h-3"></i> 
                                    ${(function () {
                                        if (p.cost_type === "Fixed Price") {
                                            return `Fixed Price (${p.billing_cycle || 'N/A'})`;
                                        } else if (p.cost_type === "Monthly Retainer") {
                                            return `Monthly Retainer: ${formatCurrency(p.billing_rate || 0)} / mo`;
                                        } else if (p.cost_type === "Time & Material" || p.cost_type === "Time and Material" || p.cost_type === "Hourly Billing") {
                                            const cycle = p.billing_cycle && p.billing_cycle !== "N/A" ? p.billing_cycle : "Monthly";
                                            const rate = formatCurrency(p.billing_rate || 0);
                                            return `Time & Material (${cycle}): ${rate}`;
                                        }
                                        return "Internal / Non-Billable";
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
                <div class="px-4 border-b border-slate-200 bg-slate-50/50 flex space-x-2 overflow-x-auto">
                    ${tabsHtml}
                </div>
                <div class="p-6 flex-1 bg-slate-50/30">
                    ${contentHtml}
                </div>
            </div>
        `;
}

async function deleteProjectChecklistTemplate(id, projectId) {
    if (!await customConfirm("Delete Item", "Are you sure you want to remove this checklist requirement?", "Delete", "Cancel", true)) return;
    try {
        await apiFetch(`/checklists/templates/${id}`, { method: "DELETE" });
        showToast("Item removed successfully", "success");
        loadProjectChecklistTemplates(projectId);
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function openProjectDetails(projectId) {
    const p = state.allProjects.find((x) => String(x.id) === String(projectId));
    if (!p) return;

    if (!state.activeProject || String(state.activeProject.id) !== String(projectId)) {
        state.activeProjectTab = "overview";
    }

    state.activeProject = p;
    sessionStorage.setItem("lastActiveProjectId", projectId);
    sessionStorage.setItem("lastActiveProjectTab", state.activeProjectTab);

    try {
        const res = await apiFetch(`/projects/details/aggregated/${projectId}`);
        state.projectAssignments = Array.isArray(res.assignments) ? res.assignments : [];
        state.projectTimeline = Array.isArray(res.timeline) ? res.timeline : [];
        state.projectSRS = Array.isArray(res.srs) ? res.srs : [];
        state.projectExpenses = Array.isArray(res.expenses) ? res.expenses : [];
        state.activeProjectPayments = Array.isArray(res.payments) ? res.payments : [];
        state.projectReceivables = Array.isArray(res.receivables) ? res.receivables : [];
        state.allTasks = Array.isArray(res.tasks) ? res.tasks : [];
        state.projectChecklistsCache = {
            START: res.checklists_start || { phase: "START", items: [] },
            END: res.checklists_end || { phase: "END", items: [] }
        };
        state.activeSrsId = null;
    } catch (err) {
        console.error("Failed to fetch project details:", err);
        state.projectAssignments = [];
        state.projectTimeline = [];
        state.projectSRS = [];
        state.projectExpenses = [];
        state.activeProjectPayments = [];
        state.projectReceivables = [];
        state.allTasks = [];
        state.projectChecklistsCache = null;
    }

    renderAdminApp();

    const todayStr = new Date().toISOString().split('T')[0];
    const dueReceivable = (state.projectReceivables || []).find(r => !r.is_done && r.due_date <= todayStr);
    if (dueReceivable) {
        setTimeout(() => {
        showReceivableReminderPopup(dueReceivable);
        }, 300);
    }
}

function closeProjectDetails() {
    state.activeProject = null;
    state.activeProjectTab = "overview";
    sessionStorage.removeItem("lastActiveProjectId");
    sessionStorage.removeItem("lastActiveProjectTab");
    renderAdminApp();
}

async function exportProjectXLSX(projectId, projectName) {
    try {
        showToast("Preparing project Excel export...", "info");
        const token = localStorage.getItem(CONFIG.TOKEN_KEY);
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${CONFIG.API_BASE_URL}/projects/export/${projectId}`, { headers });

        if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to download export file.");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const cleanName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        a.download = `project_${cleanName}_export.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showToast("Project Excel exported successfully!", "success");
    } catch (error) {
        console.error("Export error:", error);
        showToast("Failed to export project: " + error.message, "error");
    }
}

function switchProjectTab(tabName) {
    state.activeProjectTab = tabName;
    sessionStorage.setItem("lastActiveProjectTab", tabName);
    renderAdminApp();
}
