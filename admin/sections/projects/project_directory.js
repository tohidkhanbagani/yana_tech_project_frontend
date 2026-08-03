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

    state.projectTimelineFilter = state.projectTimelineFilter || 'All';
    state.projectRiskFilter = state.projectRiskFilter || 'All';
    state.projectProfitFilter = state.projectProfitFilter || 'All';
    state.projectPaymentFilter = state.projectPaymentFilter || 'All';
    state.projectManagerFilter = state.projectManagerFilter || 'All';
    state.projectMonthFilter = state.projectMonthFilter || 'All';
    state.projectYearFilter = state.projectYearFilter || 'All';

    window.updateProjectFilter = (type, value) => {
    state[type] = value;
    renderAdminProjectsTable();
    };

    const managersList = [...new Set(allProjects.map(p => p.manager).filter(m => m && m !== 'N/A' && m !== 'N/A manager'))];

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

            <!-- Premium Filters Panel -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-7 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Timeline</label>
                    <select id="filterTimeline" onchange="updateProjectFilter('projectTimelineFilter', this.value)" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-brand-primary outline-none">
                        <option value="All" ${state.projectTimelineFilter === 'All' ? 'selected' : ''}>All Timelines</option>
                        <option value="StartedThisWeek" ${state.projectTimelineFilter === 'StartedThisWeek' ? 'selected' : ''}>Started This Week</option>
                        <option value="EndingThisWeek" ${state.projectTimelineFilter === 'EndingThisWeek' ? 'selected' : ''}>Ending This Week</option>
                        <option value="StartedThisMonth" ${state.projectTimelineFilter === 'StartedThisMonth' ? 'selected' : ''}>Started This Month</option>
                        <option value="EndingThisMonth" ${state.projectTimelineFilter === 'EndingThisMonth' ? 'selected' : ''}>Ending This Month</option>
                        <option value="StartedThisYear" ${state.projectTimelineFilter === 'StartedThisYear' ? 'selected' : ''}>Started This Year</option>
                        <option value="EndingThisYear" ${state.projectTimelineFilter === 'EndingThisYear' ? 'selected' : ''}>Ending This Year</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Risk Status</label>
                    <select id="filterRisk" onchange="updateProjectFilter('projectRiskFilter', this.value)" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-brand-primary outline-none">
                        <option value="All" ${state.projectRiskFilter === 'All' ? 'selected' : ''}>All Statuses</option>
                        <option value="At Risk" ${state.projectRiskFilter === 'At Risk' ? 'selected' : ''}>At Risk</option>
                        <option value="On Track" ${state.projectRiskFilter === 'On Track' ? 'selected' : ''}>On Track</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Profitability</label>
                    <select id="filterProfit" onchange="updateProjectFilter('projectProfitFilter', this.value)" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-brand-primary outline-none">
                        <option value="All" ${state.projectProfitFilter === 'All' ? 'selected' : ''}>All Profit levels</option>
                        <option value="Profitable" ${state.projectProfitFilter === 'Profitable' ? 'selected' : ''}>Profitable (Net &gt; 0)</option>
                        <option value="Loss Making" ${state.projectProfitFilter === 'Loss Making' ? 'selected' : ''}>Loss Making (Net &le; 0)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Status</label>
                    <select id="filterPayment" onchange="updateProjectFilter('projectPaymentFilter', this.value)" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-brand-primary outline-none">
                        <option value="All" ${state.projectPaymentFilter === 'All' ? 'selected' : ''}>All Payments</option>
                        <option value="Unpaid" ${state.projectPaymentFilter === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
                        <option value="Partial" ${state.projectPaymentFilter === 'Partial' ? 'selected' : ''}>Partial</option>
                        <option value="Paid in Full" ${state.projectPaymentFilter === 'Paid in Full' ? 'selected' : ''}>Paid in Full</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Manager</label>
                    <select id="filterManager" onchange="updateProjectFilter('projectManagerFilter', this.value)" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-brand-primary outline-none">
                        <option value="All" ${state.projectManagerFilter === 'All' ? 'selected' : ''}>All Managers</option>
                        ${managersList.map(mgr => `<option value="${mgr}" ${state.projectManagerFilter === mgr ? 'selected' : ''}>${mgr}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Month</label>
                    <select id="filterMonth" onchange="updateProjectFilter('projectMonthFilter', this.value)" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-brand-primary outline-none">
                        <option value="All" ${state.projectMonthFilter === 'All' ? 'selected' : ''}>All Months</option>
                        ${Array.from({length: 12}, (_, i) => `<option value="${i}" ${state.projectMonthFilter === String(i) ? 'selected' : ''}>${new Date(0, i).toLocaleString('default', {month: 'long'})}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Year</label>
                    <select id="filterYear" onchange="updateProjectFilter('projectYearFilter', this.value)" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-brand-primary outline-none">
                        <option value="All" ${state.projectYearFilter === 'All' ? 'selected' : ''}>All Years</option>
                        ${[2024, 2025, 2026, 2027].map(y => `<option value="${y}" ${state.projectYearFilter === String(y) ? 'selected' : ''}>${y}</option>`).join('')}
                    </select>
                </div>
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
                        <input type="text" onkeyup="updateProjectSearch(this.value)" placeholder="Search projects by name, client…" class="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none sm:text-sm transition-colors">
                    </div>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-left table-fixed border-collapse">
                        <thead class="bg-slate-50/50 border-b border-slate-200">
                            <tr class="text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                <th class="py-2.5 px-4 w-[22%]">Project Name</th>
                                <th class="py-2.5 px-4 w-[13%]">Client</th>
                                <th class="py-2.5 px-4 w-[15%]">Manager</th>
                                <th class="py-2.5 px-4 w-[18%]">Budget / Billing</th>
                                <th class="py-2.5 px-4 w-[14%]">Progress</th>
                                <th class="py-2.5 px-4 w-[10%]">Status</th>
                                <th class="py-2.5 px-4 w-[8%] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="admin-projects-tbody" class="divide-y divide-slate-100 bg-white">
                            <tr><td colspan="7" class="px-4 py-8 text-center text-slate-500"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-brand-primary"></i>Loading projects...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

    // CRITICAL FIX: Schedule table population AFTER the DOM has been updated.
    // The template returns a static "Loading projects..." placeholder in the tbody.
    // renderAdminProjectsTable() replaces it with actual rows, but it must run
    // AFTER renderAdminApp() finishes injecting the HTML via innerHTML.
    // setTimeout(fn, 0) defers to the next event loop tick, guaranteeing the DOM is ready.
    if (allProjects.length > 0) {
        setTimeout(renderAdminProjectsTable, 0);
    }

    return html;
}

function renderAdminProjectsTable() {
    const tbody = document.getElementById("admin-projects-tbody");
    if (!tbody) return;

    const timelineFilter = state.projectTimelineFilter || 'All';
    const riskFilter = state.projectRiskFilter || 'All';
    const profitFilter = state.projectProfitFilter || 'All';
    const paymentFilter = state.projectPaymentFilter || 'All';
    const managerFilter = state.projectManagerFilter || 'All';

    const parseDateLocal = (dateStr) => {
    if (!dateStr || dateStr === 'N/A') return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
    };

    const getWeekRange = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);
    return { start, end };
    };

    const isInCurrentWeek = (date) => {
    if (!date) return false;
    const now = new Date();
    const { start, end } = getWeekRange(now);
    return date >= start && date <= end;
    };

    const isInCurrentMonth = (date) => {
    if (!date) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    };

    const isInCurrentYear = (date) => {
    if (!date) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear();
    };

    const filtered = state.allProjects.filter((p) => {
    const searchMatch = !state.projectSearchTerm ? true :
        (p.name &&
        p.name.toLowerCase().includes(state.projectSearchTerm)) ||
        (p.client &&
        p.client.toLowerCase().includes(state.projectSearchTerm)) ||
        (p.manager &&
        p.manager.toLowerCase().includes(state.projectSearchTerm));

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

    // Timeline Filter
    let timelineMatch = true;
    if (timelineFilter !== 'All') {
        const start = parseDateLocal(p.start_date);
        const end = parseDateLocal(p.end_date);
        if (timelineFilter === 'StartedThisWeek') {
        timelineMatch = isInCurrentWeek(start);
        } else if (timelineFilter === 'EndingThisWeek') {
        timelineMatch = isInCurrentWeek(end);
        } else if (timelineFilter === 'StartedThisMonth') {
        timelineMatch = isInCurrentMonth(start);
        } else if (timelineFilter === 'EndingThisMonth') {
        timelineMatch = isInCurrentMonth(end);
        } else if (timelineFilter === 'StartedThisYear') {
        timelineMatch = isInCurrentYear(start);
        } else if (timelineFilter === 'EndingThisYear') {
        timelineMatch = isInCurrentYear(end);
        }
    }

    // Risk Filter
    let riskMatch = true;
    if (riskFilter !== 'All') {
        if (riskFilter === 'At Risk') {
        riskMatch = p.is_at_risk === true;
        } else if (riskFilter === 'On Track') {
        riskMatch = p.is_at_risk !== true;
        }
    }

    // Profitability Filter
    let profitMatch = true;
    if (profitFilter !== 'All') {
        const profitVal = parseFloat(p.profit || 0);
        if (profitFilter === 'Profitable') {
        profitMatch = profitVal > 0;
        } else if (profitFilter === 'Loss Making') {
        profitMatch = profitVal <= 0;
        }
    }

    // Payment Status Filter
    let paymentMatch = true;
    if (paymentFilter !== 'All') {
        paymentMatch = p.payment_status === paymentFilter;
    }

    // Manager Filter
    let managerMatch = true;
    if (managerFilter !== 'All') {
        managerMatch = p.manager === managerFilter;
    }

    // Month & Year Filter
    let monthMatch = true;
    let yearMatch = true;
    const start = parseDateLocal(p.start_date);
    
    if (state.projectMonthFilter && state.projectMonthFilter !== 'All') {
        monthMatch = start && start.getMonth() === parseInt(state.projectMonthFilter);
    }
    if (state.projectYearFilter && state.projectYearFilter !== 'All') {
        yearMatch = start && start.getFullYear() === parseInt(state.projectYearFilter);
    }

    return searchMatch && filterMatch && timelineMatch && riskMatch && profitMatch && paymentMatch && managerMatch && monthMatch && yearMatch;
    });

    if (filtered.length === 0) {
    tbody.innerHTML =
        '<tr><td colspan="7" class="px-6 py-12 text-center text-slate-500"><div class="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3"><i data-lucide="folder-open" class="w-8 h-8 text-slate-400"></i></div><p class="font-medium text-slate-900">No projects found</p><p class="text-xs">Adjust your filters or create a new project.</p></td></tr>';
    lucide.createIcons();
    return;
    }

    const formatCurrencyLocal = (amount) => {
      if (amount === null || amount === undefined) return `<span class="blur-financial font-mono">₹0</span>`;
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount);
      return `<span class="blur-financial font-mono">${formatted}</span>`;
    };

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
        const budgetVal = p.budget || 0;
        const clientCostVal = p.client_cost || 0;

        return `
            <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors group cursor-pointer" onclick="hideProjectTooltip(); openProjectDetails('${p.id}')">
                <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden">
                    <div class="flex flex-col relative truncate" onmouseenter="showProjectTooltip(event, '${p.id}')" onmouseleave="hideProjectTooltip()">
                        <span class="text-xs font-bold text-slate-800 hover:text-indigo-650 transition-colors truncate" title="${p.name !== "N/A" ? p.name : "Unnamed"}">${p.name !== "N/A" ? p.name : "Unnamed"}</span>
                        <span class="text-[10px] text-slate-450 font-semibold truncate mt-0.5" title="${p.cost_type && p.cost_type !== "N/A" ? p.cost_type : "General Project"}">${p.cost_type && p.cost_type !== "N/A" ? p.cost_type : "General Project"}</span>
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
                    <div class="flex flex-col truncate">
                        <span class="text-xs font-bold text-slate-800 truncate">${formatCurrencyLocal(budgetVal)} <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">(Budget)</span></span>
                        <span class="text-[10px] text-slate-450 font-bold mt-0.5 truncate">Billing: ${formatCurrencyLocal(clientCostVal)}</span>
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
                <td class="py-2.5 px-4 whitespace-nowrap">${statusBadge}</td>
                <td class="py-2.5 px-4 whitespace-nowrap text-right text-xs font-semibold">
                    <button onclick="event.stopPropagation(); openProjectModal('${p.id}')" class="text-slate-400 hover:text-brand-primary transition-colors p-1.5 hover:bg-slate-100 rounded-md">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="event.stopPropagation(); deleteProject('${p.id}')" class="text-slate-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-md ml-0.5">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </td>
            </tr>
        `;
    })
    .join("");

    lucide.createIcons();
}
