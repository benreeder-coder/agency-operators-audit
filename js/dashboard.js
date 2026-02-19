let allAudits = [];
let allTeamMembers = [];

async function initDashboard() {
    const session = await requireAdmin();
    if (!session) return;

    setupAuthListener(null);
    renderUserInfo(document.getElementById('dashUserInfo'), session, true);
    await loadDashboardData();
    setupTabs();
    renderAuditsTab();

    // Modal: close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Modal: close on click outside content
    const modal = document.getElementById('auditModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
}

async function loadDashboardData() {
    const [auditsRes, teamRes] = await Promise.all([
        _supabase.from('audits').select('*').order('updated_at', { ascending: false }),
        _supabase.from('audit_team_members').select('*, audits(company_name)').order('created_at', { ascending: false })
    ]);

    if (auditsRes.error || teamRes.error) {
        const msg = auditsRes.error?.message || teamRes.error?.message || 'Unknown error';
        const banner = document.createElement('div');
        banner.style.cssText = 'background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;';
        banner.textContent = 'Failed to load dashboard data: ' + msg;
        document.querySelector('.dashboard-content')?.prepend(banner);
        console.error('[Dashboard] Load error:', auditsRes.error, teamRes.error);
    }

    allAudits = auditsRes.data || [];
    allTeamMembers = teamRes.data || [];

    document.getElementById('statAudits').textContent = allAudits.length;
    document.getElementById('statSubmitted').textContent = allAudits.filter(a => a.status === 'submitted').length;
    document.getElementById('statDrafts').textContent = allAudits.filter(a => a.status === 'draft').length;
    document.getElementById('statTeam').textContent = allTeamMembers.length;
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('panel-' + btn.dataset.tab).classList.add('active');

            if (btn.dataset.tab === 'audits') renderAuditsTab();
            if (btn.dataset.tab === 'team') renderTeamTab();
            if (btn.dataset.tab === 'progress') renderProgressTab();
        });
    });

    document.getElementById('auditSearch').addEventListener('input', renderAuditsTab);
    document.getElementById('auditStatusFilter').addEventListener('change', renderAuditsTab);
    document.getElementById('teamSearch').addEventListener('input', renderTeamTab);
}

function renderAuditsTab() {
    const search = document.getElementById('auditSearch').value.toLowerCase();
    const status = document.getElementById('auditStatusFilter').value;

    let filtered = allAudits;
    if (search) {
        filtered = filtered.filter(a =>
            (a.company_name || '').toLowerCase().includes(search) ||
            (a.user_name || '').toLowerCase().includes(search) ||
            (a.user_email || '').toLowerCase().includes(search)
        );
    }
    if (status) {
        filtered = filtered.filter(a => a.status === status);
    }

    const tbody = document.getElementById('auditsTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px;">No audits found</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(a => `
        <tr onclick="showAuditDetail('${a.id}')" style="cursor:pointer;">
            <td><strong>${esc(a.company_name || 'Untitled')}</strong></td>
            <td>${esc(a.user_name || '-')}</td>
            <td>${esc(a.user_email || '-')}</td>
            <td>${a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : '-'}</td>
            <td>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;height:6px;background:var(--border-color);border-radius:3px;overflow:hidden;">
                        <div style="height:100%;width:${a.completion_percentage || 0}%;background:${progressColor(a.completion_percentage)};border-radius:3px;"></div>
                    </div>
                    <span style="font-size:12px;color:var(--text-secondary);min-width:32px;">${a.completion_percentage || 0}%</span>
                </div>
            </td>
            <td><span class="status-badge status-${a.status}">${a.status}</span></td>
        </tr>
    `).join('');
}

function renderTeamTab() {
    const search = document.getElementById('teamSearch').value.toLowerCase();

    let filtered = allTeamMembers;
    if (search) {
        filtered = filtered.filter(m =>
            (m.member_name || '').toLowerCase().includes(search) ||
            (m.position || '').toLowerCase().includes(search) ||
            (m.audits?.company_name || '').toLowerCase().includes(search)
        );
    }

    const tbody = document.getElementById('teamTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:40px;">No team members found</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(m => `
        <tr>
            <td><strong>${esc(m.member_name || '-')}</strong></td>
            <td>${esc(m.position || '-')}</td>
            <td>${esc(m.compensation || '-')}</td>
            <td>${esc(m.audits?.company_name || '-')}</td>
        </tr>
    `).join('');
}

function renderProgressTab() {
    const container = document.getElementById('progressCards');
    if (allAudits.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">No audits yet</p>';
        return;
    }

    container.innerHTML = allAudits.map(a => {
        const sc = a.section_completion || {};
        const sectionLabels = {
            contact: 'Contact', strategy: 'Strategy', goals: 'Goals',
            leadgen: 'Lead Gen', leadnurture: 'Lead Nurture', sales: 'Sales',
            recruiting: 'Recruiting', operations: 'Operations',
            financials: 'Financials', voiceofdata: 'Voice of Data'
        };

        const sections = Object.entries(sectionLabels).map(([key, label]) => {
            const pct = sc[key] || 0;
            return `
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;">
                    <span style="min-width:90px;color:var(--text-secondary);">${label}</span>
                    <div style="flex:1;height:5px;background:var(--border-color);border-radius:3px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:${progressColor(pct)};border-radius:3px;"></div>
                    </div>
                    <span style="min-width:30px;text-align:right;color:var(--text-muted);font-size:12px;">${pct}%</span>
                </div>
            `;
        }).join('');

        return `
            <div class="progress-card">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
                    <div>
                        <div style="font-weight:600;font-size:15px;">${esc(a.company_name || 'Untitled')}</div>
                        <div style="font-size:13px;color:var(--text-muted);">${esc(a.user_name || '')} &middot; ${esc(a.user_email || '')}</div>
                    </div>
                    <div style="font-size:24px;font-weight:700;color:${progressColor(a.completion_percentage)};">${a.completion_percentage || 0}%</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;">${sections}</div>
                <div style="margin-top:10px;font-size:11px;color:var(--text-muted);">Updated ${new Date(a.updated_at).toLocaleString()}</div>
            </div>
        `;
    }).join('');
}

function showAuditDetail(id) {
    const audit = allAudits.find(a => a.id === id);
    if (!audit) return;

    const modal = document.getElementById('auditModal');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        <h3 style="margin-bottom:16px;">${esc(audit.company_name || 'Untitled Audit')}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;font-size:14px;margin-bottom:16px;">
            <div><strong>User:</strong> ${esc(audit.user_name || '-')}</div>
            <div><strong>Email:</strong> ${esc(audit.user_email || '-')}</div>
            <div><strong>Status:</strong> <span class="status-badge status-${audit.status}">${audit.status}</span></div>
            <div><strong>Completion:</strong> ${audit.completion_percentage || 0}%</div>
            <div><strong>Created:</strong> ${new Date(audit.created_at).toLocaleString()}</div>
            <div><strong>Updated:</strong> ${new Date(audit.updated_at).toLocaleString()}</div>
        </div>
        <details style="margin-top:12px;">
            <summary style="cursor:pointer;font-weight:600;margin-bottom:8px;">Raw Form Data</summary>
            <pre style="background:var(--bg-input);padding:16px;border-radius:8px;overflow-x:auto;font-size:12px;max-height:400px;overflow-y:auto;">${esc(JSON.stringify(audit.form_data, null, 2))}</pre>
        </details>
    `;

    modal.classList.add('open');
}

function closeModal() {
    document.getElementById('auditModal').classList.remove('open');
}

function progressColor(pct) {
    if (pct >= 80) return '#10b981';
    if (pct >= 50) return '#f59e0b';
    return '#ef4444';
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', initDashboard);
