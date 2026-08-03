function getEmployeeProfileTemplate() {
            const emp = state.employeeData || {};
            const isEdit = state.isEditingProfile;

            // Helper to render static text or input field
            const val = (k) => emp[k] && emp[k] !== 'N/A' ? emp[k] : '';
            const maskAadhaar = (val) => {
                if (!val || val === 'N/A') return val;
                const digits = val.replace(/\D/g, '');
                if (digits.length === 12) {
                    return `XXXX XXXX ${digits.slice(8)}`;
                }
                return val;
            };
            const txt = (k) => {
                const raw = emp[k] && emp[k] !== 'N/A' ? emp[k] : '';
                if (!raw) return '<span class="text-slate-300 italic font-normal">Not provided</span>';
                if (k === 'adhar_number') return maskAadhaar(raw);
                return raw;
            };

            const isAlwaysReadOnly = (k) => {
                if (emp.profile_unlocked) return false;
                const readOnlyKeys = [
                    'date_of_joining', 'reporting_manager', 'experience', 'previous_employer', 'previous_job_role',
                    'email', 'contact_number', 'bank_name', 'bank_account', 'ifsc_code', 'upi_id',
                    'account_holder_name', 'pf_number', 'esic_number', 'tax_details',
                    'adhar_number', 'pan_number'
                ];
                return readOnlyKeys.includes(k);
            };

            const isEditOnceAndSet = (k) => {
                if (emp.profile_unlocked) return false;
                const editOnceKeys = [
                    'highest_qualification', 'specialization',
                    'full_name', 'fathers_name', 'date_of_birth', 'gender'
                ];
                if (!editOnceKeys.includes(k)) return false;
                const value = emp[k];
                return value && value !== 'N/A' && value !== '';
            };

            const input = (id, label, key, type = "text", placeholder = "") => {
                const readOnly = isAlwaysReadOnly(key) || isEditOnceAndSet(key);
                const displayValue = val(key);
                
                return `
                    <div class="flex flex-col">
                        <div class="flex items-center justify-between mb-1">
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${label}</label>
                            ${readOnly && isEdit ? `<span class="text-[9px] text-slate-400 font-medium italic flex items-center cursor-help" title="Contact HR to update this field"><i data-lucide="lock" class="w-2.5 h-2.5 mr-0.5"></i> Locked</span>` : ''}
                        </div>
                        ${isEdit && !readOnly
                        ? `<input type="${type}" id="edit_${id}" value="${displayValue}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm" placeholder="${placeholder || 'Enter ' + label}">`
                        : `<div class="text-sm font-semibold text-slate-800 py-1 border-b border-transparent min-h-[32px]">${txt(key)}</div>`
                    }
                    </div>
                `;
            };

            const isRepMgrReadOnly = isAlwaysReadOnly('reporting_manager');
            const repMgrSelect = `
                <div class="flex flex-col">
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reporting Manager</label>
                        ${isRepMgrReadOnly && isEdit ? `<span class="text-[9px] text-slate-400 font-medium italic flex items-center cursor-help" title="Contact HR to update this field"><i data-lucide="lock" class="w-2.5 h-2.5 mr-0.5"></i> Locked</span>` : ''}
                    </div>
                    ${isEdit && !isRepMgrReadOnly
                    ? `<select id="edit_reporting_manager" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm">
                            <option value="N/A" ${!val('reporting_manager') || val('reporting_manager') === 'N/A' ? 'selected' : ''}>None</option>
                            ${state.allEmployees.map(empOpt => {
                                if (empOpt.id === emp.id) return '';
                                return `<option value="${empOpt.full_name}" ${val('reporting_manager') === empOpt.full_name || val('reporting_manager') === empOpt.username || val('reporting_manager') === empOpt.id ? 'selected' : ''}>${empOpt.full_name} (${empOpt.username})</option>`;
                            }).join('')}
                       </select>`
                    : `<div class="text-sm font-semibold text-slate-800 py-1 border-b border-transparent min-h-[32px]">
                            ${(function() {
                                const mgrVal = val('reporting_manager');
                                if (!mgrVal) return '<span class="text-slate-300 italic font-normal">Not provided</span>';
                                const matchedMgr = state.allEmployees.find(e => e.id === mgrVal || e.username === mgrVal || e.full_name === mgrVal);
                                return matchedMgr ? matchedMgr.full_name : mgrVal;
                            })()}
                       </div>`
                    }
                </div>
            `;

            const genderReadOnly = isAlwaysReadOnly('gender');
            const genderSelect = `
                <div class="flex flex-col">
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</label>
                        ${genderReadOnly && isEdit ? `<span class="text-[9px] text-slate-400 font-medium italic flex items-center cursor-help" title="Contact HR to update this field"><i data-lucide="lock" class="w-2.5 h-2.5 mr-0.5"></i> Locked</span>` : ''}
                    </div>
                    ${isEdit && !genderReadOnly
                    ? `<select id="edit_gender" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm">
                            <option value="Male" ${val('gender') === 'Male' ? 'selected' : ''}>Male</option>
                            <option value="Female" ${val('gender') === 'Female' ? 'selected' : ''}>Female</option>
                            <option value="Other" ${val('gender') === 'Other' ? 'selected' : ''}>Other</option>
                            <option value="N/A" ${!val('gender') || val('gender') === 'N/A' ? 'selected' : ''}>Not Specified</option>
                           </select>`
                    : `<div class="text-sm font-semibold text-slate-800 py-1 border-b border-transparent min-h-[32px]">${txt('gender')}</div>`
                }
                </div>
            `;

            const qualReadOnly = isAlwaysReadOnly('highest_qualification') || isEditOnceAndSet('highest_qualification');
            const highestQualificationSelect = `
                <div class="flex flex-col">
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Highest Qualification</label>
                        ${qualReadOnly && isEdit ? `<span class="text-[9px] text-slate-400 font-medium italic flex items-center cursor-help" title="Contact HR to update this field"><i data-lucide="lock" class="w-2.5 h-2.5 mr-0.5"></i> Locked</span>` : ''}
                    </div>
                    ${isEdit && !qualReadOnly
                    ? `<select id="edit_highest_qualification" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm">
                            <option value="10th" ${val('highest_qualification') === '10th' ? 'selected' : ''}>10th</option>
                            <option value="12th" ${val('highest_qualification') === '12th' ? 'selected' : ''}>12th</option>
                            <option value="Diploma" ${val('highest_qualification') === 'Diploma' ? 'selected' : ''}>Diploma</option>
                            <option value="Graduate" ${val('highest_qualification') === 'Graduate' ? 'selected' : ''}>Graduate</option>
                            <option value="Post Graduate" ${val('highest_qualification') === 'Post Graduate' ? 'selected' : ''}>Post Graduate</option>
                            <option value="PhD" ${val('highest_qualification') === 'PhD' ? 'selected' : ''}>PhD</option>
                            <option value="N/A" ${!val('highest_qualification') || val('highest_qualification') === 'N/A' ? 'selected' : ''}>Not Specified</option>
                           </select>`
                    : `<div class="text-sm font-semibold text-slate-800 py-1 border-b border-transparent min-h-[32px]">${txt('highest_qualification')}</div>`
                }
                </div>
            `;

            const relReadOnly = isAlwaysReadOnly('relationship_with_emergency_contact') || isEditOnceAndSet('relationship_with_emergency_contact');
            const relationshipSelect = `
                <div class="flex flex-col">
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Relationship</label>
                        ${relReadOnly && isEdit ? `<span class="text-[9px] text-slate-400 font-medium italic flex items-center cursor-help" title="Contact HR to update this field"><i data-lucide="lock" class="w-2.5 h-2.5 mr-0.5"></i> Locked</span>` : ''}
                    </div>
                    ${isEdit && !relReadOnly
                    ? `<select id="edit_relationship_with_emergency_contact" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm">
                            <option value="Father" ${val('relationship_with_emergency_contact') === 'Father' ? 'selected' : ''}>Father</option>
                            <option value="Mother" ${val('relationship_with_emergency_contact') === 'Mother' ? 'selected' : ''}>Mother</option>
                            <option value="Brother" ${val('relationship_with_emergency_contact') === 'Brother' ? 'selected' : ''}>Brother</option>
                            <option value="Sister" ${val('relationship_with_emergency_contact') === 'Sister' ? 'selected' : ''}>Sister</option>
                            <option value="Spouse" ${val('relationship_with_emergency_contact') === 'Spouse' ? 'selected' : ''}>Spouse</option>
                            <option value="Friend" ${val('relationship_with_emergency_contact') === 'Friend' ? 'selected' : ''}>Friend</option>
                            <option value="Guardian" ${val('relationship_with_emergency_contact') === 'Guardian' ? 'selected' : ''}>Guardian</option>
                            <option value="Other" ${val('relationship_with_emergency_contact') === 'Other' ? 'selected' : ''}>Other</option>
                            <option value="N/A" ${!val('relationship_with_emergency_contact') || val('relationship_with_emergency_contact') === 'N/A' ? 'selected' : ''}>Not Specified</option>
                           </select>`
                    : `<div class="text-sm font-semibold text-slate-800 py-1 border-b border-transparent min-h-[32px]">${txt('relationship_with_emergency_contact')}</div>`
                }
                </div>
            `;

            const emergencyReadOnly = isAlwaysReadOnly('emergency_contact') || isEditOnceAndSet('emergency_contact');
            let emergencyName = '';
            let emergencyPhone = '';
            const rawEmergency = val('emergency_contact');
            if (rawEmergency && rawEmergency.includes('-')) {
                const parts = rawEmergency.split('-');
                emergencyName = parts[0].trim();
                emergencyPhone = parts[1].trim();
            } else {
                emergencyName = rawEmergency;
            }

            const emergencyContactBlock = `
                <div class="flex flex-col">
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Emergency Contact Name & Phone</label>
                        ${emergencyReadOnly && isEdit ? `<span class="text-[9px] text-slate-400 font-medium italic flex items-center cursor-help" title="Contact HR to update this field"><i data-lucide="lock" class="w-2.5 h-2.5 mr-0.5"></i> Locked</span>` : ''}
                    </div>
                    ${isEdit && !emergencyReadOnly
                    ? `<div class="grid grid-cols-2 gap-4">
                            <input type="text" id="edit_emergency_contact_name" value="${emergencyName}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm" placeholder="Contact Name">
                            <input type="text" id="edit_emergency_contact_phone" value="${emergencyPhone}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm" placeholder="10-Digit Phone">
                       </div>`
                    : `<div class="text-sm font-semibold text-slate-800 py-1 border-b border-transparent min-h-[32px]">${txt('emergency_contact')}</div>`
                }
                </div>
            `;

            let bannerHtml = '';
            if (emp.profile_unlocked) {
                let timerText = "Profile editing temporarily unlocked by Admin. Compliance and locked fields can be updated once.";
                if (emp.profile_unlocked_until) {
                    timerText = `Profile editing temporarily unlocked by Admin. Time remaining: <span id="profile-unlock-countdown" class="font-bold text-emerald-600">--:--</span>`;
                }
                bannerHtml = `
                    <div class="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center shadow-sm">
                        <i data-lucide="unlock" class="w-5 h-5 mr-3 text-emerald-600 shrink-0"></i>
                        <div class="text-sm font-semibold">${timerText}</div>
                    </div>
                `;
            } else if (emp.profile_edit_requested) {
                bannerHtml = `
                    <div class="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center shadow-sm">
                        <i data-lucide="clock" class="w-5 h-5 mr-3 text-amber-600 animate-pulse shrink-0"></i>
                        <div class="text-sm font-semibold">Profile unlock request is pending approval from Admin.</div>
                    </div>
                `;
            } else if (!isEdit) {
                bannerHtml = `
                    <div class="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-between shadow-sm">
                        <div class="flex items-center">
                            <i data-lucide="lock" class="w-5 h-5 mr-3 text-slate-400 shrink-0"></i>
                            <div class="text-xs md:text-sm font-medium text-slate-600">Banking, identity, and compliance fields are locked.</div>
                        </div>
                        <button type="button" onclick="requestProfileUnlock()" class="ml-4 px-3 py-1.5 bg-brand-primary hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center shrink-0">
                            <i data-lucide="key-round" class="w-3.5 h-3.5 mr-1.5"></i> Request Edit Unlock
                        </button>
                    </div>
                `;
            }

            const missingFields = checkMandatoryFieldsMissing(emp);
            let missingAlertHtml = '';
            if (missingFields.length > 0) {
                missingAlertHtml = `
                    <div class="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start shadow-sm mt-2">
                        <i data-lucide="alert-triangle" class="w-5 h-5 mr-3 text-rose-600 shrink-0 mt-0.5 animate-bounce"></i>
                        <div class="text-sm">
                            <span class="font-bold text-rose-700">Missing Mandatory Profile Fields:</span> 
                            Please complete the following details: 
                            <span class="font-semibold text-rose-600">${missingFields.join(', ')}</span>.
                        </div>
                    </div>
                `;
            }

            return `
                <div class="max-w-5xl mx-auto pb-10">
                    ${bannerHtml}
                    ${missingAlertHtml}
                    <form onsubmit="handleProfileSave(event)">
                        <!-- Top Banner & Action Bar -->
                        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6 relative">
                            <div class="h-32 bg-gradient-to-r from-slate-800 to-slate-900 relative"></div>
                            
                            <div class="absolute top-4 right-4 z-10 flex gap-2">
                                ${isEdit ? `
                                    <button type="button" onclick="toggleEditProfile()" class="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white text-sm font-medium rounded-lg transition-colors">Cancel</button>
                                    <button type="submit" id="saveProfileBtn" class="px-4 py-2 bg-brand-accent hover:bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-lg transition-colors flex items-center shadow-emerald-500/20"><i data-lucide="save" class="w-4 h-4 mr-2"></i> Save Changes</button>
                                ` : `
                                    <button type="button" onclick="openChangePasswordModal()" class="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-[13px] font-medium rounded-lg shadow-sm transition-colors flex items-center text-rose-50 hover:text-white border-rose-300/30 hover:border-rose-300/50 hover:bg-rose-500/20"><i data-lucide="key" class="w-4 h-4 mr-2"></i> Password</button>
                                    <button type="button" onclick="toggleEditProfile()" class="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white text-[13px] font-medium rounded-lg shadow-sm transition-colors flex items-center"><i data-lucide="edit-3" class="w-4 h-4 mr-2"></i> Edit Profile</button>
                                `}
                            </div>

                            <div class="px-6 pb-6 md:px-8 relative">
                                <div class="absolute -top-16 left-6 md:left-8 w-28 h-28 bg-white rounded-full p-1.5 shadow-lg border border-slate-100">
                                    <div class="w-full h-full bg-slate-100 rounded-full flex items-center justify-center overflow-hidden relative group">
                                        ${emp.photo && emp.photo !== 'N/A' ? `<img src="${CONFIG.API_BASE_URL}/${emp.photo}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-12 h-12 text-slate-400"></i>`}
                                        <div class="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center gap-4 transition-all">
                                            <label for="upload-profile" class="cursor-pointer text-white flex flex-col items-center justify-center hover:text-brand-primary" title="Update Profile Photo">
                                                <i data-lucide="camera" class="w-6 h-6 mb-0.5"></i>
                                                <span class="text-[9px] font-bold">Update</span>
                                            </label>
                                            <input type="file" id="upload-profile" class="hidden" accept="image/*" onchange="handleFileUpload(event, 'profile', 'profile')">
                                            ${emp.photo && emp.photo !== 'N/A' ? `
                                            <button type="button" onclick="handleProfilePhotoDelete()" class="text-white flex flex-col items-center justify-center hover:text-red-400" title="Remove Profile Photo">
                                                <i data-lucide="trash-2" class="w-6 h-6 mb-0.5"></i>
                                                <span class="text-[9px] font-bold">Remove</span>
                                            </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="pt-14 flex justify-between items-end">
                                    <div>
                                        <h2 class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">${emp.full_name || 'N/A'}</h2>
                                        <p class="text-brand-primary font-bold text-sm tracking-wide uppercase mt-0.5">${emp.department || 'Employee'} &bull; @${emp.username}</p>
                                    </div>
                                    <div class="text-right hidden sm:block">
                                        <div class="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                                            <span class="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span> Active
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <!-- Left Column: Personal & Emergency -->
                            <div class="space-y-6 xl:col-span-1">
                                <!-- Personal Info Card -->
                                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center"><i data-lucide="user-circle" class="w-4 h-4 mr-2 text-brand-primary"></i> Personal Identity</h3>
                                    <div class="space-y-4">
                                        ${input('full_name', 'Full Legal Name', 'full_name')}
                                        ${input('fathers_name', "Father's Name", 'fathers_name')}
                                        <div class="grid grid-cols-2 gap-4">
                                            ${input('date_of_birth', 'Date of Birth', 'date_of_birth', 'date')}
                                            ${genderSelect}
                                        </div>
                                        <div class="grid grid-cols-2 gap-4">
                                            ${input('adhar_number', 'Aadhaar Number', 'adhar_number')}
                                            ${input('pan_number', 'PAN Number', 'pan_number')}
                                        </div>
                                        ${input('address', 'Permanent Address', 'address')}
                                    </div>
                                </div>

                                <!-- Contact Info Card -->
                                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center"><i data-lucide="phone-call" class="w-4 h-4 mr-2 text-brand-primary"></i> Contact Data</h3>
                                    <div class="space-y-4">
                                        ${input('contact_number', 'Primary Phone', 'contact_number', 'tel')}
                                        ${input('alternate_contact', 'Alternate Phone', 'alternate_contact', 'tel')}
                                        ${input('email', 'Primary Email', 'email', 'email')}
                                        ${input('alternate_email', 'Alternate Email', 'alternate_email', 'email')}
                                    </div>
                                </div>

                                <!-- Emergency Card -->
                                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 border-t-4 border-t-rose-400">
                                    <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center"><i data-lucide="heart-pulse" class="w-4 h-4 mr-2 text-rose-500"></i> Emergency Contact</h3>
                                    <div class="space-y-4">
                                        ${emergencyContactBlock}
                                        ${relationshipSelect}
                                    </div>
                                </div>
                            </div>

                            <!-- Right Column: Professional, Bank & Compliance -->
                            <div class="space-y-6 xl:col-span-2">
                                <!-- Professional & Experience Card -->
                                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center"><i data-lucide="briefcase" class="w-4 h-4 mr-2 text-brand-primary"></i> Corporate & Experience</h3>
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6 pb-6 border-b border-slate-100">
                                        ${input('date_of_joining', 'Date of Joining', 'date_of_joining', 'date')}
                                        ${repMgrSelect}
                                        ${highestQualificationSelect}
                                        ${input('specialization', 'Specialization / Major', 'specialization')}
                                    </div>
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6 pb-6 border-b border-slate-100">
                                        ${input('experience', 'Total Experience', 'experience', 'text', 'e.g. 4 Years')}
                                        ${input('previous_employer', 'Previous Employer', 'previous_employer')}
                                        <div class="md:col-span-2">${input('previous_job_role', 'Previous Job Role', 'previous_job_role')}</div>
                                    </div>

                                    <div class="space-y-4">
                                        <div class="flex flex-col">
                                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Core Skills & Competencies</label>
                                            ${isEdit
                    ? `
                                                <input type="text" id="edit_skills_input" onkeydown="handleSkillKeydown(event)" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm" placeholder="Type a skill and press Enter to add">
                                                <div id="edit_skills_container" class="flex flex-wrap gap-2 mt-3 mb-1">
                                                    ${state.editSkills.map((s, i) => `
                                                        <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-brand-primary border border-indigo-100">
                                                            ${s} 
                                                            <button type="button" onclick="removeSkill(${i})" class="ml-1.5 hover:text-indigo-800 text-sm leading-none focus:outline-none">&times;</button>
                                                        </span>
                                                    `).join('')}
                                                </div>
                                                `
                    : `
                                                <div class="text-sm font-semibold text-slate-800 py-1 min-h-[32px] flex flex-wrap gap-2">
                                                    ${(function () {
                        try {
                            let s = emp.skills;
                            if (!s || s === 'N/A' || s === '[]') return '<span class="text-slate-300 italic font-normal">Not provided</span>';
                            let arr = (typeof s === 'string' && s.startsWith('[')) ? JSON.parse(s) : (typeof s === 'string' ? s.split(',') : s);
                            return arr.map(skill => `<span class="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-brand-primary text-xs font-bold rounded-md">${skill.trim()}</span>`).join('');
                        } catch (e) { return `<span class="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-brand-primary text-xs font-bold rounded-md">${emp.skills}</span>`; }
                    })()}
                                                </div>
                                                `
                }
                                        </div>
                                        ${input('resume', 'Resume / Portfolio Link', 'resume', 'url', 'https://drive.google.com/...')}
                                    </div>
                                </div>

                                <!-- Bank & Compensation Card -->
                                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center"><i data-lucide="building" class="w-4 h-4 mr-2 text-brand-primary"></i> Banking & Payment</h3>
                                    <div class="space-y-4">
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            ${input('account_holder_name', 'Account Holder Name', 'account_holder_name')}
                                            ${input('bank_name', 'Bank Name', 'bank_name')}
                                            ${input('bank_account', 'Account Number', 'bank_account')}
                                            ${input('ifsc_code', 'IFSC / Routing Code', 'ifsc_code')}
                                        </div>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            ${input('upi_id', 'UPI ID', 'upi_id', 'text', 'e.g. user@okhdfcbank')}
                                            ${input('tax_details', 'Tax Details (PAN/VAT)', 'tax_details')}
                                        </div>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            ${input('pf_number', 'PF Number', 'pf_number')}
                                            ${input('esic_number', 'ESIC Number', 'esic_number')}
                                        </div>
                                    </div>
                                </div>

                                <!-- Compliance Documents -->
                                <div class="bg-slate-800 rounded-2xl border border-slate-900 shadow-sm p-6 text-white">
                                    <h3 class="text-sm font-black text-white uppercase tracking-wider mb-5 flex items-center"><i data-lucide="shield-check" class="w-4 h-4 mr-2 text-emerald-400"></i> Compliance Uploads</h3>
                                    <p class="text-xs text-slate-400 mb-6">${emp.compliance_verified ? 'Official compliance documents are verified and locked.' : 'Click any box to securely upload or overwrite your official compliance documents. Max size 5MB.'}</p>
                                    
                                    <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        ${getUploadBoxHtml('Aadhar Front', 'adhar', 'front', emp.adhar_front)}
                                        ${getUploadBoxHtml('Aadhar Back', 'adhar', 'back', emp.adhar_back)}
                                        ${getUploadBoxHtml('PAN Front', 'pancard', 'front', emp.pan_front)}
                                        ${getUploadBoxHtml('PAN Back', 'pancard', 'back', emp.pan_back)}
                                        ${getUploadBoxHtml('Bank QR Code', 'qr_code', 'code', emp.qr_code)}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </form>
                </div>
            `;
        }