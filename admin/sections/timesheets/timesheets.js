function getAdminTimesheetsTemplate() {
      state.timesheetProjectFilter = state.timesheetProjectFilter || 'All';
      state.timesheetStatusFilter = state.timesheetStatusFilter || 'All';
      state.timesheetEmployeeFilter = state.timesheetEmployeeFilter || 'All';
      state.timesheetTypeFilter = state.timesheetTypeFilter || 'All';

      // Define update timesheet filter handler globally
      window.updateTimesheetFilter = (type, value) => {
        state[type] = value;
        renderAdminApp();
      };

      window.fetchCustomTimesheetsData = async (sDate = null, eDate = null) => {
          const startDate = sDate || document.getElementById("timesheetsStartDate").value;
          const endDate = eDate || document.getElementById("timesheetsEndDate").value;
          if (!startDate && !endDate) {
              alert("Please select at least one date.");
              return;
          }
          state.timesheetsStartDate = startDate;
          state.timesheetsEndDate = endDate;
          
          // Sync UI inputs if parameters were passed
          const sInput = document.getElementById("timesheetsStartDate");
          const eInput = document.getElementById("timesheetsEndDate");
          if (sInput && sDate) sInput.value = sDate;
          if (eInput && eDate) eInput.value = eDate;

          let url = '/tasks/all?';
          if (startDate) url += `start_date=${startDate}&`;
          if (endDate) url += `end_date=${endDate}`;
          try {
              const tasks = await apiFetch(url);
              state.allTasks = Array.isArray(tasks) ? tasks : [];
              renderAdminApp();
          } catch (error) {
              console.error("Failed to fetch custom timesheets data:", error);
              alert("Failed to fetch data.");
          }
      };

      window.fetchCustomTimesheetsByMonthYear = async () => {
          const month = document.getElementById("timesheetsMonth").value;
          const year = document.getElementById("timesheetsYear").value;
          if (month === "All" || year === "All") {
              alert("Please select both a month and a year.");
              return;
          }
          state.timesheetsMonth = month;
          state.timesheetsYear = year;
          const startDate = new Date(year, month, 1).toISOString().split('T')[0];
          const endDate = new Date(year, parseInt(month) + 1, 0).toISOString().split('T')[0];
          
          state.timesheetsStartDate = startDate;
          state.timesheetsEndDate = endDate;
          window.fetchCustomTimesheetsData(startDate, endDate);
      };

      window.clearTimesheetFilters = async () => {
          state.timesheetsStartDate = null;
          state.timesheetsEndDate = null;
          state.timesheetsMonth = null;
          state.timesheetsYear = null;
          
          const mSel = document.getElementById("timesheetsMonth");
          const ySel = document.getElementById("timesheetsYear");
          const sInput = document.getElementById("timesheetsStartDate");
          const eInput = document.getElementById("timesheetsEndDate");
          if (mSel) mSel.value = "All";
          if (ySel) ySel.value = "All";
          if (sInput) sInput.value = "";
          if (eInput) eInput.value = "";
          
          try {
              const tasks = await apiFetch("/tasks/all");
              state.allTasks = Array.isArray(tasks) ? tasks : [];
              renderAdminApp();
          } catch (error) {
              console.error("Failed to clear timesheets filters:", error);
              alert("Failed to reset timesheets.");
          }
      };

      const filteredTasks = (state.allTasks || []).filter(t => {
        // Project Filter
        let projectMatch = true;
        if (state.timesheetProjectFilter !== 'All') {
          if (state.timesheetProjectFilter === 'General') {
            projectMatch = !t.project_id || t.project_id === 'N/A';
          } else {
            projectMatch = t.project_id === state.timesheetProjectFilter;
          }
        }

        // Employee Filter
        let employeeMatch = true;
        if (state.timesheetEmployeeFilter !== 'All') {
          employeeMatch = t.employee_id === state.timesheetEmployeeFilter;
        }

        // Task Type Filter
        let typeMatch = true;
        if (state.timesheetTypeFilter !== 'All') {
          typeMatch = t.task_type === state.timesheetTypeFilter;
        }

        // Status Filter
        let statusMatch = true;
        if (state.timesheetStatusFilter !== 'All') {
          statusMatch = (t.task_status || 'Completed').toLowerCase() === state.timesheetStatusFilter.toLowerCase();
        }

        return projectMatch && employeeMatch && typeMatch && statusMatch;
      });

      const sortedTasks = [...filteredTasks].sort(
        (a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date),
      );

      // Recalculate metrics based on current filtered ledger subset
      let totalHours = 0;
      let totalCost = 0;
      let totalBilled = 0;
      let totalProfit = 0;

      filteredTasks.forEach(t => {
        totalHours += parseFloat(t.hours_logged || 0);
        totalCost += parseFloat(t.employee_cost || 0);
        totalBilled += parseFloat(t.billing_amount || 0);
        totalProfit += parseFloat(t.profit_loss || 0);
      });

      const projectOptions = [
        { id: 'All', name: 'All Projects' },
        { id: 'General', name: 'General/No Project' },
        ...(state.allProjects || []).map(p => ({ id: p.id, name: p.name !== 'N/A' ? p.name : 'Unnamed Project' }))
      ];

      const employeeOptions = [
        { id: 'All', name: 'All Employees' },
        ...(state.allEmployees || []).map(e => ({ id: e.id, name: e.full_name || 'Unknown' }))
      ];

      const rows =
        sortedTasks
          .map((t) => {
            const date = new Date(
              t.date || t.created_at,
            ).toLocaleDateString();
            const isDev = t.task_type === "developer";
            const employee = state.allEmployees.find(
              (e) => e.id === t.employee_id,
            );
            const empName = employee ? employee.full_name : "Unknown";
            const project = state.allProjects.find(
              (p) => p.id === t.project_id,
            );
            const projName = project ? project.name : "General";

            const profit = parseFloat(t.profit_loss || 0);
            const profitClass =
              profit >= 0
                ? "text-brand-accent bg-emerald-50"
                : "text-brand-alert bg-rose-50";
            const profitSign = profit >= 0 ? "+" : "";

            let handoverBadge = '';
            if (t.is_handover || t.handover_source_task_id) {
              const colleague = state.allEmployees.find(
                (e) => e.id === t.handover_for_employee_id,
              );
              const colleagueName = colleague ? colleague.full_name : "Unknown";
              if (t.handover_source_task_id) {
                handoverBadge = `
                  <span class="inline-flex items-center gap-1 text-[8px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded ml-1.5 shrink-0" title="Handover task completed for ${colleagueName}">
                      <i data-lucide="check-check" class="w-2.5 h-2.5"></i> Done for ${colleagueName}
                  </span>
                `;
              } else {
                handoverBadge = `
                  <span class="inline-flex items-center gap-1 text-[8px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded ml-1.5 shrink-0" title="Handover task assigned to ${colleagueName}">
                      <i data-lucide="share-2" class="w-2.5 h-2.5"></i> Assigned to ${colleagueName}
                  </span>
                `;
              }
            }

            return `
                    <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer group" onclick="openTaskDetailsModal('${t.id}')">
                        <td class="px-4 py-2.5 whitespace-nowrap overflow-hidden">
                            <div class="font-bold text-slate-800 group-hover:text-brand-primary transition-colors truncate text-xs" title="${empName}">${empName}</div>
                            <div class="text-[10px] text-slate-450 font-semibold mt-0.5">${date}</div>
                        </td>
                        <td class="px-4 py-2.5 whitespace-nowrap overflow-hidden">
                            <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-655 truncate block w-fit max-w-full" title="${projName}">${projName}</span>
                        </td>
                        <td class="px-4 py-2.5 whitespace-nowrap overflow-hidden">
                            <div class="flex items-center text-[10px] font-semibold text-slate-650 flex-wrap gap-1">
                                <span class="inline-flex items-center">
                                    <i data-lucide="${isDev ? "terminal" : "video"}" class="w-3.5 h-3.5 mr-1 ${isDev ? "text-indigo-500" : "text-pink-500"}"></i> 
                                    ${isDev ? "Engineering" : "Content"}
                                </span>
                                <span class="inline-flex items-center gap-1 text-[8px] font-bold ${
                                  t.task_status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  t.task_status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  'bg-amber-50 text-amber-700 border border-amber-100'
                                } px-1.5 py-0.5 rounded shrink-0">
                                    ${t.task_status || 'Completed'}
                                </span>
                                ${t.is_edited ? `
                                    <span class="inline-flex items-center gap-0.5 text-[8px] font-bold bg-amber-50 text-amber-750 border border-amber-200 px-1.5 py-0.5 rounded shrink-0" title="Edited by ${t.edited_by || 'Unknown'}">
                                        <i data-lucide="edit-2" class="w-2 h-2"></i> Edited
                                    </span>
                                ` : ''}
                                ${handoverBadge}
                            </div>
                        </td>
                        <td class="px-4 py-2.5 whitespace-nowrap overflow-hidden text-xs font-bold text-slate-800">${parseFloat(t.hours_logged).toFixed(1)} <span class="text-[10px] text-slate-400 font-normal">hrs</span></td>
                        <td class="px-4 py-2.5 whitespace-nowrap overflow-hidden text-xs text-slate-650">${formatCurrency(t.employee_cost)}</td>
                        <td class="px-4 py-2.5 whitespace-nowrap overflow-hidden text-xs font-bold text-slate-800">${formatCurrency(t.billing_amount)}</td>
                        <td class="px-4 py-2.5 whitespace-nowrap overflow-hidden"><span class="px-2 py-0.5 rounded text-xs font-bold ${profitClass}">${profitSign}${formatCurrency(profit)}</span></td>
                    </tr>
                `;
          })
          .join("") ||
        `<tr><td colspan="7" class="px-4 py-8 text-center text-slate-500">No timesheets match selected filters.</td></tr>`;

      return `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">Financial Ledger (Timesheets)</h3>
                        <p class="text-slate-500 mt-1">Universal view of all logged hours, auto-calculated costs, and profit margins. Defaults to last 48 hours.</p>
                    </div>
                </div>

                <!-- Unified Premium Date/Range Filter Bar -->
                <div class="bg-white rounded-xl border border-slate-200 p-3.5 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
                    <div class="flex items-center gap-2 text-slate-700 shrink-0">
                        <div class="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
                            <i data-lucide="calendar" class="w-4 h-4"></i>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-slate-800">Ledger Date Filters</span>
                            <span class="text-[10px] text-slate-400 font-semibold">Select subset by Month/Year or custom Range</span>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-3">
                        <!-- Month/Year Filter Card -->
                        <div class="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-lg shadow-inner">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-1 border-r border-slate-200">Month/Year</span>
                            <select id="timesheetsMonth" aria-label="Select month" class="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-primary rounded">
                                <option value="All" ${state.timesheetsMonth === 'All' || !state.timesheetsMonth ? 'selected' : ''}>Month</option>
                                ${Array.from({length: 12}, (_, i) => `<option value="${i}" ${state.timesheetsMonth === String(i) ? 'selected' : ''}>${new Date(0, i).toLocaleString('default', {month: 'short'})}</option>`).join('')}
                            </select>
                            <select id="timesheetsYear" aria-label="Select year" class="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-primary rounded">
                                <option value="All" ${state.timesheetsYear === 'All' || !state.timesheetsYear ? 'selected' : ''}>Year</option>
                                ${[2024, 2025, 2026, 2027].map(y => `<option value="${y}" ${state.timesheetsYear === String(y) ? 'selected' : ''}>${y}</option>`).join('')}
                            </select>
                            <button onclick="fetchCustomTimesheetsByMonthYear()" aria-label="Apply month year filter" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-white text-[10px] font-bold rounded transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-brand-primary">Apply</button>
                        </div>
                        
                        <span class="text-xs font-bold text-slate-400 hidden lg:inline">or</span>
                        
                        <!-- Range Filter Card -->
                        <div class="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-lg shadow-inner">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-1 border-r border-slate-200">Custom Range</span>
                            <input type="date" id="timesheetsStartDate" value="${state.timesheetsStartDate || ''}" aria-label="Start Date" class="bg-transparent border-none text-xs font-bold text-slate-750 outline-none cursor-pointer w-[110px] focus-visible:ring-2 focus-visible:ring-brand-primary rounded" title="Start Date">
                            <span class="text-xs text-slate-400 font-bold">&rarr;</span>
                            <input type="date" id="timesheetsEndDate" value="${state.timesheetsEndDate || ''}" aria-label="End Date" class="bg-transparent border-none text-xs font-bold text-slate-750 outline-none cursor-pointer w-[110px] focus-visible:ring-2 focus-visible:ring-brand-primary rounded" title="End Date">
                            <button onclick="fetchCustomTimesheetsData()" aria-label="Fetch custom range timesheets" class="px-2.5 py-1 bg-brand-primary hover:bg-indigo-700 text-white text-[10px] font-bold rounded transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-brand-primary">Fetch</button>
                            <button onclick="clearTimesheetFilters()" aria-label="Clear timesheet filters" class="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded transition-colors shadow-sm flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-brand-primary" title="Clear Filters">
                                <i data-lucide="rotate-ccw" class="w-3 h-3" aria-hidden="true"></i> Clear
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Dynamic Metrics Summary Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <i data-lucide="clock" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Hours</span>
                            <span class="text-lg font-black text-slate-800">${totalHours.toFixed(1)} hrs</span>
                        </div>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                            <i data-lucide="trending-down" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Cost (Burn)</span>
                            <span class="text-lg font-black text-rose-600">${formatCurrency(totalCost)}</span>
                        </div>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                            <i data-lucide="trending-up" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Billed (Earn)</span>
                            <span class="text-lg font-black text-emerald-600">${formatCurrency(totalBilled)}</span>
                        </div>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-indigo-550 flex items-center justify-center text-indigo-600 shrink-0">
                            <i data-lucide="wallet" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Profit / Loss</span>
                            <span class="text-lg font-black ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                                ${totalProfit >= 0 ? '+' : ''}${formatCurrency(totalProfit)}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Ledger Filter Panel -->
                <div class="bg-white rounded-2xl border border-slate-200/60 p-5 mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shadow-sm">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Filter by Project</label>
                        <select onchange="updateTimesheetFilter('timesheetProjectFilter', this.value)" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-brand-primary outline-none bg-white">
                            ${projectOptions.map(p => `
                                <option value="${p.id}" ${state.timesheetProjectFilter === p.id ? 'selected' : ''}>${p.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Filter by Employee</label>
                        <select onchange="updateTimesheetFilter('timesheetEmployeeFilter', this.value)" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-brand-primary outline-none bg-white">
                            ${employeeOptions.map(e => `
                                <option value="${e.id}" ${state.timesheetEmployeeFilter === e.id ? 'selected' : ''}>${e.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Filter by Task Type</label>
                        <select onchange="updateTimesheetFilter('timesheetTypeFilter', this.value)" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-brand-primary outline-none bg-white">
                            <option value="All" ${state.timesheetTypeFilter === 'All' ? 'selected' : ''}>All Types</option>
                            <option value="developer" ${state.timesheetTypeFilter === 'developer' ? 'selected' : ''}>Engineering</option>
                            <option value="content_creator" ${state.timesheetTypeFilter === 'content_creator' ? 'selected' : ''}>Content</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Filter by Status</label>
                        <select onchange="updateTimesheetFilter('timesheetStatusFilter', this.value)" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-brand-primary outline-none bg-white">
                            <option value="All" ${state.timesheetStatusFilter === 'All' ? 'selected' : ''}>All Statuses</option>
                            <option value="Completed" ${state.timesheetStatusFilter === 'Completed' ? 'selected' : ''}>Completed</option>
                            <option value="In Progress" ${state.timesheetStatusFilter === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Pending Review" ${state.timesheetStatusFilter === 'Pending Review' ? 'selected' : ''}>Pending Review</option>
                        </select>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left table-fixed border-collapse">
                            <thead class="bg-slate-50/50 border-b border-slate-200">
                                <tr class="text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                    <th class="px-4 py-3 w-[18%]">Employee & Date</th>
                                    <th class="px-4 py-3 w-[18%]">Project</th>
                                    <th class="px-4 py-3 w-[18%]">Task Type</th>
                                    <th class="px-4 py-3 w-[10%]">Hours</th>
                                    <th class="px-4 py-3 w-[11%]">Cost (Burn)</th>
                                    <th class="px-4 py-3 w-[11%]">Billed (Earn)</th>
                                    <th class="px-4 py-3 w-[14%]">Net Profit</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-slate-250">
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
    }