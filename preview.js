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
        
        // 2. แกะรหัส ID ใบงานส่งผ่านมาจากหน้า URL (เช่น preview.html?id=43)
        const urlParams = new URLSearchParams(window.location.search);
        const jobId = urlParams.get('id');
        
        if (jobId) {
            fetchSingleJobDetails(jobId);
        } else {
            document.body.innerHTML = `<h2 style="text-align:center; margin-top:50px; color:#ef4444;">⚠️ ไม่พบพารามิเตอร์รหัสใบงานสำหรับการจัดพิมพ์</h2>`;
        }
    } catch (err) {
        console.error("ระบบโหลดพรีวิวขัดข้อง: ", err);
    }
}

// ==========================================
// 📥 ดึงข้อมูลชุดเดี่ยวไร้ปัญหาการซ้อนทับข้อมูล
// ==========================================
async function fetchSingleJobDetails(jobId) {
    try {
        // โหลดข้อมูลหลัก, เช็กลิสต์, และภาพถ่ายประกอบพร้อมกัน (Parallel Fetching) เพื่อประสิทธิภาพ
        const [jobRes, checklistRes, photosRes] = await Promise.all([
            supabaseClient.from('repair_jobs').select('*').eq('id', jobId).single(),
            supabaseClient.from('job_checklists').select('*').eq('job_id', jobId),
            supabaseClient.from('job_photos').select('*').eq('job_id', jobId)
        ]);

        if (jobRes.error) throw jobRes.error;
        const job = jobRes.data;

        if (job) {
            // 📅 แปลงฟอร์แมตวันที่ให้สวยงามเป็นทางการสำหรับหัวรายงาน
            const rawDate = job.repair_date || job.created_at;
            const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('th-TH', {year:'numeric', month:'long', day:'numeric'}) : 'ไม่ระบุวันที่';

            // 🎯 แก้บั๊กหัวกระดาษแหว่ง: ผูกข้อมูลเข้า ID หน้ากากตามโครงสร้าง HTML ใหม่
            document.getElementById('lblJobNumber').innerText = job.job_number || 'No-Code';
            document.getElementById('lblCustomerName').innerText = job.customer_name || 'ทั่วไป';
            document.getElementById('lblRepairDate').innerText = formattedDate;
            document.getElementById('lblJobType').innerText = job.job_type || '-';
            
            // ป้องกันข้อมูลชื่อช่างตกหล่น คัดกรองผ่านคอลัมน์เซฟตี้ทั้งแบบพิมพ์สดและเก็บออโต้
            const displayTechName = job.printed_technician_name || job.technician_name || '-';
            document.getElementById('lblTechName').innerText = displayTechName;
            
            // รายละเอียดของอุปกรณ์วิศวกรรม
            document.getElementById('lblItemName').innerText = job.item_name || '-';
            document.getElementById('lblModel').innerText = job.model || '-';
            document.getElementById('lblQty').innerText = job.quantity || '1';
            document.getElementById('lblDescription').innerText = job.job_description || 'ไม่มีการระบุรายละเอียดเพิ่มเติม';

            // ✍️ โหลดภาพลายเซ็นอิเล็กทรอนิกส์และแมปชื่อข้อความท้ายแผ่นงาน
            if (job.customer_signature_url) {
                document.getElementById('imgCustomerSig').src = job.customer_signature_url;
            }
            document.getElementById('lblCustomerSignName').innerText = `(${job.printed_customer_name || '..........................................'})`;

            if (job.technician_signature_url) {
                document.getElementById('imgTechSig').src = job.technician_signature_url;
            }
            document.getElementById('lblTechSignName').innerText = `(${displayTechName})`;
        }

        // 📋 ประมวลผลและวาดตาราง Checklist ตรวจเช็กระบบ
        const listContainer = document.getElementById('previewChecklistContainer');
        if (listContainer) {
            if (checklistRes.data && checklistRes.data.length > 0) {
                listContainer.innerHTML = checklistRes.data.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.checklist_item}</td>
                        <td style="text-align:center; font-weight:600;">${item.status}</td>
                    </tr>
                `).join('');
            } else {
                listContainer.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#64748b;">ไม่มีรายการเช็กลิสต์ในใบงานนี้</td></tr>`;
            }
        }

        // 📸 ประมวลผลและกระจายรูปภาพวิเคราะห์จุดชำรุดลง Grid กระดาษ
        const photoContainer = document.getElementById('previewPhotosBlock');
        if (photoContainer) {
            if (photosRes.data && photosRes.data.length > 0) {
                photoContainer.innerHTML = photosRes.data.map(p => `
                    <div class="photo-card">
                        <img src="${p.photo_url}">
                        <p class="photo-caption">${p.photo_description || 'รูปภาพประกอบอาการความผิดปกติ'}</p>
                    </div>
                `).join('');
            } else {
                photoContainer.innerHTML = `<p style="color:#64748b; font-size:14px; padding-left:15px;">ไม่มีการแนบรูปภาพประกอบในใบงานนี้</p>`;
            }
        }

    } catch (err) {
        console.error("ดึงรายละเอียดหน้าพรีวิวผิดพลาด: ", err.message);
        // ใช้ Swal แจ้งเตือนข้อผิดพลาดกึ่งกลางหน้าจอ
        Swal.fire({
            icon: 'error',
            title: 'ดึงข้อมูลผิดพลาด',
            text: err.message,
            confirmButtonColor: '#ef4444'
        });
    }
}

// ==========================================
// 🗑️ ฟังก์ชันลบใบงานออกจากระบบคลาวด์ Supabase (เด้งเตือนกึ่งกลางหน้าจอ)
// ==========================================
async function deleteJobData() {
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');
    
    // ดักจับกรณีไม่มี ID ใบงาน
    if (!jobId) {
        Swal.fire({
            icon: 'error',
            title: 'ไม่พบรหัสใบงาน',
            text: 'ไม่พบรหัสใบงานที่ต้องการลบในระบบ',
            confirmButtonColor: '#64748b'
        });
        return;
    }

    // 🔴 คำเตือนชั้นที่ 1: ยืนยันคำสั่งลบหลัก (กึ่งกลางหน้าจอ)
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

    // 🔴 คำเตือนชั้นที่ 2: ดับเบิ้ลเช็กความปลอดภัยป้องกันการกดลั่นหน้างาน
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

    // แสดงสถานะกำลังลบข้อมูล บล็อกปุ่มกดซ้ำ
    Swal.fire({
        title: 'กำลังลบข้อมูล...',
        text: 'โปรดรอสักครู่ ระบบกำลังเคลียร์ฐานข้อมูลคลาวด์',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // ยิงคำสั่งลบไปยังตาราง repair_jobs บน Supabase
        const { error } = await supabaseClient
            .from('repair_jobs')
            .delete()
            .eq('id', jobId);

        if (error) throw error;

        // แจ้งเตือนเมื่อทำงานเสร็จสมบูรณ์
        await Swal.fire({
            icon: 'success',
            title: 'ลบข้อมูลสำเร็จ!',
            text: 'ลบข้อมูลใบงานออกจากระบบคลาวด์เสร็จสิ้น',
            confirmButtonColor: '#0284c7'
        });

        // เด้งย้อนกลับไปยังหน้าแดชบอร์ดหลักขององค์กร
        window.location.href = "index.html";

    } catch (err) {
        // แจ้งเตือนกรณีระบบลบฝั่งเซิร์ฟเวอร์ขัดข้อง
        Swal.fire({
            icon: 'error',
            title: 'ลบข้อมูลล้มเหลว',
            text: 'เนื่องจาก: ' + err.message,
            confirmButtonColor: '#ef4444'
        });
    }
}

// ผูกระบบเริ่มต้นการทำงานเมื่อโหลดหน้าโครงร่างเรียบร้อย
document.addEventListener("DOMContentLoaded", initPreviewSystem);