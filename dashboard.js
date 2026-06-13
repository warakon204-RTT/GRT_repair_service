let supabaseClient = null; 
let localCachedJobs = [];

// ==========================================
// 🚀 เริ่มระบบและเชื่อมต่อฐานข้อมูลแดชบอร์ด
// ==========================================
async function initDashboardSystem() {
    try {
        const res = await fetch('config.json'); 
        const config = await res.json();
        supabaseClient = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
        loadHistoryData();
    } catch (err) { 
        console.error("โหลดสถิติแดชบอร์ดล้มเหลว: ", err); 
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
        
        renderTable(localCachedJobs); 
        setupFilterOptions();
        
        if(document.getElementById('counterTotalJobs')) document.getElementById('counterTotalJobs').innerText = localCachedJobs.length;
        if(document.getElementById('counterCustomers')) document.getElementById('counterCustomers').innerText = [...new Set(localCachedJobs.map(j => j.customer_name))].length;
    } catch (err) { 
        tbody.innerHTML = `<tr><td colspan="7" style="color:#ef4444; text-align:center; font-weight:bold;">❌ โหลดข้อมูลล้มเหลว: ${err.message}</td></tr>`; 
    }
}

// ==========================================
// 📊 วาดตาราง (แก้ไขการส่งค่า job_description ป้องกันข้อความหลุด)
// ==========================================
function renderTable(list) {
    const tbody = document.getElementById('historyTableBody'); if(!tbody) return;
    if(!list || list.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">📭 ไม่พบประวัติข้อมูลใบงานในระบบ</td></tr>`; 
        return; 
    }
    
    tbody.innerHTML = list.map(job => {
        const rawDate = job.repair_date || job.created_at;
        const d = rawDate ? new Date(rawDate).toLocaleDateString('th-TH', {year:'numeric', month:'short', day:'numeric'}) : 'ไม่ระบุวันที่';
        
        // ลำดับความสำคัญในการดึงชื่อช่าง
        const displayTechName = job.printed_technician_name || job.technician_name || '-';
        
        // 🛠️ จุดแก้ไขสำคัญ: เข้ารหัสข้อความรายละเอียดเพิ่มเติม ป้องกันปุ่มแก้ไขพังเมื่อเจอข้อความยาว/เว้นบรรทัด
        const safeDescription = encodeURIComponent(job.job_description || '');
        
        return `<tr>
            <td><b>${d}</b></td>
            <td><span style="color:#1e3a8a; font-weight:bold; font-family:monospace;">${job.job_number || 'No-Code'}</span></td>
            <td>${job.customer_name || 'ทั่วไป'}</td>
            <td>${job.item_name || '-'}</td>
            <td><mark style="background:#e0f2fe; color:#0369a1; padding:4px 8px; border-radius:4px; font-weight:600; font-size:12px;">${job.job_type}</mark></td>
            <td>👤 ${displayTechName}</td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-primary" style="padding:6px 12px; font-size:12px; background:#475569;" onclick="viewFullReport('${job.id}')">📄 รีพอร์ต</button>
                    <button class="btn btn-success" style="padding:6px 12px; font-size:12px; background:var(--accent-color);" onclick="openEditModal('${job.id}', \`${job.customer_name}\`, \`${job.job_type}\`, \`${displayTechName}\`, '${safeDescription}')">✏️ แก้ไข</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ==========================================
// ✏️ ระบบ Modal (จัดการเปิด-ปิด และบันทึกข้อมูลแก้ไข)
// ==========================================
function viewFullReport(jobId) { window.open(`preview.html?id=${jobId}`, '_blank'); }

// ✅ ดึงรายละเอียดเดิมมากางแสดงผลในช่องกรอกได้ถูกต้อง ไร้รอยต่อ
function openEditModal(id, cust, type, tech, desc) {
    document.getElementById('editJobId').value = id; 
    document.getElementById('editCustomerName').value = cust; 
    document.getElementById('editJobType').value = type; 
    document.getElementById('editTechName').value = tech;
    
    // 🛠️ โหลดข้อความรายละเอียดที่เคยพิมพ์ไว้กลับคืนมาแสดง
    const descInput = document.getElementById('editDescription');
    if (descInput) {
        // ถอดรหัสข้อความให้กลับมาเป็นอักขระปกติ เว้นบรรทัดได้เหมือนเดิม
        descInput.value = desc ? decodeURIComponent(desc) : '';
    }
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() { 
    document.getElementById('editModal').style.display = 'none'; 
}

// 💾 อัปเดตข้อมูลที่แก้ไขลงสู่คอลัมน์บนฐานข้อมูล Supabase
async function updateJobData() {
    try {
        const id = document.getElementById('editJobId').value;
        const { error } = await supabaseClient
            .from('repair_jobs')
            .update({ 
                customer_name: document.getElementById('editCustomerName').value, 
                job_type: document.getElementById('editJobType').value, 
                printed_technician_name: document.getElementById('editTechName').value,
                job_description: document.getElementById('editDescription').value
            })
            .eq('id', id);
            
        if(error) throw error; 
        alert("🎉 บันทึกข้อมูลสำเร็จ!"); 
        closeEditModal(); 
        loadHistoryData();
    } catch(err) { 
        alert("ล้มเหลว: " + err.message); 
    }
}

// ==========================================
// 🔍 ระบบกรองข้อมูลข้อมูล (Filters)
// ==========================================
function filterData() {
    const custFilter = document.getElementById('filterCustomer').value;
    const dateStart = document.getElementById('filterDateStart').value;
    const dateEnd = document.getElementById('filterDateEnd').value;

    const filtered = localCachedJobs.filter(job => {
        const matchCustomer = (custFilter === "ALL" || job.customer_name === custFilter);
        
        const jobDate = new Date(job.repair_date || job.created_at);
        const matchStart = !dateStart || jobDate >= new Date(dateStart);
        const matchEnd = !dateEnd || jobDate <= new Date(dateEnd);

        return matchCustomer && matchStart && matchEnd;
    });

    renderTable(filtered);
}

function resetFilters() {
    document.getElementById('filterCustomer').value = "ALL";
    document.getElementById('filterDateStart').value = "";
    document.getElementById('filterDateEnd').value = "";
    
    renderTable(localCachedJobs);
}

function setupFilterOptions() {
    const select = document.getElementById('filterCustomer');
    if (!select) return;
    const names = [...new Set(localCachedJobs.map(j => j.customer_name).filter(n => n))];
    
    select.innerHTML = '<option value="ALL">แสดงทั้งหมด</option>' + 
        names.map(n => `<option value="${n}">${n}</option>`).join('');
}

// ผูกเข้าทำงานเมื่อเปิดหน้าเว็บโหลด DOM เสร็จสิ้น
document.addEventListener("DOMContentLoaded", () => initDashboardSystem());