// project_directory.js

function getAdminProjectsTemplate() {
    if (state.activeProject) {
        return getProjectCommandCenterTemplate();
    }
    return getProjectListTemplate();
}

function getProjectListTemplate() {
    const allProjects = state.allProjects || [];
    const planningCount = allProjects.filter(p => p.status === 'Planning').length;
    const activeCount = allProjects.filter(p => p.status === 'In Progress' || p.status === 'Active').length;
    const completedCount = allProjects.filter(p => p.status === 'Completed').length;

    const html = `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-slate-900 tracking-tight">Project Directory</h3>
                        <p class="text-sm text-slate-500 mt-1">Manage all client projects, budgets, and operational statuses.</p>
                    </div>
                    <button onclick="openProjectModal()" class="inline-flex items-center px-4 py-2 bg-brand-primary hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
                        <i data-lucide="plus" class="w-4 h-4 mr-2"></i> New Project
                    </button>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between bg-slate-50/50 gap-4">
                        <div class="flex space-x-2 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-lg border border-slate-200" id="projectFilterContainer">
                            <button onclick="setProjectFilter('All', this)" class="px-4 py-1.5 text-sm font-medium rounded-md shadow-sm bg-white text-brand-primary transition-all whitespace-nowrap">All Projects</button>
                            <button onclick="setProjectFilter('Planning', this)" class="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md transition-all whitespace-nowrap">Planning (${planningCount})</button>
                            <button onclick="setProjectFilter('In Progress', this)" class="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md transition-all whitespace-nowrap">Active (${activeCount})</button>
                            <button onclick="setProjectFilter('Completed', this)" class="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md transition-all whitespace-nowrap">Completed (${completedCount})</button>
                        </div>
                        <div class="w-full sm:w-72 relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i data-lucide="search" class="w-4 h-4 text-slate-400"></i>
                            </div>
                            <input type="text" onkeyup="updateProjectSearch(this.value)" placeholder="Search projects by name, client..." class="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-primary sm:text-sm transition-all outline-none">
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left table-fixed border-collapse">
                            <thead class="bg-slate-50/50 border-b border-slate-200">
                                <tr class="text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                    <th class="py-2.5 px-4 w-[27%]">Project Name</th>
                                    <th class="py-2.5 px-4 w-[15%]">Client</th>
                                    <th class="py-2.5 px-4 w-[18%]">Manager</th>
                                    <th class="py-2.5 px-4 w-[18%]">Progress</th>
                                    <th class="py-2.5 px-4 w-[14%]">Project Status</th>
                                    <th class="py-2.5 px-4 w-[8%] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="admin-projects-tbody" class="divide-y divide-slate-100 bg-white">
                                <tr><td colspan="6" class="px-4 py-8 text-center text-slate-500"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-brand-primary"></i>Loading projects...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

    if (allProjects.length > 0) {
        setTimeout(renderAdminProjectsTable, 0);
    }

    return html;
}

function renderAdminProjectsTable() {
  const tbody = document.getElementById("admin-projects-tbody");
  if (!tbody) return;

  const filtered = state.allProjects.filter((p) => {
    const searchMatch =
      !state.projectSearchTerm ? true :
      (p.name && p.name.toLowerCase().includes(state.projectSearchTerm)) ||
      (p.client && p.client.toLowerCase().includes(state.projectSearchTerm)) ||
      (p.manager && p.manager.toLowerCase().includes(state.projectSearchTerm));

    let filterMatch = true;
    if (state.projectFilter !== "All" && state.projectFilter) {
      if (
        state.projectFilter === "In Progress" ||
        state.projectFilter === "Active"
      ) {
        filterMatch = p.status === "In Progress" || p.status === "Active";
      } else {
        filterMatch = p.status === state.projectFilter;
      }
    }
    return searchMatch && filterMatch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="px-6 py-12 text-center text-slate-500"><div class="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3"><i data-lucide="folder-open" class="w-8 h-8 text-slate-400"></i></div><p class="font-medium text-slate-900">No projects found</p><p class="text-xs">Adjust your filters or create a new project.</p></td></tr>';
    lucide.createIcons();
    return;
  }

  const getInitials = (name) =>
    name && name !== "N/A"
      ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
      : "U";

  tbody.innerHTML = filtered
    .map((p) => {
      let statusBadge = "";
      const stat = p.status || "Planning";

      if (stat === "In Progress" || stat === "Active") {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><span class="w-1 h-1 mr-1 bg-blue-500 rounded-full"></span>In Progress</span>`;
      } else if (stat === "Completed") {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1 h-1 mr-1 bg-emerald-500 rounded-full"></span>Completed</span>`;
      } else if (stat === "At Risk") {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><span class="w-1 h-1 mr-1 bg-amber-500 rounded-full animate-pulse"></span>At Risk</span>`;
      } else {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"><span class="w-1 h-1 mr-1 bg-slate-500 rounded-full"></span>${stat}</span>`;
      }

      const prog = p.progress && p.progress !== "N/A" ? p.progress : "0%";

      return `
            <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors group cursor-pointer" onclick="hideProjectTooltip(); openProjectDetails('${p.id}')">
                <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden">
                    <div class="flex flex-col relative truncate" onmouseenter="showProjectTooltip(event, '${p.id}')" onmouseleave="hideProjectTooltip()">
                        <span class="text-xs font-bold text-slate-800 hover:text-indigo-650 transition-colors truncate" title="${p.name !== "N/A" ? p.name : "Unnamed"}">${p.name !== "N/A" ? p.name : "Unnamed"}</span>
                        <span class="text-[10px] text-slate-455 font-semibold truncate mt-0.5" title="${p.cost_type && p.cost_type !== "N/A" ? p.cost_type : "General Project"}">${p.cost_type && p.cost_type !== "N/A" ? p.cost_type : "General Project"}</span>
                    </div>
                </td>
                <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden">
                    <span class="text-xs font-semibold text-slate-650 truncate block" title="${p.client !== "N/A" ? p.client : "--"}">${p.client !== "N/A" ? p.client : "--"}</span>
                </td>
                <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden">
                    <div class="flex items-center truncate">
                        <div class="w-5.5 h-5.5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[9px] font-black mr-2 shrink-0">
                            ${getInitials(p.manager)}
                        </div>
                        <span class="text-xs text-slate-700 font-semibold truncate" title="${p.manager !== "N/A" ? p.manager : "Unassigned"}">${p.manager !== "N/A" ? p.manager : "Unassigned"}</span>
                    </div>
                </td>
                <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden">
                    <div class="flex items-center w-full gap-2">
                        <span class="text-[10px] font-bold text-slate-755 w-7 shrink-0">${prog}</span>
                        <div class="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div class="h-1 bg-brand-primary rounded-full transition-all duration-500" style="width: ${prog}"></div>
                        </div>
                    </div>
                </td>
                <td class="py-2.5 px-4 whitespace-nowrap">
                    ${statusBadge}
                </td>
                <td class="py-2.5 px-4 whitespace-nowrap text-right text-xs font-semibold">
                    <div class="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="event.stopPropagation(); openProjectModal('${p.id}')" class="text-slate-400 hover:text-brand-primary p-1 bg-white border border-slate-200 rounded shadow-xs transition-colors" title="Edit">
                            <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="event.stopPropagation(); confirmDeleteProject('${p.id}')" class="text-slate-400 hover:text-brand-alert p-1 bg-white border border-slate-200 rounded shadow-xs transition-colors" title="Delete">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;
    })
    .join("");
  lucide.createIcons();
}
