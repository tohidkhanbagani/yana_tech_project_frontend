function getEmployeeTimesheetsTemplate() {
            const milestones = state.myMilestones || [];
            const tasks = state.employeeTasks || [];

            // Calculate overall metadata
            const totalMilestones = milestones.length;
            const totalTasks = tasks.length;
            let totalHours = 0;
            tasks.forEach(t => {
                totalHours += parseFloat(t.hours_logged || 0);
            });

            // Render Raw Tasks Table
            const sortedTasks = [...tasks].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
            const tableRows = sortedTasks.map(t => {
                const d = new Date(t.date || t.created_at);
                const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                
                const project = t.project_id ? (state.projects.find(p => p.id === t.project_id)?.name || 'Project Attached') : 'General / No Project';
                const milestone = t.milestone_id ? (milestones.find(m => m.id === t.milestone_id)?.milestone_name || 'Milestone Attached') : 'General Task';
                
                // 24 hour edit permission check
                const createdTime = new Date(t.created_at).getTime();
                const elapsedHours = (Date.now() - createdTime) / (1000 * 60 * 60);
                const canEdit = elapsedHours <= 24;

                let actionBtn = '';
                if (canEdit) {
                    actionBtn = `
                        <button onclick="event.stopPropagation(); window.openEditTaskModal('${t.id}', '${t.task_type}')" class="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-650 hover:text-white border border-indigo-200 rounded-lg text-xs font-bold transition-all shadow-xs">
                            <i data-lucide="edit-3" class="w-3 h-3"></i> Edit
                        </button>
                    `;
                } else {
                    actionBtn = `
                        <span onclick="event.stopPropagation()" class="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg text-xs font-medium cursor-not-allowed" title="Locked (24h expired)">
                            <i data-lucide="lock" class="w-3 h-3"></i> Locked
                        </span>
                    `;
                }

                const editedBadge = t.is_edited ? `
                    <span class="inline-flex items-center gap-0.5 text-[8px] font-black bg-amber-50 text-amber-700 border border-amber-250 px-1.5 py-0.5 rounded shadow-sm">
                        Edited
                    </span>
                ` : '';

                // Handover Badge
                let coveredEmpName = '';
                if (t.handover_for_employee_id) {
                    const coveredEmp = (state.allEmployees || []).find(e => e.id === t.handover_for_employee_id);
                    coveredEmpName = coveredEmp ? coveredEmp.full_name : 'Colleague';
                }
                const handoverBadge = t.is_handover ? `
                    <span class="inline-flex items-center gap-1 text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md mt-0.5 shadow-xs w-fit" title="Covering ${coveredEmpName}">
                        Handover
                    </span>
                ` : '';

                // Effort Metrics custom formatting (Culling zero values, displaying as premium badges)
                let metricsText = '';
                if (t.task_type === 'content_creator') {
                    let customVals = {};
                    try {
                        customVals = t.custom_field_values ? (typeof t.custom_field_values === 'string' ? JSON.parse(t.custom_field_values) : t.custom_field_values) : {};
                    } catch(e) {
                        customVals = {};
                    }
                    
                    const activeMetrics = [];
                    if (customVals && typeof customVals === 'object' && Object.keys(customVals).length > 0) {
                        Object.entries(customVals).forEach(([k, v]) => {
                            const val = parseInt(v) || 0;
                            if (val > 0) {
                                activeMetrics.push({ name: k, value: val });
                            }
                        });
                    } else {
                        const standard = [
                            { name: 'Reels', value: t.reels_count },
                            { name: 'Videos', value: t.long_video_count },
                            { name: 'Posters', value: t.poster_count },
                            { name: 'Calls', value: t.calls_made }
                        ];
                        standard.forEach(m => {
                            const val = parseInt(m.value) || 0;
                            if (val > 0) {
                                activeMetrics.push({ name: m.name, value: val });
                            }
                        });
                    }

                    if (activeMetrics.length > 0) {
                        metricsText = activeMetrics.map(m => {
                            let displayName = m.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            if (displayName.toLowerCase().includes('reel')) displayName = 'Reels';
                            else if (displayName.toLowerCase().includes('video') || displayName.toLowerCase().includes('youtube')) displayName = 'Videos';
                            else if (displayName.toLowerCase().includes('call')) displayName = 'Calls';
                            else if (displayName.toLowerCase().includes('post') || displayName.toLowerCase().includes('graphic')) displayName = 'Posts';
                            
                            return `${m.value} ${displayName}`;
                        }).join(', ');
                    }
                }

                const hoursLoggedVal = parseFloat(t.hours_logged) || 0.0;
                const hoursBadge = `
                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 text-indigo-750 border border-indigo-100 shrink-0">
                        <i data-lucide="clock" class="w-2.5 h-2.5 text-indigo-550"></i> ${hoursLoggedVal.toFixed(1)} hrs
                    </span>
                `;

                const metricsBadge = metricsText ? `
                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100 truncate max-w-[120px]" title="${metricsText}">
                        ${metricsText}
                    </span>
                ` : '';

                const effortMetricHtml = `
                    <div class="flex items-center gap-1.5 flex-wrap">
                        ${hoursBadge}
                        ${metricsBadge}
                    </div>
                `;

                const taskTypeLabel = t.task_type === 'developer' ? 'Developer' : 'Content Creator';
                const taskTypeColor = t.task_type === 'developer' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-rose-50 text-rose-700 border-rose-200';
                const taskTypeIcon = t.task_type === 'developer' ? 'terminal' : 'video';

                return `
                    <tr onclick="window.openTaskDetailsModal('${t.id}')" class="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer">
                        <td class="px-4 py-2.5 whitespace-nowrap text-left">
                            <div class="text-xs font-bold text-slate-800">${dateStr}</div>
                            <div class="text-[10px] text-slate-400 font-semibold mt-0.5">${timeStr}</div>
                        </td>
                        <td class="px-4 py-2.5 text-xs text-slate-800">
                            <div class="font-bold text-slate-800 truncate max-w-[150px]" title="${project}">${project}</div>
                            <div class="text-[10px] text-slate-450 font-medium truncate max-w-[150px] mt-0.5" title="${milestone}">${milestone}</div>
                        </td>
                        <td class="px-4 py-2.5 whitespace-nowrap">
                            <div class="flex flex-col gap-1 items-start">
                                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${taskTypeColor} shadow-xs">
                                    <i data-lucide="${taskTypeIcon}" class="w-3 h-3"></i>
                                    ${taskTypeLabel}
                                </span>
                                <span class="text-[9px] text-slate-400 font-semibold uppercase tracking-wider ml-0.5">${t.work_type || 'General'}</span>
                                ${handoverBadge}
                            </div>
                        </td>
                        <td class="px-4 py-2.5 text-xs text-slate-600 max-w-[280px]">
                            <div class="pl-2 border-l border-slate-200 text-slate-600 font-medium truncate" title="Click to view details: ${t.task_performed || 'N/A'}">
                                ${t.task_performed || 'N/A'}
                            </div>
                            ${editedBadge}
                        </td>
                        <td class="px-4 py-2.5 whitespace-nowrap">${effortMetricHtml}</td>
                        <td class="px-4 py-2.5 text-right whitespace-nowrap" onclick="event.stopPropagation()">${actionBtn}</td>
                    </tr>
                `;
            }).join('') || '<tr><td colspan="6" class="px-4 py-6 text-center text-slate-500 font-medium">No tasks logged yet.</td></tr>';

            return `
                <div class="max-w-5xl mx-auto space-y-6 fade-in overflow-visible">
                    <!-- KPI Cards Row -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div class="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                            <div class="absolute right-0 bottom-0 translate-y-3 translate-x-3 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                                <i data-lucide="target" class="w-20 h-20 text-indigo-900"></i>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Assigned Milestones</span>
                                <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <i data-lucide="target" class="w-4.5 h-4.5"></i>
                                </div>
                            </div>
                            <div class="text-3xl font-black text-slate-800 mt-3">${totalMilestones}</div>
                            <div class="text-[10px] font-bold text-slate-400 mt-2">Active & legacy milestones</div>
                        </div>
                        
                        <div class="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                            <div class="absolute right-0 bottom-0 translate-y-3 translate-x-3 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                                <i data-lucide="clipboard-list" class="w-20 h-20 text-slate-900"></i>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Tasks Logged</span>
                                <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <i data-lucide="clipboard-list" class="w-4.5 h-4.5"></i>
                                </div>
                            </div>
                            <div class="text-3xl font-black text-slate-800 mt-3">${totalTasks}</div>
                            <div class="text-[10px] font-bold text-slate-400 mt-2">Total submissions till date</div>
                        </div>

                        <div class="bg-gradient-to-br from-indigo-500 to-indigo-650 rounded-2xl p-5 text-white shadow-md relative overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                            <div class="absolute right-0 bottom-0 translate-y-3 translate-x-3 opacity-15 pointer-events-none group-hover:scale-110 transition-transform">
                                <i data-lucide="clock" class="w-20 h-20"></i>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-black uppercase tracking-wider text-indigo-150">Total Hours Logged</span>
                                <div class="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center border border-white/20">
                                    <i data-lucide="clock" class="w-4.5 h-4.5"></i>
                                </div>
                            </div>
                            <div class="text-3xl font-black mt-3">${totalHours.toFixed(1)} hrs</div>
                            <div class="text-[10px] font-bold text-indigo-150 mt-2">Accumulated effort logged</div>
                        </div>
                    </div>

                    <!-- Content Area -->
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-black text-slate-800 flex items-center gap-2">
                                <i data-lucide="history" class="w-5 h-5 text-indigo-600"></i> Timesheet Entry Logs History
                            </h3>
                        </div>
                        <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
                            <div class="overflow-x-auto">
                                <table class="w-full text-left table-fixed border-collapse">
                                    <thead>
                                        <tr class="bg-slate-50/70 border-b border-slate-200 text-slate-450 text-[10px] font-black uppercase tracking-wider">
                                            <th class="px-4 py-3 w-[15%]">Logged Time</th>
                                            <th class="px-4 py-3 w-[20%]">Project / Milestone</th>
                                            <th class="px-4 py-3 w-[15%] font-medium">Task Type</th>
                                            <th class="px-4 py-3 w-[30%]">Task Performed Details</th>
                                            <th class="px-4 py-3 w-[12%]">Effort Metric</th>
                                            <th class="px-4 py-3 w-[8%] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        ${tableRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }