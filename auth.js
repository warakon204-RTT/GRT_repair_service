const AUTH_STORAGE_KEY = 'grt_logged_in_user';
const AUTH_PASSWORD = 'grt';

function isUserAuthenticated() {
    return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
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
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
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
    localStorage.removeItem(AUTH_STORAGE_KEY);
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
        }
    }
}

document.addEventListener('DOMContentLoaded', setupAuthPage);
