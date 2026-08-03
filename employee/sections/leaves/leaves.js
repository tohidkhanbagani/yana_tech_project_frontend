function getEmployeeLeaveRequestsTemplate() {
            const sortedRequests = [...(state.myLeaveRequests || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            // Fetch employee quota & inventory directly from employee profile
            const empData = state.employeeData || {};
            const totalPaid = parseFloat(empData.total_paid_leaves ?? 18.0);
            const usedPaid = parseFloat(empData.used_paid_leaves ?? 0.0);
            const remainingPaid = Math.max(totalPaid - usedPaid, 0);

            const totalCasual = parseFloat(empData.total_casual_leaves ?? 6.0);
            const usedCasual = parseFloat(empData.used_casual_leaves ?? 0.0);
            const remainingCasual = Math.max(totalCasual - usedCasual, 0);

            const totalSick = parseFloat(empData.total_sick_leaves ?? 6.0);
            const usedSick = parseFloat(empData.used_sick_leaves ?? 0.0);
            const remainingSick = Math.max(totalSick - usedSick, 0);

            let pendingCount = 0;
            let totalUsed = 0;
            
            sortedRequests.forEach(req => {
                if (req.status === 'Approved') {
                    totalUsed += req.total_days || 0;
                } else if (req.status === 'Pending') {
                    pendingCount += req.total_days || 0;
                }
            });
            
            let tableRows = '';
            if (sortedRequests.length === 0) {
                tableRows = '<tr><td colspan="8" class="px-6 py-8 text-center text-slate-500 font-medium">No leave requests found.</td></tr>';
            } else {
                tableRows = sortedRequests.map(req => {
                    const startStr = new Date(req.start_date).toLocaleDateString();
                    const endStr = new Date(req.end_date).toLocaleDateString();
                    const requestedOnStr = req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A';
                    
                    let statusColor = 'bg-slate-100 text-slate-700';
                    if (req.status === 'Approved') statusColor = 'bg-emerald-100 text-emerald-800';
                    if (req.status === 'Rejected') statusColor = 'bg-rose-100 text-rose-800';
                    if (req.status === 'Pending') statusColor = 'bg-amber-100 text-amber-800';
                    if (req.status === 'Cancelled') statusColor = 'bg-slate-200 text-slate-600';
                    if (req.status === 'Cancellation Requested') statusColor = 'bg-orange-100 text-orange-800';
                    
                    const statusBadge = `<span class="px-2.5 py-1 ${statusColor} rounded-full text-xs font-bold border border-white/20 shadow-sm">${req.status}</span>`;
                    
                    const todayLocal = new Date();
                    todayLocal.setHours(0, 0, 0, 0);
                    const leaveEndDate = new Date(req.end_date);
                    leaveEndDate.setHours(0, 0, 0, 0);
                    const hasEnded = todayLocal.getTime() > leaveEndDate.getTime();

                    let actionBtn = '';
                    if (req.status === 'Pending') {
                        if (hasEnded) {
                            actionBtn = `<span class="text-xs font-bold text-slate-400 italic">Leave Ended</span>`;
                        } else {
                            actionBtn = `<button onclick="window.cancelLeaveRequest('${req.id}')" class="text-rose-600 hover:text-rose-900 text-xs font-bold bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 shadow-sm">Cancel</button>`;
                        }
                    } else if (req.status === 'Approved') {
                        if (hasEnded) {
                            actionBtn = `<span class="text-xs font-bold text-slate-400 italic">Leave Ended</span>`;
                        } else {
                            actionBtn = `<button onclick="window.cancelLeaveRequest('${req.id}')" class="text-amber-600 hover:text-amber-900 text-xs font-bold bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors flex items-center gap-1 shadow-sm">Request Cancel</button>`;
                        }
                    } else if (req.status === 'Cancellation Requested') {
                        actionBtn = `<span class="text-[10px] text-slate-400 font-semibold italic">Cancellation pending approval</span>`;
                    } else {
                        actionBtn = `<span class="text-xs text-slate-400">-</span>`;
                    }
                    
                    let backupName = 'N/A';
                    if (req.backup_employee_id && req.backup_employee_id !== 'N/A') {
                        const backupEmp = (state.allEmployees || []).find(e => e.id === req.backup_employee_id);
                        backupName = backupEmp ? backupEmp.full_name : req.backup_employee_id;
                    }
                    
                    return `
                        <tr onclick="window.showLeaveDetailsModal('${req.id}')" class="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer text-xs">
                            <td class="px-4 py-3 font-semibold text-slate-700">${requestedOnStr}</td>
                            <td class="px-4 py-3 font-semibold text-slate-800">${startStr} - ${endStr}</td>
                            <td class="px-4 py-3 text-slate-500 font-medium">${req.leave_type || 'Paid Leave'}</td>
                            <td class="px-4 py-3 font-bold text-slate-700">${req.total_days || 1.0} d (${req.half_day_option || 'Full Day'})</td>
                            <td class="px-4 py-3 text-slate-600 max-w-[150px] truncate" title="${req.reason}">${req.reason}</td>
                            <td class="px-4 py-3 text-slate-500" title="Work Handover: ${req.pending_work_summary || 'N/A'}">
                                <span class="font-semibold text-slate-600 truncate max-w-[120px] block">${backupName}</span>
                            </td>
                            <td class="px-4 py-3">${statusBadge}</td>
                            <td class="px-4 py-3 text-right" onclick="event.stopPropagation()">${actionBtn}</td>
                        </tr>
                    `;
                }).join('');
            }
            
            const backupOptions = (state.allEmployees || [])
                .filter(emp => emp.id !== state.user.id)
                .map(emp => `<option value="${emp.id}">${emp.full_name}</option>`)
                .join('');
            
            const todayStr = new Date().toISOString().split('T')[0];
            
            return `
                <div class="max-w-5xl mx-auto space-y-6 fade-in">
                    <!-- Dashboard Cards -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-4 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-all">
                            <div class="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-15 pointer-events-none group-hover:scale-110 transition-transform">
                                <i data-lucide="check-circle" class="w-20 h-20"></i>
                            </div>
                            <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-100">Paid Leave Balance</span>
                            <div class="text-2xl font-black mt-1.5">${remainingPaid} / ${totalPaid}</div>
                            <div class="text-[11px] font-semibold text-emerald-100/90 mt-1">${usedPaid} days used</div>
                        </div>

                        <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-4 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-all">
                            <div class="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-15 pointer-events-none group-hover:scale-110 transition-transform">
                                <i data-lucide="calendar" class="w-20 h-20"></i>
                            </div>
                            <span class="text-[10px] font-extrabold uppercase tracking-wider text-indigo-100">Casual Leave Balance</span>
                            <div class="text-2xl font-black mt-1.5">${remainingCasual} / ${totalCasual}</div>
                            <div class="text-[11px] font-semibold text-indigo-100/90 mt-1">${usedCasual} days used</div>
                        </div>

                        <div class="bg-gradient-to-br from-rose-500 to-rose-600 rounded-3xl p-4 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-all">
                            <div class="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-15 pointer-events-none group-hover:scale-110 transition-transform">
                                <i data-lucide="heart-pulse" class="w-20 h-20"></i>
                            </div>
                            <span class="text-[10px] font-extrabold uppercase tracking-wider text-rose-100">Sick Leave Balance</span>
                            <div class="text-2xl font-black mt-1.5">${remainingSick} / ${totalSick}</div>
                            <div class="text-[11px] font-semibold text-rose-100/90 mt-1">${usedSick} days used</div>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div class="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                                <i data-lucide="check-circle-2" class="w-20 h-20 text-slate-900"></i>
                            </div>
                            <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Approved Leaves</span>
                            <div class="text-2xl font-black text-slate-800 mt-1.5">${totalUsed} Day${totalUsed !== 1 ? 's' : ''}</div>
                            <div class="text-[11px] font-semibold text-slate-500 mt-1">Across categories</div>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div class="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                                <i data-lucide="clock-4" class="w-20 h-20 text-slate-900"></i>
                            </div>
                            <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pending Approval</span>
                            <div class="text-2xl font-black text-slate-800 mt-1.5">${pendingCount} Day${pendingCount !== 1 ? 's' : ''}</div>
                            <div class="text-[11px] font-semibold text-slate-500 mt-1">Manager approval</div>
                        </div>
                    </div>


                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Left Column: Form -->
                        <div class="lg:col-span-2 space-y-6">
                            <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                <h3 class="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2.5">
                                    <i data-lucide="calendar-plus" class="w-5 h-5 text-indigo-600"></i> Apply for Leave
                                </h3>
                                <form onsubmit="handleLeaveRequestSubmit(event)" class="space-y-5">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Leave / Request Type <span class="text-rose-500">*</span></label>
                                            <div class="relative">
                                                <select id="leave-type" required onchange="window.handleLeaveTypeChange(this)" class="input-field w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 font-medium appearance-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                                    <option value="Casual Leave" selected>Casual Leave</option>
                                                    <option value="Sick Leave">Sick Leave</option>
                                                    <option value="Paid Leave">Paid Leave</option>
                                                    <option value="Unpaid Leave">Unpaid Leave</option>
                                                    <option value="Out of Office">Out of Office</option>
                                                    <option value="Work Handover Only">Work Handover Only (No Leave Deduction)</option>
                                                </select>
                                                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Duration <span class="text-rose-500">*</span></label>
                                            <div class="relative">
                                                <select id="leave-duration" required onchange="window.updateLeaveDaysCalculation()" class="input-field w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 font-medium appearance-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                                    <option value="Full Day" selected>Full Day</option>
                                                    <option value="First Half">First Half (0.5 Day)</option>
                                                    <option value="Second Half">Second Half (0.5 Day)</option>
                                                </select>
                                                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Start Date <span class="text-rose-500">*</span></label>
                                            <input type="date" id="leave-start" required min="${todayStr}" onchange="window.updateLeaveDaysCalculation()" class="input-field w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">End Date <span class="text-rose-500">*</span></label>
                                            <input type="date" id="leave-end" required min="${todayStr}" onchange="window.updateLeaveDaysCalculation()" class="input-field w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                        </div>
                                    </div>
                                    
                                    <div id="leave-calculation-output"></div>

                                    <div>
                                        <div class="flex justify-between items-center mb-2">
                                            <label class="block text-xs font-black text-slate-400 uppercase tracking-wider">Reason for Leave / Handover <span class="text-rose-500">*</span></label>
                                            <span id="leave-reason-counter" class="text-[10px] text-slate-400">0 / 500 characters</span>
                                        </div>
                                        <textarea id="leave-reason" required rows="4" minlength="15" maxlength="500" oninput="window.autoExpandTextarea(this); document.getElementById('leave-reason-counter').innerText = this.value.length + ' / 500 characters'" class="input-field w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl outline-none text-sm text-slate-700 focus:bg-white focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10 transition-all" placeholder="Explain the reason clearly (minimum 15 characters, maximum 500 characters)..."></textarea>
                                    </div>

                                    <!-- Interactive Work Handover Toggle Card -->
                                    <div class="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between transition-all">
                                        <div class="flex items-center gap-3">
                                            <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                                <i data-lucide="shuffle" class="w-5 h-5"></i>
                                            </div>
                                            <div>
                                                <h4 class="text-xs font-bold text-slate-800">Attach Work Handover / Delegate Tasks?</h4>
                                                <p class="text-[11px] text-slate-500 font-medium">Turn ON only if you have pending tasks to hand over to a colleague.</p>
                                            </div>
                                        </div>
                                        <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                            <input type="checkbox" id="toggle-leave-handover" onchange="window.toggleLeaveHandoverSection(this.checked)" class="sr-only peer">
                                            <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>

                                    <!-- Task Handover Section (Hidden/Collapsed by default) -->
                                    <div id="leave-handover-container" class="hidden bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <h4 class="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <i data-lucide="shuffle" class="w-4 h-4 text-indigo-500"></i> Work Handover Details
                                        </h4>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-500 mb-2">Assigned Backup Employee <span id="req-star-backup" class="text-rose-500 hidden">*</span></label>
                                                <div class="relative">
                                                    <select id="leave-backup" class="input-field w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 font-medium appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                                        <option value="N/A">-- Select Handover Employee --</option>
                                                        ${backupOptions}
                                                    </select>
                                                    <i data-lucide="user-check" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-500 mb-2">Deployment Pending?</label>
                                                <div class="relative">
                                                    <select id="leave-deployment" class="input-field w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 font-medium appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                                        <option value="No" selected>No</option>
                                                        <option value="Yes">Yes</option>
                                                    </select>
                                                    <i data-lucide="server" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-500 mb-2">Project <span id="req-star-project" class="text-rose-500 hidden">*</span></label>
                                                <div class="relative">
                                                    <select id="leave-project" onchange="window.updateLeaveMilestones(this)" class="input-field w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 font-medium appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                                        <option value="">-- Select Project --</option>
                                                        ${state.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                                    </select>
                                                    <i data-lucide="folder" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-500 mb-2">Milestone</label>
                                                <div class="relative">
                                                    <select id="leave-milestone" onchange="window.handleLeaveMilestoneChange(this)" class="input-field w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 font-medium appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                                        <option value="">General Task (No Milestone)</option>
                                                    </select>
                                                    <i data-lucide="target" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-500 mb-2">Task Type</label>
                                                <div class="relative">
                                                    <select id="leave-task-type" class="input-field w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 font-medium appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                                        <option value="developer" selected>Engineering</option>
                                                        <option value="content">Content</option>
                                                        <option value="both">Both</option>
                                                    </select>
                                                    <i data-lucide="settings" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-bold text-slate-500 mb-2">Pending Work Summary <span id="req-star-summary" class="text-rose-500 hidden">*</span></label>
                                            <textarea id="leave-work-summary" rows="2" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="Provide a summary of tasks handed over..."></textarea>
                                        </div>
                                    </div>

                                    <div class="flex justify-end">
                                        <button type="submit" id="btn-submit-leave" class="bg-brand-primary hover:bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
                                            <i data-lucide="send" class="w-4 h-4"></i> Submit Request
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <!-- Right Column: Holiday Calendar -->
                        <div class="space-y-6">
                            <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                                <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <i data-lucide="calendar" class="w-4 h-4 text-slate-500"></i> Holiday Calendar 2026
                                </h3>
                                <p class="text-slate-500 text-xs mb-4">Note: Weekends (Saturdays and Sundays) and the following public holidays are automatically excluded from leave deductions.</p>
                                <div class="space-y-2.5">
                                    ${(state.holidays && state.holidays.length > 0) ? state.holidays.map(h => `
                                        <div class="flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl transition-all animate-in fade-in duration-200">
                                            <div>
                                                <span class="text-xs font-semibold text-slate-700">${h.name}</span>
                                                <span class="block text-[9px] font-black uppercase tracking-wider text-slate-400 mt-0.5">${h.holiday_type} Holiday</span>
                                            </div>
                                            <span class="text-xs font-black text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">${new Date(h.date).toLocaleDateString([], {month: 'short', day: 'numeric'})}</span>
                                        </div>
                                    `).join('') : `
                                        <div class="flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl transition-all">
                                            <span class="text-xs font-semibold text-slate-700">New Year's Day</span>
                                            <span class="text-xs font-black text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">Jan 01</span>
                                        </div>
                                        <div class="flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl transition-all">
                                            <span class="text-xs font-semibold text-slate-700">Republic Day</span>
                                            <span class="text-xs font-black text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">Jan 26</span>
                                        </div>
                                        <div class="flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl transition-all">
                                            <span class="text-xs font-semibold text-slate-700">Independence Day</span>
                                            <span class="text-xs font-black text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">Aug 15</span>
                                        </div>
                                        <div class="flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl transition-all">
                                            <span class="text-xs font-semibold text-slate-700">Gandhi Jayanti</span>
                                            <span class="text-xs font-black text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">Oct 02</span>
                                        </div>
                                        <div class="flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl transition-all">
                                            <span class="text-xs font-semibold text-slate-700">Christmas Day</span>
                                            <span class="text-xs font-black text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">Dec 25</span>
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- History Table -->
                    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                        <div class="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h4 class="font-bold text-slate-800 flex items-center gap-2">
                                <i data-lucide="history" class="w-5 h-5 text-slate-500"></i> My Leave History
                            </h4>
                            <span class="px-2.5 py-1 bg-indigo-100 text-brand-primary text-xs font-bold rounded-md">${sortedRequests.length} Total</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left whitespace-nowrap">
                                <thead>
                                    <tr class="bg-slate-50/50 border-b border-slate-200">
                                        <th class="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400">Requested On</th>
                                        <th class="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400">Duration</th>
                                        <th class="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400">Type</th>
                                        <th class="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400">Total Days</th>
                                        <th class="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400">Reason</th>
                                        <th class="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400">Backup Person</th>
                                        <th class="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400">Status</th>
                                        <th class="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${tableRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }