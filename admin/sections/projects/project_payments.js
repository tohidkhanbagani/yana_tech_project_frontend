/**
 * Yana OS - Universal Project Payments & Cash Flow Controller (PRB-090 Phase 2)
 * Module: frontend/admin/sections/projects/project_payments.js
 * Centralized governance of client payments, receivables, retainer recurrence & cash flow.
 */

(function () {
    // Controller state - Default to 'overview' (Project Inflows & Billing) as first section
    window.universalPaymentState = {
        activeTab: "overview", // "overview" (Projects Overview) | "payments" (Payment History) | "scheduled" (Scheduled Payments)
        searchQuery: "",
        selectedProject: "ALL",
        selectedClient: "ALL",
        selectedCostType: "ALL",
        selectedStatus: "ALL",
        dateRange: "ALL"
    };

    window.getAdminProjectPaymentsTemplate = function () {
        const summary = state.universalPaymentsSummary || {
            total_contract_value: 0,
            total_collected: 0,
            total_outstanding: 0,
            pending_receivables_count: 0,
            pending_receivables_amount: 0,
            overdue_receivables_count: 0,
            overdue_receivables_amount: 0,
            active_retainers_count: 0,
            project_breakdown: []
        };

        const formatCurrency = function (val) {
            if (typeof window.formatCurrency === "function") return window.formatCurrency(val);
            return `<span class="blur-financial font-mono">₹${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
        };

        const activeTab = window.universalPaymentState.activeTab;

        // Unique client options from state.allProjects
        const clientNames = Array.from(new Set(
            (state.allProjects || [])
                .map(p => p.client)
                .filter(c => c && c !== "N/A" && c.trim() !== "")
        )).sort();

        return `
        <div class="space-y-6 animate-in">
            <!-- Header Banner -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div class="absolute -right-16 -top-16 w-56 h-56 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none"></div>
                <div class="relative z-10">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">Financial Controller</span>
                        <span class="text-xs text-slate-400 font-semibold">• Universal Billing Hub</span>
                    </div>
                    <h1 class="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                        <i data-lucide="wallet-cards" class="w-6 h-6 text-indigo-600"></i> Project Payments & Receivables
                    </h1>
                    <p class="text-xs text-slate-500 font-medium mt-1">Universal cash-flow controller governing client payments, scheduled milestones, billing models, and project contract values.</p>
                </div>

                <div class="flex flex-wrap items-center gap-2.5 relative z-10">
                    <button onclick="openUniversalAddReceivableModal()" class="px-3.5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer">
                        <i data-lucide="plus-circle" class="w-4 h-4 text-indigo-600"></i> Set Up Receivable
                    </button>
                    <button onclick="openUniversalAddPaymentModal()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer">
                        <i data-lucide="plus" class="w-4 h-4"></i> Record Payment
                    </button>
                    <button onclick="exportUniversalPaymentsReport()" class="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition-colors hover:bg-slate-100 cursor-pointer" title="Export Financial Data">
                        <i data-lucide="download" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>

            <!-- Fintech KPI Ribbon (4 Metric Cards) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Total Contract Value -->
                <div class="fintech-card fintech-card-indigo p-5">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Contract Value</span>
                        <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <i data-lucide="layers" class="w-4 h-4"></i>
                        </div>
                    </div>
                    <div class="text-2xl font-black text-slate-800 tracking-tight blur-financial">${formatCurrency(summary.total_contract_value)}</div>
                    <div class="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-medium">
                        <span class="text-indigo-600 font-bold">${(state.allProjects || []).filter(p => p.cost_type !== "Internal / Non-Billable").length}</span> Billable Active Projects
                    </div>
                </div>

                <!-- Inflows Collected -->
                <div class="fintech-card fintech-card-emerald p-5">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Inflow Collected</span>
                        <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <i data-lucide="arrow-down-left" class="w-4 h-4"></i>
                        </div>
                    </div>
                    <div class="text-2xl font-black text-emerald-600 tracking-tight blur-financial">${formatCurrency(summary.total_collected)}</div>
                    <div class="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-medium">
                        <span class="text-emerald-600 font-bold">${(state.universalPayments || []).length}</span> Completed Transactions
                    </div>
                </div>

                <!-- Outstanding Receivables -->
                <div class="fintech-card fintech-card-amber p-5">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Balance</span>
                        <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <i data-lucide="clock" class="w-4 h-4"></i>
                        </div>
                    </div>
                    <div class="text-2xl font-black text-amber-600 tracking-tight blur-financial">${formatCurrency(summary.total_outstanding)}</div>
                    <div class="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-medium">
                        <span class="text-amber-600 font-bold">${summary.pending_receivables_count}</span> Pending Milestones / Retainers
                    </div>
                </div>

                <!-- Immediate Due / Overdue -->
                <div class="fintech-card fintech-card-rose p-5">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Immediate Due / Overdue</span>
                        <div class="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                            <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                        </div>
                    </div>
                    <div class="text-2xl font-black text-rose-600 tracking-tight blur-financial">${formatCurrency(summary.overdue_receivables_amount)}</div>
                    <div class="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-medium">
                        <span class="text-rose-600 font-bold ${summary.overdue_receivables_count > 0 ? 'animate-pulse' : ''}">${summary.overdue_receivables_count}</span> Overdue Invoices Requiring Action
                    </div>
                </div>
            </div>

            <!-- Operational Control Box -->
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <!-- Navigation Tabs (Reordered per user specification) -->
                <div class="border-b border-slate-200 px-6 pt-2 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                    <div class="flex items-center gap-2">
                        <!-- Section 1: Project Inflows & Billing (First) -->
                        <button onclick="switchUniversalPaymentTab('overview')" class="fintech-nav-tab ${activeTab === 'overview' ? 'active' : ''}">
                            <i data-lucide="layers" class="w-4 h-4"></i> Project Inflows & Billing
                            <span class="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${activeTab === 'overview' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}">${summary.project_breakdown?.length || 0}</span>
                        </button>
                        <!-- Section 2: Payment History (Second) -->
                        <button onclick="switchUniversalPaymentTab('payments')" class="fintech-nav-tab ${activeTab === 'payments' ? 'active' : ''}">
                            <i data-lucide="receipt" class="w-4 h-4"></i> Payment History
                            <span class="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${activeTab === 'payments' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}">${(state.universalPayments || []).length}</span>
                        </button>
                        <!-- Section 3: Scheduled Payments (Third) -->
                        <button onclick="switchUniversalPaymentTab('scheduled')" class="fintech-nav-tab ${activeTab === 'scheduled' ? 'active' : ''}">
                            <i data-lucide="calendar-clock" class="w-4 h-4"></i> Scheduled Payments
                            <span class="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${activeTab === 'scheduled' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}">${(state.universalReceivables || []).length}</span>
                        </button>
                    </div>

                    <!-- Quick Search Input -->
                    <div class="pb-2">
                        <div class="relative w-64">
                            <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                            <input type="text" id="universalPaymentSearch" placeholder="Search projects & payments..." 
                                   value="${window.universalPaymentState.searchQuery}"
                                   oninput="handleUniversalPaymentSearch(this.value)"
                                   class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 shadow-2xs">
                        </div>
                    </div>
                </div>

                <!-- Multi-Criteria Filter Bar -->
                <div class="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-3 text-xs">
                    <!-- Project Filter -->
                    <div class="flex items-center gap-1.5">
                        <label class="font-bold text-slate-500 uppercase text-[10px]">Project:</label>
                        <select id="filterPaymentProject" onchange="handleUniversalFilterChange('selectedProject', this.value)" class="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-indigo-500">
                            <option value="ALL" ${window.universalPaymentState.selectedProject === 'ALL' ? 'selected' : ''}>All Projects (${(state.allProjects || []).length})</option>
                            ${(state.allProjects || []).map(p => `
                                <option value="${p.id}" ${window.universalPaymentState.selectedProject === p.id ? 'selected' : ''}>${p.name}</option>
                            `).join("")}
                        </select>
                    </div>

                    <!-- Client Filter -->
                    <div class="flex items-center gap-1.5">
                        <label class="font-bold text-slate-500 uppercase text-[10px]">Client:</label>
                        <select id="filterPaymentClient" onchange="handleUniversalFilterChange('selectedClient', this.value)" class="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-indigo-500">
                            <option value="ALL" ${window.universalPaymentState.selectedClient === 'ALL' ? 'selected' : ''}>All Clients</option>
                            ${clientNames.map(c => `
                                <option value="${c}" ${window.universalPaymentState.selectedClient === c ? 'selected' : ''}>${c}</option>
                            `).join("")}
                        </select>
                    </div>

                    <!-- Cost Type Filter -->
                    <div class="flex items-center gap-1.5">
                        <label class="font-bold text-slate-500 uppercase text-[10px]">Model:</label>
                        <select id="filterPaymentCostType" onchange="handleUniversalFilterChange('selectedCostType', this.value)" class="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-indigo-500">
                            <option value="ALL" ${window.universalPaymentState.selectedCostType === 'ALL' ? 'selected' : ''}>All Billing Types</option>
                            <option value="Fixed Price" ${window.universalPaymentState.selectedCostType === 'Fixed Price' ? 'selected' : ''}>Fixed Price</option>
                            <option value="Time & Material" ${window.universalPaymentState.selectedCostType === 'Time & Material' ? 'selected' : ''}>Time & Material / Retainer</option>
                            <option value="Internal" ${window.universalPaymentState.selectedCostType === 'Internal' ? 'selected' : ''}>Internal / Non-Billable</option>
                        </select>
                    </div>

                    <!-- Status Filter (only shown in scheduled payments view) -->
                    ${activeTab === 'scheduled' ? `
                    <div class="flex items-center gap-1.5">
                        <label class="font-bold text-slate-500 uppercase text-[10px]">Status:</label>
                        <select id="filterPaymentStatus" onchange="handleUniversalFilterChange('selectedStatus', this.value)" class="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-indigo-500">
                            <option value="ALL" ${window.universalPaymentState.selectedStatus === 'ALL' ? 'selected' : ''}>All Statuses</option>
                            <option value="OVERDUE" ${window.universalPaymentState.selectedStatus === 'OVERDUE' ? 'selected' : ''}>Overdue (Past Due)</option>
                            <option value="PENDING" ${window.universalPaymentState.selectedStatus === 'PENDING' ? 'selected' : ''}>Upcoming / Nearing</option>
                            <option value="COMPLETED" ${window.universalPaymentState.selectedStatus === 'COMPLETED' ? 'selected' : ''}>Received</option>
                        </select>
                    </div>
                    ` : ''}

                    <!-- Reset Filters Button -->
                    <button onclick="resetUniversalPaymentFilters()" class="ml-auto text-slate-400 hover:text-rose-500 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer">
                        <i data-lucide="rotate-ccw" class="w-3 h-3"></i> Reset Filters
                    </button>
                </div>

                <!-- Tab Body Container -->
                <div class="p-0">
                    ${activeTab === "overview" ? renderUniversalProjectOverview() : activeTab === "payments" ? renderUniversalPaymentsTable() : renderUniversalScheduledPaymentsTable()}
                </div>
            </div>
        </div>
        `;
    };

    // =========================================================================
    // SECTION 1: Project Inflows & Billing (Projects Overview)
    // =========================================================================
    function renderUniversalProjectOverview() {
        const summary = state.universalPaymentsSummary || {};
        const breakdown = summary.project_breakdown || [];
        const formatCurrency = window.formatCurrency || (v => `<span class="blur-financial font-mono">₹${Number(v || 0).toLocaleString("en-IN")}</span>`);

        const filtered = breakdown.filter(p => {
            const matchesSearch = !window.universalPaymentState.searchQuery ||
                (p.name && p.name.toLowerCase().includes(window.universalPaymentState.searchQuery.toLowerCase())) ||
                (p.client && p.client.toLowerCase().includes(window.universalPaymentState.searchQuery.toLowerCase()));

            const matchesProject = window.universalPaymentState.selectedProject === "ALL" || p.id === window.universalPaymentState.selectedProject;
            const matchesClient = window.universalPaymentState.selectedClient === "ALL" || p.client === window.universalPaymentState.selectedClient;

            let matchesCostType = true;
            if (window.universalPaymentState.selectedCostType === "Fixed Price") matchesCostType = p.cost_type === "Fixed Price";
            else if (window.universalPaymentState.selectedCostType === "Time & Material") {
                matchesCostType = ["Time & Material", "Time and Material", "Monthly Retainer", "Hourly Billing"].includes(p.cost_type);
            } else if (window.universalPaymentState.selectedCostType === "Internal") {
                matchesCostType = p.cost_type === "Internal" || p.cost_type === "Internal / Non-Billable";
            }

            return matchesSearch && matchesProject && matchesClient && matchesCostType;
        });

        if (filtered.length === 0) {
            return `
                <div class="py-12 text-center text-slate-400">
                    <i data-lucide="layers" class="w-10 h-10 mx-auto text-slate-300 mb-2"></i>
                    <p class="text-sm font-semibold text-slate-600">No project contracts match this filter.</p>
                </div>
            `;
        }

        return `
            <div class="overflow-x-auto">
                <table class="payments-table">
                    <thead>
                        <tr>
                            <th class="text-left w-52">Project Name</th>
                            <th class="text-left w-36">Client</th>
                            <th class="text-left w-36">Billing / Cost Type</th>
                            <th class="text-left w-36">Rate / Terms</th>
                            <th class="text-left w-36">Next Invoice Date</th>
                            <th class="text-left w-36 font-bold text-slate-700">Contract Value</th>
                            <th class="text-left w-48">Total Received vs Balance</th>
                            <th class="text-right w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(p => {
                            const isRetainer = ["Time & Material", "Time and Material", "Monthly Retainer", "Hourly Billing"].includes(p.cost_type);
                            const percentCollected = p.client_cost > 0 ? Math.min(100, Math.round((p.total_paid / p.client_cost) * 100)) : 0;

                            return `
                                <tr class="transition-colors group hover:bg-slate-50">
                                    <td class="font-bold text-slate-800">
                                        <!-- Clicking project name opens the project details section of that project without reminder popups -->
                                        <a href="#" onclick="openProjectDetails('${p.id}'); return false;" class="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5 cursor-pointer">
                                            <span>${p.name}</span>
                                            <i data-lucide="external-link" class="w-3 h-3 text-slate-400"></i>
                                        </a>
                                    </td>
                                    <td class="text-slate-600 text-xs">${p.client || 'N/A'}</td>
                                    <td>
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isRetainer ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">
                                            ${p.cost_type || 'Fixed Price'}
                                        </span>
                                    </td>
                                    <td>
                                        ${isRetainer ? `
                                            <span class="font-bold text-emerald-600 text-xs blur-financial">${formatCurrency(p.billing_rate)}</span>
                                            <span class="text-[10px] text-slate-400 uppercase">/${p.billing_cycle || 'Monthly'}</span>
                                        ` : `
                                            <span class="text-xs text-slate-600 font-medium">${p.billing_cycle || 'Milestone / Upfront'}</span>
                                        `}
                                    </td>
                                    <td>
                                        ${isRetainer && p.next_billing_date && p.next_billing_date !== 'N/A' ? `
                                            <span class="font-mono text-xs font-bold text-slate-700 flex items-center gap-1">
                                                <i data-lucide="clock" class="w-3 h-3 text-indigo-500"></i>
                                                ${new Date(p.next_billing_date).toLocaleDateString()}
                                            </span>
                                        ` : `
                                            <span class="text-slate-400 text-xs italic">N/A</span>
                                        `}
                                    </td>
                                    <td class="font-bold text-slate-800 text-xs blur-financial">${formatCurrency(p.client_cost)}</td>
                                    <td>
                                        <div class="w-40">
                                            <div class="flex justify-between text-[10px] font-bold mb-1">
                                                <span class="text-emerald-600 blur-financial">${formatCurrency(p.total_paid)}</span>
                                                <span class="text-slate-400">${percentCollected}%</span>
                                            </div>
                                            <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div class="h-full bg-emerald-500 rounded-full" style="width: ${percentCollected}%"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="text-right whitespace-nowrap">
                                        <div class="flex items-center justify-end gap-1">
                                            <button onclick="openUniversalAddPaymentModal('${p.id}')" class="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all border border-emerald-200 cursor-pointer" title="Record Inflow for ${p.name}">
                                                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                                            </button>
                                            <button onclick="openProjectModal('${p.id}')" class="px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-bold transition-all border border-slate-200 flex items-center gap-1 cursor-pointer" title="Edit Billing & Recurrence Settings">
                                                <i data-lucide="sliders" class="w-3 h-3"></i> <span>Edit</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    // =========================================================================
    // SECTION 2: Payment History (Client Payments Ledger)
    // =========================================================================
    function renderUniversalPaymentsTable() {
        const rawPmts = state.universalPayments || [];
        const formatCurrency = window.formatCurrency || (v => `<span class="blur-financial font-mono">₹${Number(v || 0).toLocaleString("en-IN")}</span>`);

        const filtered = rawPmts.filter(pm => {
            const matchesSearch = !window.universalPaymentState.searchQuery ||
                (pm.project_name && pm.project_name.toLowerCase().includes(window.universalPaymentState.searchQuery.toLowerCase())) ||
                (pm.client_name && pm.client_name.toLowerCase().includes(window.universalPaymentState.searchQuery.toLowerCase())) ||
                (pm.reference_number && pm.reference_number.toLowerCase().includes(window.universalPaymentState.searchQuery.toLowerCase())) ||
                (pm.payment_method && pm.payment_method.toLowerCase().includes(window.universalPaymentState.searchQuery.toLowerCase())) ||
                (pm.remarks && pm.remarks.toLowerCase().includes(window.universalPaymentState.searchQuery.toLowerCase()));

            const matchesProject = window.universalPaymentState.selectedProject === "ALL" || pm.project_id === window.universalPaymentState.selectedProject;
            const matchesClient = window.universalPaymentState.selectedClient === "ALL" || pm.client_name === window.universalPaymentState.selectedClient;

            return matchesSearch && matchesProject && matchesClient;
        });

        if (filtered.length === 0) {
            return `
                <div class="py-12 text-center text-slate-400">
                    <i data-lucide="receipt-text" class="w-10 h-10 mx-auto text-slate-300 mb-2"></i>
                    <p class="text-sm font-semibold text-slate-600">No payment records found.</p>
                    <p class="text-xs text-slate-400 mt-1">Record client payments using the "+ Record Payment" button above.</p>
                </div>
            `;
        }

        return `
            <div class="overflow-x-auto">
                <table class="payments-table">
                    <thead>
                        <tr>
                            <!-- Column alignment strictly matched (Image 1 fix) -->
                            <th class="text-left w-28">PAYMENT DATE</th>
                            <th class="text-left w-36">PROJECT</th>
                            <th class="text-left w-32">CLIENT</th>
                            <th class="text-left w-36 font-black text-emerald-700">AMOUNT COLLECTED</th>
                            <th class="text-left w-36">PAYMENT METHOD</th>
                            <th class="text-left w-40">REFERENCE / CHEQUE #</th>
                            <th class="text-left">REMARKS & NOTES</th>
                            <th class="text-right w-20">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(pm => `
                            <!-- Clicking any entry row opens the detailed inspection modal of that entry -->
                            <tr class="transition-colors group clickable-row" onclick="openPaymentDetailsModal('${pm.id}')" title="Click to view payment transaction details">
                                <td class="font-mono text-xs text-slate-600 whitespace-nowrap text-left">
                                    ${pm.payment_date ? new Date(pm.payment_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td class="font-bold text-slate-800 text-left">
                                    <!-- Clicking project name opens the project details with payments tab active -->
                                    <a href="#" onclick="event.stopPropagation(); openProjectDetails('${pm.project_id}', 'payments'); return false;" class="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5 cursor-pointer">
                                        <span>${pm.project_name || 'Project'}</span>
                                        <i data-lucide="external-link" class="w-3 h-3 text-slate-400"></i>
                                    </a>
                                </td>
                                <td class="text-slate-600 text-xs text-left">${pm.client_name || 'Direct / Internal'}</td>
                                <td class="font-black text-emerald-600 text-left whitespace-nowrap text-xs blur-financial">
                                    ${formatCurrency(pm.amount)}
                                </td>
                                <td class="text-left">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1.5">
                                        <i data-lucide="${pm.payment_method === 'UPI' ? 'smartphone' : pm.payment_method === 'Cash' ? 'banknote' : 'landmark'}" class="w-3 h-3 text-slate-500"></i>
                                        <span>${pm.payment_method || 'Bank Transfer'}</span>
                                    </span>
                                </td>
                                <td class="font-mono text-xs text-slate-500 truncate max-w-[140px] text-left" title="${pm.reference_number}">
                                    ${pm.reference_number || 'N/A'}
                                </td>
                                <td class="text-xs text-slate-500 truncate max-w-[200px] text-left" title="${pm.remarks}">
                                    ${pm.remarks || 'N/A'}
                                </td>
                                <td class="text-right whitespace-nowrap">
                                    <div class="flex items-center justify-end gap-1.5" onclick="event.stopPropagation()">
                                        <button onclick="openEditPaymentModal('${pm.id}')" class="p-1.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors shadow-2xs cursor-pointer" title="Directly Edit Payment Entry">
                                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                                        </button>
                                        <button onclick="deleteUniversalPayment('${pm.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors shadow-2xs cursor-pointer" title="Delete Payment Record">
                                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    // =========================================================================
    // SECTION 3: Scheduled Payments (Scheduled Receivables)
    // =========================================================================
    function renderUniversalScheduledPaymentsTable() {
        const rawRecs = state.universalReceivables || [];
        const formatCurrency = window.formatCurrency || (v => `<span class="blur-financial font-mono">₹${Number(v || 0).toLocaleString("en-IN")}</span>`);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        // Filter records
        const filtered = rawRecs.filter(r => {
            const matchesSearch = !window.universalPaymentState.searchQuery || 
                (r.item_name && r.item_name.toLowerCase().includes(window.universalPaymentState.searchQuery.toLowerCase())) ||
                (r.project_name && r.project_name.toLowerCase().includes(window.universalPaymentState.searchQuery.toLowerCase())) ||
                (r.client_name && r.client_name.toLowerCase().includes(window.universalPaymentState.searchQuery.toLowerCase()));

            const matchesProject = window.universalPaymentState.selectedProject === "ALL" || r.project_id === window.universalPaymentState.selectedProject;
            const matchesClient = window.universalPaymentState.selectedClient === "ALL" || r.client_name === window.universalPaymentState.selectedClient;

            let matchesStatus = true;
            let diffDays = 0;
            if (r.due_date) {
                const dueParts = r.due_date.split("-");
                const dueDate = new Date(parseInt(dueParts[0]), parseInt(dueParts[1]) - 1, parseInt(dueParts[2]));
                dueDate.setHours(0, 0, 0, 0);
                diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            }

            const isPastDue = !r.is_done && diffDays < 0;
            const isNearing = !r.is_done && diffDays >= 0 && diffDays <= 7;

            if (window.universalPaymentState.selectedStatus === "OVERDUE") matchesStatus = isPastDue;
            else if (window.universalPaymentState.selectedStatus === "PENDING") matchesStatus = isNearing || (!r.is_done && diffDays > 7);
            else if (window.universalPaymentState.selectedStatus === "COMPLETED") matchesStatus = r.is_done;

            return matchesSearch && matchesProject && matchesClient && matchesStatus;
        });

        if (filtered.length === 0) {
            return `
                <div class="py-12 text-center text-slate-400">
                    <i data-lucide="calendar-x" class="w-10 h-10 mx-auto text-slate-300 mb-2"></i>
                    <p class="text-sm font-semibold text-slate-600">No scheduled payments match your filter criteria.</p>
                    <p class="text-xs text-slate-400 mt-1">Configure scheduled client payments using the "+ Set Up Receivable" button above.</p>
                </div>
            `;
        }

        return `
            <div class="overflow-x-auto">
                <table class="payments-table">
                    <thead>
                        <tr>
                            <th class="text-left w-52">Item / Deliverable</th>
                            <th class="text-left w-36">Project</th>
                            <th class="text-left w-32">Client</th>
                            <th class="text-left w-32">Frequency / Model</th>
                            <th class="text-left w-32">Due Date</th>
                            <th class="text-left w-36 font-bold text-slate-700">Expected Amount</th>
                            <th class="text-left w-36">Status</th>
                            <th class="text-right w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(r => {
                            let rowClass = "";
                            let statusBadge = "";
                            let diffDays = 0;

                            if (r.due_date) {
                                const dueParts = r.due_date.split("-");
                                const dueDate = new Date(parseInt(dueParts[0]), parseInt(dueParts[1]) - 1, parseInt(dueParts[2]));
                                dueDate.setHours(0, 0, 0, 0);
                                diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            }

                            if (r.is_done) {
                                rowClass = "";
                                statusBadge = `<span class="status-pill-paid whitespace-nowrap"><i data-lucide="check" class="w-3 h-3 shrink-0"></i> Received</span>`;
                            } else if (diffDays < 0) {
                                // Past receive date: compact single-line badge with dot separator
                                rowClass = "row-overdue";
                                const overdueDays = Math.abs(diffDays);
                                statusBadge = `<span class="status-pill-overdue whitespace-nowrap"><i data-lucide="alert-circle" class="w-3 h-3 shrink-0"></i> Overdue • ${overdueDays}d</span>`;
                            } else if (diffDays <= 7) {
                                // To be received or nearing its receive date: compact single-line badge
                                rowClass = "row-due-soon";
                                const label = diffDays === 0 ? "Due Today" : `Due in ${diffDays}d`;
                                statusBadge = `<span class="status-pill-due-soon whitespace-nowrap"><i data-lucide="clock" class="w-3 h-3 shrink-0"></i> ${label}</span>`;
                            } else {
                                rowClass = "";
                                statusBadge = `<span class="status-pill-pending whitespace-nowrap">Scheduled</span>`;
                            }

                            return `
                                <tr class="transition-colors group clickable-row ${rowClass}" onclick="openScheduledPaymentDetailsModal('${r.id}')" title="Click to inspect scheduled payment details">
                                    <td class="font-bold text-slate-800 text-left">
                                        <div class="flex items-center gap-2">
                                            <i data-lucide="${r.frequency === 'Monthly' ? 'repeat' : 'calendar'}" class="w-3.5 h-3.5 text-indigo-500 shrink-0"></i>
                                            <span class="truncate max-w-[180px]">${r.item_name}</span>
                                        </div>
                                    </td>
                                    <td class="font-medium text-slate-700 text-left">
                                        <!-- Clicking project name opens project details without reminder popups -->
                                        <a href="#" onclick="event.stopPropagation(); openProjectDetails('${r.project_id}'); return false;" class="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5 cursor-pointer">
                                            <span>${r.project_name || 'Project'}</span>
                                            <i data-lucide="external-link" class="w-3 h-3 text-slate-400"></i>
                                        </a>
                                    </td>
                                    <td class="text-slate-600 text-xs text-left">${r.client_name || 'Internal / Direct'}</td>
                                    <td class="text-left">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">${r.frequency}</span>
                                    </td>
                                    <td class="font-mono text-xs text-left whitespace-nowrap ${diffDays < 0 && !r.is_done ? 'text-rose-600 font-bold' : diffDays <= 7 && !r.is_done ? 'text-amber-700 font-bold' : 'text-slate-600'}">
                                        ${r.due_date ? new Date(r.due_date).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td class="font-bold text-left whitespace-nowrap blur-financial ${diffDays < 0 && !r.is_done ? 'text-rose-700' : 'text-slate-800'}">${formatCurrency(r.amount)}</td>
                                    <td class="text-left whitespace-nowrap">${statusBadge}</td>
                                    <td class="text-right whitespace-nowrap">
                                        <div class="flex items-center justify-end gap-1.5" onclick="event.stopPropagation()">
                                            ${!r.is_done ? `
                                            <button onclick="handleUniversalReceivableDone('${r.id}')" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer" title="Mark Paid & Auto-Record Inflow">
                                                <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> <span>Received</span>
                                            </button>
                                            ` : ''}
                                            <button onclick="deleteUniversalReceivable('${r.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors shadow-2xs cursor-pointer" title="Delete Scheduled Item">
                                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    // =========================================================================
    // MODAL: Payment Transaction Details (Inspection View - PRB-090 Phase 3)
    // =========================================================================
    window.openPaymentDetailsModal = function (paymentId) {
        const pmts = state.universalPayments || [];
        const pm = pmts.find(p => p.id === paymentId);
        if (!pm) {
            showToast("Payment record not found.", "error");
            return;
        }

        const formatCurrency = window.formatCurrency || (v => `<span class="blur-financial font-mono">₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`);
        const pDate = pm.payment_date ? new Date(pm.payment_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "N/A";

        const html = `
            <div class="space-y-4">
                <!-- Top Header Banner -->
                <div class="bg-gradient-to-r from-slate-900 to-slate-800 p-5 rounded-2xl text-white relative overflow-hidden shadow-sm">
                    <div class="absolute right-0 top-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div class="flex items-center justify-between relative z-10 mb-2">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <i data-lucide="check-circle-2" class="w-3 h-3"></i> Verified Inflow
                        </span>
                        <span class="text-[10px] font-mono text-slate-400">ID: ${paymentId.substring(0, 8)}</span>
                    </div>
                    <div class="text-3xl font-black text-emerald-400 tracking-tight mb-1 blur-financial">${formatCurrency(pm.amount)}</div>
                    <p class="text-xs text-slate-300 font-medium">Logged on ${pDate}</p>
                </div>

                <!-- 2x2 Details Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div class="detail-field-box">
                        <div class="detail-field-label">Target Project</div>
                        <div class="detail-field-value text-indigo-600 flex items-center gap-1">
                            <a href="#" onclick="closeModal(); openProjectDetails('${pm.project_id}', 'payments'); return false;" class="hover:underline flex items-center gap-1 font-bold">
                                ${pm.project_name || 'Project'} <i data-lucide="external-link" class="w-3 h-3 text-slate-400"></i>
                            </a>
                        </div>
                    </div>

                    <div class="detail-field-box">
                        <div class="detail-field-label">Client Account</div>
                        <div class="detail-field-value">${pm.client_name || 'Direct / Internal'}</div>
                    </div>

                    <div class="detail-field-box">
                        <div class="detail-field-label">Payment Method</div>
                        <div class="detail-field-value flex items-center gap-1.5">
                            <i data-lucide="${pm.payment_method === 'UPI' ? 'smartphone' : pm.payment_method === 'Cash' ? 'banknote' : 'landmark'}" class="w-3.5 h-3.5 text-slate-500"></i>
                            <span>${pm.payment_method || 'Bank Transfer'}</span>
                        </div>
                    </div>

                    <div class="detail-field-box">
                        <div class="detail-field-label">Transaction Ref / Cheque #</div>
                        <div class="detail-field-value font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block text-[11px]">${pm.reference_number || 'N/A'}</div>
                    </div>
                </div>

                <!-- Remarks Box -->
                <div class="detail-field-box">
                    <div class="detail-field-label">Remarks & Operational Notes</div>
                    <p class="text-xs text-slate-700 leading-relaxed font-medium mt-1">${(pm.remarks && pm.remarks !== 'N/A' ? pm.remarks : 'No additional remarks logged for this transaction.').replace(/</g, '&lt;')}</p>
                </div>

                <!-- Action Footer -->
                <div class="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                    <button type="button" onclick="closeModal(); deleteUniversalPayment('${paymentId}');" class="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete Record
                    </button>
                    <div class="flex items-center gap-2.5">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors cursor-pointer">Close</button>
                        <!-- Primary edit trigger inside detailed modal -->
                        <button type="button" onclick="openEditPaymentModal('${paymentId}')" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                            <i data-lucide="edit-3" class="w-4 h-4"></i> Edit Entry
                        </button>
                    </div>
                </div>
            </div>
        `;

        openModal("Payment Transaction Details", html);
        if (window.lucide) lucide.createIcons();
    };

    // =========================================================================
    // MODAL: Scheduled Payment Details (Inspection View - PRB-090 Phase 3)
    // =========================================================================
    window.openScheduledPaymentDetailsModal = function (receivableId) {
        const recs = state.universalReceivables || [];
        const r = recs.find(x => x.id === receivableId);
        if (!r) {
            showToast("Scheduled payment record not found.", "error");
            return;
        }

        const formatCurrency = window.formatCurrency || (v => `<span class="blur-financial font-mono">₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`);
        const dueDateStr = r.due_date ? new Date(r.due_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "N/A";
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let diffDays = 0;
        if (r.due_date) {
            const dueParts = r.due_date.split("-");
            const dueDate = new Date(parseInt(dueParts[0]), parseInt(dueParts[1]) - 1, parseInt(dueParts[2]));
            dueDate.setHours(0, 0, 0, 0);
            diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        const isOverdue = !r.is_done && diffDays < 0;
        const isNearing = !r.is_done && diffDays >= 0 && diffDays <= 7;

        const html = `
            <div class="space-y-4">
                <!-- Top Header Banner -->
                <div class="${isOverdue ? 'bg-gradient-to-r from-rose-900 to-rose-800' : isNearing ? 'bg-gradient-to-r from-amber-900 to-amber-800' : 'bg-gradient-to-r from-slate-900 to-slate-800'} p-5 rounded-2xl text-white relative overflow-hidden shadow-sm">
                    <div class="flex items-center justify-between relative z-10 mb-2">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isOverdue ? 'bg-rose-500/20 text-rose-200 border border-rose-500/30' : isNearing ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30' : 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30'} flex items-center gap-1">
                            <i data-lucide="${isOverdue ? 'alert-circle' : isNearing ? 'clock' : 'calendar'}" class="w-3 h-3"></i>
                            ${r.is_done ? 'Received' : isOverdue ? `Overdue (${Math.abs(diffDays)} Days Past)` : isNearing ? `Due in ${diffDays} Days` : 'Scheduled Inflow'}
                        </span>
                        <span class="text-[10px] font-mono text-slate-400">ID: ${receivableId.substring(0, 8)}</span>
                    </div>
                    <div class="text-3xl font-black blur-financial ${isOverdue ? 'text-rose-300' : isNearing ? 'text-amber-300' : 'text-emerald-400'} tracking-tight mb-1">${formatCurrency(r.amount)}</div>
                    <p class="text-xs text-slate-200 font-medium">Due on ${dueDateStr}</p>
                </div>

                <!-- 2x2 Details Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div class="detail-field-box">
                        <div class="detail-field-label">Item / Charge Description</div>
                        <div class="detail-field-value font-bold text-slate-900">${r.item_name}</div>
                    </div>

                    <div class="detail-field-box">
                        <div class="detail-field-label">Target Project</div>
                        <div class="detail-field-value text-indigo-600">
                            <a href="#" onclick="closeModal(); openProjectDetails('${r.project_id}'); return false;" class="hover:underline flex items-center gap-1 font-bold">
                                ${r.project_name || 'Project'} <i data-lucide="external-link" class="w-3 h-3 text-slate-400"></i>
                            </a>
                        </div>
                    </div>

                    <div class="detail-field-box">
                        <div class="detail-field-label">Client Account</div>
                        <div class="detail-field-value">${r.client_name || 'Direct / Internal'}</div>
                    </div>

                    <div class="detail-field-box">
                        <div class="detail-field-label">Billing Recurrence / Frequency</div>
                        <div class="detail-field-value font-mono bg-white px-2 py-0.5 rounded border border-slate-200 inline-block text-[11px]">${r.frequency || 'Custom Date'}</div>
                    </div>
                </div>

                <!-- Action Footer -->
                <div class="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                    <button type="button" onclick="closeModal(); deleteUniversalReceivable('${receivableId}');" class="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete Setup
                    </button>
                    <div class="flex items-center gap-2.5">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors cursor-pointer">Close</button>
                        ${!r.is_done ? `
                        <button type="button" onclick="closeModal(); handleUniversalReceivableDone('${receivableId}');" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                            <i data-lucide="check-circle" class="w-4 h-4"></i> Mark Received
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        openModal("Scheduled Payment Details", html);
        if (window.lucide) lucide.createIcons();
    };

    // =========================================================================
    // MODAL: Edit Payment Entry (PRB-090 Phase 2 & 3)
    // =========================================================================
    window.openEditPaymentModal = function (paymentId) {
        const pmts = state.universalPayments || [];
        const pm = pmts.find(p => p.id === paymentId);
        if (!pm) {
            showToast("Payment record not found.", "error");
            return;
        }

        let dateVal = "";
        if (pm.payment_date) {
            try {
                dateVal = new Date(pm.payment_date).toISOString().split("T")[0];
            } catch (e) {
                dateVal = "";
            }
        }

        const html = `
            <form onsubmit="handleUniversalPaymentUpdate(event, '${paymentId}')" class="space-y-4">
                <div class="bg-indigo-50 p-3.5 rounded-xl border border-indigo-100 mb-2 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <h4 class="text-xs font-bold text-indigo-950">Edit Payment Entry</h4>
                            <p class="text-[11px] text-indigo-700">Update verified client transaction details and payment references.</p>
                        </div>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-indigo-200 text-indigo-800 font-bold">ID: ${paymentId.substring(0, 8)}</span>
                </div>

                <!-- Read-only Project & Client info -->
                <div class="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div>
                        <span class="block text-[10px] font-bold text-slate-400 uppercase">Project</span>
                        <span class="text-xs font-bold text-slate-800">${pm.project_name || 'Project'}</span>
                    </div>
                    <div>
                        <span class="block text-[10px] font-bold text-slate-400 uppercase">Client</span>
                        <span class="text-xs font-bold text-slate-800">${pm.client_name || 'Direct / Internal'}</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Amount Collected (₹) *</label>
                        <input type="number" id="u_edit_pay_amount" value="${pm.amount || 0}" required step="0.01" min="0.01" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-bold text-emerald-700">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Date *</label>
                        <input type="date" id="u_edit_pay_date" value="${dateVal}" required class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-mono">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method</label>
                        <select id="u_edit_pay_method" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-semibold">
                            <option value="Bank Transfer" ${pm.payment_method === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer (NEFT/IMPS/RTGS)</option>
                            <option value="UPI" ${pm.payment_method === 'UPI' ? 'selected' : ''}>UPI</option>
                            <option value="Cash" ${pm.payment_method === 'Cash' ? 'selected' : ''}>Cash</option>
                            <option value="Cheque" ${pm.payment_method === 'Cheque' ? 'selected' : ''}>Cheque</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Reference / Cheque #</label>
                        <input type="text" id="u_edit_pay_ref" value="${(pm.reference_number || '').replace(/"/g, '&quot;')}" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-mono" placeholder="Transaction ID">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Remarks & Notes</label>
                    <textarea id="u_edit_pay_remarks" rows="2" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm resize-none" placeholder="Notes, installments, etc.">${(pm.remarks || '').replace(/</g, '&lt;')}</textarea>
                </div>

                <div id="uEditPaymentErrorBanner" class="hidden bg-rose-50 border border-rose-200 text-rose-600 px-3.5 py-2.5 rounded-lg text-xs items-center shadow-sm">
                    <i data-lucide="alert-circle" class="w-4 h-4 mr-2 shrink-0"></i>
                    <span id="uEditPaymentErrorMessage">Error</span>
                </div>

                <div class="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                    <button type="button" onclick="closeModal(); deleteUniversalPayment('${paymentId}');" class="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete Entry
                    </button>
                    <div class="flex items-center gap-2.5">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors cursor-pointer">Cancel</button>
                        <button type="submit" id="btnSubmitUEditPayment" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                            <i data-lucide="save" class="w-4 h-4"></i> Save Changes
                        </button>
                    </div>
                </div>
            </form>
        `;

        openModal("Edit Payment Details", html);
        if (window.lucide) lucide.createIcons();
    };

    window.handleUniversalPaymentUpdate = async function (event, paymentId) {
        event.preventDefault();
        const btn = document.getElementById("btnSubmitUEditPayment");
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Saving...';
        btn.disabled = true;

        try {
            const dateInput = document.getElementById("u_edit_pay_date").value;
            const payload = {
                amount: parseFloat(document.getElementById("u_edit_pay_amount").value),
                payment_date: dateInput ? new Date(dateInput).toISOString() : null,
                payment_method: document.getElementById("u_edit_pay_method").value,
                reference_number: document.getElementById("u_edit_pay_ref").value || "N/A",
                remarks: document.getElementById("u_edit_pay_remarks").value || "N/A"
            };

            await apiFetch(`/projects/payments/update/${paymentId}`, {
                method: "PUT",
                body: payload
            });

            showToast("Payment record updated successfully", "success");
            closeModal();
            await lazyLoadViewData("project_payments");
            renderAdminApp();
        } catch (err) {
            const errBanner = document.getElementById("uEditPaymentErrorBanner");
            const errSpan = document.getElementById("uEditPaymentErrorMessage");
            if (errSpan) errSpan.innerText = err.message;
            if (errBanner) {
                errBanner.classList.remove("hidden");
                errBanner.classList.add("flex");
            }
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    // Tab switcher
    window.switchUniversalPaymentTab = function (tabId) {
        window.universalPaymentState.activeTab = tabId;
        renderAdminApp();
    };

    // Filter handlers
    window.handleUniversalPaymentSearch = function (val) {
        window.universalPaymentState.searchQuery = val || "";
        renderAdminApp();
        const inp = document.getElementById("universalPaymentSearch");
        if (inp) {
            inp.focus();
            inp.selectionStart = inp.selectionEnd = inp.value.length;
        }
    };

    window.handleUniversalFilterChange = function (field, val) {
        window.universalPaymentState[field] = val;
        renderAdminApp();
    };

    window.resetUniversalPaymentFilters = function () {
        window.universalPaymentState = {
            activeTab: window.universalPaymentState.activeTab,
            searchQuery: "",
            selectedProject: "ALL",
            selectedClient: "ALL",
            selectedCostType: "ALL",
            selectedStatus: "ALL",
            dateRange: "ALL"
        };
        renderAdminApp();
    };

    // =========================================================================
    // MODAL: Record Client Payment
    // =========================================================================
    window.openUniversalAddPaymentModal = function (preselectedProjectId = null) {
        const projects = state.allProjects || [];
        const projectOptions = projects.map(p => `
            <option value="${p.id}" ${preselectedProjectId === p.id ? 'selected' : ''}>${p.name} ${p.client && p.client !== 'N/A' ? `(${p.client})` : ''}</option>
        `).join("");

        const todayStr = new Date().toISOString().split("T")[0];

        const html = `
            <form onsubmit="handleUniversalPaymentSave(event)" class="space-y-4">
                <div class="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 mb-2 flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <i data-lucide="arrow-down-left" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-emerald-900">Record Client Payment</h4>
                        <p class="text-[11px] text-emerald-700">Logs a verified incoming payment into the project ledger and updates cash flow metrics.</p>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Select Project *</label>
                    <select id="u_pay_project_id" required class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-semibold text-slate-800">
                        <option value="">-- Choose Project --</option>
                        ${projectOptions}
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Amount (₹) *</label>
                        <input type="number" id="u_pay_amount" required step="0.01" min="1" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-bold text-emerald-700" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Date *</label>
                        <input type="date" id="u_pay_date" value="${todayStr}" required class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-mono">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method</label>
                        <select id="u_pay_method" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-semibold">
                            <option value="Bank Transfer">Bank Transfer (NEFT/IMPS/RTGS)</option>
                            <option value="UPI">UPI</option>
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Transaction Ref / Cheque #</label>
                        <input type="text" id="u_pay_ref" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-mono" placeholder="e.g. TXN123456789">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Remarks / Notes</label>
                    <textarea id="u_pay_remarks" rows="2" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm resize-none" placeholder="Milestone 1 settlement, advance, etc."></textarea>
                </div>

                <div id="uPaymentErrorBanner" class="hidden bg-rose-50 border border-rose-200 text-rose-600 px-3.5 py-2.5 rounded-lg text-xs items-center shadow-sm">
                    <i data-lucide="alert-circle" class="w-4 h-4 mr-2 shrink-0"></i>
                    <span id="uPaymentErrorMessage">Error</span>
                </div>

                <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors cursor-pointer">Cancel</button>
                    <button type="submit" id="btnSubmitUPayment" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                        <i data-lucide="check" class="w-4 h-4"></i> Save Payment
                    </button>
                </div>
            </form>
        `;
        openModal("Record Client Payment", html);
        if (window.lucide) lucide.createIcons();
    };

    window.handleUniversalPaymentSave = async function (event) {
        event.preventDefault();
        const btn = document.getElementById("btnSubmitUPayment");
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Processing...';
        btn.disabled = true;

        try {
            const payload = {
                project_id: document.getElementById("u_pay_project_id").value,
                amount: parseFloat(document.getElementById("u_pay_amount").value),
                payment_date: new Date(document.getElementById("u_pay_date").value).toISOString(),
                payment_method: document.getElementById("u_pay_method").value,
                reference_number: document.getElementById("u_pay_ref").value || "N/A",
                remarks: document.getElementById("u_pay_remarks").value || "N/A"
            };

            await apiFetch("/projects/payments/create", {
                method: "POST",
                body: payload
            });

            showToast("Payment logged successfully", "success");
            closeModal();
            await lazyLoadViewData("project_payments");
            renderAdminApp();
        } catch (err) {
            const errBanner = document.getElementById("uPaymentErrorBanner");
            const errSpan = document.getElementById("uPaymentErrorMessage");
            if (errSpan) errSpan.innerText = err.message;
            if (errBanner) {
                errBanner.classList.remove("hidden");
                errBanner.classList.add("flex");
            }
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    // =========================================================================
    // MODAL: Set Up Client Receivable
    // =========================================================================
    window.openUniversalAddReceivableModal = function (preselectedProjectId = null) {
        const projects = state.allProjects || [];
        const projectOptions = projects.map(p => `
            <option value="${p.id}" ${preselectedProjectId === p.id ? 'selected' : ''}>${p.name} ${p.client && p.client !== 'N/A' ? `(${p.client})` : ''}</option>
        `).join("");

        const todayStr = new Date().toISOString().split("T")[0];

        const html = `
            <form onsubmit="handleUniversalReceivableSave(event)" class="space-y-4">
                <div class="bg-indigo-50 p-3.5 rounded-xl border border-indigo-100 mb-2 flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <i data-lucide="calendar-plus" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-indigo-900">Set Up Client Receivable</h4>
                        <p class="text-[11px] text-indigo-700">Configures future scheduled payments (hosting, retainer, or custom milestones) with automated due date tracking.</p>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Target Project *</label>
                    <select id="u_rec_project_id" required class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-semibold text-slate-800">
                        <option value="">-- Choose Project --</option>
                        ${projectOptions}
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Item / Charge Description *</label>
                    <input type="text" id="u_rec_item_name" required placeholder="e.g. AWS Cloud Server, Monthly Retainer, Milestone 2" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-semibold">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Amount (₹) *</label>
                        <input type="number" id="u_rec_amount" required step="0.01" min="0" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-bold text-emerald-700" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Frequency / Cycle *</label>
                        <select id="u_rec_frequency" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-semibold">
                            <option value="Custom Date">One-Time / Milestone Date</option>
                            <option value="Monthly">Monthly Recurring</option>
                            <option value="Weekly">Weekly Recurring</option>
                            <option value="Yearly">Yearly Recurring</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Due Date *</label>
                    <input type="date" id="u_rec_due_date" value="${todayStr}" required class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm font-mono">
                </div>

                <div id="uReceivableErrorBanner" class="hidden bg-rose-50 border border-rose-200 text-rose-600 px-3.5 py-2.5 rounded-lg text-xs items-center shadow-sm">
                    <i data-lucide="alert-circle" class="w-4 h-4 mr-2 shrink-0"></i>
                    <span id="uReceivableErrorMessage">Error</span>
                </div>

                <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors cursor-pointer">Cancel</button>
                    <button type="submit" id="btnSubmitUReceivable" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                        <i data-lucide="check" class="w-4 h-4"></i> Add Setup
                    </button>
                </div>
            </form>
        `;
        openModal("Set Up Client Receivable", html);
        if (window.lucide) lucide.createIcons();
    };

    window.handleUniversalReceivableSave = async function (event) {
        event.preventDefault();
        const btn = document.getElementById("btnSubmitUReceivable");
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Saving...';
        btn.disabled = true;

        try {
            const payload = {
                project_id: document.getElementById("u_rec_project_id").value,
                item_name: document.getElementById("u_rec_item_name").value,
                amount: parseFloat(document.getElementById("u_rec_amount").value) || 0.0,
                frequency: document.getElementById("u_rec_frequency").value,
                due_date: document.getElementById("u_rec_due_date").value
            };

            await apiFetch("/projects/receivables/create", {
                method: "POST",
                body: payload
            });

            showToast("Receivable item added successfully", "success");
            closeModal();
            await lazyLoadViewData("project_payments");
            renderAdminApp();
        } catch (err) {
            const errBanner = document.getElementById("uReceivableErrorBanner");
            const errSpan = document.getElementById("uReceivableErrorMessage");
            if (errSpan) errSpan.innerText = err.message;
            if (errBanner) {
                errBanner.classList.remove("hidden");
                errBanner.classList.add("flex");
            }
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    // Action: Mark Receivable Received
    window.handleUniversalReceivableDone = async function (receivableId) {
        try {
            await apiFetch(`/projects/receivables/mark-done/${receivableId}`, {
                method: "PUT"
            });
            showToast("Marked as received and inflow recorded in payment ledger", "success");
            await lazyLoadViewData("project_payments");
            renderAdminApp();
        } catch (err) {
            showToast("Failed to mark receivable: " + err.message, "error");
        }
    };

    // Action: Delete Payment Record
    window.deleteUniversalPayment = async function (paymentId) {
        const isConfirmed = await customConfirm(
            "Delete Payment Record",
            "Are you sure you want to delete this payment record? This will revert the project's financial status.",
            "Delete Record",
            "Keep It",
            true
        );
        if (!isConfirmed) return;

        try {
            await apiFetch(`/projects/payments/delete/${paymentId}`, {
                method: "DELETE"
            });
            showToast("Payment record removed", "success");
            await lazyLoadViewData("project_payments");
            renderAdminApp();
        } catch (err) {
            showToast("Failed to delete payment: " + err.message, "error");
        }
    };

    // Action: Delete Receivable
    window.deleteUniversalReceivable = async function (receivableId) {
        const isConfirmed = await customConfirm(
            "Delete Receivable Config",
            "Are you sure you want to remove this client receivable? Future automated reminders for this item will be cancelled.",
            "Delete Item",
            "Cancel",
            true
        );
        if (!isConfirmed) return;

        try {
            await apiFetch(`/projects/receivables/delete/${receivableId}`, {
                method: "DELETE"
            });
            showToast("Receivable item removed", "success");
            await lazyLoadViewData("project_payments");
            renderAdminApp();
        } catch (err) {
            showToast("Failed to delete receivable: " + err.message, "error");
        }
    };

    // Export Universal Payments CSV / Excel
    window.exportUniversalPaymentsReport = function () {
        const pmts = state.universalPayments || [];
        if (pmts.length === 0) {
            showToast("No payment data available to export.", "warning");
            return;
        }

        const headers = ["Date", "Project", "Client", "Amount", "Method", "Reference", "Remarks"];
        const rows = pmts.map(p => [
            p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "",
            `"${(p.project_name || "").replace(/"/g, '""')}"`,
            `"${(p.client_name || "").replace(/"/g, '""')}"`,
            p.amount || 0,
            `"${(p.payment_method || "").replace(/"/g, '""')}"`,
            `"${(p.reference_number || "").replace(/"/g, '""')}"`,
            `"${(p.remarks || "").replace(/"/g, '""')}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `yana_universal_payments_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Payments report exported successfully", "success");
    };

    // Section initializer
    window.initAdminProjectPayments = function () {
        if (window.lucide) lucide.createIcons();
    };
})();
