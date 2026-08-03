/**
 * YANA OS - OPERATIONAL OBLIGATIONS & RECURRING BILLS MANAGER (PRB-058 & PRB-061)
 * Office Rent, Utilities, Subscriptions & Mandatory Commercial-Grade Persistent Popup System
 */

function safeFormatCurrency(val) {
  if (typeof window.formatCurrencyPlain === 'function') {
    return window.formatCurrencyPlain(val);
  }
  if (typeof window.formatCurrency === 'function') {
    return window.formatCurrency(val);
  }
  const n = parseFloat(val || 0);
  return '₹' + (isNaN(n) ? '0.00' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

function getAdminObligationsTemplate() {
  // Load obligations from backend if not fetched
  if (!state.allObligations) {
    state.allObligations = [];
    apiFetch('/obligations/all').then(data => {
      if (data && Array.isArray(data)) {
        state.allObligations = data;
        renderAdminApp();
      }
    });
    return `
      <div class="h-full w-full flex items-center justify-center bg-slate-50 min-h-[500px]">
        <div class="flex flex-col items-center">
          <i data-lucide="loader-2" class="w-10 h-10 animate-spin text-brand-primary mb-4"></i>
          <p class="text-slate-500 font-medium">Loading operational obligations...</p>
        </div>
      </div>
    `;
  }

  const obligations = state.allObligations || [];
  const overdueCount = obligations.filter(o => o.status === 'OVERDUE').length;
  const pendingCount = obligations.filter(o => o.status === 'PENDING' || o.status === 'OVERDUE').length;
  const totalMonthlyCost = obligations.reduce((sum, o) => sum + (o.amount || 0), 0);

  return `
    <div class="p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto h-full animate-in pb-24">
      
      <!-- Top Breadcrumbs Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div class="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Operations & Finance</span>
            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            <span class="text-brand-primary">Office Bills & Rent Manager</span>
          </div>
          <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Recurring Operational Obligations</h2>
        </div>
        <div class="flex items-center space-x-3">
          <button onclick="openAddObligationModal()" class="inline-flex items-center px-4 py-2.5 bg-brand-primary hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md">
            <i data-lucide="plus" class="w-4 h-4 mr-1.5"></i> Add Recurring Obligation
          </button>
        </div>
      </div>

      <!-- Quick Metrics Bar -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Monthly Commitments</div>
            <div class="text-2xl font-black text-slate-800 mt-1 font-mono">${safeFormatCurrency(totalMonthlyCost)}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">${obligations.length} Active Obligations</div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-brand-primary flex items-center justify-center">
            <i data-lucide="receipt" class="w-6 h-6"></i>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Billing Cycles</div>
            <div class="text-2xl font-black text-amber-600 mt-1 font-mono">${pendingCount} Tasks</div>
            <div class="text-[11px] text-slate-500 mt-0.5">Requiring payment proof</div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <i data-lucide="clock" class="w-6 h-6"></i>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-slate-400">Overdue Obligations</div>
            <div class="text-2xl font-black text-rose-600 mt-1 font-mono">${overdueCount} Alerts</div>
            <div class="text-[11px] text-rose-500 font-semibold mt-0.5">${overdueCount > 0 ? 'Popup alerts active' : 'All obligations up to date'}</div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <i data-lucide="alert-triangle" class="w-6 h-6"></i>
          </div>
        </div>
      </div>

      <!-- Obligations Main Table Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 class="font-bold text-base text-slate-800">Recurring Office Bills & Rent Register</h3>
            <p class="text-xs text-slate-500 mt-0.5">Tasks repeat monthly; persistent popup alerts trigger for Admins & Managers until proof is submitted.</p>
          </div>
          <button onclick="refreshObligationsList()" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th class="py-3.5 px-6">Obligation Title</th>
                <th class="py-3.5 px-6">Category</th>
                <th class="py-3.5 px-6">Monthly Due Day</th>
                <th class="py-3.5 px-6 text-right">Amount</th>
                <th class="py-3.5 px-6">Next Due Date</th>
                <th class="py-3.5 px-6">Status</th>
                <th class="py-3.5 px-6">Last Completion Remark & Proof</th>
                <th class="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              ${obligations.length === 0 ? `
                <tr>
                  <td colspan="8" class="p-8 text-center text-slate-400 italic">
                    No recurring operational obligations configured. Click "Add Recurring Obligation" to add Office Rent or Bills.
                  </td>
                </tr>
              ` : obligations.map(o => {
                let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                if (o.status === "OVERDUE") badgeClass = "bg-rose-100 text-rose-800 border-rose-300 animate-pulse";
                else if (o.status === "PENDING" || o.status === "DUE TODAY") badgeClass = "bg-amber-100 text-amber-800 border-amber-300";

                return `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3.5 px-6 font-bold text-slate-800 flex items-center gap-2">
                      <div class="w-8 h-8 rounded-lg bg-indigo-50 text-brand-primary flex items-center justify-center shrink-0">
                        <i data-lucide="${getCategoryIcon(o.category)}" class="w-4 h-4"></i>
                      </div>
                      <span>${o.title}</span>
                    </td>
                    <td class="py-3.5 px-6">
                      <span class="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        ${o.category}
                      </span>
                    </td>
                    <td class="py-3.5 px-6 font-semibold text-slate-600">
                      Day ${o.due_day} of month
                    </td>
                    <td class="py-3.5 px-6 text-right font-mono font-bold text-slate-800">
                      ${safeFormatCurrency(o.amount)}
                    </td>
                    <td class="py-3.5 px-6 font-mono text-slate-600">
                      ${o.next_due_date ? new Date(o.next_due_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td class="py-3.5 px-6">
                      <span class="px-2.5 py-1 rounded-md text-[10px] font-bold border ${badgeClass}">
                        ${o.status}
                      </span>
                    </td>
                    <td class="py-3.5 px-6 max-w-xs">
                      <p class="text-slate-700 font-normal truncate" title="${o.last_completion_remark || 'N/A'}">${o.last_completion_remark || 'N/A'}</p>
                      ${o.last_completion_proof_url && o.last_completion_proof_url !== 'N/A' ? `
                        <a href="${o.last_completion_proof_url}" target="_blank" class="inline-flex items-center text-[10px] text-brand-primary font-bold hover:underline mt-0.5">
                          <i data-lucide="image" class="w-3 h-3 mr-1"></i> View Receipt Image
                        </a>
                      ` : ''}
                    </td>
                    <td class="py-3.5 px-6 text-right space-x-2">
                      <button onclick="openCompleteObligationModal('${o.id}', '${o.title.replace(/'/g, "\\'")}', ${o.amount})" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-2xs">
                        Mark Paid
                      </button>
                      <button onclick="deleteObligationTask('${o.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 transition-colors">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

function getCategoryIcon(category) {
  if (category === 'Office Rent') return 'building';
  if (category === 'Electricity') return 'zap';
  if (category === 'Internet') return 'wifi';
  if (category === 'Tax') return 'file-text';
  if (category === 'Water') return 'droplet';
  return 'tag';
}

/**
 * Refresh Obligations List
 */
async function refreshObligationsList() {
  try {
    const data = await apiFetch('/obligations/all');
    if (data && Array.isArray(data)) {
      state.allObligations = data;
      renderAdminApp();
    }
  } catch (err) {
    if (typeof showToast === 'function') showToast("Failed to refresh obligations: " + err.message, "error");
  }
}

/**
 * Open Add Obligation Modal
 */
function openAddObligationModal() {
  const modalHtml = `
    <div id="add-obligation-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in">
      <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div class="flex items-center space-x-2">
            <i data-lucide="plus-circle" class="w-5 h-5 text-brand-primary"></i>
            <h3 class="font-bold text-base">Add Recurring Obligation</h3>
          </div>
          <button onclick="document.getElementById('add-obligation-modal').remove()" class="text-slate-400 hover:text-white">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form onsubmit="handleCreateObligation(event)" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Obligation Title *</label>
            <input type="text" id="ob-title" required placeholder="e.g. Office Rent Payment" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-sm font-medium" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Category</label>
              <select id="ob-category" onchange="toggleCustomCategoryInput(this.value)" class="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-xs font-semibold bg-white">
                <option value="Office Rent">Office Rent</option>
                <option value="Electricity">Electricity Bill</option>
                <option value="Internet">Internet / Broadband</option>
                <option value="Water">Water Bill</option>
                <option value="Tax">GST / Tax Filing</option>
                <option value="Maintenance">Maintenance & Misc</option>
                <option value="__CUSTOM__">+ Create Custom Category...</option>
              </select>
              <div id="ob-custom-category-container" class="hidden mt-2">
                <input type="text" id="ob-custom-category-input" placeholder="e.g. Server Hosting / Cloud Retainer" class="w-full px-3 py-2 border border-brand-primary/60 rounded-xl outline-none text-xs font-medium bg-indigo-50/30 text-brand-primary" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Monthly Due Day (1-28)</label>
              <input type="number" id="ob-due-day" min="1" max="28" value="5" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-sm font-medium" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Estimated Amount (₹)</label>
              <input type="number" id="ob-amount" step="0.01" min="0" placeholder="25000" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-sm font-medium" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Assigned Portal Role</label>
              <select id="ob-role" class="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-xs font-semibold bg-white">
                <option value="All">Admin & Managers</option>
                <option value="Admin">Admin Only</option>
                <option value="Manager">Manager Only</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onclick="document.getElementById('add-obligation-modal').remove()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">
              Cancel
            </button>
            <button type="submit" class="px-5 py-2.5 bg-brand-primary hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md">
              Create Obligation Task
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) lucide.createIcons();
}

/**
 * Toggle Custom Category Input Container
 */
function toggleCustomCategoryInput(val) {
  const container = document.getElementById('ob-custom-category-container');
  const input = document.getElementById('ob-custom-category-input');
  if (!container || !input) return;
  if (val === '__CUSTOM__') {
    container.classList.remove('hidden');
    input.focus();
  } else {
    container.classList.add('hidden');
  }
}

/**
 * Submit Create Obligation Form
 */
async function handleCreateObligation(event) {
  event.preventDefault();
  const formData = new FormData();
  formData.append('title', document.getElementById('ob-title').value.trim());

  let category = document.getElementById('ob-category').value;
  if (category === '__CUSTOM__') {
    const customVal = document.getElementById('ob-custom-category-input')?.value.trim();
    category = customVal || "Custom Category";
  }

  formData.append('category', category);
  formData.append('due_day', document.getElementById('ob-due-day').value);
  formData.append('amount', document.getElementById('ob-amount').value || 0);
  formData.append('assigned_role', document.getElementById('ob-role').value);

  try {
    const res = await apiFetch('/obligations', {
      method: 'POST',
      body: formData
    });
    if (res) {
      if (typeof showToast === 'function') showToast("Recurring obligation task created!", "success");
      document.getElementById('add-obligation-modal')?.remove();
      refreshObligationsList();
    }
  } catch (err) {
    if (typeof showToast === 'function') showToast("Failed to create obligation: " + err.message, "error");
  }
}

/**
 * Open Complete Obligation Modal
 */
function openCompleteObligationModal(obId, title, amount) {
  const modalHtml = `
    <div id="complete-obligation-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in">
      <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div class="flex items-center space-x-2">
            <i data-lucide="check-circle" class="w-5 h-5 text-emerald-400"></i>
            <h3 class="font-bold text-base">Complete Payment: ${title}</h3>
          </div>
          <button onclick="document.getElementById('complete-obligation-modal').remove()" class="text-slate-400 hover:text-white">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form onsubmit="handleCompleteObligation(event, '${obId}')" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Mandatory Completion Remark *</label>
            <textarea id="ob-complete-remarks" required rows="3" placeholder="e.g. Paid Rs ${amount || ''} via HDFC Netbanking ref #987654. Verified by admin." class="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-xs font-medium"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Amount Paid (₹)</label>
              <input type="number" id="ob-complete-amount" step="0.01" value="${amount || ''}" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-sm font-medium" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Next Bill Date (Optional)</label>
              <input type="date" id="ob-complete-next-due" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-xs font-medium" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Upload Receipt / Payment Image Proof</label>
            <input type="file" id="ob-complete-proof-file" accept="image/*" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-primary bg-slate-50" />
            <p class="text-[11px] text-slate-400 mt-1">Upload screenshot of bank transfer or bill payment invoice receipt.</p>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onclick="document.getElementById('complete-obligation-modal').remove()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">
              Cancel
            </button>
            <button type="submit" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center">
              <i data-lucide="check" class="w-4 h-4 mr-1.5"></i> Submit Proof & Mark Completed
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) lucide.createIcons();
}

/**
 * Handle Completing Obligation Form
 */
async function handleCompleteObligation(event, obId) {
  event.preventDefault();
  const remarks = document.getElementById('ob-complete-remarks').value.trim();
  const amount = document.getElementById('ob-complete-amount').value;
  const nextDue = document.getElementById('ob-complete-next-due').value;
  const fileInput = document.getElementById('ob-complete-proof-file');

  if (!remarks) {
    if (typeof showToast === 'function') showToast("Please enter completion remarks.", "error");
    return;
  }

  const formData = new FormData();
  formData.append('remarks', remarks);
  formData.append('completed_by_user_id', state.user?.username || 'Admin');
  formData.append('completed_by_role', 'Admin');
  if (amount) formData.append('amount_paid', amount);
  if (nextDue) formData.append('custom_next_due', nextDue);
  if (fileInput && fileInput.files[0]) {
    formData.append('proof_image', fileInput.files[0]);
  }

  try {
    const res = await apiFetch(`/obligations/${obId}/complete`, {
      method: 'POST',
      body: formData
    });
    if (res) {
      if (typeof showToast === 'function') showToast("Obligation marked as completed!", "success");
      document.getElementById('complete-obligation-modal')?.remove();
      refreshObligationsList();
      checkPendingObligationAlerts(); // Update popup alert status
    }
  } catch (err) {
    if (typeof showToast === 'function') showToast("Failed to complete obligation: " + err.message, "error");
  }
}

/**
 * Delete Obligation Task
 */
async function deleteObligationTask(obId) {
  if (!confirm("Are you sure you want to deactivate this recurring obligation task?")) return;
  try {
    await apiFetch(`/obligations/${obId}`, { method: 'DELETE' });
    if (typeof showToast === 'function') showToast("Obligation task removed.", "success");
    refreshObligationsList();
  } catch (err) {
    if (typeof showToast === 'function') showToast("Failed to delete obligation: " + err.message, "error");
  }
}

/**
 * Snooze Obligation Alert for Current Session
 */
function snoozeObligationAlert() {
  sessionStorage.setItem('snoozed_obligation_alert', 'true');
  const modal = document.getElementById('persistent-obligation-alert-modal');
  if (modal) {
    modal.classList.add('opacity-0', 'scale-95');
    setTimeout(() => modal.remove(), 200);
  }
  if (typeof showToast === 'function') {
    showToast("Obligation alerts snoozed for current session.", "info");
  }
}

/**
 * Persistent Obligation Alert Modal Popup Check for Admin & Manager Portals (PRB-061 Commercial Grade)
 */
async function checkPendingObligationAlerts(role = "Admin") {
  // Respect Session Snooze Preference
  if (sessionStorage.getItem('snoozed_obligation_alert') === 'true') {
    return;
  }

  try {
    const pending = await apiFetch(`/obligations/pending-alerts?role=${role}`);
    if (pending && Array.isArray(pending) && pending.length > 0) {
      // Remove any existing alert modal instance
      document.getElementById('persistent-obligation-alert-modal')?.remove();

      const modalHtml = `
        <div id="persistent-obligation-alert-modal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div class="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden relative transform transition-all duration-300 scale-100">
            
            <!-- Vibrant Top Accent Gradient Bar -->
            <div class="h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-600"></div>

            <!-- Commercial Executive Header -->
            <div class="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex justify-between items-center relative overflow-hidden">
              <div class="flex items-center space-x-3.5 relative z-10">
                <div class="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
                  <i data-lucide="shield-alert" class="w-6 h-6 animate-pulse"></i>
                </div>
                <div>
                  <div class="flex items-center space-x-2">
                    <h3 class="font-extrabold text-lg text-white tracking-tight">Mandatory Office Obligation Alert</h3>
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/30 text-rose-300 border border-rose-400/30">Action Required</span>
                  </div>
                  <p class="text-xs text-slate-300 font-medium mt-0.5">Recurring rent or office bill obligations require payment confirmation for this cycle.</p>
                </div>
              </div>
              <button onclick="snoozeObligationAlert()" title="Snooze for current session" class="text-slate-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10 relative z-10 cursor-pointer">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>

            <!-- Modal Content Body -->
            <div class="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <!-- Security / Policy Banner -->
              <div class="bg-gradient-to-r from-indigo-50/80 to-slate-50 border border-indigo-100 rounded-2xl p-4 text-xs text-slate-700 flex items-start space-x-3 shadow-2xs">
                <div class="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <i data-lucide="info" class="w-4.5 h-4.5"></i>
                </div>
                <div class="leading-relaxed">
                  <span class="font-bold text-slate-900">Session Policy:</span> This reminder appears on login until all pending/overdue cycle obligations have verified payment remarks & receipt proof. You may click <strong class="text-slate-900">Remind Me Later</strong> to snooze popup alerts for this session.
                </div>
              </div>

              <!-- Pending Obligations List -->
              <div class="space-y-3">
                ${pending.map(ob => `
                  <div class="p-4 bg-slate-50/90 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-slate-300 transition-all">
                    <div>
                      <div class="flex items-center space-x-2.5">
                        <span class="font-bold text-slate-900 text-sm">${ob.title}</span>
                        <span class="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${ob.status === 'OVERDUE' ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse' : 'bg-amber-100 text-amber-800 border border-amber-300'}">
                          ${ob.status}
                        </span>
                      </div>
                      <p class="text-xs text-slate-500 mt-1">Due Day: <span class="font-bold text-slate-700">Day ${ob.due_day} of month</span> • Amount: <span class="font-mono font-bold text-slate-900">${safeFormatCurrency(ob.amount)}</span></p>
                    </div>

                    <button onclick="openCompleteObligationModal('${ob.id}', '${ob.title.replace(/'/g, "\\'")}', ${ob.amount}); document.getElementById('persistent-obligation-alert-modal')?.remove();" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shrink-0 flex items-center justify-center cursor-pointer transition-all hover:scale-102">
                      <i data-lucide="check-circle-2" class="w-4 h-4 mr-1.5"></i> Submit Proof & Pay
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Commercial Action Bar Footer -->
            <div class="px-6 py-4 bg-slate-50/90 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span class="text-xs font-bold text-slate-500">${pending.length} Active Pending Obligation(s)</span>
              <div class="flex items-center space-x-3 w-full sm:w-auto justify-end">
                <button onclick="snoozeObligationAlert()" class="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-300 shadow-2xs cursor-pointer">
                  Remind Me Later
                </button>
                <button onclick="routeApp('obligations'); document.getElementById('persistent-obligation-alert-modal')?.remove();" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center cursor-pointer">
                  <i data-lucide="arrow-right-circle" class="w-4 h-4 mr-1.5 text-indigo-400"></i> Open Obligations Manager
                </button>
              </div>
            </div>

          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      if (window.lucide) lucide.createIcons();
    }
  } catch (err) {
    console.warn("Failed to check pending obligation alerts:", err);
  }
}

// Global Bindings
window.safeFormatCurrency = safeFormatCurrency;
window.getAdminObligationsTemplate = getAdminObligationsTemplate;
window.refreshObligationsList = refreshObligationsList;
window.openAddObligationModal = openAddObligationModal;
window.handleCreateObligation = handleCreateObligation;
window.openCompleteObligationModal = openCompleteObligationModal;
window.handleCompleteObligation = handleCompleteObligation;
window.deleteObligationTask = deleteObligationTask;
window.snoozeObligationAlert = snoozeObligationAlert;
window.checkPendingObligationAlerts = checkPendingObligationAlerts;
window.toggleCustomCategoryInput = toggleCustomCategoryInput;
