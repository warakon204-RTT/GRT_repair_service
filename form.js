let supabaseClient = null;
let photoBlockCount = 1;
let partCount = 0;

// ==========================================
// 🆔 ฟังก์ชันรันเลขที่ใบงานอัตโนมัติ (GRT-YYYYMMDD-XXXX)
// ==========================================
function generateJobNumber() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); 
    const dd = String(today.getDate()).padStart(2, '0');
    
    const dateStr = `${yyyy}${mm}${dd}`; 
    const randomNum = Math.floor(1000 + Math.random() * 9000); 
    const finalJobNumber = `GRT-${dateStr}-${randomNum}`;
    
    const jobInput = document.getElementById('jobUUID');
    if (jobInput) {
        jobInput.value = finalJobNumber;
        jobInput.readOnly = true; 
        jobInput.style.background = "#f1f5f9"; 
        jobInput.style.color = "#1e3a8a";
        jobInput.style.fontWeight = "bold";
    }
}

// ==========================================
// 🚀 เริ่มระบบและเชื่อมต่อฐานข้อมูลคลาวด์
// ==========================================
async function initFormSystem() {
    try {
        const res = await fetch('config.json');
        const config = await res.json();
        supabaseClient = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
        setupFormCanvases();
    } catch (err) { 
        console.error("บูตระบบฟอร์มพลาด: ", err); 
        Swal.fire({
            icon: 'error',
            title: 'การเชื่อมต่อขัดข้อง',
            text: 'ไม่สามารถโหลดไฟล์ตั้งค่าระบบคลาวด์ได้ กรุณาติดต่อผู้ดูแลระบบ',
            confirmButtonColor: '#ef4444'
        });
    }
}

function setupFormCanvases() {
    initCanvasDrawing('customerSigCanvas', '#0f172a', 3.5); 
    initCanvasDrawing('techSigCanvas', '#0f172a', 3.5);    
    initCanvasDrawing('markupCanvas_1', 'red', 4);  
}

// ==========================================
// ✍️ ระบบคำนวณพิกัดและวาดเส้นลื่นไหล (รองรับ Touch Screen หน้างาน)
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
    
    canvas.addEventListener('mousedown', (e) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
    canvas.addEventListener('mousemove', (e) => { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineWidth = thickness; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.lineTo(p.x, p.y); ctx.stroke(); });
    canvas.addEventListener('mouseup', () => drawing = false);
    
    canvas.addEventListener('touchstart', (e) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }, {passive: false});
    canvas.addEventListener('touchmove', (e) => { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineWidth = thickness; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.lineTo(p.x, p.y); ctx.stroke(); }, {passive: false});
    canvas.addEventListener('touchend', () => drawing = false);
}

// ==========================================
// 📋 ฟังก์ชันสร้างแถว Checklist (Dynamic Rows)
// ==========================================
function createChecklistRow(itemText = "") {
    const container = document.getElementById('checklistContainer'); if (!container) return;
    const num = container.querySelectorAll('.checklist-row').length + 1;
    const row = document.createElement('div'); 
    row.className = 'checklist-row';
    
    row.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center; width:100%;">
            <b style="color:var(--text-muted); min-width:20px;">${num}.</b>
            <input type="text" class="check-item-input" value="${itemText}" style="flex:2;" placeholder="ระบุรายการตรวจสอบ">
            <select class="check-status-input" style="width: auto; min-width: 120px;">
                <option value="ปกติ">✅ ปกติ</option>
                <option value="พบปัญหา">❌ พบปัญหา</option>
                <option value="ไม่ได้ตรวจสอบ">⚪ N/A</option>
            </select>
            <button type="button" class="btn-danger-sm" onclick="this.parentElement.parentElement.remove(); reindexChecklist();" style="height:42px; width:42px; padding:0; display:flex; justify-content:center; align-items:center;">🗑️</button>
        </div>
        <input type="text" class="check-details-input" placeholder="ระบุหมายเหตุความผิดปกติเพิ่มเติม (ถ้ามี)..." style="margin-top:8px; border:1px dashed var(--border-color); background:transparent;">`;
    container.appendChild(row);
}

function reindexChecklist() {
    document.querySelectorAll('#checklistContainer .checklist-row').forEach((row, index) => {
        const bTag = row.querySelector('b');
        if(bTag) bTag.innerText = `${index + 1}.`;
    });
}

// ==========================================
// 📸 โหลดรูปภาพและจัดการ Canvas มาร์กจุดเสีย
// ==========================================
function handleImageUpload(input, canvasId) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image(); img.onload = function() {
            const cvs = document.getElementById(canvasId); const ctx = cvs.getContext('2d');
            ctx.clearRect(0,0,cvs.width,cvs.height); ctx.drawImage(img,0,0,cvs.width,cvs.height);
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
}

function clearCanvasContent(canvasId) {
    const cvs = document.getElementById(canvasId); if(!cvs) return;
    cvs.getContext('2d').clearRect(0,0,cvs.width,cvs.height);
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
// 🚀 ฟังก์ชันส่งข้อมูลรวมศูนย์ขึ้นระบบคลาวด์ Supabase
// ==========================================
async function submitRepairJob() {
    try {
        const cSel = document.getElementById('customerSelect').value;
        const customerName = (cSel === "OTHER") ? document.getElementById('customerNameOther').value : cSel;
        const jSel = document.getElementById('jobTypeSelect').value;
        const jobNum = document.getElementById('jobUUID').value;
        
        // 1. ตรวจสอบชื่อลูกค้าและเลขใบงาน
        if(!customerName || !jobNum) { 
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณากรอกชื่อลูกค้าและเลขใบงานให้ครบถ้วนก่อนทำการบันทึก',
                confirmButtonColor: '#f59e0b'
            });
            return; 
        }

        // 2. บังคับเลือก "ประเภทงาน"
        if(!jSel || jSel === "") {
            Swal.fire({
                icon: 'warning',
                title: 'ยังไม่ได้เลือกประเภทงาน',
                text: 'กรุณาเลือกประเภทงานก่อนบันทึกข้อมูลครับ',
                confirmButtonColor: '#f59e0b'
            }).then(() => {
                document.getElementById('jobTypeSelect').focus();
            });
            return;
        }

        // กรณีเลือกประเภทงานเป็น อื่นๆ ต้องเช็กว่าพิมพ์ระบุหรือไม่
        const jobType = (jSel === "OTHER") ? document.getElementById('jobTypeOther').value : jSel;
        if(jSel === "OTHER" && !jobType.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'โปรดระบุประเภทงาน',
                text: 'คุณเลือกประเภทงานเป็น "อื่นๆ" กรุณาระบุชื่อประเภทงานลงในช่องกรอกด้วยครับ',
                confirmButtonColor: '#f59e0b'
            }).then(() => {
                document.getElementById('jobTypeOther').focus();
            });
            return;
        }

        // 3. ตรวจสอบการเลือกสถานะชิ้นส่วนและอะไหล่
        const partsStatusRadio = document.querySelector('input[name="partsStatus"]:checked');
        if (!partsStatusRadio) {
            Swal.fire({
                icon: 'warning',
                title: 'ผลตรวจสอบชิ้นส่วนว่าง',
                text: 'กรุณาเลือกผลการตรวจสอบชิ้นส่วนและอะไหล่ก่อนบันทึกข้อมูล',
                confirmButtonColor: '#f59e0b'
            }).then(() => {
                const targetElement = document.querySelector('input[name="partsStatus"]');
                if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            return;
        }

        const partsStatus = partsStatusRadio.value;

        // กรณีเลือก "ไม่ครบ" ต้องเช็กต่อว่าระบุรายการไว้ไหม
        if (partsStatus === "ไม่ครบ") {
            const partInputs = document.querySelectorAll('.part-item-input');
            let hasText = false;
            partInputs.forEach(input => {
                if (input.value.trim() !== "") hasText = true;
            });

            if (!hasText) {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณาระบุรายการอะไหล่ขาด',
                    text: 'คุณระบุสถานะ "ไม่ครบถ้วน" กรุณากรอกรายการชิ้นส่วนอะไหล่ที่ขาดหายอย่างน้อย 1 รายการ',
                    confirmButtonColor: '#f59e0b'
                }).then(() => {
                    if (partInputs.length > 0) partInputs[0].focus();
                });
                return;
            }
        }

        // 🌟 เปลี่ยนยืนยันการบันทึกมาอยู่กึ่งกลางจอด้วย SweetAlert2 แบบมีปุ่มกดเลือก
        const confirmResult = await Swal.fire({
            title: 'ยืนยันการบันทึกเอกสาร?',
            text: 'ระบบจะทำการส่งข้อมูลและไฟล์ทั้งหมดขึ้นคลาวด์องค์กร',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#64748b',
            confirmButtonText: '📥 ยืนยันบันทึก',
            cancelButtonText: 'ยกเลิก'
        });

        if (!confirmResult.isConfirmed) return;

        const submitBtn = document.getElementById('btnSubmitJob');
        submitBtn.disabled = true;
        submitBtn.innerText = "⏳ กำลังอัปโหลดข้อมูลและภาพถ่าย...";

        // ⏳ เปิดหน้าต่าง Loading กึ่งกลางจอระหว่างดำเนินการอัปโหลดป้องกัน User กดซ้ำ
        Swal.fire({
            title: 'กำลังนำส่งข้อมูล...',
            text: 'กรุณารอสักครู่ ระบบกำลังอัปโหลดไฟล์ภาพและสร้างเอกสารวิศวกรรม',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // อัปโหลดรูปภาพลายเซ็นคู่
        const custSigUrl = await uploadCanvasToStorage('customerSigCanvas', `${customerName}/${jobNum}/signature_customer.png`);
        const techSigUrl = await uploadCanvasToStorage('techSigCanvas', `${customerName}/${jobNum}/signature_technician.png`);

        // ยิงข้อมูลหลักเข้าตาราง 'repair_jobs'
        const { data: jData, error: jErr } = await supabaseClient.from('repair_jobs').insert([{
            job_number: jobNum, 
            customer_name: customerName, 
            job_type: jobType, 
            customer_signature_url: custSigUrl, 
            technician_signature_url: techSigUrl,
            repair_date: new Date().toISOString().split('T')[0], 
            printed_customer_name: document.getElementById('printedCustomerName').value, 
            printed_technician_name: document.getElementById('printedTechName').value,
            item_name: document.getElementById('addItemName').value, 
            model: document.getElementById('addItemModel').value, 
            quantity: parseInt(document.getElementById('addItemQty').value)||1,
            job_description: document.getElementById('addJobDescription').value
        }]).select();
        
        if(jErr) throw jErr;
        const jobId = jData[0].id; 
        const batch = [];

        // รายการ Checklist หน้างาน
        document.querySelectorAll('.checklist-row').forEach(row => {
            const item = row.querySelector('.check-item-input').value;
            const status = row.querySelector('.check-status-input').value;
            const note = row.querySelector('.check-details-input').value;
            if(item) batch.push({ job_id: jobId, checklist_item: item, status: note ? `${status} (${note})` : status });
        });

        // บันทึกข้อมูลอะไหล่ขาด/ไม่ครบถ้วน
        if (partsStatus === "ไม่ครบ") {
            const partsNotes = document.getElementById('partsNotes').value;
            document.querySelectorAll('.part-item-input').forEach(input => {
                if (input.value.trim() !== "") { 
                    batch.push({ 
                        job_id: jobId, 
                        checklist_item: `[อะไหล่ขาด]: ${input.value}`, 
                        status: "ไม่ครบ",
                        remarks: partsNotes 
                    });
                }
            });
        } else {
            batch.push({
                job_id: jobId,
                checklist_item: "ตรวจสอบชิ้นส่วนอะไหล่และอุปกรณ์",
                status: "ครบถ้วน"
            });
        }

        if(batch.length > 0) {
            const { error: bErr } = await supabaseClient.from('job_checklists').insert(batch);
            if(bErr) throw bErr;
        }

        // วนลูปอัปโหลดรูปถ่ายประกอบหน้างาน
        const blocks = document.querySelectorAll('.photo-block');
        for(let i=0; i<blocks.length; i++) {
            const cvs = blocks[i].querySelector('canvas'); 
            const descInput = blocks[i].querySelector('.photo-desc-input');
            const desc = descInput ? descInput.value : '';
            
            if(cvs) {
                const url = await uploadCanvasToStorage(cvs.id, `${customerName}/${jobNum}/photo_${i+1}.png`);
                if(url) {
                    await supabaseClient.from('job_photos').insert([{ 
                        job_id: jobId, 
                        photo_url: url, 
                        photo_description: desc || `รูปภาพที่ ${i+1}` 
                    }]);
                }
            }
        }
        
        // 🌟 ปิดหน้า Loading และแสดงกล่องสำเร็จอยู่กึ่งกลางจอ
        Swal.fire({
            icon: 'success',
            title: 'บันทึกข้อมูลเสร็จสิ้น!',
            text: 'ประวัติใบงานและไฟล์ตรวจสอบได้รับการจัดเก็บลงคลาวด์องค์กรแล้ว',
            confirmButtonColor: '#10b981'
        }).then(() => {
            window.location.href = "index.html"; 
        });
        
    } catch(err) { 
        console.error(err);
        Swal.fire({
            icon: 'error',
            title: 'ระบบเกิดข้อผิดพลาด',
            text: 'ไม่สามารถบันทึกข้อมูลได้เนื่องจาก: ' + err.message,
            confirmButtonColor: '#ef4444'
        });
        const submitBtn = document.getElementById('btnSubmitJob');
        submitBtn.disabled = false; 
        submitBtn.innerText = "🚀 บันทึกประวัติส่งคลาวด์องค์กร";
    }
}

// ==========================================
// 🔄 ฟังก์ชันรีเฟรชหน้าฟอร์มกรอกข้อมูลใหม่
// ==========================================
async function refreshForm() {
    const result = await Swal.fire({
        title: 'ล้างข้อมูลฟอร์ม?',
        text: 'คุณต้องการล้างข้อมูลทั้งหมดในฟอร์มนี้เพื่อเริ่มกรอกใหม่ ใช่หรือไม่? (ข้อมูลที่ยังไม่ถูกบันทึกจะสูญหาย)',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: '🔄 ใช่, ล้างข้อมูลใหม่',
        cancelButtonText: 'กรอกต่อ'
    });

    if (result.isConfirmed) {
        window.location.reload();
    }
}

// ==========================================
// 🌐 DOMContentLoaded Setup (ผูกระบบเหตุการณ์)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    generateJobNumber();
    initFormSystem();
    
    document.getElementById('btnSubmitJob').addEventListener('click', submitRepairJob);
    
    document.getElementById('customerSelect').addEventListener('change', (e) => {
        const target = document.getElementById('customerNameOther');
        target.classList.toggle('hidden-input', e.target.value !== 'OTHER');
        if(e.target.value !== 'OTHER') target.value = '';
    });
    
    document.getElementById('jobTypeSelect').addEventListener('change', (e) => {
        const target = document.getElementById('jobTypeOther');
        target.classList.toggle('hidden-input', e.target.value !== 'OTHER');
        if(e.target.value !== 'OTHER') target.value = '';
    });
    
    document.querySelectorAll('input[name="partsStatus"]').forEach(r => r.addEventListener('change', (e) => {
        const container = document.getElementById('missingPartsContainer');
        if (e.target.value === 'ไม่ครบ') {
            container.classList.remove('hidden-input'); 
            if(document.getElementById('partsList').children.length === 0) {
                partCount++; 
                const div = document.createElement('div'); 
                div.className = 'parts-row';
                div.style.display = 'flex';
                div.style.gap = '8px';
                div.style.marginTop = '5px';
                div.innerHTML = `
                    <input type="text" class="part-item-input" placeholder="ระบุรายการอะไหล่ขาด" style="flex:1;">
                    <button type="button" class="btn-danger-sm" onclick="this.parentElement.remove()" style="background:#ef4444; color:white; border:none; padding:5px 10px; cursor:pointer;">🗑️</button>
                `; 
                document.getElementById('partsList').appendChild(div);
            }
        } else {
            container.classList.add('hidden-input'); 
        }
    }));
    
    document.getElementById('btnAddPart').addEventListener('click', () => { 
        partCount++; 
        const div = document.createElement('div');
        div.className = 'parts-row'; 
        div.style.display = 'flex';
        div.style.gap = '8px';
        div.style.marginTop = '5px';
        div.innerHTML = `
            <input type="text" class="part-item-input" placeholder="ระบุรายการอะไหล่ขาด" style="flex:1;">
            <button type="button" class="btn-danger-sm" onclick="this.parentElement.remove()" style="background:#ef4444; color:white; border:none; padding:5px 10px; cursor:pointer;">🗑️</button>
        `;
        document.getElementById('partsList').appendChild(div); 
    });
    
    document.getElementById('btnAddPhotoBlock').addEventListener('click', () => {
        photoBlockCount++; 
        const block = document.createElement('div'); 
        block.className = 'photo-block';
        block.style.cssText = "background: rgba(255, 255, 255, 0.6); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); margin-top:15px;";
        
        block.innerHTML = `
            <input type="file" accept="image/*" onchange="handleImageUpload(this, 'markupCanvas_${photoBlockCount}')" style="height: auto; border: none; padding: 0; background: transparent;">
            <div class="canvas-wrapper" style="margin-top:12px;"><canvas id="markupCanvas_${photoBlockCount}" width="500" height="350"></canvas></div>
            <div style="display:flex; gap:12px; align-items:center; margin-top:10px; flex-wrap:wrap;">
                <input type="text" class="photo-desc-input" placeholder="คำอธิบายภาพ เช่น ภาพมุมที่ ${photoBlockCount}" style="flex:1;">
                <button type="button" class="btn-danger-sm" onclick="clearCanvasContent('markupCanvas_${photoBlockCount}')">ล้างรอยวาด</button>
            </div>`;
            
        document.getElementById('photosContainer').appendChild(block); 
        initCanvasDrawing(`markupCanvas_${photoBlockCount}`, 'red', 4);
    });
    
    document.getElementById('btnClearCustSig').addEventListener('click', () => clearCanvasContent('customerSigCanvas'));
    document.getElementById('btnClearTechSig').addEventListener('click', () => clearCanvasContent('techSigCanvas'));
});