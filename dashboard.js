let supabaseClient = null; 
let localCachedJobs = [];
let isCanvasDrawn = false; // ตรวจสอบว่าลูกค้ามีการวาดลายเซ็นใหม่ใน Modal หรือไม่

// ==========================================
// 🚀 เริ่มระบบและเชื่อมต่อฐานข้อมูลแดชบอร์ด
// ==========================================
async function initDashboardSystem() {
    try {
        const res = await fetch('config.json'); 
        const config = await res.json();
        supabaseClient = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
        
        // 🖋️ เริ่มระบบดักจับการวาดลายเซ็นบน Canvas
        initCanvasDrawing('newCustomerSigCanvas', '#0f172a', 3.0);
        
        loadHistoryData();
    } catch (err) { 
        console.error("โหลดสถิติแดชบอร์ดล้มเหลว: ", err); 
        Swal.fire({
            icon: 'error',
            title: 'การเชื่อมต่อระบบล้มเหลว',
            text: 'ไม่สามารถอ่านค่า config เพื่อเชื่อมคลาวด์องค์กรได้',
            confirmButtonColor: '#ef4444'
        });
    }
}

// ==========================================
// 📥 ดึงข้อมูลประวัติใบงานทั้งหมดจากคลาวด์ Supabase
// ==========================================
async function loadHistoryData() {
    const tbody = document.getElementById('historyTableBody'); if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">⏳ กำลังคำนวณสถิติองค์กรและดึงข้อมูลใบงาน...</td></tr>`;
    try {
        const { data, error } = await supabaseClient
            .from('repair_jobs')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error; 
        localCachedJobs = data || [];
        
        setupFilterOptions();
        
        // 🌟 ส่งรายการทั้งหมด (localCachedJobs) ไปเรนเดอร์ในตารางทันทีตั้งแต่โหลดหน้าแรก
        // และส่งค่า true เพื่อบอกให้กล่องสถิติด้านบนคำนวณเฉพาะ "วันปัจจุบัน"
        renderTable(localCachedJobs, true); 
        
    } catch (err) { 
        tbody.innerHTML = `<tr><td colspan="7" style="color:#ef4444; text-align:center; font-weight:bold;">❌ โหลดข้อมูลล้มเหลว: ${err.message}</td></tr>`; 
    }
}

// ==========================================
// 📊 วาดตารางแสดงรายการข้อมูล + ประมวลผลยอดสถิติแยกส่วน (Counters Logic)
// ==========================================
function renderTable(list, isInitialToday = false) {
    const tbody = document.getElementById('historyTableBody'); if(!tbody) return;
    
    let totalJobsCount = 0;
    let uniqueCustomersCount = 0;

    // ⚙️ ตรรกะการคำนวณยอดนับในกล่องสถิติ
    if (isInitialToday) {
        // กรณีโหลดหน้าแรก หรือ กดรีเซ็ต: ให้กล่องสถิตินับเฉพาะ "วันปัจจุบัน" เท่านั้น
        const todayStr = new Date().toISOString().split('T')[0];
        const todayJobs = localCachedJobs.filter(job => {
            const rawDate = job.repair_date || job.created_at;
            if (!rawDate) return false;
            return new Date(rawDate).toISOString().split('T')[0] === todayStr;
        });
        totalJobsCount = todayJobs.length;
        uniqueCustomersCount = [...new Set(todayJobs.map(j => j.customer_name).filter(n => n))].length;
    } else {
        // กรณีที่ผู้ใช้กำลังใช้งานฟิลเตอร์ (ค้นหา): ให้กล่องสถิตินับจำนวนตามผลลัพธ์ที่ฟิลเตอร์จริง
        totalJobsCount = list ? list.length : 0;
        uniqueCustomersCount = list ? [...new Set(list.map(j => j.customer_name).filter(n => n))].length : 0;
    }
    
    // อัปเดตตัวเลขลงกล่องสถิติบนหน้าจอ
    if(document.getElementById('counterTotalJobs')) document.getElementById('counterTotalJobs').innerText = totalJobsCount;
    if(document.getElementById('counterCustomers')) document.getElementById('counterCustomers').innerText = uniqueCustomersCount;

    // เปลี่ยนข้อความอธิบายกลุ่มสถิติให้สอดคล้องกับตัวเลข
    const labelJobs = document.getElementById('lblTotalJobsScope');
    const labelCust = document.getElementById('lblCustomersScope');
    if (labelJobs && labelCust) {
        if (isInitialToday) {
            labelJobs.innerText = "จำนวนใบงานซ่อมบำรุง (เฉพาะวันนี้)";
            labelCust.innerText = "จำนวนลูกค้าในระบบ (เฉพาะวันนี้)";
        } else {
            labelJobs.innerText = "จำนวนใบงานซ่อมบำรุง (ตามตัวกรอง)";
            labelCust.innerText = "จำนวนลูกค้าในระบบ (ตามตัวกรอง)";
        }
    }

    // 🌟 ส่วนการแสดงผลตาราง: จะแสดงผลตามข้อมูล (list) ที่ส่งเข้ามา 
    if(!list || list.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding: 20px;">📭 ไม่พบประวัติข้อมูลใบงานในเงื่อนไขเวลานี้</td></tr>`; 
        return; 
    }
    
    tbody.innerHTML = list.map(job => {
        const rawDate = job.repair_date || job.created_at;
        const d = rawDate ? new Date(rawDate).toLocaleDateString('th-TH', {year:'numeric', month:'short', day:'numeric'}) : 'ไม่ระบุวันที่';
        const displayTechName = job.printed_technician_name || job.technician_name || '-';
        
        return `<tr>
            <td><b>${d}</b></td>
            <td><span style="color:#1e3a8a; font-weight:bold; font-family:monospace;">${job.job_number || 'No-Code'}</span></td>
            <td>${job.customer_name || 'ทั่วไป'}</td>
            <td>${job.item_name || '-'}</td>
            <td><mark style="background:#e0f2fe; color:#0369a1; padding:4px 8px; border-radius:4px; font-weight:600; font-size:12px;">${job.job_type}</mark></td>
            <td>👤 ${displayTechName}</td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-primary" style="padding:6px 12px; font-size:12px; background:#475569; cursor:pointer;" onclick="viewFullReport('${job.id}')">📄 รีพอร์ต</button>
                    <button class="btn btn-success" style="padding:6px 12px; font-size:12px; background:#10b981; cursor:pointer; border:none; color:#fff; border-radius:4px;" onclick="openEditModal('${job.id}')">✏️ แก้ไข</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function viewFullReport(jobId) { window.open(`preview.html?id=${jobId}`, '_blank'); }

// ==========================================
// ✏️ ระบบเปิด Modal และโหลดข้อมูลเก่ามาแสดงผล
// ==========================================
function openEditModal(id) {
    const job = localCachedJobs.find(item => item.id == id);
    if (!job) return;

    const canvas = document.getElementById('newCustomerSigCanvas');
    if (canvas) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
    isCanvasDrawn = false;

    document.getElementById('editJobId').value = job.id; 
    document.getElementById('editJobNumber').value = job.job_number || '';
    document.getElementById('editCustomerName').value = job.customer_name || ''; 
    document.getElementById('editJobType').value = job.job_type || ''; 
    document.getElementById('editTechName').value = job.printed_technician_name || job.technician_name || '';
    document.getElementById('editDescription').value = job.job_description || '';
    
    document.getElementById('editPrintedCustomerName').value = job.printed_customer_name || '';
    const imgElement = document.getElementById('currentCustomerSigImg');
    if (imgElement) {
        imgElement.src = job.customer_signature_url || '';
    }
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() { 
    document.getElementById('editModal').style.display = 'none'; 
}

// ==========================================
// 🎨 ระบบจัดการวาดภาพลายมือชื่อ (Canvas Logic)
// ==========================================
function initCanvasDrawing(canvasId, color, thickness) {
    const canvas = document.getElementById(canvasId); if(!canvas) return;
    const ctx = canvas.getContext('2d'); let drawing = false;
    
    function getPos(e) {
        const r = canvas.getBoundingClientRect();
        let cX = e.clientX, cY = e.clientY;
        if (e.touches && e.touches.length > 0) { 
            cX = e.touches[0].clientX; 
            cY = e.touches[0].clientY; 
        }
        return { 
            x: (cX - r.left) * (canvas.width / r.width), 
            y: (cY - r.top) * (canvas.height / r.height) 
        };
    }
    
    canvas.addEventListener('mousedown', (e) => { drawing = true; isCanvasDrawn = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
    canvas.addEventListener('mousemove', (e) => { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineWidth = thickness; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.lineTo(p.x, p.y); ctx.stroke(); });
    canvas.addEventListener('mouseup', () => drawing = false);
    
    canvas.addEventListener('touchstart', (e) => { drawing = true; isCanvasDrawn = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }, {passive: false});
    canvas.addEventListener('touchmove', (e) => { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineWidth = thickness; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.lineTo(p.x, p.y); ctx.stroke(); }, {passive: false});
    canvas.addEventListener('touchend', () => drawing = false);
}

async function uploadCanvasToStorage(canvasId, path) {
    return new Promise((resolve) => {
        const cvs = document.getElementById(canvasId); if(!cvs) return resolve(null);
        cvs.toBlob(async (blob) => {
            if(!blob) return resolve(null);
            const { data, error } = await supabaseClient.storage.from('repair-documents').upload(path, blob, { contentType: 'image/png', upsert: true });
            if (error) resolve(null);
            else { 
                const { data: url } = supabaseClient.storage.from('repair-documents').getPublicUrl(path); 
                resolve(url.publicUrl); 
            }
        }, 'image/png');
    });
}

// ==========================================
// 💾 บันทึกการแก้ไขทุกส่วน
// ==========================================
async function updateJobData() {
    try {
        const id = document.getElementById('editJobId').value;
        const jobNum = document.getElementById('editJobNumber').value;
        const customerName = document.getElementById('editCustomerName').value;
        const printedCustomerName = document.getElementById('editPrintedCustomerName').value.trim();

        if (!printedCustomerName) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณากรอกชื่อลูกค้า',
                text: 'กรุณากรอกชื่อตัวแทนลูกค้าผู้ลงนามตรวจรับงาน',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        Swal.fire({
            title: 'กำลังอัปเดตข้อมูลองค์กร...',
            text: 'กรุณารอสักครู่ ระบบกำลังจัดเก็บข้อมูลและประมวลผลลายเซ็นใหม่',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        let newSigUrl = null;
        if (isCanvasDrawn) {
            const timeStamp = Date.now();
            const filePath = `${customerName}/${jobNum}/customer_sig_edit_${timeStamp}.png`;
            newSigUrl = await uploadCanvasToStorage('newCustomerSigCanvas', filePath);
        }

        const updatePayload = { 
            customer_name: customerName, 
            job_type: document.getElementById('editJobType').value, 
            printed_technician_name: document.getElementById('editTechName').value,
            job_description: document.getElementById('editDescription').value,
            printed_customer_name: printedCustomerName
        };

        if (newSigUrl) {
            updatePayload.customer_signature_url = newSigUrl;
        }

        const { error } = await supabaseClient
            .from('repair_jobs')
            .update(updatePayload)
            .eq('id', id);
            
        if(error) throw error; 
        
        Swal.fire({
            icon: 'success',
            title: 'บันทึกข้อมูลสำเร็จ!',
            text: 'รายละเอียดใบงาน ชื่อ และลายมือชื่อชุดใหม่ถูกแทนที่เรียบร้อย',
            confirmButtonColor: '#10b981'
        });

        closeEditModal(); 
        loadHistoryData(); 
    } catch(err) { 
        console.error(err);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาดในการบันทึก',
            text: err.message,
            confirmButtonColor: '#ef4444'
        });
    }
}

// ==========================================
// 🔍 ระบบกรองข้อมูล (Filters)
// ==========================================
function filterData() {
    const custFilter = document.getElementById('filterCustomer').value;
    const dateStart = document.getElementById('filterDateStart').value;
    const dateEnd = document.getElementById('filterDateEnd').value;

    const hasActiveFilter = (custFilter !== "ALL" || dateStart !== "" || dateEnd !== "");

    const filtered = localCachedJobs.filter(job => {
        const matchCustomer = (custFilter === "ALL" || job.customer_name === custFilter);
        
        const rawDate = job.repair_date || job.created_at;
        if (!rawDate) return false;
        const jobDateStr = new Date(rawDate).toISOString().split('T')[0];
        
        const matchStart = !dateStart || jobDateStr >= dateStart;
        const matchEnd = !dateEnd || jobDateStr <= dateEnd;

        return matchCustomer && matchStart && matchEnd;
    });

    // เรนเดอร์ข้อมูลที่ผ่านการกรองลงตาราง และอัปเดตสถิติตามผลลัพธ์ฟิลเตอร์จริง
    renderTable(filtered, !hasActiveFilter);
}

// เมื่อกดปุ่มรีเซ็ต ให้ตารางกลับมาโชว์ทั้งหมด แต่กล่องสถิติกลับไปนับเฉพาะของวันนี้ตามเดิม
function resetFilters() {
    document.getElementById('filterCustomer').value = "ALL";
    document.getElementById('filterDateStart').value = "";
    document.getElementById('filterDateEnd').value = "";
    
    renderTable(localCachedJobs, true);
}

function setupFilterOptions() {
    const select = document.getElementById('filterCustomer');
    if (!select) return;
    const names = [...new Set(localCachedJobs.map(j => j.customer_name).filter(n => n))];
    
    select.innerHTML = '<option value="ALL">แสดงทั้งหมด</option>' + 
        names.map(n => `<option value="${n}">${n}</option>`).join('');
}

document.addEventListener("DOMContentLoaded", () => {
    initDashboardSystem();
    
    const btnClearSig = document.getElementById('btnClearNewCustSig');
    if (btnClearSig) {
        btnClearSig.addEventListener('click', () => {
            const canvas = document.getElementById('newCustomerSigCanvas');
            if (canvas) {
                canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            }
            isCanvasDrawn = false; 
        });
    }
});