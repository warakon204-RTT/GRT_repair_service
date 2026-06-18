let supabaseClient = null;

// ==========================================
// 🚀 ฟังก์ชันสตาร์ทระบบเชื่อมต่อระบบเอกสารพรีวิว
// ==========================================
async function initPreviewSystem() {
    try {
        // 1. อ่านการตั้งค่า Key จากระบบกลาง
        const res = await fetch('config.json');
        const config = await res.json();
        supabaseClient = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
        
        // 2. แกะรหัส ID ใบงานส่งผ่านมาจากหน้า URL (เช่น preview.html?id=60)
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        
        if (urlId) {
            fetchSingleJobDetails(urlId);
        } else {
            document.body.innerHTML = `<h2 style="text-align:center; margin-top:50px; color:#ef4444;">⚠️ ไม่พบพารามิเตอร์รหัสใบงานสำหรับการจัดพิมพ์</h2>`;
        }
    } catch (err) {
        console.error("ระบบโหลดพรีวิวขัดข้อง: ", err);
        Swal.fire({
            icon: 'error',
            title: 'เชื่อมต่อระบบล้มเหลว',
            text: 'ไม่สามารถโหลดไฟล์ตั้งค่าระบบกลางได้',
            confirmButtonColor: '#ef4444'
        });
    }
}

// ==========================================
// 📥 ดึงข้อมูลเวอร์ชันอัจฉริยะกู้คืนตามพฤติกรรมการส่ง ID (Smart Cross-Query)
// ==========================================
async function fetchSingleJobDetails(urlId) {
    try {
        let job = null;
        console.log(`🤖 กำลังวิเคราะห์ข้อมูลพรีวิวสำหรับ URL ID: ${urlId}`);

        // 🟢 [ชั้นที่ 1] ลองดึงจากตารางแม่ (repair_jobs) ตรงๆ เผื่อกรณี URL ส่งไอดีแม่มาถูกต้อง
        const jobRes = await supabaseClient.from('repair_jobs').select('*').eq('id', urlId).maybeSingle();
        
        if (jobRes.data) {
            job = jobRes.data;
            console.log("🎯 Match ชั้นที่ 1: ตรวจพบว่าเป็น ID ของตารางแม่โดยตรง");
        } else {
            // 🟡 [ชั้นที่ 2] บั๊กแก้ทาง! ถ้าค้นหาตารางแม่ไม่เจอ แปลว่าหน้าแรกส่ง ID ของตารางลูก (Checklist) มาสลับกัน
            console.warn("⚠️ ไม่เจอข้อมูลในตารางแม่ กำลังเข้าโหมด Cross-Query เช็กตารางเช็กลิสต์...");
            
            const crossChecklistRes = await supabaseClient.from('job_checklists').select('job_id').eq('id', urlId).maybeSingle();
            
            let realJobId = null;
            if (crossChecklistRes.data && crossChecklistRes.data.job_id) {
                realJobId = crossChecklistRes.data.job_id;
            } else {
                // เผื่อกรณีระบบหยิบ ID จากตารางรูปภาพมาส่งแทน
                const crossPhotosRes = await supabaseClient.from('job_photos').select('job_id').eq('id', urlId).maybeSingle();
                if (crossPhotosRes.data && crossPhotosRes.data.job_id) {
                    realJobId = crossPhotosRes.data.job_id;
                }
            }

            // เมื่อได้ไอดีตารางแม่ที่แท้จริงแล้ว ให้ดึงข้อมูลตารางแม่อีกครั้งหนึ่ง
            if (realJobId) {
                console.log(`🔍 พบไอดีตารางแม่ที่แท้จริงคือ job_id: ${realJobId} (แปลงมาจากไอดีสลับ: ${urlId})`);
                const finalJobRes = await supabaseClient.from('repair_jobs').select('*').eq('id', realJobId).maybeSingle();
                if (finalJobRes.data) {
                    job = finalJobRes.data;
                }
            }
        }

        // 🚨 แจ้งเตือนกรณีที่ตามหาในฐานข้อมูลทุกวิถีทางแล้วไม่เจอจริงๆ
        if (!job) {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่พบข้อมูลใบงาน',
                text: 'ไม่พบรหัสเอกสารนี้ในฐานข้อมูล กรุณาตรวจสอบการกดลิงก์มาจากหน้าหลัก',
                confirmButtonColor: '#64748b'
            }).then(() => { window.location.href = "index.html"; });
            return;
        }

        const targetJobId = job.id; 
        const targetJobNumber = job.job_number; // เลขใบงาน เช่น GRT-2026...

        // 3. โหลดรายการเช็กลิสต์ และภาพถ่ายประกอบโดยใช้ targetJobId ตัวจริงแบบคู่ขนาน (Parallel)
        const [checklistRes, photosRes] = await Promise.all([
            supabaseClient.from('job_checklists').select('*').eq('job_id', targetJobId).order('id', { ascending: true }),
            supabaseClient.from('job_photos').select('*').eq('job_id', targetJobId).order('id', { ascending: true })
        ]);

        // 📅 แปลงฟอร์แมตวันที่ให้สวยงาม
        const rawDate = job.repair_date || job.created_at;
        const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('th-TH', {year:'numeric', month:'long', day:'numeric'}) : 'ไม่ระบุวันที่';

        // ทำความสะอาดคัดกรองคำขยะประเภทสตริงคำว่า 'EMPTY' หรือ 'NULL' ของตารางแม่
        const cleanCustomerName = (job.customer_name && job.customer_name !== 'EMPTY') ? job.customer_name : 'ทั่วไป';
        const cleanItemName = (job.item_name && job.item_name !== 'EMPTY') ? job.item_name : '-';
        const cleanModel = (job.model && job.model !== 'EMPTY') ? job.model : '-';
        const cleanDescription = (job.job_description && job.job_description !== 'EMPTY') ? job.job_description : 'ไม่มีการระบุรายละเอียดเพิ่มเติม';

        // คัดกรองตัวแปรชื่อช่างและลายเซ็นรายงานให้ตรงแถว
        const headerTechName = (job.printed_technician_name && job.printed_technician_name !== 'EMPTY') ? job.printed_technician_name : (job.technician_name || '-');
        const footerCustomerName = (job.printed_customer_name && job.printed_customer_name !== 'EMPTY') ? job.printed_customer_name : '..........................................';
        const footerTechName = (job.printed_technician_name && job.printed_technician_name !== 'EMPTY') ? job.printed_technician_name : '..........................................';

        // 🎯 ผูกข้อมูลเข้า ID หน้ากากตามโครงสร้าง HTML ของระบบ
        document.getElementById('lblJobNumber').innerText = targetJobNumber || 'No-Code';
        document.getElementById('lblCustomerName').innerText = cleanCustomerName;
        document.getElementById('lblRepairDate').innerText = formattedDate;
        document.getElementById('lblJobType').innerText = job.job_type || '-';
        document.getElementById('lblTechName').innerText = headerTechName;
        
        document.getElementById('lblItemName').innerText = cleanItemName;
        document.getElementById('lblModel').innerText = cleanModel;
        document.getElementById('lblQty').innerText = job.quantity || '1';
        document.getElementById('lblDescription').innerText = cleanDescription;

        // ✍️ โหลดภาพลายเซ็นอิเล็กทรอนิกส์ฝั่งลูกค้า
        const imgCustomerSig = document.getElementById('imgCustomerSig');
        if (job.customer_signature_url && job.customer_signature_url !== 'EMPTY' && job.customer_signature_url !== 'NULL') {
            imgCustomerSig.src = job.customer_signature_url;
            imgCustomerSig.style.display = 'block';
        } else {
            imgCustomerSig.style.display = 'none';
        }
        document.getElementById('lblCustomerSignName').innerText = `(${footerCustomerName})`;

        // ✍️ โหลดภาพลายเซ็นอิเล็กทรอนิกส์ฝั่งช่าง
        const imgTechSig = document.getElementById('imgTechSig');
        if (job.technician_signature_url && job.technician_signature_url !== 'EMPTY' && job.technician_signature_url !== 'NULL') {
            imgTechSig.src = job.technician_signature_url;
            imgTechSig.style.display = 'block';
        } else {
            imgTechSig.style.display = 'none';
        }
        document.getElementById('lblTechSignName').innerText = `(${footerTechName})`;

        // 📋 ประมวลผลและวาดตาราง Checklist ตรวจเช็กระบบเฉพาะของใบงานนี้
        const listContainer = document.getElementById('previewChecklistContainer');
        if (listContainer) {
            if (checklistRes.data && checklistRes.data.length > 0) {
                listContainer.innerHTML = checklistRes.data.map((item, index) => {
                    // 🟢 ล้างค่าขยะ 'EMPTY' หรือ 'NULL' ในตารางลูก (Checklist) ไม่ให้บล็อกการแสดงผล
                    const rawStatus = item.status ? item.status.trim() : '';
                    const rawRemarks = item.remarks ? item.remarks.trim() : '';

                    const statusText = (rawStatus !== 'EMPTY' && rawStatus !== 'NULL') ? rawStatus : '-';
                    const remarksText = (rawRemarks !== 'EMPTY' && rawRemarks !== 'NULL') ? rawRemarks : '-';

                    // เช็กสถานะข้อความเพื่อกำหนดสีตัวอักษร
                    const isPassed = ['ปกติ', 'ผ่าน', 'ครบถ้วน', 'pass', 'ok'].includes(statusText.toLowerCase());
                    const statusColor = isPassed ? '#16a34a' : (statusText === '-' ? '#64748b' : '#dc2626');

                    return `
                        <tr>
                            <td style="text-align:center;">${index + 1}</td>
                            <td style="font-weight: 500;">${escapeHtml(item.checklist_item)}</td>
                            <td style="text-align:center; font-weight:600; color:${statusColor};">${escapeHtml(statusText)}</td>
                            <td>${escapeHtml(remarksText)}</td> </tr>
                    `;
                }).join('');
            } else {
                // 💡 ปรับให้ขยายคลุมพื้นที่ตารางทั้งหมดแบบ 4 คอลัมน์เต็ม (colspan="4")
                listContainer.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b; padding: 20px 0;">ไม่มีรายการเช็กลิสต์ในใบงานนี้ (job_id: ${targetJobId})</td></tr>`;
            }
        }

        // 📸 ประมวลผลและกระจายรูปภาพวิเคราะห์จุดชำรุดลง Grid เฉพาะของใบงานนี้
        const photoContainer = document.getElementById('previewPhotosBlock');
        if (photoContainer) {
            if (photosRes.data && photosRes.data.length > 0) {
                photoContainer.innerHTML = photosRes.data.map(p => `
                    <div class="photo-card">
                        <img src="${p.photo_url}" onerror="this.src='https://placehold.co/500x350?text=No+Image'">
                        <p class="photo-caption">${escapeHtml(p.photo_description) || 'รูปภาพประกอบอาการความผิดปกติ'}</p>
                    </div>
                `).join('');
            } else {
                photoContainer.innerHTML = `<p style="color:#64748b; font-size:14px; padding: 10px 5px; grid-column: 1 / -1;">ไม่มีการแนบรูปภาพประกอบในใบงานนี้</p>`;
            }
        }

    } catch (err) {
        console.error("ดึงรายละเอียดหน้าพรีวิวผิดพลาด: ", err.message);
        Swal.fire({
            icon: 'error',
            title: 'ดึงข้อมูลผิดพลาด',
            text: err.message,
            confirmButtonColor: '#ef4444'
        });
    }
}

// ==========================================
// 🗑️ ฟังก์ชันลบใบงานออกจากระบบคลาวด์ Supabase อย่างปลอดภัย (รองรับ ID สลับตาราง)
// ==========================================
async function deleteJobData() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlId = urlParams.get('id');
    
    if (!urlId) {
        Swal.fire({ icon: 'error', title: 'ไม่พบรหัสใบงาน', text: 'ไม่พบรหัสใบงานที่ต้องการลบในระบบ' });
        return;
    }

    const firstCheck = await Swal.fire({
        title: 'คุณแน่ใจหรือไม่ที่จะลบ?',
        text: "เมื่อลบแล้ว ข้อมูลใบงานรวมถึงภาพถ่ายจะหายไปถาวร ไม่สามารถกู้คืนได้!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'ใช่, ฉันต้องการลบ',
        cancelButtonText: 'ยกเลิก'
    });

    if (!firstCheck.isConfirmed) return;

    const secondCheck = await Swal.fire({
        title: 'ยืนยันคำสั่งลบครั้งสุดท้าย?',
        text: "กรุณายืนยันอีกครั้งเพื่อลบข้อมูลใบงานนี้ออกจากระบบคลาวด์อย่างถาวร",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: '🚨 ยืนยันลบถาวร',
        cancelButtonText: 'เปลี่ยนใจยกเลิก'
    });

    if (!secondCheck.isConfirmed) return;

    Swal.fire({
        title: 'กำลังลบข้อมูล...',
        text: 'โปรดรอสักครู่ ระบบกำลังเคลียร์ฐานข้อมูลคลาวด์',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        let finalDeleteId = urlId;
        const checkJob = await supabaseClient.from('repair_jobs').select('id').eq('id', urlId).maybeSingle();
        
        if (!checkJob.data) {
            const checkFromChecklist = await supabaseClient.from('job_checklists').select('job_id').eq('id', urlId).maybeSingle();
            if (checkFromChecklist.data && checkFromChecklist.data.job_id) {
                finalDeleteId = checkFromChecklist.data.job_id;
            }
        } else {
            finalDeleteId = checkJob.data.id;
        }

        await supabaseClient.from('job_checklists').delete().eq('job_id', finalDeleteId);
        await supabaseClient.from('job_photos').delete().eq('job_id', finalDeleteId);

        const { error } = await supabaseClient.from('repair_jobs').delete().eq('id', finalDeleteId);
        if (error) throw error;

        await Swal.fire({
            icon: 'success',
            title: 'ลบข้อมูลสำเร็จ!',
            text: 'ลบข้อมูลใบงานออกจากระบบคลาวด์เสร็จสิ้น',
            confirmButtonColor: '#0284c7'
        });

        window.location.href = "index.html";

    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'ลบข้อมูลล้มเหลว',
            text: 'เนื่องจาก: ' + err.message,
            confirmButtonColor: '#ef4444'
        });
    }
}

// ==========================================
// 🛡️ ฟังก์ชันช่วยแปลงอักขระพิเศษเพื่อความปลอดภัย (Prevent XSS Injection)
// ==========================================
function escapeHtml(string) {
    if (!string) return '';
    const matchHtmlRegExp = /["'&<>]/;
    const str = '' + string;
    const match = matchHtmlRegExp.exec(str);
    if (!match) return str;
    
    let escape; let html = ''; let index = 0; let lastIndex = 0;
    for (index = match.index; index < str.length; index++) {
        switch (str.charCodeAt(index)) {
            case 34: escape = '&quot;'; break; // "
            case 38: escape = '&amp;'; break;  // &
            case 39: escape = '&#39;'; break;  // '
            case 60: escape = '&lt;'; break;   // <
            case 62: escape = '&gt;'; break;   // >
            default: continue;
        }
        if (lastIndex !== index) html += str.substring(lastIndex, index);
        lastIndex = index + 1; html += escape;
    }
    return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}

document.addEventListener("DOMContentLoaded", initPreviewSystem);