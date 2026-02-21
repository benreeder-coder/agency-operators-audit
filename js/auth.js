const ADMIN_DOMAINS = ['builderbenai.com', 'agencyoperators.io'];

async function getSession() {
    const { data: { session }, error } = await _supabase.auth.getSession();
    if (error) console.error('Session error:', error);
    return session;
}

async function getProfile(userId) {
    const { data, error } = await _supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) console.error('Profile error:', error);
    return data;
}

async function ensureProfile(session) {
    if (!session) return;
    const existing = await getProfile(session.user.id);
    if (existing) return existing;
    const user = session.user;
    const email = user.email;
    const { data, error } = await _supabase
        .from('profiles')
        .upsert({
            id: user.id,
            email: email,
            full_name: user.user_metadata?.full_name || email.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url || null,
            is_admin: email.endsWith('@builderbenai.com') || email.endsWith('@agencyoperators.io')
        }, { onConflict: 'id' })
        .select()
        .single();
    if (error) {
        console.error('ensureProfile upsert failed:', error);
        return null;
    }
    return data;
}

async function isAdmin(session) {
    if (!session) return false;
    const email = session.user.email;
    const domainMatch = ADMIN_DOMAINS.some(d => email.endsWith('@' + d));
    if (domainMatch) return true;
    const profile = await getProfile(session.user.id);
    return profile?.is_admin === true;
}

async function signInWithGoogle() {
    const redirectTo = window.location.origin + '/form.html';
    const { error } = await _supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
    });
    if (error) {
        console.error('Sign-in error:', error);
        showAuthError('Sign-in failed: ' + (error.message || 'Unknown error. Please try again.'));
    }
}

function showAuthError(message) {
    let el = document.getElementById('auth-error');
    if (!el) {
        el = document.createElement('div');
        el.id = 'auth-error';
        el.style.cssText = 'margin-top:16px;padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:0.875rem;line-height:1.4;text-align:center;';
        const btn = document.querySelector('.google-btn');
        if (btn) btn.parentNode.insertBefore(el, btn.nextSibling);
        else document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.display = 'block';
}

function checkOAuthError() {
    // Check URL hash (Supabase puts OAuth errors here)
    const hash = window.location.hash;
    if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const error = params.get('error');
        const desc = params.get('error_description');
        if (error) {
            const msg = desc ? decodeURIComponent(desc.replace(/\+/g, ' ')) : error;
            showAuthError('Sign-in failed: ' + msg);
            history.replaceState(null, '', window.location.pathname + window.location.search);
            return;
        }
    }
    // Check query params (forwarded from form.html when OAuth fails there)
    const qp = new URLSearchParams(window.location.search);
    const authError = qp.get('auth_error');
    if (authError) {
        showAuthError('Sign-in failed: ' + decodeURIComponent(authError));
        history.replaceState(null, '', window.location.pathname);
    }
}

async function signOut() {
    // Clear form localStorage to prevent data leaking to next user on same browser
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
        if (k.startsWith('agency_audit_form_data') || k.startsWith('agency_audit_table_data')) {
            localStorage.removeItem(k);
        }
    });
    localStorage.removeItem('audit_table_v2_clean');
    await _supabase.auth.signOut();
    window.location.href = '/index.html';
}

async function requireAuth(showLoadingOverlay) {
    if (showLoadingOverlay) showLoadingOverlay(true);
    const session = await getSession();
    if (!session) {
        window.location.href = '/index.html';
        return null;
    }
    await ensureProfile(session);
    if (showLoadingOverlay) showLoadingOverlay(false);
    return session;
}

async function requireAdmin() {
    const session = await requireAuth();
    if (!session) return null;
    const admin = await isAdmin(session);
    if (!admin) {
        window.location.href = '/form.html';
        return null;
    }
    return session;
}

function renderUserInfo(container, session, adminFlag) {
    const user = session.user;
    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    const avatar = user.user_metadata?.avatar_url;

    container.innerHTML = '';

    // User info row
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 20px;border-bottom:1px solid var(--border-color);';

    if (avatar && typeof avatar === 'string' && avatar.startsWith('https://')) {
        const img = document.createElement('img');
        img.src = avatar;
        img.style.cssText = 'width:32px;height:32px;border-radius:50%;';
        img.alt = '';
        row.appendChild(img);
    } else {
        const fallback = document.createElement('div');
        fallback.style.cssText = 'width:32px;height:32px;border-radius:50%;background:var(--accent-blue);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;';
        fallback.textContent = name[0].toUpperCase();
        row.appendChild(fallback);
    }

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    nameEl.textContent = name;
    info.appendChild(nameEl);

    const emailEl = document.createElement('div');
    emailEl.style.cssText = 'font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    emailEl.textContent = user.email;
    info.appendChild(emailEl);

    row.appendChild(info);
    container.appendChild(row);

    if (adminFlag) {
        const link = document.createElement('a');
        link.href = '/dashboard.html';
        link.style.cssText = 'display:block;padding:10px 20px;font-size:13px;font-weight:500;color:var(--accent-blue);text-decoration:none;border-bottom:1px solid var(--border-color);';
        link.textContent = 'Dashboard';
        container.appendChild(link);
    }

    const btn = document.createElement('button');
    btn.style.cssText = 'display:block;width:100%;padding:10px 20px;font-size:13px;font-weight:500;color:var(--text-secondary);text-align:left;background:none;border:none;border-bottom:1px solid var(--border-color);cursor:pointer;';
    btn.textContent = 'Sign Out';
    btn.addEventListener('click', signOut);
    container.appendChild(btn);
}

function setupAuthListener(onSessionUpdate) {
    _supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            window.location.href = '/index.html';
        }
        if (event === 'TOKEN_REFRESHED' && session) {
            if (onSessionUpdate) onSessionUpdate(session);
        }
    });
}
