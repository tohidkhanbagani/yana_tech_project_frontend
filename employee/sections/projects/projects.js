function getProjectsMilestonesTemplate() {
            const milestones = state.myMilestones || [];
            const tasks = state.employeeTasks || [];

            const totalMilestones = milestones.length;
            const totalTasks = tasks.length;
            let totalHours = 0;
            tasks.forEach(t => {
                totalHours += parseFloat(t.hours_logged || 0);
            });

            // Group milestones by project for the projects cards grid
            const projectsWithMilestones = {};
            (state.projects || []).forEach(p => {
                projectsWithMilestones[p.id] = {
                    project: p,
                    milestones: []
                };
            });
            milestones.forEach(m => {
                if (projectsWithMilestones[m.project_id]) {
                    projectsWithMilestones[m.project_id].milestones.push(m);
                } else {
                    projectsWithMilestones[m.project_id] = {
                        project: { id: m.project_id, name: m.projectName || 'Project', client: 'Internal', team: 'General' },
                        milestones: [m]
                    };
                }
            });

            const projectCardsList = Object.values(projectsWithMilestones).map(group => {
                const p = group.project;
                const projMilestones = group.milestones;
                const projectTasks = tasks.filter(t => t.project_id === p.id);
                const projectHours = projectTasks.reduce((sum, t) => sum + parseFloat(t.hours_logged || 0), 0);
                const projectTasksCount = projectTasks.length;

                return `
                    <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                        <div>
                            <div class="flex items-start justify-between gap-3 mb-3">
                                <div class="p-2.5 bg-indigo-50 text-brand-primary rounded-xl shrink-0 group-hover:bg-brand-primary group-hover:text-white transition-colors duration-200">
                                    <i data-lucide="folder" class="w-5 h-5"></i>
                                </div>
                                <span class="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
                                    ${projMilestones.length} Milestone${projMilestones.length === 1 ? '' : 's'}
                                </span>
                            </div>
                            <h4 class="font-bold text-slate-800 text-base leading-tight mb-1 group-hover:text-brand-primary transition-colors duration-200">${p.name}</h4>
                            <p class="text-xs text-slate-400 font-semibold mb-3">${p.client || 'Internal Client'} &bull; ${p.team || 'General Team'}</p>

                            <div class="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600">
                                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <span class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tasks Logged</span>
                                    <span class="text-slate-700">${projectTasksCount} Entries</span>
                                </div>
                                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <span class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Hours Invested</span>
                                    <span class="text-brand-primary font-black">${projectHours.toFixed(1)} hrs</span>
                                </div>
                            </div>
                        </div>
                        <div class="mt-4 pt-3 border-t border-slate-100">
                            <button onclick="window.openProjectMilestonesModal('${p.id}')"
                                class="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-brand-primary text-brand-primary hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                                View Milestones <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('') || `<div class="col-span-full bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-500 font-medium">No assigned projects or milestones found.</div>`;

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
                                <i data-lucide="folder-kanban" class="w-5 h-5 text-indigo-600"></i> Project Milestones
                            </h3>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            ${projectCardsList}
                        </div>
                    </div>
                </div>
            `;
        }