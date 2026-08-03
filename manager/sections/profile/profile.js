/**
 * YANA OS - MANAGER PORTAL PROFILE SECTION (PRB-062)
 * Executive Commercial-Grade Manager Profile Suite
 */

function getAdminProfileTemplate() {
  // If activeAdminProfile isn't loaded yet, fetch in background and show loader
  if (!state.activeAdminProfile) {
    apiFetch('/admins/me').then(admin => {
      if (admin) {
        state.activeAdminProfile = admin;
        renderAdminApp();
      }
    });
    return `
      <div class="h-full w-full flex items-center justify-center bg-slate-50 min-h-[500px]">
        <div class="flex flex-col items-center">
          <i data-lucide="loader-2" class="w-10 h-10 animate-spin text-brand-primary mb-4"></i>
          <p class="text-slate-500 font-medium">Loading manager profile...</p>
        </div>
      </div>
    `;
  }

  const admin = state.activeAdminProfile;
  const activeTab = state.adminProfileTab || 'profile-identity';
  const initial = (admin.full_name || admin.username || 'M').charAt(0).toUpperCase();
  const fullNameVal = admin.full_name && admin.full_name !== 'N/A' ? admin.full_name : '';
  const emailVal = admin.email && admin.email !== 'N/A' ? admin.email : '';
  const phoneVal = localStorage.getItem('yana_manager_phone') || '';
  const designationVal = localStorage.getItem('yana_manager_designation') || 'Engineering & Operations Manager';
  const timezoneVal = localStorage.getItem('yana_manager_timezone') || 'UTC+05:30 (Asia/Kolkata - IST)';
  const bioVal = localStorage.getItem('yana_manager_bio') || '';

  return `
    <div class="p-6 md:p-8 space-y-6 max-w-6xl mx-auto overflow-y-auto h-full animate-in pb-24">
      
      <!-- Top Breadcrumbs Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div class="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Manager Portal</span>
            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            <span class="text-brand-primary">My Profile</span>
          </div>
          <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Manager Account & Security</h2>
        </div>
        <div class="flex items-center space-x-3">
          <span class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span class="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            Active Session
          </span>
          <button onclick="logout()" class="inline-flex items-center px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-all shadow-xs">
            <i data-lucide="log-out" class="w-3.5 h-3.5 mr-1.5"></i>
            Terminate Session
          </button>
        </div>
      </div>

      <!-- Executive Manager Hero Card -->
      <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl shadow-md border border-slate-800 p-6 text-white relative overflow-hidden">
        <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div class="flex items-center space-x-5">
            <div class="relative">
              <div class="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-primary to-indigo-500 text-white flex items-center justify-center text-3xl font-extrabold shadow-lg border-2 border-white/20">
                ${initial}
              </div>
              <span class="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center" title="Online & Authenticated">
                <i data-lucide="check" class="w-3 h-3 text-white"></i>
              </span>
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="text-2xl font-bold text-white tracking-tight">${admin.full_name && admin.full_name !== 'N/A' ? admin.full_name : admin.username}</h3>
                <span class="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wide">
                  ${admin.access_level || 'ManagerAdmin'}
                </span>
              </div>
              <p class="text-sm text-slate-300 font-medium mt-0.5">@${admin.username} • <span class="text-indigo-300 font-semibold">${designationVal}</span></p>
              <p class="text-xs text-slate-400 mt-1 flex items-center">
                <i data-lucide="mail" class="w-3.5 h-3.5 mr-1.5 text-slate-400"></i>
                ${admin.email && admin.email !== 'N/A' ? admin.email : 'No registered email'}
              </p>
            </div>
          </div>

          <!-- Quick Metrics Bar -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 md:border-l md:border-slate-700/60 md:pl-6">
            <div class="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-3">
              <div class="text-[10px] uppercase font-bold text-slate-400">Role Authority</div>
              <div class="text-sm font-bold text-emerald-400 mt-0.5">${admin.access_level || 'ManagerAdmin'}</div>
            </div>
            <div class="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-3">
              <div class="text-[10px] uppercase font-bold text-slate-400">Managed Projects</div>
              <div class="text-sm font-bold text-indigo-300 mt-0.5">${state.allProjects ? state.allProjects.length : 0} Active</div>
            </div>
            <div class="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-3 col-span-2 sm:col-span-1">
              <div class="text-[10px] uppercase font-bold text-slate-400">Timezone</div>
              <div class="text-xs font-semibold text-slate-200 truncate mt-0.5" title="${timezoneVal}">${timezoneVal.split(' ')[0]}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-bold">
        <button onclick="setManagerProfileTab('profile-identity')" class="pb-3 px-4 flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${activeTab === 'profile-identity' ? 'border-brand-primary text-brand-primary font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="user" class="w-4 h-4"></i>
          <span>My Identity & Account Details</span>
        </button>
        <button onclick="setManagerProfileTab('profile-security')" class="pb-3 px-4 flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${activeTab === 'profile-security' ? 'border-brand-primary text-brand-primary font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="shield-check" class="w-4 h-4"></i>
          <span>Account Security & Password</span>
        </button>
      </div>

      <!-- TAB CONTENT PANELS -->

      ${activeTab === 'profile-identity' ? `
        <!-- TAB 1: IDENTITY & ACCOUNT DETAILS -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden stagger-1 animate-in">
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 class="font-bold text-base text-slate-800">Manager Profile Information</h3>
              <p class="text-xs text-slate-500 mt-0.5">Update your personal information and contact details.</p>
            </div>
            <span class="px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-50 text-brand-primary border border-indigo-100">
              ID: ${admin.id || admin.username}
            </span>
          </div>

          <form onsubmit="handleAdminProfileUpdate(event)" class="p-6 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Username (Immutable)</label>
                <div class="relative">
                  <input type="text" value="${admin.username}" readonly class="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-mono text-sm" />
                  <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute right-3 top-3"></i>
                </div>
                <p class="text-[11px] text-slate-400 mt-1">System usernames are fixed upon account creation.</p>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Access Role</label>
                <div class="relative">
                  <input type="text" value="${admin.access_level || 'ManagerAdmin'}" readonly class="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-semibold text-sm" />
                  <i data-lucide="shield" class="w-4 h-4 text-slate-400 absolute right-3 top-3"></i>
                </div>
                <p class="text-[11px] text-slate-400 mt-1">Role privileges configured by System Admin.</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Full Legal Name *</label>
                <input type="text" id="admin-profile-name-input" value="${fullNameVal}" required placeholder="e.g. Alex Morgan" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary font-medium text-sm transition-all" />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Official Email Address *</label>
                <input type="email" id="admin-profile-email-input" value="${emailVal}" required placeholder="alex@company.com" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary font-medium text-sm transition-all" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Contact Phone Number</label>
                <input type="tel" id="manager-profile-phone-input" value="${phoneVal}" placeholder="+91 98765 43210" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary font-medium text-sm transition-all" />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Official Designation</label>
                <input type="text" id="manager-profile-designation-input" value="${designationVal}" placeholder="Operations Manager" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary font-medium text-sm transition-all" />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Operating Timezone</label>
                <select id="manager-profile-timezone-input" class="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand-primary font-medium text-xs bg-white">
                  <option value="UTC+05:30 (Asia/Kolkata - IST)" ${timezoneVal.includes('05:30') ? 'selected' : ''}>UTC+05:30 (IST - India)</option>
                  <option value="UTC+00:00 (London - GMT)" ${timezoneVal.includes('00:00') ? 'selected' : ''}>UTC+00:00 (GMT - London)</option>
                  <option value="UTC-05:00 (New York - EST)" ${timezoneVal.includes('05:00') ? 'selected' : ''}>UTC-05:00 (EST - New York)</option>
                  <option value="UTC+08:00 (Singapore - SGT)" ${timezoneVal.includes('08:00') ? 'selected' : ''}>UTC+08:00 (SGT - Singapore)</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Professional Summary & Bio</label>
              <textarea id="manager-profile-bio-input" rows="3" placeholder="Brief statement regarding engineering or operational responsibilities..." class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary font-medium text-xs transition-all">${bioVal}</textarea>
            </div>

            <div class="flex justify-end border-t border-slate-100 pt-5">
              <button type="submit" class="inline-flex items-center px-6 py-2.5 bg-brand-primary hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all">
                <i data-lucide="save" class="w-4 h-4 mr-2"></i> Save Profile Details
              </button>
            </div>
          </form>
        </div>
      ` : ''}

      ${activeTab === 'profile-security' ? `
        <!-- TAB 2: ACCOUNT SECURITY & PASSWORD -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden stagger-1 animate-in">
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 class="font-bold text-base text-slate-800">Security Credentials & Password</h3>
              <p class="text-xs text-slate-500 mt-0.5">Manage password security for your Manager account.</p>
            </div>
            <span class="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              High Security
            </span>
          </div>

          <form onsubmit="handleManagerPasswordChange(event)" class="p-6 space-y-6">
            <div class="max-w-xl space-y-5">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Current Password *</label>
                <input type="password" id="mgr-current-pass" required placeholder="••••••••••••" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-sm font-medium" />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">New Password *</label>
                <input type="password" id="mgr-new-pass" required minlength="6" placeholder="At least 6 characters" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-sm font-medium" />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Confirm New Password *</label>
                <input type="password" id="mgr-confirm-pass" required minlength="6" placeholder="Re-enter new password" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-sm font-medium" />
              </div>
            </div>

            <div class="flex justify-end border-t border-slate-100 pt-5">
              <button type="submit" class="inline-flex items-center px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all">
                <i data-lucide="key-round" class="w-4 h-4 mr-2 text-indigo-400"></i> Update Account Password
              </button>
            </div>
          </form>
        </div>
      ` : ''}

    </div>
  `;
}

/**
 * Switch Manager Profile Tab
 */
function setManagerProfileTab(tabName) {
  state.adminProfileTab = tabName;
  renderAdminApp();
}

/**
 * Save Profile Details Form Submit Handler
 */
async function handleAdminProfileUpdate(e) {
  e.preventDefault();
  const name = document.getElementById('admin-profile-name-input').value.trim();
  const email = document.getElementById('admin-profile-email-input').value.trim();
  const phone = document.getElementById('manager-profile-phone-input')?.value.trim() || '';
  const designation = document.getElementById('manager-profile-designation-input')?.value.trim() || '';
  const timezone = document.getElementById('manager-profile-timezone-input')?.value || '';
  const bio = document.getElementById('manager-profile-bio-input')?.value.trim() || '';

  if (!name || !email) {
    if (typeof showToast === 'function') showToast("Please fill in required name and email.", "error");
    return;
  }

  // Save additional local manager preferences
  if (phone) localStorage.setItem('yana_manager_phone', phone);
  if (designation) localStorage.setItem('yana_manager_designation', designation);
  if (timezone) localStorage.setItem('yana_manager_timezone', timezone);
  if (bio) localStorage.setItem('yana_manager_bio', bio);

  try {
    const updated = await apiFetch('/admins/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: name,
        email: email
      })
    });

    if (updated) {
      state.activeAdminProfile = updated;
      if (typeof showToast === 'function') showToast("Manager profile updated successfully!", "success");
      renderAdminApp();
    }
  } catch (err) {
    if (typeof showToast === 'function') showToast("Failed to update profile: " + err.message, "error");
  }
}

/**
 * Change Password Submit Handler
 */
async function handleManagerPasswordChange(e) {
  e.preventDefault();
  const currentPass = document.getElementById('mgr-current-pass').value;
  const newPass = document.getElementById('mgr-new-pass').value;
  const confirmPass = document.getElementById('mgr-confirm-pass').value;

  if (newPass !== confirmPass) {
    if (typeof showToast === 'function') showToast("New passwords do not match.", "error");
    return;
  }

  try {
    await apiFetch('/admins/me/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: currentPass,
        new_password: newPass
      })
    });
    if (typeof showToast === 'function') showToast("Password updated successfully!", "success");
    e.target.reset();
  } catch (err) {
    if (typeof showToast === 'function') showToast("Failed to update password: " + err.message, "error");
  }
}

// Global Bindings
window.getAdminProfileTemplate = getAdminProfileTemplate;
window.setManagerProfileTab = setManagerProfileTab;
window.handleAdminProfileUpdate = handleAdminProfileUpdate;
window.handleManagerPasswordChange = handleManagerPasswordChange;
