const AUTH_STORAGE_KEY = 'grt_logged_in_user';
const DEVICE_STORAGE_KEY = 'grt_device_id';
const AUTH_PASSWORD = 'grt';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const DEVICE_HEARTBEAT_MS = 60 * 1000;

function getStoredSession() {
    try {
        return JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    } catch (error) {
        return null;
    }
}

function getDeviceId() {
    let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!deviceId) {
        deviceId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    }
    return deviceId;
}

function getSupabaseClient() {
    if (!window.supabase) return null;
    const url = 'https://nxoxfwartamlrusfvgtt.supabase.co';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54b3hmdGFydGFtbHJ1c2Z2Z3R0IiwiaWF0IjoxNzc5NzM1MDg3LCJleHAiOjIwOTUzMTEwODN9.OXdwrF0SpchQw27Fi1jjj36muo0LvfzAlMLbXlEY8Q';
    return window.supabase.createClient(url, key);
}

async function updateDeviceHeartbeat() {
    const session = getStoredSession();
    const client = getSupabaseClient();
    if (!session || Date.now() >= session.expiresAt || !client) return;
    await client.from('active_devices').upsert({
        device_id: getDeviceId(),
        session_id: session.sessionId,
        last_seen: new Date().toISOString(),
        user_agent: navigator.userAgent
    }, { onConflict: 'device_id' });
}

async function removeDeviceSession() {
    const client = getSupabaseClient();
    if (client) await client.from('active_devices').delete().eq('device_id', getDeviceId());
}

async function refreshActiveDeviceCount() {
    const countElement = document.getElementById('activeDevicesCount');
    if (!countElement) return;
    const client = getSupabaseClient();
    if (!client) return;
    const activeSince = new Date(Date.now() - (DEVICE_HEARTBEAT_MS * 2)).toISOString();
    const { count, error } = await client.from('active_devices')
        .select('id', { count: 'exact', head: true })
        .gte('last_seen', activeSince);
    if (!error) countElement.textContent = count || 0;
}

function isUserAuthenticated() {
    const session = getStoredSession();
    if (!session || !session.expiresAt || Date.now() >= session.expiresAt) {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        return false;
    }
    return true;
}

function redirectToLogin() {
    if (!window.location.pathname.toLowerCase().endsWith('login.html')) {
        window.location.href = 'login.html';
    }
}

function redirectToDashboard() {
    if (window.location.pathname.toLowerCase().endsWith('login.html')) {
        window.location.href = 'index.html';
    }
}

function authenticateUser(password) {
    if (!password) {
        Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลไม่ครบถ้วน',
            text: 'กรุณากรอกรหัสผ่าน',
            confirmButtonColor: '#f59e0b'
        });
        return;
    }

    if (password === AUTH_PASSWORD) {
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
            sessionId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            expiresAt: Date.now() + SESSION_MAX_AGE_MS
        }));
        updateDeviceHeartbeat();
        const successSplash = document.getElementById('loginSuccessSplash');
        if (successSplash) {
            successSplash.style.display = 'flex';
            successSplash.setAttribute('aria-hidden', 'false');
        }
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 100);
        return;
    }

    Swal.fire({
        icon: 'error',
        title: 'รหัสผ่านไม่ถูกต้อง',
        text: 'กรุณาตรวจสอบตัวพิมพ์ใหญ่-เล็ก และดูว่าเปิด Caps Lock อยู่หรือไม่',
        confirmButtonColor: '#ef4444'
    });
}

function logoutUser() {
    removeDeviceSession();
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = 'login.html';
}

function setupAuthPage() {
    const isLoginPage = window.location.pathname.toLowerCase().endsWith('login.html');
    if (isLoginPage) {
        if (isUserAuthenticated()) {
            redirectToDashboard();
            return;
        }

        const loginForm = document.getElementById('loginForm');
        const passwordInput = document.getElementById('loginPassword');
        const capsLockWarning = document.getElementById('capsLockWarning');

        function updateCapsLockWarning(event) {
            if (!capsLockWarning) return;
            capsLockWarning.style.display = event.getModifierState && event.getModifierState('CapsLock') ? 'block' : 'none';
        }

        if (passwordInput) {
            passwordInput.addEventListener('keydown', updateCapsLockWarning);
            passwordInput.addEventListener('keyup', updateCapsLockWarning);
            passwordInput.addEventListener('blur', () => {
                if (capsLockWarning) capsLockWarning.style.display = 'none';
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const password = passwordInput.value.trim();
                authenticateUser(password);
            });
        }
    } else {
        if (!isUserAuthenticated()) {
            redirectToLogin();
        } else {
            const session = getStoredSession();
            updateDeviceHeartbeat();
            setInterval(updateDeviceHeartbeat, DEVICE_HEARTBEAT_MS);
            refreshActiveDeviceCount();
            setTimeout(() => {
                if (!isUserAuthenticated()) {
                    removeDeviceSession();
                    window.location.href = 'login.html';
                }
            }, Math.max(0, session.expiresAt - Date.now()));
        }
    }
}

document.addEventListener('DOMContentLoaded', setupAuthPage);
