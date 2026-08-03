function getDevTaskFormTemplate() {
            return `
                <div class="bg-white rounded-3xl border border-slate-200 shadow-sm max-w-[95%] mx-auto mt-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 relative pb-16">
                    <!-- Premium Header -->
                    <div class="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 text-white relative overflow-hidden">
                        <div class="absolute top-0 right-0 opacity-10 pointer-events-none translate-x-1/4 -translate-y-1/4">
                            <i data-lucide="terminal-square" class="w-64 h-64"></i>
                        </div>
                        <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div class="flex items-center gap-5">
                                <button onclick="routeApp('dashboard')" class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all backdrop-blur-sm shrink-0 shadow-sm">
                                    <i data-lucide="arrow-left" class="w-4 h-4"></i>
                                </button>
                                <div>
                                    <h3 class="text-xl font-black tracking-tight text-white flex items-center gap-2">
                                        Engineering Log <span class="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] uppercase tracking-widest font-bold">Batch Mode</span>
                                    </h3>
                                    <p class="text-slate-450 text-xs mt-0.5">Log multiple development tasks in a single fluid motion.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onsubmit="handleTaskSubmit(event, 'developer')" class="p-3 sm:p-4 bg-slate-50/30">
                        <div id="dev-task-container" class="space-y-4 pb-2">
                            <!-- Rows added dynamically -->
                        </div>
                        
                        <!-- Repositioned Add Row Button sitting at the bottom of the list -->
                        <div class="flex justify-center mt-3 mb-5 px-2">
                            <button type="button" onclick="window.addDevTaskRow()" class="w-full py-2.5 border border-dashed border-slate-300 hover:border-brand-primary rounded-xl text-slate-500 hover:text-brand-primary bg-white hover:bg-indigo-50/20 transition-all flex items-center justify-center font-bold text-xs gap-1.5 shadow-sm">
                                <i data-lucide="plus-circle" class="w-4 h-4"></i> Add Another Task Row (Alt + N)
                            </button>
                        </div>
                        
                        <!-- Sticky Total Hours & Submit Bar -->
                        <div class="sticky bottom-0 left-0 right-0 bg-slate-50/95 backdrop-blur-md border-t border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] z-40 rounded-b-3xl">
                            <div class="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                <div class="flex flex-col gap-1">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Total Logged Hours:</span>
                                        <span id="sticky-total-hours" class="text-sm font-extrabold text-slate-800 whitespace-nowrap">0.0 hrs</span>
                                    </div>
                                    <div class="w-48 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div id="sticky-hours-progress" class="bg-indigo-600 h-full rounded-full transition-all duration-300" style="width: 0%"></div>
                                    </div>
                                </div>
                                <div id="sticky-hours-badge" class="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-slate-100 text-slate-500 border border-slate-200/60 shadow-xs whitespace-nowrap shrink-0">
                                    No Hours Logged
                                </div>
                            </div>
                            
                            <div class="flex items-center gap-4 w-full md:w-auto justify-end">
                                <div class="text-[10px] text-slate-400 font-bold hidden lg:flex items-center gap-1.5 whitespace-nowrap">
                                    <kbd class="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 font-bold shadow-xs">Ctrl+Enter</kbd> to submit
                                    <span class="text-slate-300">•</span>
                                    <kbd class="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 font-bold shadow-xs">Alt+N</kbd> new row
                                </div>
                                <button type="submit" id="btn-submit-dev" class="w-full sm:w-auto whitespace-nowrap bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-indigo-500/20 active:scale-[0.98] text-white font-extrabold text-xs tracking-wider uppercase py-3.5 px-8 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2">
                                    <i data-lucide="send" class="w-3.5 h-3.5"></i> <span>Submit Batch Timesheet</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            `;
        }


function getContentTaskFormTemplate() {
            return `
                <div class="bg-white rounded-3xl border border-slate-200 shadow-sm max-w-[95%] mx-auto mt-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 relative pb-16">
                    <!-- Premium Header -->
                    <div class="bg-gradient-to-r from-rose-900 to-rose-800 px-6 py-4 text-white relative overflow-hidden">
                        <div class="absolute top-0 right-0 opacity-10 pointer-events-none translate-x-1/4 -translate-y-1/4">
                            <i data-lucide="video" class="w-64 h-64"></i>
                        </div>
                        <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div class="flex items-center gap-5">
                                <button onclick="routeApp('dashboard')" class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all backdrop-blur-sm shrink-0 shadow-sm">
                                    <i data-lucide="arrow-left" class="w-4 h-4"></i>
                                </button>
                                <div>
                                    <h3 class="text-xl font-black tracking-tight text-white flex items-center gap-2">
                                        Content Log <span class="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/30 text-rose-300 text-[10px] uppercase tracking-widest font-bold">Batch Mode</span>
                                    </h3>
                                    <p class="text-rose-100/70 text-xs mt-0.5">Log multiple content tasks in a single fluid motion.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onsubmit="handleTaskSubmit(event, 'content')" class="p-3 sm:p-4 bg-slate-50/30">
                        <div id="con-task-container" class="space-y-4 pb-2">
                            <!-- Rows added dynamically -->
                        </div>
                        
                        <!-- Repositioned Add Row Button sitting at the bottom of the list -->
                        <div class="flex justify-center mt-3 mb-5 px-2">
                            <button type="button" onclick="window.addConTaskRow()" class="w-full py-2.5 border border-dashed border-rose-300 hover:border-rose-600 rounded-xl text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50/20 transition-all flex items-center justify-center font-bold text-xs gap-1.5 shadow-sm">
                                <i data-lucide="plus-circle" class="w-4 h-4"></i> Add Another Task Row (Alt + N)
                            </button>
                        </div>
                        
                        <!-- Sticky Total Hours & Submit Bar -->
                        <div class="sticky bottom-0 left-0 right-0 bg-slate-50/95 backdrop-blur-md border-t border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] z-40 rounded-b-3xl">
                            <div class="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                <div class="flex flex-col gap-1">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Total Logged Hours:</span>
                                        <span id="sticky-total-hours" class="text-sm font-extrabold text-slate-800 whitespace-nowrap">0.0 hrs</span>
                                    </div>
                                    <div class="w-48 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div id="sticky-hours-progress" class="bg-rose-500 h-full rounded-full transition-all duration-300" style="width: 0%"></div>
                                    </div>
                                </div>
                                <div id="sticky-hours-badge" class="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-slate-100 text-slate-500 border border-slate-200/60 shadow-xs whitespace-nowrap shrink-0">
                                    No Hours Logged
                                </div>
                            </div>
                            
                            <div class="flex items-center gap-4 w-full md:w-auto justify-end">
                                <div class="text-[10px] text-slate-400 font-bold hidden lg:flex items-center gap-1.5 whitespace-nowrap">
                                    <kbd class="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 font-bold shadow-xs">Ctrl+Enter</kbd> to submit
                                    <span class="text-slate-300">•</span>
                                    <kbd class="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 font-bold shadow-xs">Alt+N</kbd> new row
                                </div>
                                <button type="submit" id="btn-submit-con" class="w-full sm:w-auto whitespace-nowrap bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 hover:shadow-rose-500/20 active:scale-[0.98] text-white font-extrabold text-xs tracking-wider uppercase py-3.5 px-8 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2">
                                    <i data-lucide="send" class="w-3.5 h-3.5"></i> <span>Submit Batch Timesheet</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            `;
        }