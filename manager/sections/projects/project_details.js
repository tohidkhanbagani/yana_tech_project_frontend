// project_details.js

function getProjectCommandCenterTemplate() {
      const p = state.activeProject;
      const pTasks = (state.allTasks || []).filter((t) => String(t.project_id) === String(p.id));

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
                        <button onclick="closeProjectDetails()" class="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm focus:outline-none">
                            <i data-lucide="arrow-left" class="w-4.5 h-4.5 text-slate-600"></i>
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
                                    ${(function() {
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
                                        <i data-lucide="indian-rupee" class="w-3 h-3"></i> ${p.cost_type && p.cost_type !== "N/A" ? p.cost_type : "Internal / Non-Billable"}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approximate Cost</p>
                                <p class="text-sm font-bold text-slate-800 mt-1">${formatCurrency(p.approx_cost || 0)}</p>
                            </div>
                            <div>
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

async function loadProjectChecklistTemplates(projectId) {
      try {
        const templates = await apiFetch(`/checklists/templates/${projectId}`);

        const startContainer = document.getElementById("proj-settings-start-checklists");
        const endContainer = document.getElementById("proj-settings-end-checklists");
        if (!startContainer || !endContainer) return;

        let startHtml = "";
        let endHtml = "";

        templates.forEach(t => {
          const itemHtml = `
                      <div class="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm group">
                          <span class="text-sm font-medium text-slate-700">${t.task_description}</span>
                          <button onclick="deleteProjectChecklistTemplate('${t.id}', '${projectId}')" class="text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                              <i data-lucide="trash-2" class="w-4 h-4"></i>
                          </button>
                      </div>
                  `;
          if (t.phase === "START") startHtml += itemHtml;
          else if (t.phase === "END") endHtml += itemHtml;
        });

        startContainer.innerHTML = startHtml || '<p class="text-sm text-slate-400 italic p-3 text-center border border-dashed border-slate-200 rounded-lg">No start checklists defined.</p>';
        endContainer.innerHTML = endHtml || '<p class="text-sm text-slate-400 italic p-3 text-center border border-dashed border-slate-200 rounded-lg">No end checklists defined.</p>';
        lucide.createIcons();
      } catch (err) {
        console.error(err);
        showToast("Failed to load checklists", "error");
      }
}

async function loadProjectGatekeeperState(projectId) {
      const panel = document.getElementById("project-gatekeeper-state-panel");
      if (!panel) return;

      try {
        let startRes, endRes;
        if (state.projectChecklistsCache && String(state.activeProject?.id) === String(projectId)) {
          startRes = state.projectChecklistsCache.START;
          endRes = state.projectChecklistsCache.END;
        } else {
          [startRes, endRes] = await Promise.all([
            apiFetch(`/checklists/projects/${projectId}?phase=START`).catch(() => ({ items: [] })),
            apiFetch(`/checklists/projects/${projectId}?phase=END`).catch(() => ({ items: [] }))
          ]);
        }

        const startItems = startRes.items || [];
        const endItems = endRes.items || [];

        if (startItems.length === 0 && endItems.length === 0) {
          panel.innerHTML = '';
          return;
        }

        const renderChecklists = (items, colorClass, iconHtml) => {
          if (items.length === 0) return `<p class="text-xs text-slate-400 italic mt-2">No requirements defined.</p>`;
          return `<ul class="mt-3 space-y-2">` + items.map(item => `
                      <li class="flex items-start gap-2 text-sm">
                          ${item.is_checked ?
              `<i data-lucide="check-square" class="w-4 h-4 mt-0.5 ${colorClass}"></i><span class="text-slate-700 line-through opacity-70">${item.task_description}</span>` :
              `<i data-lucide="square" class="w-4 h-4 mt-0.5 text-slate-300"></i><span class="text-slate-700 font-medium">${item.task_description}</span>`
            }
                      </li>
                  `).join('') + `</ul>`;
        };

        panel.innerHTML = `
                  <h4 class="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <i data-lucide="list-checks" class="w-4 h-4 text-brand-primary"></i> Mandatory Phase Checklists
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                          <h5 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-indigo-500"></div> START PHASE</h5>
                          ${renderChecklists(startItems, "text-indigo-500")}
                      </div>
                      <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                          <h5 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-emerald-500"></div> END PHASE</h5>
                          ${renderChecklists(endItems, "text-emerald-500")}
                      </div>
                  </div>
              `;
        lucide.createIcons();
      } catch (err) {
        console.error("Failed to load gatekeeper state", err);
      }
}

async function openProjectDetails(projectId) {
      // Force strict string matching to prevent integer/string type conflicts
      const p = state.allProjects.find(
        (x) => String(x.id) === String(projectId),
      );
      if (!p) return;

      // ARCHITECTURE FIX: Keep the active tab if we are just refreshing the same project
      if (
        !state.activeProject ||
        String(state.activeProject.id) !== String(projectId)
      ) {
        state.activeProjectTab = "overview";
      }

      state.activeProject = p;

      try {
        const res = await apiFetch(`/projects/details/aggregated/${projectId}`);
        state.projectAssignments = Array.isArray(res.assignments) ? res.assignments : [];
        state.projectTimeline = Array.isArray(res.timeline) ? res.timeline : [];
        state.projectSRS = Array.isArray(res.srs) ? res.srs : [];
        state.projectExpenses = Array.isArray(res.expenses) ? res.expenses : [];
        state.activeProjectPayments = Array.isArray(res.payments) ? res.payments : [];
        state.allTasks = Array.isArray(res.tasks) ? res.tasks : [];
        state.projectChecklistsCache = {
            START: res.checklists_start || { phase: "START", items: [] },
            END: res.checklists_end || { phase: "END", items: [] }
        };
        state.activeSrsId = null; // Reset viewer
      } catch (err) {
        console.error("Failed to fetch project details:", err);
        state.projectAssignments = [];
        state.projectTimeline = [];
        state.projectSRS = [];
        state.projectExpenses = [];
        state.activeProjectPayments = [];
        state.allTasks = [];
        state.projectChecklistsCache = null;
      }

      renderAdminApp();
}

function closeProjectDetails() {
      state.activeProject = null;
      state.activeProjectTab = "overview";
      renderAdminApp();
}

async function exportProjectXLSX(projectId, projectName) {
      try {
        showToast("Preparing project Excel export...", "info");
        const token = localStorage.getItem(CONFIG.TOKEN_KEY);
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${CONFIG.API_BASE_URL}/projects/export/${projectId}`, {
          headers
        });

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
      renderAdminApp();
}

async function triggerProjectGatekeeper(projectId, phase) {
      try {
        // 1. Fetch the checklist state for this project & phase
        const res = await apiFetch(`/checklists/projects/${projectId}?phase=${phase}`);
        const items = res.items || [];

        if (items.length === 0) {
          // No checklists defined, proceed directly
          if (phase === "START") await executeProjectStatusChange(projectId, "In Progress");
          if (phase === "END") await executeProjectStatusChange(projectId, "Completed", "100%");
          return;
        }

        // 2. Render Modal
        let checksHtml = items.map(item => `
                  <label class="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                      <input type="checkbox" id="chk_${item.checklist_id}" class="gatekeeper-checkbox w-5 h-5 text-brand-primary rounded border-slate-300 focus:ring-brand-primary mt-0.5" ${item.is_checked ? 'checked' : ''} />
                      <span class="text-sm font-medium text-slate-700 leading-tight">${item.task_description}</span>
                  </label>
              `).join("");

        const modalHtml = `
                  <div class="space-y-4 mb-6">
                      <p class="text-sm text-slate-600">Please verify the following mandatory tasks before proceeding.</p>
                      <div class="space-y-3" id="gatekeeper-list">
                          ${checksHtml}
                      </div>
                  </div>
                  <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                      <button type="button" onclick="submitProjectGatekeeper('${projectId}', '${phase}')" class="px-6 py-2 bg-brand-primary hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-all flex items-center gap-2">
                          <i data-lucide="check" class="w-4 h-4"></i> Proceed
                      </button>
                  </div>
              `;

        openModal(phase === "START" ? "Project Start Checklist" : "Project End Checklist", modalHtml);

      } catch (err) {
        showToast("Failed to load checklist: " + err.message, "error");
      }
}

async function submitProjectGatekeeper(projectId, phase) {
      const checkboxes = document.querySelectorAll(".gatekeeper-checkbox");
      let allChecked = true;
      const itemsToSave = [];

      checkboxes.forEach(cb => {
        const checklistId = cb.id.replace("chk_", "");
        itemsToSave.push({ checklist_id: checklistId, is_checked: cb.checked });
        if (!cb.checked) allChecked = false;
      });

      if (!allChecked) {
        showToast("You must verify and check all items before proceeding.", "error");
        return;
      }

      try {
        // Save checklist state
        await apiFetch(`/checklists/projects/${projectId}/submit`, {
          method: "POST",
          body: { phase: phase, items: itemsToSave }
        });

        closeModal();
        showToast("Checklist verified.", "success");

        // Change Status
        if (phase === "START") await executeProjectStatusChange(projectId, "In Progress");
        if (phase === "END") await executeProjectStatusChange(projectId, "Completed", "100%");

      } catch (err) {
        showToast("Failed to verify checklist: " + err.message, "error");
      }
}

async function executeProjectStatusChange(projectId, status, progress = null) {
      try {
        const body = { status: status };
        if (progress) body.progress = progress;

        await apiFetch(`/projects/update/${projectId}`, {
          method: "PUT",
          body: body
        });
        showToast(`Project marked as ${status}!`, "success");
        await loadAdminWorkspaceData();
        await openProjectDetails(projectId);
      } catch (err) {
        showToast("Failed to update project status: " + err.message, "error");
      }
}
