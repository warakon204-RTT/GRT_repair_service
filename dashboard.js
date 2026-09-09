let supabaseClient = null; 
let localCachedJobs = [];
let jobPreviewPhotos = {};
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
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">⏳ กำลังคำนวณสถิติองค์กรและดึงข้อมูลใบงาน...</td></tr>`;
    try {
        const { data, error } = await supabaseClient
            .from('repair_jobs')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error; 
        localCachedJobs = data || [];

        const { data: photoData, error: photoError } = await supabaseClient
            .from('job_photos')
            .select('job_id, photo_url, photo_description')
            .order('id', { ascending: true });
        if (photoError) throw photoError;
        jobPreviewPhotos = {};
        (photoData || []).forEach(photo => {
            if (!jobPreviewPhotos[photo.job_id]) jobPreviewPhotos[photo.job_id] = photo;
        });
        
        setupFilterOptions();
        
        // 🌟 ส่งรายการทั้งหมด (localCachedJobs) ไปเรนเดอร์ในตารางทันทีตั้งแต่โหลดหน้าแรก
        // และส่งค่า true เพื่อบอกให้กล่องสถิติด้านบนคำนวณเฉพาะ "วันปัจจุบัน"
        renderTable(localCachedJobs.filter(job => job.job_status !== 'ส่งกลับลูกค้าแล้ว'), true); 
        
    } catch (err) { 
        tbody.innerHTML = `<tr><td colspan="8" style="color:#ef4444; text-align:center; font-weight:bold;">❌ โหลดข้อมูลล้มเหลว: ${err.message}</td></tr>`; 
    }
}

// ==========================================
// 📊 วาดตารางแสดงรายการข้อมูล + ประมวลผลยอดสถิติแยกส่วน (Counters Logic)
// ==========================================
function renderTable(list, isInitialToday = false) {
    const tbody = document.getElementById('historyTableBody'); if(!tbody) return;
    
    let totalJobsCount = 0;
    let activeJobsCount = 0;

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
        activeJobsCount = localCachedJobs.filter(job => job.job_status !== 'ส่งกลับลูกค้าแล้ว').length;
    } else {
        // กรณีที่ผู้ใช้กำลังใช้งานฟิลเตอร์ (ค้นหา): ให้กล่องสถิตินับจำนวนตามผลลัพธ์ที่ฟิลเตอร์จริง
        totalJobsCount = list ? list.length : 0;
        activeJobsCount = list ? list.filter(job => job.job_status !== 'ส่งกลับลูกค้าแล้ว').length : 0;
    }
    
    // อัปเดตตัวเลขลงกล่องสถิติบนหน้าจอ
    if(document.getElementById('counterTotalJobs')) document.getElementById('counterTotalJobs').innerText = totalJobsCount;
    if(document.getElementById('counterCustomers')) document.getElementById('counterCustomers').innerText = activeJobsCount;

    // เปลี่ยนข้อความอธิบายกลุ่มสถิติให้สอดคล้องกับตัวเลข
    const labelJobs = document.getElementById('lblTotalJobsScope');
    const labelCust = document.getElementById('lblCustomersScope');
    if (labelJobs && labelCust) {
        if (isInitialToday) {
            labelJobs.innerText = "จำนวนใบงานซ่อมบำรุง (เฉพาะวันนี้)";
            labelCust.innerText = "จำนวนงานที่กำลังดำเนินการ";
        } else {
            labelJobs.innerText = "จำนวนใบงานซ่อมบำรุง (ตามตัวกรอง)";
            labelCust.innerText = "จำนวนงานที่กำลังดำเนินการ (ตามตัวกรอง)";
        }
    }

    // 🌟 ส่วนการแสดงผลตาราง: จะแสดงผลตามข้อมูล (list) ที่ส่งเข้ามา 
    if(!list || list.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding: 20px;">📭 ไม่พบประวัติข้อมูลใบงานในเงื่อนไขเวลานี้</td></tr>`; 
        return; 
    }
    
    tbody.innerHTML = list.map(job => {
        const rawDate = job.repair_date || job.created_at;
        const d = rawDate ? new Date(rawDate).toLocaleDateString('th-TH', {year:'numeric', month:'short', day:'numeric'}) : 'ไม่ระบุวันที่';
        const displayTechName = job.printed_technician_name || job.technician_name || '-';
        const isSent = job.job_status === 'ส่งกลับลูกค้าแล้ว';
        const sentDate = job.sent_date ? new Date(`${job.sent_date}T00:00:00`).toLocaleDateString('th-TH', {year:'numeric', month:'short', day:'numeric'}) : '-';
        
        const previewPhoto = jobPreviewPhotos[job.id];
        const hoverHandlers = previewPhoto
            ? `onmouseenter="showJobImage(event, '${job.id}')" onmousemove="moveJobImage(event)" onmouseleave="hideJobImage()"`
            : '';

        const tapHandler = previewPhoto ? `onclick="handleJobRowTap(event, '${job.id}')"` : '';

        return `<tr ${hoverHandlers} ${tapHandler}>
            <td><b>${d}</b></td>
            <td><span class="job-number-hover" style="color:#1e3a8a; font-weight:bold; font-family:monospace;">${job.job_number || 'No-Code'}</span></td>
            <td>${job.customer_name || 'ทั่วไป'}</td>
            <td>${job.item_name || '-'}</td>
            <td><mark style="background:#e0f2fe; color:#0369a1; padding:4px 8px; border-radius:4px; font-weight:600; font-size:12px;">${job.job_type}</mark></td>
            <td><span style="color:${isSent ? '#15803d' : '#d97706'}; font-weight:600;">${isSent ? 'ส่งกลับลูกค้าแล้ว' : 'กำลังดำเนินการ'}</span>${isSent ? `<br><small>วันที่ส่ง: ${sentDate}</small>` : ''}</td>
            <td>👤 ${displayTechName}</td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-primary" style="padding:6px 12px; font-size:12px; background:#475569; cursor:pointer;" onclick="viewFullReport('${job.id}')">📄 รีพอร์ต</button>
                    <button class="btn" style="padding:6px 12px; font-size:12px; background:#0284c7; color:#fff; cursor:pointer;" onclick="openProgressModal('${job.id}')">📝 ดำเนินงานต่อ</button>
                    <button class="btn btn-success" style="padding:6px 12px; font-size:12px; background:#10b981; cursor:pointer; border:none; color:#fff; border-radius:4px;" onclick="openEditModal('${job.id}')">✏️ แก้ไข</button>
                    <button class="btn" style="padding:6px 12px; font-size:12px; background:${isSent ? '#f59e0b' : '#16a34a'}; color:#fff; cursor:pointer;" onclick="${isSent ? `restoreJob('${job.id}')` : `markJobSent('${job.id}')`}">${isSent ? '↩️ เรียกกลับ' : '📦 ส่งกลับลูกค้า'}</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function handleJobRowTap(event, jobId) {
    if (event.target.closest('button, a, input, select, textarea')) return;
    event.stopPropagation();
    const popup = document.getElementById('jobImagePopup');
    if (popup && popup.classList.contains('is-visible')) {
        hideJobImage();
    } else {
        showJobImage(event, jobId);
    }
}

function showJobImage(event, jobId) {
    const photo = jobPreviewPhotos[jobId];
    const popup = document.getElementById('jobImagePopup');
    const image = document.getElementById('jobImagePopupImg');
    const caption = document.getElementById('jobImagePopupCaption');
    if (!photo || !popup || !image) return;

    image.src = photo.photo_url;
    caption.textContent = photo.photo_description || 'รูปภาพประกอบใบงาน';
    popup.classList.add('is-visible');
    popup.setAttribute('aria-hidden', 'false');
    moveJobImage(event);
}

function moveJobImage(event) {
    const popup = document.getElementById('jobImagePopup');
    if (!popup || !popup.classList.contains('is-visible')) return;
    const offset = 18;
    const popupWidth = popup.offsetWidth || 280;
    const popupHeight = popup.offsetHeight || 220;
    const left = Math.min(event.clientX + offset, window.innerWidth - popupWidth - 12);
    const top = Math.min(event.clientY + offset, window.innerHeight - popupHeight - 12);
    popup.style.left = `${Math.max(12, left)}px`;
    popup.style.top = `${Math.max(12, top)}px`;
}

function hideJobImage() {
    const popup = document.getElementById('jobImagePopup');
    if (!popup) return;
    popup.classList.remove('is-visible');
    popup.setAttribute('aria-hidden', 'true');
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
    const statusFilter = document.getElementById('filterStatus').value;

    const hasActiveFilter = (custFilter !== "ALL" || dateStart !== "" || dateEnd !== "" || statusFilter !== "OPEN");

    const filtered = localCachedJobs.filter(job => {
        const matchCustomer = (custFilter === "ALL" || job.customer_name === custFilter);
        const matchStatus = statusFilter === "ALL" || (statusFilter === "SENT" ? job.job_status === 'ส่งกลับลูกค้าแล้ว' : job.job_status !== 'ส่งกลับลูกค้าแล้ว');
        
        const rawDate = job.repair_date || job.created_at;
        if (!rawDate) return false;
        const jobDateStr = new Date(rawDate).toISOString().split('T')[0];
        
        const matchStart = !dateStart || jobDateStr >= dateStart;
        const matchEnd = !dateEnd || jobDateStr <= dateEnd;

        return matchCustomer && matchStatus && matchStart && matchEnd;
    });

    // เรนเดอร์ข้อมูลที่ผ่านการกรองลงตาราง และอัปเดตสถิติตามผลลัพธ์ฟิลเตอร์จริง
    renderTable(filtered, !hasActiveFilter);
}

// เมื่อกดปุ่มรีเซ็ต ให้ตารางกลับมาโชว์ทั้งหมด แต่กล่องสถิติกลับไปนับเฉพาะของวันนี้ตามเดิม
function resetFilters() {
    document.getElementById('filterCustomer').value = "ALL";
    document.getElementById('filterDateStart').value = "";
    document.getElementById('filterDateEnd').value = "";
    document.getElementById('filterStatus').value = "OPEN";
    
    renderTable(localCachedJobs.filter(job => job.job_status !== 'ส่งกลับลูกค้าแล้ว'), true);
}

function todayInputValue() { return new Date().toISOString().split('T')[0]; }

async function markJobSent(id) {
    const result = await Swal.fire({
        title: 'บันทึกการส่งงานกลับลูกค้า',
        html: '<label style="display:block;text-align:left;margin-bottom:6px">วันที่ส่งงาน</label><input id="sentDateInput" type="date" class="swal2-input" style="width:90%;margin:0">',
        showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#16a34a',
        didOpen: () => { document.getElementById('sentDateInput').value = todayInputValue(); }
    });
    if (!result.isConfirmed) return;
    const sentDate = document.getElementById('sentDateInput').value;
    if (!sentDate) return;
    const { error } = await supabaseClient.from('repair_jobs').update({ job_status: 'ส่งกลับลูกค้าแล้ว', sent_date: sentDate }).eq('id', id);
    if (error) return Swal.fire('บันทึกไม่สำเร็จ', error.message, 'error');
    await loadHistoryData();
}

async function restoreJob(id) {
    const result = await Swal.fire({ title: 'เรียกใบงานกลับมาแสดง?', icon: 'question', showCancelButton: true, confirmButtonText: 'เรียกกลับ', cancelButtonText: 'ยกเลิก' });
    if (!result.isConfirmed) return;
    const { error } = await supabaseClient.from('repair_jobs').update({ job_status: 'กำลังดำเนินการ', sent_date: null }).eq('id', id);
    if (error) return Swal.fire('บันทึกไม่สำเร็จ', error.message, 'error');
    await loadHistoryData();
}

async function openProgressModal(id) {
    const job = localCachedJobs.find(item => item.id == id);
    if (!job) return;
    document.getElementById('progressJobId').value = id;
    document.getElementById('progressJobLabel').innerText = `JOB ${job.job_number || '-'} | ${job.customer_name || '-'}`;
    document.getElementById('progressJobNumber').value = job.job_number || '';
    document.getElementById('progressDate').value = todayInputValue();
    document.getElementById('progressQuotationNumber').value = '';
    document.getElementById('progressPoNumber').value = '';
    document.getElementById('progressDeliveryNoteNumber').value = '';
    document.getElementById('progressTechnician').value = job.printed_technician_name || job.technician_name || '';
    document.getElementById('progressDetail').value = '';
    document.getElementById('progressModal').style.display = 'flex';
    await loadProgressEntries(id);
}

function closeProgressModal() { document.getElementById('progressModal').style.display = 'none'; }

async function loadProgressEntries(id) {
    const history = document.getElementById('progressHistory');
    history.innerHTML = 'กำลังโหลดรายการดำเนินงาน...';
    const { data, error } = await supabaseClient.from('job_progress').select('*').eq('job_id', id).order('operation_date', { ascending: false }).order('created_at', { ascending: false });
    if (error) { history.innerHTML = `<span style="color:#ef4444">โหลดรายการไม่สำเร็จ: ${error.message}</span>`; return; }
    history.innerHTML = data && data.length ? data.map(item => `<div style="border-bottom:1px solid #e2e8f0;padding:9px 0"><b>${new Date(`${item.operation_date}T00:00:00`).toLocaleDateString('th-TH')}</b> ${item.technician_name ? `| ${escapeHtml(item.technician_name)}` : ''}<br><small style="color:#475569;line-height:1.8;">JOB: ${escapeHtml(item.job_number) || '-'} | ใบเสนอราคา: ${escapeHtml(item.quotation_number) || '-'} | PO: ${escapeHtml(item.po_number) || '-'} | ใบส่งของ: ${escapeHtml(item.delivery_note_number) || '-'}</small><br>${escapeHtml(item.operation_detail)}</div>`).join('') : '<span style="color:#94a3b8">ยังไม่มีรายการดำเนินงานต่อ</span>';
}

async function saveProgressEntry() {
    const jobId = document.getElementById('progressJobId').value;
    const operationDate = document.getElementById('progressDate').value;
    const jobNumber = document.getElementById('progressJobNumber').value.trim();
    const quotationNumber = document.getElementById('progressQuotationNumber').value.trim();
    const poNumber = document.getElementById('progressPoNumber').value.trim();
    const deliveryNoteNumber = document.getElementById('progressDeliveryNoteNumber').value.trim();
    const detail = document.getElementById('progressDetail').value.trim();
    const technician = document.getElementById('progressTechnician').value.trim();
    if (!operationDate || !detail) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุวันที่และรายละเอียดการดำเนินงาน', 'warning');
    const { error } = await supabaseClient.from('job_progress').insert([{ job_id: jobId, job_number: jobNumber, quotation_number: quotationNumber, po_number: poNumber, delivery_note_number: deliveryNoteNumber, operation_date: operationDate, operation_detail: detail, technician_name: technician }]);
    if (error) return Swal.fire('บันทึกไม่สำเร็จ', error.message, 'error');
    document.getElementById('progressDetail').value = '';
    await loadProgressEntries(jobId);
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
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

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#historyTableBody tr') && !event.target.closest('#jobImagePopup')) {
            hideJobImage();
        }
    });
    
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