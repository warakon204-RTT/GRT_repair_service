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
        Swal.fire({
            icon: 'success',
            title: 'เข้าสู่ระบบสำเร็จ',
            text: 'กำลังนำทางไปยังแดชบอร์ด...',
            showConfirmButton: false,
            timer: 1200,
            timerProgressBar: true
        }).then(() => {
            window.location.href = 'index.html';
        });
        return;
    }

    Swal.fire({
        icon: 'error',
        title: 'รหัสผ่านไม่ถูกต้อง',
        text: 'กรุณาตรวจสอบข้อมูลอีกครั้ง',
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
        if (loginForm) {
            loginForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const password = document.getElementById('loginPassword').value.trim();
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
