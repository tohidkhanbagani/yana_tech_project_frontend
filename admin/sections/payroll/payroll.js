/**
 * YANA OS - Employee Pay & Payroll Calculation Engine (PRB-079)
 * Features:
 *  - Monthly pay calculation based on attendance hours, company holidays, approved leaves, and expected hours.
 *  - Changed working shifts / temporary hours adjustment recording and accounting.
 *  - Guaranteed Monthly Salary Protection floor enforcement (paying allotted salary when calculated cost is lower).
 *  - Comprehensive "Why Was He Paid This Salary" audit modal detailing all time factors and payout rationale.
 *  - Privacy mode blur support (.blur-financial) and compact high-speed layout.
 */

window.handlePayrollSearch = function(query) {
    state.payrollSearchTerm = (query || "").toLowerCase();
    renderPayrollTable();
};

window.setPayrollStatusFilter = function(filter) {
    state.payrollStatusFilter = filter;
    renderPayrollTable();
};

window.fetchPayrollData = async function(monthYear, force = false) {
    if (!monthYear) {
        monthYear = state.selectedPayrollMonth || new Date().toISOString().slice(0, 7);
    }
    state.selectedPayrollMonth = monthYear;
    sessionStorage.setItem("lastPayrollMonth", monthYear);

    const loader = document.getElementById("payroll-table-loading");
    if (loader) loader.classList.remove("hidden");

    try {
        state.isPayrollLoading = true;
        const [payrollData, shiftAdjustments, employees] = await Promise.all([
            apiFetch(`/payroll/calculate?month_year=${monthYear}`).catch(() => null),
            apiFetch(`/payroll/shift-adjustments?month_year=${monthYear}`).catch(() => []),
            apiFetch("/employees/all").catch(() => [])
        ]);

        state.payrollData = payrollData;
        state.payrollShiftAdjustments = Array.isArray(shiftAdjustments) ? shiftAdjustments : [];
        if (Array.isArray(employees) && employees.length > 0) {
            state.allEmployees = employees;
        }
        state.isPayrollLoading = false;
        renderAdminApp();
    } catch (err) {
        state.isPayrollLoading = false;
        console.error("Failed to load payroll data:", err);
        showToast("Failed to fetch payroll calculations", "error");
        if (loader) loader.classList.add("hidden");
    }
};

window.changePayrollMonth = function(offsetOrValue) {
    let targetMonth = state.selectedPayrollMonth || new Date().toISOString().slice(0, 7);
    if (typeof offsetOrValue === "number") {
        const [y, m] = targetMonth.split("-").map(Number);
        const d = new Date(y, m - 1 + offsetOrValue, 1);
        targetMonth = d.toISOString().slice(0, 7);
    } else if (typeof offsetOrValue === "string") {
        targetMonth = offsetOrValue;
    }
    fetchPayrollData(targetMonth, true);
};

function getAdminPayrollTemplate() {
    const currentMonth = state.selectedPayrollMonth || new Date().toISOString().slice(0, 7);
    state.selectedPayrollMonth = currentMonth;
    const data = state.payrollData;

    // Trigger background fetch if data is not yet loaded
    if (!data && !state.isPayrollLoading) {
        setTimeout(() => fetchPayrollData(currentMonth), 50);
    }

    const monthLabel = data?.month_label || formatMonthYearLabel(currentMonth);
    const totalSalary = data?.total_allotted_salary || 0.0;
    const totalCost = data?.total_calculated_cost || 0.0;
    const totalPayout = data?.total_final_payout || 0.0;
    const totalHolidays = data?.company_holidays_count || 0;
    const holidaysList = data?.company_holidays_list || [];
    const totalOvertime = data?.total_overtime_hours || 0.0;
    const totalDeficit = data?.total_deficit_hours || 0.0;
    const calculations = data?.calculations || [];

    // Filter calculations based on search and status
    const searchTerm = (state.payrollSearchTerm || "").toLowerCase();
    const statusFilter = state.payrollStatusFilter || "all";

    const filteredCalcs = calculations.filter(c => {
        const matchesSearch = !searchTerm || 
            (c.full_name && c.full_name.toLowerCase().includes(searchTerm)) ||
            (c.role_name && c.role_name.toLowerCase().includes(searchTerm)) ||
            (c.department && c.department.toLowerCase().includes(searchTerm));
        
        let matchesStatus = true;
        if (statusFilter === "protected") {
            matchesStatus = c.status_badge === "Salary Protected";
        } else if (statusFilter === "overtime") {
            matchesStatus = c.status_badge === "Overtime Added";
        } else if (statusFilter === "adjusted") {
            matchesStatus = c.shift_changes_count > 0;
        }
        return matchesSearch && matchesStatus;
    });

    return `
        <div class="space-y-3 animate-in">
            <!-- Compact Header Bar -->
            <div class="flex flex-wrap items-center justify-between gap-2.5 bg-white px-4 py-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
                <div class="flex items-center gap-2">
                    <span class="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <i data-lucide="calculator" class="w-4 h-4"></i>
                    </span>
                    <div class="flex items-baseline gap-2">
                        <h1 class="text-sm font-bold text-slate-900 tracking-tight">Employee Pay & Payroll Engine</h1>
                        <span class="text-[11px] text-slate-400 hidden xl:inline">• Work hours, holidays, leaves & Guaranteed Salary Protection</span>
                    </div>
                </div>

                <!-- Month Navigation & Controls -->
                <div class="flex items-center gap-1.5">
                    <div class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                        <button onclick="changePayrollMonth(-1)" title="Previous Month" class="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition-all cursor-pointer">
                            <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                        </button>
                        <span class="px-2.5 py-0.5 text-xs font-bold text-slate-800 tracking-wide select-none min-w-[110px] text-center">
                            ${monthLabel}
                        </span>
                        <button onclick="changePayrollMonth(1)" title="Next Month" class="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition-all cursor-pointer">
                            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>

                    <input type="month" value="${currentMonth}" onchange="changePayrollMonth(this.value)"
                        class="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold outline-none transition-all cursor-pointer shadow-2xs" />

                    <button onclick="openPenaltySettingsModal()" title="Configure Dynamic Attendance Penalties"
                        class="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer">
                        <i data-lucide="sliders" class="w-3.5 h-3.5 text-amber-600"></i>
                        <span>Penalties</span>
                    </button>

                    <button onclick="openAddShiftAdjustmentModal()" 
                        class="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer">
                        <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                        <span>Override</span>
                    </button>

                    <button onclick="fetchPayrollData('${currentMonth}', true)" title="Refresh Data"
                        class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all border border-slate-200 shadow-2xs cursor-pointer">
                        <i data-lucide="rotate-cw" class="w-3.5 h-3.5 ${state.isPayrollLoading ? 'animate-spin text-indigo-600' : ''}"></i>
                    </button>
                </div>
            </div>

            <!-- Streamlined High-Density KPI Ribbon -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <!-- 1. Allotted Base Salary -->
                <div class="bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Allotted Base Salary</div>
                        <div class="text-base font-black text-slate-900 mt-0.5 blur-financial">₹${formatCurrency(totalSalary)}</div>
                        <div class="text-[10px] text-slate-400 font-medium">${calculations.length} Active Staff</div>
                    </div>
                    <span class="p-1.5 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">
                        <i data-lucide="wallet" class="w-3.5 h-3.5"></i>
                    </span>
                </div>

                <!-- 2. Calculated Cost -->
                <div class="bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Calculated Cost (Hours)</div>
                        <div class="text-base font-black text-amber-700 mt-0.5 blur-financial">₹${formatCurrency(totalCost)}</div>
                        <div class="text-[10px] text-slate-400 font-medium">Actual hours basis</div>
                    </div>
                    <span class="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100/50">
                        <i data-lucide="calculator" class="w-3.5 h-3.5"></i>
                    </span>
                </div>

                <!-- 3. Final Net Payout -->
                <div class="bg-white px-3.5 py-2 rounded-xl border border-indigo-100 shadow-2xs flex items-center justify-between bg-gradient-to-r from-white to-indigo-50/20">
                    <div>
                        <div class="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Final Net Payout</div>
                        <div class="text-base font-black text-indigo-900 mt-0.5 blur-financial">₹${formatCurrency(totalPayout)}</div>
                        <div class="text-[10px] ${(data?.total_penalties_deducted || 0) > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'} flex items-center gap-1">
                            ${(data?.total_penalties_deducted || 0) > 0 
                                ? `<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> -₹${formatCurrency(data.total_penalties_deducted)} penalties`
                                : `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Salary Protected`}
                        </div>
                    </div>
                    <span class="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100/50">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                    </span>
                </div>

                <!-- 4. Holidays & Work Days -->
                <div class="bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Holidays & Work Hours</div>
                        <div class="text-base font-black text-slate-800 mt-0.5 flex items-baseline gap-1.5">
                            <span>${totalHolidays}</span>
                            <span class="text-xs font-semibold text-slate-400">Holidays</span>
                        </div>
                        <div class="text-[10px] text-slate-400 font-medium truncate max-w-[140px]" title="${holidaysList.map(h => `${h.date}: ${h.name}`).join(', ')}">
                            ${holidaysList.length > 0 ? holidaysList.map(h => h.name).join(', ') : 'No holidays recorded'}
                        </div>
                    </div>
                    <span class="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100/50">
                        <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                    </span>
                </div>
            </div>

            <!-- Compact Data Table Card -->
            <div class="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <!-- Compact Search & Filter Bar -->
                <div class="px-3.5 py-2 border-b border-slate-200/80 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2.5">
                    <div class="relative w-64">
                        <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        <input type="text" placeholder="Filter employee, role, dept..." 
                            value="${state.payrollSearchTerm || ''}"
                            oninput="handlePayrollSearch(this.value)"
                            class="w-full pl-8 pr-2 py-1 bg-white border border-slate-200/80 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs" />
                    </div>

                    <!-- Filter Pills -->
                    <div class="flex items-center gap-1 text-[10px] font-bold">
                        <button onclick="setPayrollStatusFilter('all')" 
                            class="px-2.5 py-1 rounded-md transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                            All (${calculations.length})
                        </button>
                        <button onclick="setPayrollStatusFilter('protected')" 
                            class="px-2.5 py-1 rounded-md transition-all cursor-pointer ${statusFilter === 'protected' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                            🛡️ Protected
                        </button>
                        <button onclick="setPayrollStatusFilter('overtime')" 
                            class="px-2.5 py-1 rounded-md transition-all cursor-pointer ${statusFilter === 'overtime' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                            ⚡ Overtime
                        </button>
                        <button onclick="setPayrollStatusFilter('adjusted')" 
                            class="px-2.5 py-1 rounded-md transition-all cursor-pointer ${statusFilter === 'adjusted' ? 'bg-purple-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                            🔄 Overridden
                        </button>
                    </div>
                </div>

                <div id="payroll-table-container">
                    ${renderPayrollTableHtml(filteredCalcs, currentMonth)}
                </div>
            </div>
        </div>
    `;
}

// --- UI Helper Functions ---
function getAvatarGradient(name) {
    const palettes = [
        "from-indigo-600 to-violet-600 text-white shadow-indigo-200",
        "from-emerald-600 to-teal-600 text-white shadow-emerald-200",
        "from-sky-600 to-blue-600 text-white shadow-sky-200",
        "from-amber-500 to-orange-600 text-white shadow-amber-200",
        "from-rose-600 to-pink-600 text-white shadow-rose-200",
        "from-purple-600 to-fuchsia-600 text-white shadow-purple-200",
        "from-teal-600 to-cyan-700 text-white shadow-teal-200",
        "from-slate-700 to-slate-900 text-white shadow-slate-300"
    ];
    let hash = 0;
    const str = name || "Employee";
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % palettes.length;
    return palettes[idx];
}

function formatTitleCase(str) {
    if (!str) return "";
    return str.split(" ").filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function renderPayrollTableHtml(calcs, currentMonth) {
    if (!calcs || calcs.length === 0) {
        return `
            <div class="p-12 text-center text-slate-400 bg-white">
                <i data-lucide="calculator" class="w-6 h-6 mx-auto mb-2 text-slate-300"></i>
                <p class="text-xs font-bold text-slate-700">No payroll records match your filter</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Try clearing search or changing the filter.</p>
            </div>
        `;
    }

    const rows = calcs.map(c => {
        const initials = (c.full_name || "--").split(" ").filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase();
        const avatarGradient = getAvatarGradient(c.full_name || c.employee_id);
        const formattedName = formatTitleCase(escapeHtml(c.full_name));

        const isOverridden = Boolean(c.is_admin_overridden);
        const isProtected = c.status_badge === "Salary Protected";
        const hasDeductions = (c.total_penalties || 0) > 0;
        const hasValidEmail = Boolean(c.email && c.email !== "N/A" && c.email.includes("@"));
        
        let statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/90";
        let statusDotClass = "bg-emerald-500";
        let statusLabel = "Full Salary";

        if (isOverridden) {
            statusBadgeClass = "bg-purple-50 text-purple-700 border-purple-200/90";
            statusDotClass = "bg-purple-500";
            statusLabel = "Adjusted";
        } else if (hasDeductions) {
            statusBadgeClass = "bg-rose-50 text-rose-700 border-rose-200/90";
            statusDotClass = "bg-rose-500";
            statusLabel = "Deductions";
        }

        const hasShiftAdjustment = c.shift_changes_count > 0;

        // Attendance Percentage & Progress Bar styling
        const expectedH = c.expected_hours || 1;
        const attendancePct = Math.round((c.actual_worked_hours / expectedH) * 100);
        const barBgClass = attendancePct >= 100 ? "bg-emerald-500" : (attendancePct >= 50 ? "bg-indigo-500" : "bg-amber-500");
        const pctColorClass = attendancePct >= 100 ? "text-emerald-600" : (attendancePct >= 50 ? "text-indigo-600" : "text-amber-600");

        // Leaves & Holidays summary pills
        let leavesHolidaysHtml = "";
        if (c.paid_leave_days === 0 && c.holiday_days_count === 0) {
            leavesHolidaysHtml = `<span class="text-slate-300 text-xs font-mono select-none">—</span>`;
        } else {
            leavesHolidaysHtml = `
                <div class="flex items-center gap-1 flex-wrap">
                    ${c.paid_leave_days > 0 ? `<span class="px-1 py-0.2 rounded bg-blue-50 text-blue-700 font-bold text-[9px] border border-blue-200/70" title="${c.paid_leave_days} paid leave days">${c.paid_leave_days}d Lve</span>` : ''}
                    ${c.holiday_days_count > 0 ? `<span class="px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold text-[9px] border border-emerald-200/70" title="${c.holiday_days_count} holidays">${c.holiday_days_count}d Hol</span>` : ''}
                </div>
            `;
        }

        return `
            <tr class="hover:bg-indigo-50/20 transition-all duration-100 border-b border-slate-100 text-xs">
                <!-- 1. Employee Column (18%) -->
                <td class="px-2.5 py-2 w-[18%]">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-gradient-to-tr ${avatarGradient} flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs ring-1 ring-black/5">
                            ${initials}
                        </div>
                        <div class="min-w-0">
                            <div class="font-bold text-slate-900 tracking-tight flex items-center gap-1 truncate">
                                <span class="truncate max-w-[125px] font-bold text-xs text-slate-900">${formattedName}</span>
                                ${hasShiftAdjustment ? `<span class="px-1 py-0.2 rounded text-[8px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200" title="${c.shift_changes_count} shift override(s)">⚡</span>` : ''}
                            </div>
                            <div class="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                                <span class="truncate max-w-[90px] text-slate-500 font-medium">${escapeHtml(c.role_name || 'Staff')}</span>
                                <span>•</span>
                                <span class="truncate max-w-[60px] font-mono text-[9px]">${escapeHtml(c.department || 'General')}</span>
                            </div>
                        </div>
                    </div>
                </td>

                <!-- 2. Allotted Base Salary (10%) -->
                <td class="px-2.5 py-2 w-[10%] font-semibold text-slate-800 blur-financial whitespace-nowrap">
                    <div class="font-bold text-xs text-slate-900">₹${formatCurrency(c.salary)}</div>
                    <div class="text-[9px] text-slate-400 font-mono">₹${c.hourly_rate}/h</div>
                </td>

                <!-- 3. Expected Target Hours (8%) -->
                <td class="px-2.5 py-2 w-[8%] text-slate-700 whitespace-nowrap">
                    <div class="font-bold text-xs text-slate-800">${c.expected_hours}h</div>
                    <div class="text-[9px] text-slate-400">${c.working_days}d @ ${c.standard_shift_hours}h</div>
                </td>

                <!-- 4. Actual Worked Attendance Hours with Mini Progress Bar (10%) -->
                <td class="px-2.5 py-2 w-[10%] whitespace-nowrap">
                    <div class="flex items-center gap-1">
                        <span class="font-bold text-slate-900 text-xs">${c.actual_worked_hours}h</span>
                        <span class="text-[9px] font-bold ${pctColorClass}">(${attendancePct}%)</span>
                    </div>
                    <div class="w-16 h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                        <div class="h-full rounded-full ${barBgClass}" style="width: ${Math.min(100, attendancePct)}%"></div>
                    </div>
                    <div class="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span>${c.attended_days_count}d</span>
                        ${c.attendance_breakdown?.late_days > 0 ? `<span class="px-1 py-0.1 rounded bg-amber-50 text-amber-700 font-bold text-[8px] border border-amber-200" title="${c.attendance_breakdown.late_days} late check-in(s)">${c.attendance_breakdown.late_days}L</span>` : ''}
                        ${c.attendance_breakdown?.half_days > 0 ? `<span class="px-1 py-0.1 rounded bg-orange-50 text-orange-700 font-bold text-[8px] border border-orange-200" title="${c.attendance_breakdown.half_days} half-day(s): ${c.attendance_breakdown.half_days_covered_by_leave} on leave, ${c.attendance_breakdown.half_days_penalized} unapproved">${c.attendance_breakdown.half_days}HD</span>` : ''}
                        ${c.attendance_breakdown?.extended_shift_days > 0 ? `<span class="px-1 py-0.1 rounded bg-purple-50 text-purple-700 font-bold text-[8px] border border-purple-200" title="${c.attendance_breakdown.extended_shift_days} extended shift(s)">${c.attendance_breakdown.extended_shift_days}Ext</span>` : ''}
                    </div>
                </td>

                <!-- 5. Paid Leaves & Holiday Credits (8%) -->
                <td class="px-2.5 py-2 w-[8%] whitespace-nowrap">
                    ${leavesHolidaysHtml}
                </td>

                <!-- 6. Effective Payable Hours (9%) -->
                <td class="px-2.5 py-2 w-[9%] whitespace-nowrap">
                    <div class="font-extrabold text-slate-900 text-xs">${c.effective_payable_hours}h</div>
                    ${c.hours_difference >= 0 
                        ? `<div class="text-[9px] font-bold text-emerald-600">+${c.hours_difference}h OT</div>`
                        : `<div class="text-[9px] font-medium text-slate-400">${c.hours_difference}h diff</div>`
                    }
                </td>

                <!-- 7. Calculated Cost (9%) -->
                <td class="px-2.5 py-2 w-[9%] whitespace-nowrap">
                    <div class="font-semibold text-slate-700 text-xs blur-financial">₹${formatCurrency(c.calculated_cost)}</div>
                    <div class="text-[9px] text-slate-400">hours cost</div>
                </td>

                <!-- 8. Final Net Payable (11%) -->
                <td class="px-2.5 py-2 w-[11%] whitespace-nowrap">
                    <div class="inline-flex flex-col">
                        <span class="font-black text-slate-950 text-xs blur-financial">₹${formatCurrency(c.final_payable_amount)}</span>
                        <div class="flex items-center gap-1">
                            <span class="text-[8px] font-bold uppercase tracking-wider ${isOverridden ? 'text-purple-700' : (hasDeductions ? 'text-rose-600' : 'text-emerald-600')}">
                                ${isOverridden ? 'Adjusted' : (hasDeductions ? 'Deducted' : 'Full Base')}
                            </span>
                            ${(c.total_penalties || 0) > 0 ? `<span class="text-[8px] font-bold text-rose-600 blur-financial" title="Dynamic attendance deductions: -₹${formatCurrency(c.total_penalties)}">-₹${formatCurrency(c.total_penalties)}</span>` : ''}
                        </div>
                    </div>
                </td>

                <!-- 9. Status Badge (9%) -->
                <td class="px-2.5 py-2 w-[9%] whitespace-nowrap">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadgeClass}">
                        <span class="w-1.5 h-1.5 rounded-full ${statusDotClass}"></span>
                        <span>${statusLabel}</span>
                    </span>
                </td>

                <!-- 10. Actions (8%) -->
                <td class="px-2 py-2 w-[8%] text-right whitespace-nowrap">
                    <div class="inline-flex items-center justify-end gap-1">
                        <button onclick="event.stopPropagation(); sendPayrollStatement('${c.employee_id}', '${currentMonth}')" 
                            title="${hasValidEmail ? (c.email_sent ? `Re-send statement (previously sent to ${escapeHtml(c.email)})` : `Send payroll statement to ${escapeHtml(c.email)}`) : 'No registered email'}"
                            class="p-1 rounded transition-colors cursor-pointer ${hasValidEmail ? (c.email_sent ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100') : 'text-slate-300 cursor-not-allowed'}">
                            <i data-lucide="${c.email_sent ? 'check-check' : 'mail'}" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="openPayrollDetailModal('${c.employee_id}')" 
                            class="px-2 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-md text-[10px] font-bold transition-all border border-indigo-200/60 hover:border-transparent cursor-pointer">
                            Audit
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    return `
        <div class="w-full overflow-x-auto">
            <table class="w-full min-w-[1050px] text-left border-collapse table-fixed">
                <thead>
                    <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider select-none">
                        <th class="px-2.5 py-2 w-[18%]">Employee</th>
                        <th class="px-2.5 py-2 w-[10%]">Allotted</th>
                        <th class="px-2.5 py-2 w-[8%]">Expected</th>
                        <th class="px-2.5 py-2 w-[10%]">Attended</th>
                        <th class="px-2.5 py-2 w-[8%]">Leaves/Hol</th>
                        <th class="px-2.5 py-2 w-[9%]">Payable</th>
                        <th class="px-2.5 py-2 w-[9%]">Hours Cost</th>
                        <th class="px-2.5 py-2 w-[11%]">Final Payout</th>
                        <th class="px-2.5 py-2 w-[9%]">Status</th>
                        <th class="px-2.5 py-2 w-[8%] text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-xs">
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

function renderPayrollTable() {
    const container = document.getElementById("payroll-table-container");
    if (!container || !state.payrollData) return;

    const currentMonth = state.selectedPayrollMonth || new Date().toISOString().slice(0, 7);
    const calculations = state.payrollData.calculations || [];
    const searchTerm = (state.payrollSearchTerm || "").toLowerCase();
    const statusFilter = state.payrollStatusFilter || "all";

    const filteredCalcs = calculations.filter(c => {
        const matchesSearch = !searchTerm || 
            (c.full_name && c.full_name.toLowerCase().includes(searchTerm)) ||
            (c.role_name && c.role_name.toLowerCase().includes(searchTerm)) ||
            (c.department && c.department.toLowerCase().includes(searchTerm));
        
        let matchesStatus = true;
        if (statusFilter === "protected") {
            matchesStatus = c.status_badge === "Salary Protected";
        } else if (statusFilter === "overtime") {
            matchesStatus = c.status_badge === "Overtime Added";
        } else if (statusFilter === "adjusted") {
            matchesStatus = c.shift_changes_count > 0;
        }
        return matchesSearch && matchesStatus;
    });

    container.innerHTML = renderPayrollTableHtml(filteredCalcs, currentMonth);
    if (window.lucide) lucide.createIcons();
}

/**
 * Modal width helper: expands modal to max-w-3xl for detailed audit breakdowns
 */
window.closePayrollModal = function() {
    const modalBox = document.getElementById("modal-content");
    if (modalBox) {
        modalBox.classList.remove("max-w-3xl", "max-w-4xl");
        modalBox.classList.add("max-w-2xl");
    }
    closeModal();
};

/**
 * Detailed "Why Was He Paid This Salary" Audit Modal (Ultra-Compact Zero-Scroll UI)
 */
window.openPayrollDetailModal = function(employeeId) {
    if (!state.payrollData || !state.payrollData.calculations) return;
    const c = state.payrollData.calculations.find(x => x.employee_id === employeeId);
    if (!c) return;

    // Expand modal container to max-w-3xl for generous breathing room
    const modalBox = document.getElementById("modal-content");
    if (modalBox) {
        modalBox.classList.remove("max-w-2xl");
        modalBox.classList.add("max-w-3xl");
    }

    const monthLabel = state.payrollData.month_label || state.payrollData.month_year;
    const initials = (c.full_name || "--").split(" ").filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase();
    const avatarGradient = getAvatarGradient(c.full_name || c.employee_id);
    const formattedName = formatTitleCase(escapeHtml(c.full_name));

    const isOverridden = Boolean(c.is_admin_overridden);
    const isProtected = c.status_badge === "Salary Protected" || (!c.total_penalties && !c.is_admin_overridden);
    const hasValidEmail = Boolean(c.email && c.email !== "N/A" && c.email.includes("@"));

    const statusBadgeHeaderClass = isOverridden
        ? "bg-purple-50 text-purple-700 border-purple-200"
        : (isProtected 
            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
            : "bg-rose-50 text-rose-700 border-rose-200");
    const statusIcon = isOverridden ? "sliders" : (isProtected ? "shield-check" : "alert-circle");

    // Attendance Completion Percentage
    const expectedH = c.expected_hours || 1;
    const attendancePct = Math.round((c.actual_worked_hours / expectedH) * 100);
    const barBgClass = attendancePct >= 100 ? "bg-emerald-500" : (attendancePct >= 50 ? "bg-indigo-500" : "bg-amber-500");

    // Protection Diff Benefit Badge
    let benefitDiffBadge = "";
    if (isOverridden) {
        benefitDiffBadge = `
            <span class="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200/80">
                Admin Adjusted
            </span>
        `;
    } else if (isProtected) {
        benefitDiffBadge = `
            <span class="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/80">
                Full Base Salary
            </span>
        `;
    } else {
        benefitDiffBadge = `
            <span class="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200/80">
                -₹${formatCurrency(c.total_penalties || 0)} Deductions
            </span>
        `;
    }

    // Shift Adjustments Component HTML (1-Line Compact)
    let shiftAdjustmentHtml = "";
    if (c.shift_changes_summary && c.shift_changes_summary.length > 0) {
        shiftAdjustmentHtml = `
            <div class="px-2.5 py-0.5 bg-purple-50/70 border border-purple-200/70 rounded-lg flex items-center justify-between text-[10px]">
                <div class="flex items-center gap-1.5 text-purple-950 font-medium truncate">
                    <span class="font-bold text-purple-800">⚡ Shift Override:</span>
                    <span>${c.shift_changes_summary[0].start_date} to ${c.shift_changes_summary[0].end_date} @ ${c.shift_changes_summary[0].working_hours}h/d (${c.shift_changes_summary[0].shift_start_time}-${c.shift_changes_summary[0].shift_end_time})</span>
                    <span class="text-purple-600 truncate max-w-[120px]">"${escapeHtml(c.shift_changes_summary[0].reason || '')}"</span>
                </div>
                <button onclick="deleteShiftAdjustment('${c.shift_changes_summary[0].id}')" title="Remove Shift Adjustment" 
                    class="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer shrink-0">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>
            </div>
        `;
    } else {
        shiftAdjustmentHtml = `
            <div class="px-2.5 py-0.5 bg-slate-50 border border-slate-200/70 rounded-lg text-[10px] text-slate-600 flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span><strong>Standard Shift Policy:</strong> Followed standard 8.0h/day baseline (${c.working_days} working days).</span>
                </div>
                <button onclick="openAddShiftAdjustmentModal('${c.employee_id}')" class="text-indigo-600 hover:underline font-bold text-[10px] cursor-pointer">
                    + Override
                </button>
            </div>
        `;
    }

    const ab = c.attendance_breakdown || {
        present_days: 0,
        late_days: 0,
        half_days: 0,
        half_days_covered_by_leave: 0,
        half_days_penalized: 0,
        absent_days: 0,
        on_leave_days: 0,
        extended_shift_days: 0
    };
    const pb = c.penalties_breakdown || {
        late_penalty_rate: 100,
        late_penalty_total: 0,
        half_day_penalty_rate: 250,
        half_day_penalty_total: 0,
        absent_penalty_rate: 500,
        absent_penalty_total: 0,
        total_penalties: 0
    };

    const incDed = c.included_deductions || {
        unworked_hours: true,
        late: true,
        half_day: true,
        absent: true,
        overtime: false
    };
    const deficitHours = c.deficit_hours || 0;
    const unworkedDeduction = (deficitHours >= (c.expected_hours || 0) && (c.salary || 0) > 0) ? c.salary : (c.unworked_hours_deduction || Math.round(deficitHours * (c.hourly_rate || 0) * 100) / 100);
    const overtimeAmount = c.overtime_amount || 0;
    const adminRemarks = c.admin_remarks || "";

    // Attendance Status 6-Pill Micro Ribbon HTML
    const attendanceRibbonHtml = `
        <div class="grid grid-cols-3 md:grid-cols-6 gap-1 text-[10px]">
            <!-- 1. Present -->
            <div class="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200/80 flex flex-col items-center text-center">
                <span class="text-[8px] font-bold uppercase tracking-wider text-emerald-700">Present</span>
                <span class="font-black text-emerald-950 text-xs mt-0.5">${ab.present_days}d</span>
                <span class="text-[8px] text-emerald-600 font-medium">On time</span>
            </div>

            <!-- 2. Late -->
            <div class="px-2 py-0.5 rounded-lg ${ab.late_days > 0 ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200/80'} border flex flex-col items-center text-center">
                <span class="text-[8px] font-bold uppercase tracking-wider ${ab.late_days > 0 ? 'text-amber-800 font-extrabold' : 'text-slate-400'}">Late</span>
                <span class="font-black ${ab.late_days > 0 ? 'text-amber-950' : 'text-slate-700'} text-xs mt-0.5">${ab.late_days}d</span>
                <span class="text-[8px] ${ab.late_days > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}">${ab.late_days > 0 ? `-₹${formatCurrency(pb.late_penalty_total)}` : '0 late'}</span>
            </div>

            <!-- 3. Half-Day -->
            <div class="px-2 py-0.5 rounded-lg ${ab.half_days > 0 ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-200/80'} border flex flex-col items-center text-center">
                <span class="text-[8px] font-bold uppercase tracking-wider ${ab.half_days > 0 ? 'text-orange-800 font-extrabold' : 'text-slate-400'}">Half-Day</span>
                <span class="font-black ${ab.half_days > 0 ? 'text-orange-950' : 'text-slate-700'} text-xs mt-0.5">${ab.half_days}d</span>
                <span class="text-[8px] ${ab.half_days_penalized > 0 ? 'text-rose-600 font-bold' : (ab.half_days_covered_by_leave > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400')}">
                    ${ab.half_days_penalized > 0 ? `-₹${formatCurrency(pb.half_day_penalty_total)} (${ab.half_days_penalized}p)` : (ab.half_days_covered_by_leave > 0 ? 'Leave Paid' : '0 HD')}
                </span>
            </div>

            <!-- 4. Absent -->
            <div class="px-2 py-0.5 rounded-lg ${ab.absent_days > 0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200/80'} border flex flex-col items-center text-center">
                <span class="text-[8px] font-bold uppercase tracking-wider ${ab.absent_days > 0 ? 'text-rose-800 font-extrabold' : 'text-slate-400'}">Absent</span>
                <span class="font-black ${ab.absent_days > 0 ? 'text-rose-950' : 'text-slate-700'} text-xs mt-0.5">${ab.absent_days}d</span>
                <span class="text-[8px] ${ab.absent_days > 0 ? 'text-rose-700 font-bold' : 'text-slate-400'}">${ab.absent_days > 0 ? `-₹${formatCurrency(pb.absent_penalty_total)}` : '0 absent'}</span>
            </div>

            <!-- 5. On Leave -->
            <div class="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200/80 flex flex-col items-center text-center">
                <span class="text-[8px] font-bold uppercase tracking-wider text-blue-700">On Leave</span>
                <span class="font-black text-blue-950 text-xs mt-0.5">${ab.on_leave_days}d</span>
                <span class="text-[8px] text-blue-600 font-medium">${c.paid_leave_days}d paid</span>
            </div>

            <!-- 6. Extended Shift -->
            <div class="px-2 py-0.5 rounded-lg ${ab.extended_shift_days > 0 ? 'bg-purple-50 border-purple-300' : 'bg-slate-50 border-slate-200/80'} border flex flex-col items-center text-center">
                <span class="text-[8px] font-bold uppercase tracking-wider ${ab.extended_shift_days > 0 ? 'text-purple-800 font-extrabold' : 'text-slate-400'}">Extended</span>
                <span class="font-black ${ab.extended_shift_days > 0 ? 'text-purple-950' : 'text-slate-700'} text-xs mt-0.5">${ab.extended_shift_days}d</span>
                <span class="text-[8px] ${ab.extended_shift_days > 0 ? 'text-purple-700 font-bold' : 'text-slate-400'}">${ab.extended_shift_days > 0 ? 'OT punch' : 'Standard'}</span>
            </div>
        </div>
    `;

    // Granular Admin Deductions & Overtime Controls Card
    const adminControlsCardHtml = `
        <div class="p-2 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5">
            <div class="flex items-center justify-between">
                <span class="text-[9px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <i data-lucide="sliders" class="w-3 h-3 text-indigo-600"></i> Admin Payout & Deduction Controls
                </span>
                <span class="text-[8px] text-slate-400 font-medium">Toggle items to dynamically include/exclude from final payout</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 text-[10px]">
                <!-- Toggle 1: Unworked Hours Deficit -->
                <label class="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer select-none">
                    <input type="checkbox" id="chk_ded_unworked_${c.employee_id}" 
                        ${incDed.unworked_hours !== false ? 'checked' : ''} 
                        onchange="updateAuditCalculation('${c.employee_id}')" 
                        class="rounded text-indigo-600 focus:ring-0 cursor-pointer" />
                    <div class="min-w-0">
                        <span class="block font-bold text-slate-800 text-[10px]">Unworked Deficit</span>
                        <span class="block text-[9px] ${deficitHours > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}">
                            ${deficitHours > 0 ? `-${deficitHours}h (-₹${formatCurrency(unworkedDeduction)})` : '0h deficit (₹0)'}
                        </span>
                    </div>
                </label>

                <!-- Toggle 2: Late Check-ins -->
                <label class="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer select-none">
                    <input type="checkbox" id="chk_ded_late_${c.employee_id}" 
                        ${incDed.late !== false ? 'checked' : ''} 
                        onchange="updateAuditCalculation('${c.employee_id}')" 
                        class="rounded text-indigo-600 focus:ring-0 cursor-pointer" />
                    <div class="min-w-0">
                        <span class="block font-bold text-slate-800 text-[10px]">Late Arrival</span>
                        <span class="block text-[9px] ${pb.late_penalty_total > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}">
                            ${ab.late_days > 0 ? `${ab.late_days}d (-₹${formatCurrency(pb.late_penalty_total)})` : '0 late (₹0)'}
                        </span>
                    </div>
                </label>

                <!-- Toggle 3: Unapproved Half-Days -->
                <label class="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer select-none">
                    <input type="checkbox" id="chk_ded_half_day_${c.employee_id}" 
                        ${incDed.half_day !== false ? 'checked' : ''} 
                        onchange="updateAuditCalculation('${c.employee_id}')" 
                        class="rounded text-indigo-600 focus:ring-0 cursor-pointer" />
                    <div class="min-w-0">
                        <span class="block font-bold text-slate-800 text-[10px]">Unapproved Half-Day</span>
                        <span class="block text-[9px] ${pb.half_day_penalty_total > 0 ? 'text-orange-700 font-bold' : 'text-slate-400'}">
                            ${ab.half_days_penalized > 0 ? `${ab.half_days_penalized}d (-₹${formatCurrency(pb.half_day_penalty_total)})` : '0 penalized (₹0)'}
                        </span>
                    </div>
                </label>

                <!-- Toggle 4: Unexcused Absence -->
                <label class="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer select-none">
                    <input type="checkbox" id="chk_ded_absent_${c.employee_id}" 
                        ${incDed.absent !== false ? 'checked' : ''} 
                        onchange="updateAuditCalculation('${c.employee_id}')" 
                        class="rounded text-indigo-600 focus:ring-0 cursor-pointer" />
                    <div class="min-w-0">
                        <span class="block font-bold text-slate-800 text-[10px]">Unexcused Absence</span>
                        <span class="block text-[9px] ${pb.absent_penalty_total > 0 ? 'text-rose-700 font-bold' : 'text-slate-400'}">
                            ${ab.absent_days > 0 ? `${ab.absent_days}d (-₹${formatCurrency(pb.absent_penalty_total)})` : '0 absent (₹0)'}
                        </span>
                    </div>
                </label>

                <!-- Toggle 5: Overtime Addition -->
                <label class="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer select-none">
                    <input type="checkbox" id="chk_ded_overtime_${c.employee_id}" 
                        ${Boolean(incDed.overtime) ? 'checked' : ''} 
                        onchange="updateAuditCalculation('${c.employee_id}')" 
                        class="rounded text-emerald-600 focus:ring-0 cursor-pointer" />
                    <div class="min-w-0">
                        <span class="block font-bold text-slate-800 text-[10px]">Include Overtime Bonus</span>
                        <span class="block text-[9px] ${overtimeAmount > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'}">
                            ${c.hours_difference > 0 ? `+${c.hours_difference}h (+₹${formatCurrency(overtimeAmount)})` : '0h overtime (₹0)'}
                        </span>
                    </div>
                </label>

                <!-- Remarks Box (Inline in grid) -->
                <div class="flex flex-col justify-center">
                    <span class="text-[9px] font-bold text-slate-600 block mb-0.5">Admin Remark Note:</span>
                    <input type="text" id="audit_remarks_input_${c.employee_id}" 
                        placeholder="Optional remarks for employee email..."
                        value="${escapeHtml(adminRemarks)}"
                        class="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[10px] font-medium text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
            </div>
        </div>
    `;

    const modalContent = `
        <div class="space-y-1.5 text-slate-800 text-xs">
            <!-- 1. Compact Personnel Bar -->
            <div class="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900 text-white shadow-xs">
                <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-tr ${avatarGradient} flex items-center justify-center font-bold text-xs text-white shrink-0">
                        ${initials}
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-white text-xs">${formattedName}</span>
                        <span class="text-indigo-300 text-[10px] font-medium">${escapeHtml(c.role_name || 'Staff')}</span>
                        <span class="text-white/30">•</span>
                        <span class="text-slate-400 font-mono text-[10px]">${escapeHtml(c.department || 'General')}</span>
                        <span class="text-white/30">•</span>
                        <span class="text-slate-400 font-mono text-[10px] flex items-center gap-1">
                            ${hasValidEmail ? `<i data-lucide="mail-check" class="w-3 h-3 text-emerald-400"></i>` : `<i data-lucide="mail-x" class="w-3 h-3 text-rose-400"></i>`}
                            ${c.email || 'No email registered'}
                        </span>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadgeHeaderClass}">
                        ${isOverridden ? 'Admin Adjusted' : (isProtected ? 'Salary Protected' : 'Deductions Applied')}
                    </span>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">${monthLabel}</span>
                </div>
            </div>

            <!-- 2. Attendance Status 6-Pill Micro Ribbon -->
            ${attendanceRibbonHtml}

            <!-- 3. Split Verdict & 4 KPIs Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                <!-- Left: Payout Verdict Card -->
                <div class="p-2 rounded-xl border ${isOverridden ? 'bg-purple-50/60 border-purple-200/90' : (isProtected ? 'bg-emerald-50/60 border-emerald-200/90' : 'bg-rose-50/60 border-rose-200/90')} flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between">
                            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500">Final Net Payable</span>
                            <div class="flex items-center gap-1">${benefitDiffBadge}</div>
                        </div>
                        <div id="audit_verdict_amount_${c.employee_id}" class="text-xl font-black text-slate-950 blur-financial mt-0.5">
                            ₹${formatCurrency(c.final_payable_amount)}
                        </div>
                    </div>
                    <div class="text-[10px] text-slate-600 leading-snug mt-1 pt-1 border-t border-slate-200/60">
                        <strong>Verdict:</strong> <span id="audit_verdict_text_${c.employee_id}">${c.why_paid_rationale}</span>
                    </div>
                </div>

                <!-- Right: 4 Micro KPI Stats (2x2 Grid) -->
                <div class="grid grid-cols-2 gap-1.5">
                    <div class="bg-white p-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
                        <span class="text-[9px] uppercase font-bold text-slate-400 block">Allotted Base</span>
                        <span class="text-xs font-black text-slate-900 blur-financial">₹${formatCurrency(c.salary)}</span>
                        <span class="text-[8px] text-slate-400 block">Monthly floor</span>
                    </div>
                    <div class="bg-white p-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
                        <span class="text-[9px] uppercase font-bold text-slate-400 block">Base Rate</span>
                        <span class="text-xs font-black text-slate-900 blur-financial">₹${c.hourly_rate}/hr</span>
                        <span class="text-[8px] text-slate-400 block">Salary ÷ Expected</span>
                    </div>
                    <div class="bg-white p-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
                        <span class="text-[9px] uppercase font-bold text-slate-400 block">Target Expected</span>
                        <span class="text-xs font-black text-slate-900">${c.expected_hours}h</span>
                        <span class="text-[8px] text-slate-400 block">${c.working_days} working days</span>
                    </div>
                    <div class="bg-white p-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
                        <span class="text-[9px] uppercase font-bold text-slate-400 block">Payable Hours</span>
                        <span class="text-xs font-black text-indigo-700">${c.effective_payable_hours}h</span>
                        <span class="text-[8px] font-medium text-slate-400 block">
                            ${c.actual_worked_hours}h clock-in logged
                        </span>
                    </div>
                </div>
            </div>

            <!-- 4. Granular Admin Controls Ribbon -->
            ${adminControlsCardHtml}

            <!-- 5. Consolidated 3-Factor Hours Breakdown -->
            <div class="grid grid-cols-3 gap-1.5">
                <!-- Factor 1: Biometric Attendance -->
                <div class="bg-white p-1.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-0.5">
                    <div class="flex items-center justify-between text-[9px] font-bold uppercase text-slate-500">
                        <span>1. Clock-in Work</span>
                        <span class="text-xs font-black text-slate-900">${c.actual_worked_hours}h</span>
                    </div>
                    <div class="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full rounded-full ${barBgClass}" style="width: ${Math.min(100, attendancePct)}%"></div>
                    </div>
                    <div class="flex items-center justify-between text-[9px] text-slate-400">
                        <span>${c.attended_days_count}d logged</span>
                        <span>${attendancePct}% target</span>
                    </div>
                </div>

                <!-- Factor 2: Company Holidays -->
                <div class="bg-white p-1.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-0.5">
                    <div class="flex items-center justify-between text-[9px] font-bold uppercase text-slate-500">
                        <span>2. Holidays</span>
                        <span class="text-xs font-black text-emerald-700">+${c.holiday_credit_hours}h</span>
                    </div>
                    <div class="text-[9px] text-slate-500 truncate">
                        ${c.holiday_days_count > 0 ? `${c.holiday_days_count} credited: ${c.holidays_list.map(h => h.name).join(', ')}` : 'No holidays in month'}
                    </div>
                </div>

                <!-- Factor 3: Approved Leaves -->
                <div class="bg-white p-1.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-0.5">
                    <div class="flex items-center justify-between text-[9px] font-bold uppercase text-slate-500">
                        <span>3. Paid Leaves</span>
                        <span class="text-xs font-black text-blue-700">+${c.paid_leave_hours}h</span>
                    </div>
                    <div class="text-[9px] text-slate-500 truncate">
                        ${c.paid_leave_days > 0 ? `${c.paid_leave_days}d approved (${c.unpaid_leave_days}d unpaid)` : 'No approved leaves'}
                    </div>
                </div>
            </div>

            <!-- 6. Shift Schedule Strip -->
            ${shiftAdjustmentHtml}

            <!-- 7. Modern 5-Step Formula Pipeline -->
            <div class="bg-slate-900 text-white p-1.5 rounded-xl shadow-2xs">
                <div class="grid grid-cols-2 md:grid-cols-5 gap-1.5 text-[10px]">
                    <div class="space-y-0.5">
                        <span class="text-indigo-400 font-bold uppercase text-[9px]">Step 1 • Payable Hours</span>
                        <div class="text-slate-300 font-mono text-[9px]">${c.actual_worked_hours}h + ${c.holiday_credit_hours}h + ${c.paid_leave_hours}h</div>
                        <div class="font-bold text-white text-[10px]">= ${c.effective_payable_hours}h Payable</div>
                    </div>
                    <div class="space-y-0.5">
                        <span class="text-sky-400 font-bold uppercase text-[9px]">Step 2 • Base Rate</span>
                        <div class="text-slate-300 font-mono text-[9px] blur-financial">₹${formatCurrency(c.salary)} ÷ ${c.expected_hours}h</div>
                        <div class="font-bold text-white text-[10px] blur-financial">= ₹${c.hourly_rate}/hr</div>
                    </div>
                    <div class="space-y-0.5">
                        <span class="text-amber-400 font-bold uppercase text-[9px]">Step 3 • Base Floor</span>
                        <div class="text-slate-300 font-mono text-[9px] blur-financial">Standard Salary</div>
                        <div class="font-bold text-amber-300 text-[10px] blur-financial">= ₹${formatCurrency(c.salary)} Base</div>
                    </div>
                    <div class="space-y-0.5">
                        <span class="text-rose-400 font-bold uppercase text-[9px]">Step 4 • Deductions</span>
                        <div class="text-slate-300 font-mono text-[9px] blur-financial">Active Deductions</div>
                        <div id="audit_step4_val_${c.employee_id}" class="font-bold text-rose-300 text-[10px] blur-financial">= -₹${formatCurrency(c.total_penalties || 0)}</div>
                    </div>
                    <div class="space-y-0.5">
                        <span class="text-emerald-400 font-bold uppercase text-[9px]">Step 5 • Net Payout</span>
                        <div class="text-slate-300 font-mono text-[9px] blur-financial">${isOverridden ? 'Admin Override' : 'Base - Active Deductions'}</div>
                        <div id="audit_step5_val_${c.employee_id}" class="font-bold text-emerald-300 text-[10px] blur-financial">= ₹${formatCurrency(c.final_payable_amount)}</div>
                    </div>
                </div>
            </div>

            <!-- 8. Admin Payout Control & Actions Footer (Zero-Scroll Ergonomics) -->
            <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px]">
                <!-- Left: Admin Final Payout Controller -->
                <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
                    <span class="font-bold text-slate-600 text-[9px] uppercase tracking-wide">Final Payout:</span>
                    <div class="relative flex items-center">
                        <span class="absolute left-1.5 text-slate-400 font-bold text-[10px]">₹</span>
                        <input type="number" step="1" id="audit_override_input_${c.employee_id}" 
                            value="${c.final_payable_amount}" 
                            class="w-24 pl-4 pr-1 py-0.5 bg-white border border-slate-300 rounded font-black text-slate-900 text-xs outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <button onclick="saveAuditPayoutOverride('${c.employee_id}', '${state.selectedPayrollMonth || ''}')" 
                        class="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[9px] cursor-pointer transition-all shadow-2xs">
                        Save
                    </button>
                    ${isOverridden ? `<span class="text-[8px] font-bold text-purple-700 bg-purple-100 px-1 py-0.2 rounded">Adjusted</span>` : ''}
                </div>

                <!-- Right: Statement Email & Close Buttons -->
                <div class="flex items-center gap-1.5">
                    ${hasValidEmail ? `
                        <button onclick="sendPayrollStatement('${c.employee_id}', '${state.selectedPayrollMonth || ''}')" 
                            id="btn_send_statement_${c.employee_id}"
                            class="px-2.5 py-1 ${c.email_sent ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'} rounded-lg text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer">
                            <i data-lucide="${c.email_sent ? 'check-check' : 'mail'}" class="w-3.5 h-3.5"></i>
                            <span>${c.email_sent ? 'Re-send Statement' : 'Send Statement'}</span>
                        </button>
                    ` : `
                        <button disabled 
                            title="Employee does not have a registered email address."
                            class="px-2.5 py-1 bg-slate-100 text-slate-400 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-not-allowed border border-slate-200">
                            <i data-lucide="mail-warning" class="w-3.5 h-3.5 text-amber-500"></i>
                            <span>No Email</span>
                        </button>
                    `}
                    <button onclick="closePayrollModal()" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer">
                        Close Audit
                    </button>
                </div>
            </div>
        </div>
    `;

    openModal(`Payroll Audit: ${formattedName}`, modalContent);

    // Completely eliminate vertical scrollbar by tightening modal padding & height
    const modalContainer = document.getElementById("modal-content");
    if (modalContainer) {
        modalContainer.classList.remove("max-w-2xl");
        modalContainer.classList.add("max-w-3xl");

        const modalHeader = modalContainer.querySelector(".border-b.bg-slate-50");
        if (modalHeader) {
            modalHeader.className = "flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50 shrink-0";
            const h3 = modalHeader.querySelector("h3");
            if (h3) h3.className = "text-sm font-bold text-slate-800";
        }

        const modalBody = modalContainer.querySelector(".overflow-y-auto");
        if (modalBody) {
            modalBody.className = "px-4 py-2 max-h-[92vh] overflow-y-auto";
        }
    }
    if (window.lucide) lucide.createIcons();
};

/**
 * Client-side live recalculation for Audit modal as toggles flip
 */
window.updateAuditCalculation = function(employeeId) {
    if (!state.payrollData || !state.payrollData.calculations) return;
    const c = state.payrollData.calculations.find(x => x.employee_id === employeeId);
    if (!c) return;

    const salary = c.salary || 0.0;
    const hourlyRate = c.hourly_rate || 0.0;
    const deficitHours = c.deficit_hours || 0.0;
    const unworkedDeduction = (deficitHours >= (c.expected_hours || 0) && salary > 0) ? salary : (c.unworked_hours_deduction || Math.round(deficitHours * hourlyRate * 100) / 100);
    const pb = c.penalties_breakdown || {};
    const lateTotal = pb.late_penalty_total || 0.0;
    const halfDayTotal = pb.half_day_penalty_total || 0.0;
    const absentTotal = pb.absent_penalty_total || 0.0;
    const overtimeAmount = c.overtime_amount || 0.0;

    const chkUnworked = document.getElementById(`chk_ded_unworked_${employeeId}`)?.checked ?? true;
    const chkLate = document.getElementById(`chk_ded_late_${employeeId}`)?.checked ?? true;
    const chkHalfDay = document.getElementById(`chk_ded_half_day_${employeeId}`)?.checked ?? true;
    const chkAbsent = document.getElementById(`chk_ded_absent_${employeeId}`)?.checked ?? true;
    const chkOt = document.getElementById(`chk_ded_overtime_${employeeId}`)?.checked ?? false;

    let activeDeductions = 0.0;
    const appliedItems = [];
    if (chkUnworked && unworkedDeduction > 0) {
        activeDeductions += unworkedDeduction;
        appliedItems.push(`Unworked hours deficit (-₹${formatCurrency(unworkedDeduction)})`);
    }
    if (chkLate && lateTotal > 0) {
        activeDeductions += lateTotal;
        appliedItems.push(`Late check-ins (-₹${formatCurrency(lateTotal)})`);
    }
    if (chkHalfDay && halfDayTotal > 0) {
        activeDeductions += halfDayTotal;
        appliedItems.push(`Unapproved half-days (-₹${formatCurrency(halfDayTotal)})`);
    }
    if (chkAbsent && absentTotal > 0) {
        activeDeductions += absentTotal;
        appliedItems.push(`Unexcused absences (-₹${formatCurrency(absentTotal)})`);
    }
    activeDeductions = Math.round(activeDeductions * 100) / 100;

    let activeOt = (chkOt && overtimeAmount > 0) ? overtimeAmount : 0.0;
    const calculatedPay = Math.max(0, Math.round((salary - activeDeductions + activeOt) * 100) / 100);

    const overrideInput = document.getElementById(`audit_override_input_${employeeId}`);
    if (overrideInput) {
        overrideInput.value = calculatedPay;
    }

    const verdictAmount = document.getElementById(`audit_verdict_amount_${employeeId}`);
    if (verdictAmount) {
        verdictAmount.textContent = `₹${formatCurrency(calculatedPay)}`;
    }

    const step4Deductions = document.getElementById(`audit_step4_val_${employeeId}`);
    if (step4Deductions) {
        step4Deductions.textContent = `= -₹${formatCurrency(activeDeductions)}`;
    }

    const step5Net = document.getElementById(`audit_step5_val_${employeeId}`);
    if (step5Net) {
        step5Net.textContent = `= ₹${formatCurrency(calculatedPay)}`;
    }

    const verdictText = document.getElementById(`audit_verdict_text_${employeeId}`);
    if (verdictText) {
        if (activeDeductions === 0 && activeOt === 0) {
            verdictText.textContent = `Allotted base salary is ₹${formatCurrency(salary)}. Zero deductions selected. Full base salary payable.`;
        } else {
            let note = `Base salary ₹${formatCurrency(salary)} minus active deductions -₹${formatCurrency(activeDeductions)}`;
            if (activeOt > 0) note += ` plus approved overtime +₹${formatCurrency(activeOt)}`;
            note += `. Net payable: ₹${formatCurrency(calculatedPay)}.`;
            verdictText.textContent = note;
        }
    }
};

/**
 * Modal to add a temporary shift adjustment for an employee
 */
window.openAddShiftAdjustmentModal = function(preselectedEmpId = null) {
    const employees = state.allEmployees || [];
    const currentMonth = state.selectedPayrollMonth || new Date().toISOString().slice(0, 7);
    const defaultStart = `${currentMonth}-01`;
    const defaultEnd = `${currentMonth}-05`;

    const empOptions = employees.map(e => `
        <option value="${e.id}" ${preselectedEmpId === e.id ? 'selected' : ''}>
            ${escapeHtml(e.full_name)} (${escapeHtml(e.role_name || 'Staff')})
        </option>
    `).join('');

    const formHtml = `
        <form onsubmit="submitShiftAdjustment(event)" class="space-y-4 text-xs">
            <div>
                <label class="block font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">Select Employee</label>
                <select id="adj_employee_id" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="" disabled ${!preselectedEmpId ? 'selected' : ''}>Choose employee...</option>
                    ${empOptions}
                </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">Start Date</label>
                    <input type="date" id="adj_start_date" required value="${defaultStart}"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                    <label class="block font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">End Date</label>
                    <input type="date" id="adj_end_date" required value="${defaultEnd}"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">Shift Hours / Day</label>
                    <input type="number" step="0.5" min="1" max="24" id="adj_working_hours" required value="6.0"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                    <label class="block font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">Shift Start</label>
                    <input type="time" id="adj_start_time" value="10:00"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                    <label class="block font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">Shift End</label>
                    <input type="time" id="adj_end_time" value="16:00"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
            </div>

            <div>
                <label class="block font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">Reason for Shift Change</label>
                <input type="text" id="adj_reason" required placeholder="e.g. Temporary client sync week, reduced hours approval, etc."
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>

            <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button type="button" onclick="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer">
                    Cancel
                </button>
                <button type="submit" id="btn-submit-adj" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5">
                    <i data-lucide="check" class="w-3.5 h-3.5"></i>
                    <span>Save Shift Override</span>
                </button>
            </div>
        </form>
    `;

    openModal("Add Employee Shift Adjustment", formHtml);
};

window.submitShiftAdjustment = async function(event) {
    event.preventDefault();
    const btn = document.getElementById("btn-submit-adj");
    if (btn) btn.disabled = true;

    const empId = document.getElementById("adj_employee_id").value;
    const startDate = document.getElementById("adj_start_date").value;
    const endDate = document.getElementById("adj_end_date").value;
    const workingHours = parseFloat(document.getElementById("adj_working_hours").value) || 8.0;
    const shiftStartTime = document.getElementById("adj_start_time").value || "09:00";
    const shiftEndTime = document.getElementById("adj_end_time").value || "18:00";
    const reason = document.getElementById("adj_reason").value || "Standard adjustment";

    try {
        await apiFetch("/payroll/shift-adjustments", {
            method: "POST",
            body: JSON.stringify({
                employee_id: empId,
                start_date: startDate,
                end_date: endDate,
                working_hours: workingHours,
                shift_start_time: shiftStartTime,
                shift_end_time: shiftEndTime,
                reason: reason,
                created_by: state.user?.sub || "Admin"
            })
        });

        showToast("Shift adjustment created successfully!", "success");
        closeModal();
        fetchPayrollData(state.selectedPayrollMonth, true);
    } catch (err) {
        console.error("Failed to save shift adjustment:", err);
        showToast("Failed to save shift adjustment: " + (err.message || "Unknown error"), "error");
        if (btn) btn.disabled = false;
    }
};

window.deleteShiftAdjustment = async function(adjustmentId) {
    if (!confirm("Are you sure you want to remove this shift adjustment? Expected hours will recalculate.")) {
        return;
    }
    try {
        await apiFetch(`/payroll/shift-adjustments/${adjustmentId}`, { method: "DELETE" });
        showToast("Shift adjustment removed", "info");
        closeModal();
        fetchPayrollData(state.selectedPayrollMonth, true);
    } catch (err) {
        console.error("Failed to delete shift adjustment:", err);
        showToast("Failed to delete shift adjustment", "error");
    }
};

/**
 * Modal to configure dynamic payroll penalty rates & Mailjet Email Dispatch
 */
window.openPenaltySettingsModal = async function() {
    let settings = {
        late_penalty_rate: 100.0,
        half_day_penalty_rate: 250.0,
        absent_penalty_rate: 500.0,
        mailjet_api_key: "",
        mailjet_secret_key: "",
        mailjet_sender_email: "noreply@yanatechnology.com",
        mailjet_sender_name: "Yana Technologies Payroll"
    };

    try {
        const fetched = await apiFetch("/payroll/penalty-settings");
        if (fetched) {
            settings = { ...settings, ...fetched };
        }
    } catch (err) {
        console.warn("Could not fetch remote penalty settings, using local defaults:", err);
    }

    const formHtml = `
        <form onsubmit="submitPenaltySettings(event)" class="space-y-3 text-xs">
            <div class="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2 text-amber-900">
                <i data-lucide="sliders" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
                <div class="text-[11px] leading-relaxed">
                    <strong class="font-bold text-amber-950">Dynamic Penalty & Email Rules:</strong>
                    Set deduction rates applied to attendance infractions. Configure Mailjet API credentials to dispatch branded itemized salary statements directly to employees' verified emails.
                </div>
            </div>

            <div class="space-y-3">
                <div class="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-rose-500"></i>
                    <span>Attendance Deduction Rates</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <!-- 1. Late Check-In Penalty -->
                    <div class="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                        <label class="font-bold text-slate-800 text-[10px] flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Late Arrival (₹/day)
                        </label>
                        <div class="relative">
                            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
                            <input type="number" step="10" min="0" max="10000" id="pen_late_rate" required
                                value="${settings.late_penalty_rate || 100}"
                                class="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                        </div>
                        <p class="text-[9px] text-slate-400">>15m late check-in.</p>
                    </div>

                    <!-- 2. Unapproved Half-Day Penalty -->
                    <div class="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                        <label class="font-bold text-slate-800 text-[10px] flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                            Unapproved Half-Day (₹)
                        </label>
                        <div class="relative">
                            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
                            <input type="number" step="25" min="0" max="25000" id="pen_half_day_rate" required
                                value="${settings.half_day_penalty_rate || 250}"
                                class="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                        </div>
                        <p class="text-[9px] text-slate-400">Waived if leave approved.</p>
                    </div>

                    <!-- 3. Unexcused Absent Penalty -->
                    <div class="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                        <label class="font-bold text-slate-800 text-[10px] flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Unexcused Absent (₹)
                        </label>
                        <div class="relative">
                            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
                            <input type="number" step="50" min="0" max="50000" id="pen_absent_rate" required
                                value="${settings.absent_penalty_rate || 500}"
                                class="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500" />
                        </div>
                        <p class="text-[9px] text-slate-400">Absent without leave.</p>
                    </div>
                </div>

                <!-- Mailjet Credentials Section -->
                <div class="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pt-1 pb-1">
                    <i data-lucide="mail" class="w-3.5 h-3.5 text-indigo-500"></i>
                    <span>Mailjet Statement Email Dispatch Settings</span>
                </div>

                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-2">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                            <label class="block font-bold text-slate-700 text-[9px] uppercase mb-0.5">Mailjet API Public Key</label>
                            <input type="text" id="pen_mailjet_api_key" placeholder="e.g. 3b7c84..."
                                value="${escapeHtml(settings.mailjet_api_key || '')}"
                                class="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 text-[9px] uppercase mb-0.5">Mailjet Secret Key</label>
                            <input type="password" id="pen_mailjet_secret_key" placeholder="••••••••••••••••"
                                value="${escapeHtml(settings.mailjet_secret_key || '')}"
                                class="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                            <label class="block font-bold text-slate-700 text-[9px] uppercase mb-0.5">Sender Email Address</label>
                            <input type="email" id="pen_mailjet_sender_email" placeholder="noreply@yanatechnology.com"
                                value="${escapeHtml(settings.mailjet_sender_email || 'noreply@yanatechnology.com')}"
                                class="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
                            <p class="text-[8px] text-slate-400 mt-0.5">Must match verified domain yanatechnology.com</p>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 text-[9px] uppercase mb-0.5">Sender Display Name</label>
                            <input type="text" id="pen_mailjet_sender_name" placeholder="Yana Technologies Payroll"
                                value="${escapeHtml(settings.mailjet_sender_name || 'Yana Technologies Payroll')}"
                                class="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onclick="closeModal()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer">
                    Cancel
                </button>
                <button type="submit" id="btn-submit-pen" class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5">
                    <i data-lucide="check" class="w-3.5 h-3.5"></i>
                    <span>Save & Apply Settings</span>
                </button>
            </div>
        </form>
    `;

    openModal("Configure Dynamic Penalties & Mailjet Dispatch", formHtml);
    if (window.lucide) lucide.createIcons();
};

window.submitPenaltySettings = async function(event) {
    event.preventDefault();
    const btn = document.getElementById("btn-submit-pen");
    if (btn) btn.disabled = true;

    const lateRate = parseFloat(document.getElementById("pen_late_rate")?.value) || 0.0;
    const halfDayRate = parseFloat(document.getElementById("pen_half_day_rate")?.value) || 0.0;
    const absentRate = parseFloat(document.getElementById("pen_absent_rate")?.value) || 0.0;
    const mailjetApiKey = document.getElementById("pen_mailjet_api_key")?.value?.trim() || "";
    const mailjetSecretKey = document.getElementById("pen_mailjet_secret_key")?.value?.trim() || "";
    const mailjetSenderEmail = document.getElementById("pen_mailjet_sender_email")?.value?.trim() || "noreply@yanatechnology.com";
    const mailjetSenderName = document.getElementById("pen_mailjet_sender_name")?.value?.trim() || "Yana Technologies Payroll";

    try {
        await apiFetch("/payroll/penalty-settings", {
            method: "POST",
            body: JSON.stringify({
                late_penalty_rate: lateRate,
                half_day_penalty_rate: halfDayRate,
                absent_penalty_rate: absentRate,
                mailjet_api_key: mailjetApiKey,
                mailjet_secret_key: mailjetSecretKey,
                mailjet_sender_email: mailjetSenderEmail,
                mailjet_sender_name: mailjetSenderName,
                updated_by: state.user?.sub || "Admin"
            })
        });

        showToast("Settings & Mailjet credentials saved! Recalculating...", "success");
        closeModal();
        fetchPayrollData(state.selectedPayrollMonth, true);
    } catch (err) {
        console.error("Failed to update penalty settings:", err);
        showToast("Failed to update settings: " + (err.message || "Unknown error"), "error");
        if (btn) btn.disabled = false;
    }
};

/**
 * Save Admin Payout Override for an employee
 */
window.saveAuditPayoutOverride = async function(employeeId, monthYear) {
    const input = document.getElementById(`audit_override_input_${employeeId}`);
    if (!input) return;

    const val = parseFloat(input.value);
    if (isNaN(val) || val < 0) {
        showToast("Please enter a valid payout amount (₹0 or greater)", "error");
        return;
    }

    const m = monthYear || state.selectedPayrollMonth || new Date().toISOString().slice(0, 7);

    const includedDeductions = {
        unworked_hours: document.getElementById(`chk_ded_unworked_${employeeId}`)?.checked ?? true,
        late: document.getElementById(`chk_ded_late_${employeeId}`)?.checked ?? true,
        half_day: document.getElementById(`chk_ded_half_day_${employeeId}`)?.checked ?? true,
        absent: document.getElementById(`chk_ded_absent_${employeeId}`)?.checked ?? true,
        overtime: document.getElementById(`chk_ded_overtime_${employeeId}`)?.checked ?? false
    };
    const remarks = document.getElementById(`audit_remarks_input_${employeeId}`)?.value?.trim() || "";

    try {
        await apiFetch("/payroll/override-payout", {
            method: "POST",
            body: JSON.stringify({
                employee_id: employeeId,
                month_year: m,
                override_amount: val,
                included_deductions: includedDeductions,
                notes: remarks,
                updated_by: state.user?.sub || "Admin"
            })
        });

        showToast(`Final payout successfully set to ₹${formatCurrency(val)}`, "success");
        await fetchPayrollData(m, true);
        openPayrollDetailModal(employeeId);
    } catch (err) {
        console.error("Failed to save payout override:", err);
        showToast("Failed to save payout override: " + (err.message || "Unknown error"), "error");
    }
};

/**
 * Dispatch Salary Breakdown Statement via Mailjet
 */
window.sendPayrollStatement = async function(employeeId, monthYear) {
    if (!state.payrollData || !state.payrollData.calculations) return;
    const c = state.payrollData.calculations.find(x => x.employee_id === employeeId);
    if (!c) return;

    if (!c.email || c.email === "N/A" || !c.email.includes("@")) {
        showToast(`Cannot send statement: ${c.full_name || 'Employee'} does not have a registered email address.`, "error");
        return;
    }

    const m = monthYear || state.selectedPayrollMonth || new Date().toISOString().slice(0, 7);
    const confirmMsg = `Send official payroll breakdown statement for ${formatTitleCase(c.full_name)} to ${c.email}?`;
    if (!confirm(confirmMsg)) return;

    const btn = document.getElementById(`btn_send_statement_${employeeId}`);
    const originalHtml = btn ? btn.innerHTML : null;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> Sending...`;
    }

    // Capture current modal inputs if modal is open
    const inputVal = parseFloat(document.getElementById(`audit_override_input_${employeeId}`)?.value);
    const finalAmount = (!isNaN(inputVal) && inputVal >= 0) ? inputVal : c.final_payable_amount;
    
    let includedDeductions = c.included_deductions;
    const chkUnworked = document.getElementById(`chk_ded_unworked_${employeeId}`);
    if (chkUnworked) {
        includedDeductions = {
            unworked_hours: chkUnworked.checked,
            late: document.getElementById(`chk_ded_late_${employeeId}`)?.checked ?? true,
            half_day: document.getElementById(`chk_ded_half_day_${employeeId}`)?.checked ?? true,
            absent: document.getElementById(`chk_ded_absent_${employeeId}`)?.checked ?? true,
            overtime: document.getElementById(`chk_ded_overtime_${employeeId}`)?.checked ?? false
        };
    }

    const remarksInput = document.getElementById(`audit_remarks_input_${employeeId}`);
    const notes = remarksInput ? remarksInput.value.trim() : (c.admin_remarks || "");

    try {
        const res = await apiFetch("/payroll/send-statement", {
            method: "POST",
            body: JSON.stringify({
                employee_id: employeeId,
                month_year: m,
                final_payable_override: finalAmount,
                included_deductions: includedDeductions,
                notes: notes,
                sent_by: state.user?.sub || "Admin"
            })
        });

        showToast(`Statement successfully dispatched to ${c.email}!`, "success");
        await fetchPayrollData(m, true);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="check-check" class="w-3.5 h-3.5"></i> Re-send Statement`;
            if (window.lucide) lucide.createIcons();
        }
    } catch (err) {
        console.error("Failed to send payroll statement:", err);
        showToast("Failed to dispatch email: " + (err.message || "Unknown error"), "error");
        if (btn && originalHtml) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            if (window.lucide) lucide.createIcons();
        }
    }
};

// Helper formatters
function formatCurrency(val) {
    const num = parseFloat(val) || 0.0;
    return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMonthYearLabel(yyyyMm) {
    if (!yyyyMm) return "--";
    const [y, m] = yyyyMm.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
