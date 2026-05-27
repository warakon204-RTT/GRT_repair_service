

// ==========================================
// 🔐 1. ตั้งค่าและสร้างตัวเชื่อมต่อฐานข้อมูล Supabase 
// ==========================================
const SUPABASE_URL = "https://nxoxfwartamlrusfvgtt.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54b3hmd2FydGFtbHJ1c2Z2Z3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzUwODcsImV4cCI6MjA5NTMxMTA4N30.OXdwrbF0SpchQw27Fi1jjj36muo0LvfzAlMLbXlEY8Q"; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 🎨 2. ระบบตรวจจับพิกเซลนิ้ววาดและเมาส์ลากบน Canvas (ฉบับแก้บั๊ก Touch เส้นขาด/เซ็นไม่ติด)
// ==========================================
function initCanvasDrawing(canvasId, color, thickness) {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;

    // คำนวณตำแหน่งพิกเซลสัมผัสให้แม่นยำทุกขนาดหน้าจอ
    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;
        
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
        return { 
            x: (clientX - rect.left) * (canvas.width / rect.width), 
            y: (clientY - rect.top) * (canvas.height / rect.height) 
        };
    }

    function start(e) { 
        drawing = true; 
        const pos = getPos(e);
        ctx.beginPath(); // เริ่มเส้นใหม่ทุกครั้งที่จิ้มนิ้วหรือคลิก
        ctx.moveTo(pos.x, pos.y);
    }
    
    function stop() { 
        drawing = false; 
    }
    
    function draw(e) {
        if (!drawing) return;
        e.preventDefault(); // 🔥 สำคัญมาก: ล็อกหน้าจอมือถือไม่ให้เลื่อนหนีเวลาลากเส้น
        const pos = getPos(e);
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    // อีเวนต์สำหรับคอมพิวเตอร์ (Mouse)
    canvas.addEventListener('mousedown', start); 
    canvas.addEventListener('mouseup', stop); 
    canvas.addEventListener('mouseleave', stop);
    canvas.addEventListener('mousemove', draw);
    
    // อีเวนต์สำหรับมือถือ / แท็บเล็ต (Touch)
    canvas.addEventListener('touchstart', start, {passive: false}); 
    canvas.addEventListener('touchend', stop); 
    canvas.addEventListener('touchmove', draw, {passive: false});
}


// ==========================================
// ⚙️ 3. ระบบควบคุมรายการตรวจสอบหน้างาน (Checklist)
// ==========================================
const defaultChecklists = [
    "ตรวจสอบความสะอาดและสภาพภายนอกตัวเครื่อง",
    "ตรวจสอบระบบสายไฟ จุดเชื่อมต่อ และสายกราวด์"
];

function createChecklistRow(itemText = "") {
    const container = document.getElementById('checklistContainer');
    if (!container) return;

    const currentCount = container.querySelectorAll('.checklist-row').length + 1;

    const row = document.createElement('div');
    row.className = 'checklist-row';
    row.style.cssText = "margin-bottom: 12px; background: #fdfdfd; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; position: relative;";

    row.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: bold; color: #2b6cb0; min-width: 25px;">${currentCount}.</span>
            <input type="text" class="check-item-input" value="${itemText}" placeholder="ชื่อรายการตรวจสอบ..." style="flex: 2; padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px;">
            <select class="check-status-input" style="flex: 1; padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px;">
                <option value="ปกติ">✅ ปกติ</option>
                <option value="พบปัญหา">❌ พบปัญหา</option>
                <option value="ไม่ได้ตรวจสอบ">⚪ N/A</option>
            </select>
            <button type="button" onclick="this.parentElement.parentElement.remove()" style="background: #feb2b2; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">🗑️</button>
        </div>
        <div style="margin-left: 35px;">
            <input type="text" class="check-details-input" placeholder="รายละเอียดหรือหมายเหตุเพิ่มเติม (ถ้ามี)..." style="width: 100%; padding: 8px; font-size: 13px; border: 1px dashed #cbd5e0; border-radius: 4px; box-sizing: border-box;">
        </div>
    `;
    container.appendChild(row);
}

if(document.getElementById('btnAddChecklist')) {
    document.getElementById('btnAddChecklist').addEventListener('click', () => createChecklistRow());
}


// ==========================================
// ⚙️ 4. ระบบควบคุมฟิลด์อื่นๆ และ ตัวเลือกอะไหล่ไม่ครบ
// ==========================================
const partsRadios = document.querySelectorAll('input[name="partsStatus"]');
partsRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const container = document.getElementById('missingPartsContainer');
        if(!container) return;
        if (e.target.value === 'ไม่ครบ') {
            container.classList.remove('hidden-input');
            const partsList = document.getElementById('partsList');
            if(partsList && partsList.children.length === 0) {
                addPartRow();
            }
        } else {
            container.classList.add('hidden-input');
        }
    });
});

let partCount = 0;
function addPartRow() {
    partCount++;
    const partsList = document.getElementById('partsList');
    if(!partsList) return;
    
    const div = document.createElement('div');
    div.className = 'part-row';
    div.style.marginBottom = '8px';
    div.innerHTML = `<input type="text" class="part-item-input" placeholder="ระบุรายการอะไหล่ที่ขาด ข้อที่ ${partCount}" style="width:100%; padding:8px; box-sizing: border-box;">`;
    partsList.appendChild(div);
}

if(document.getElementById('btnAddPart')) {
    document.getElementById('btnAddPart').addEventListener('click', (e) => {
        e.preventDefault();
        addPartRow();
    });
}

if(document.getElementById('customerSelect')) {
    document.getElementById('customerSelect').addEventListener('change', (e) => {
        const inputOther = document.getElementById('customerNameOther');
        if(inputOther) {
            if(e.target.value === 'OTHER') inputOther.classList.remove('hidden-input');
            else inputOther.classList.add('hidden-input');
        }
    });
}
if(document.getElementById('jobTypeSelect')) {
    document.getElementById('jobTypeSelect').addEventListener('change', (e) => {
        const inputOther = document.getElementById('jobTypeOther');
        if(inputOther) {
            if(e.target.value === 'OTHER') inputOther.classList.remove('hidden-input');
            else inputOther.classList.add('hidden-input');
        }
    });
}


// ==========================================
// 📸 5. ระบบเพิ่มรูปภาพขัดข้องและมาร์กจุดเสีย (Dynamic Multi-Canvas)
// ==========================================
let photoBlockCount = 1;

if(document.getElementById('btnAddPhotoBlock')) {
    document.getElementById('btnAddPhotoBlock').addEventListener('click', (e) => {
        e.preventDefault();
        photoBlockCount++;
        
        const container = document.getElementById('photosContainer');
        const block = document.createElement('div');
        block.className = 'photo-block';
        block.id = `photoBlock_${photoBlockCount}`;
        
        block.innerHTML = `
            <p style="font-weight: bold; color: #2b6cb0; margin-top:10px;">📷 รูปภาพที่ ${photoBlockCount}</p>
            <div style="margin-bottom: 10px;">
                <input type="file" class="camera-input" accept="image/*" onchange="handleImageUpload(this, 'markupCanvas_${photoBlockCount}')">
            </div>
            <div class="canvas-wrapper">
                <canvas id="markupCanvas_${photoBlockCount}" width="500" height="350" style="background: #e2e8f0; max-width: 100%; border: 1px solid #cbd5e0;"></canvas>
            </div>
            <div style="margin-top: 5px;">
                <input type="text" class="photo-desc-input" placeholder="คำอธิบายภาพถ่ายใบนี้ (เช่น จุดน้ำมันรั่วฝั่งซ้าย)" style="width: 100%; padding: 8px; margin-bottom: 5px; box-sizing: border-box;">
                <button type="button" class="btn-danger-sm" onclick="clearCanvasContent('markupCanvas_${photoBlockCount}')">ล้างรอยวาดรูปนี้</button>
            </div>
        `;
        container.appendChild(block);
        initCanvasDrawing(`markupCanvas_${photoBlockCount}`, 'red', 4);
    });
}

function handleImageUpload(input, canvasId) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
}

function clearCanvasContent(canvasId) {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
}


// ==========================================
// 🚀 6. ฟังก์ชันบันทึกข้อมูลและอัปโหลดภาพขึ้นคลาวด์ Supabase
// ==========================================
if(document.getElementById('btnSubmitJob')) {
    document.getElementById('btnSubmitJob').addEventListener('click', async () => {
        try {
            const cSel = document.getElementById('customerSelect').value;
            const customerName = (cSel === "OTHER") ? document.getElementById('customerNameOther').value : cSel;
            const jSel = document.getElementById('jobTypeSelect').value;
            const jobType = (jSel === "OTHER") ? document.getElementById('jobTypeOther').value : jSel;
            const jobNum = document.getElementById('jobUUID').value; 

            if(!customerName || !jobNum) {
                alert("⚠️ กรุณาระบุชื่อลูกค้าและเลขใบงานก่อนทำการบันทึก!");
                return;
            }

            const btnSubmit = document.getElementById('btnSubmitJob');
            btnSubmit.innerText = "⏳ กำลังอัปโหลดข้อมูลและภาพถ่ายทั้งหมด...";
            btnSubmit.disabled = true;

            const itemName = document.getElementById('addItemName') ? document.getElementById('addItemName').value.trim() : "";
            const itemQty = document.getElementById('addItemQty') ? parseInt(document.getElementById('addItemQty').value) || 1 : 1;
            const itemModel = document.getElementById('addItemModel') ? document.getElementById('addItemModel').value.trim() : "";
            const jobDescription = document.getElementById('addJobDescription') ? document.getElementById('addJobDescription').value.trim() : "";

            const printedCustName = document.getElementById('printedCustomerName') ? document.getElementById('printedCustomerName').value : "";
            const printedTechName = document.getElementById('printedTechName') ? document.getElementById('printedTechName').value : "";

            const custSigUrl = await uploadCanvasToStorage('customerSigCanvas', `${customerName}/${jobNum}/signature_customer.png`);
            const techSigUrl = await uploadCanvasToStorage('techSigCanvas', `${customerName}/${jobNum}/signature_technician.png`);

            const { data: jobData, error: jobErr } = await supabaseClient
                .from('repair_jobs')
                .insert([{ 
                    job_number: jobNum, 
                    customer_name: customerName, 
                    job_type: jobType, 
                    customer_signature_url: custSigUrl, 
                    technician_signature_url: techSigUrl,
                    printed_customer_name: printedCustName,    
                    printed_technician_name: printedTechName,
                    item_name: itemName,          
                    quantity: itemQty,            
                    model: itemModel,             
                    job_description: jobDescription 
                }]).select();

            if(jobErr) throw new Error("เกิดข้อผิดพลาดในการบันทึกตารางหลัก: " + jobErr.message);
            const jobId = jobData[0].id;

            const checkRows = document.querySelectorAll('.checklist-row');
            for (let row of checkRows) {
                const textInput = row.querySelector('.check-item-input');
                const statusSelect = row.querySelector('.check-status-input');
                const detailsInput = row.querySelector('.check-details-input');
                
                if(textInput && textInput.value) {
                    let fullComment = statusSelect.value;
                    if(detailsInput && detailsInput.value) {
                        fullComment += ` (${detailsInput.value})`;
                    }
                    
                    await supabaseClient.from('job_checklists').insert([{ 
                        job_id: jobId, 
                        checklist_item: textInput.value, 
                        status: fullComment 
                    }]);
                }
            }

            const partsRadio = document.querySelector('input[name="partsStatus"]:checked');
            const partsStatus = partsRadio ? partsRadio.value : "ครบถ้วน";
            const partsNotes = document.getElementById('partsNotes') ? document.getElementById('partsNotes').value : "";

            if(partsStatus === "ไม่ครบ") {
                const partInputs = document.querySelectorAll('.part-item-input');
                for (let input of partInputs) {
                    if(input && input.value) {
                        let itemText = `[อะไหล่ขาด]: ${input.value}`;
                        if(partsNotes) itemText += ` | หมายเหตุ: ${partsNotes}`;
                        
                        await supabaseClient.from('job_checklists').insert([{ 
                            job_id: jobId, 
                            checklist_item: itemText, 
                            status: "ไม่ครบ" 
                        }]);
                    }
                }
            } else {
                await supabaseClient.from('job_checklists').insert([{ 
                    job_id: jobId, 
                    checklist_item: "ตรวจสอบชิ้นส่วนอะไหล่และอุปกรณ์", 
                    status: "ครบถ้วน" 
                }]);
            }

            const photoBlocks = document.querySelectorAll('.photo-block');
            for(let i=0; i<photoBlocks.length; i++) {
                const block = photoBlocks[i];
                const canvasElement = block.querySelector('canvas');
                const descElement = block.querySelector('.photo-desc-input');
                
                if(canvasElement) {
                    const uploadedUrl = await uploadCanvasToStorage(canvasElement.id, `${customerName}/${jobNum}/photo_${i+1}.png`);
                    if(uploadedUrl) {
                        const descriptionText = (descElement && descElement.value) ? descElement.value : `ภาพถ่าย ${i+1}`;
                        await supabaseClient.from('job_photos').insert([{ 
                            job_id: jobId, 
                            photo_url: uploadedUrl, 
                            photo_description: descriptionText
                        }]);
                    }
                }
            }

            if(document.getElementById('addItemName')) document.getElementById('addItemName').value = '';
            if(document.getElementById('addItemQty')) document.getElementById('addItemQty').value = '1';
            if(document.getElementById('addItemModel')) document.getElementById('addItemModel').value = '';
            if(document.getElementById('addJobDescription')) document.getElementById('addJobDescription').value = '';

            btnSubmit.innerText = "บันทึกข้อมูลและแยกโฟลเดอร์สำเร็จ";
            btnSubmit.disabled = false;
            alert("🎉 บันทึกประวัติรายการตรวจสอบแบบละเอียด และชุดภาพถ่ายขึ้นคลาวด์สำเร็จเรียบร้อย!");

            if (typeof generateJobNumber === "function" && document.getElementById('jobUUID')) {
                document.getElementById('jobUUID').value = generateJobNumber();
            }
            if (typeof loadHistoryData === "function") loadHistoryData(); 

        } catch (err) {
            console.error(err);
            alert("❌ บันทึกไม่สำเร็จ: " + err.message);
            document.getElementById('btnSubmitJob').disabled = false;
            document.getElementById('btnSubmitJob').innerText = "บันทึกข้อมูลและแยกโฟลเดอร์สำเร็จ";
        }
    });
}

async function uploadCanvasToStorage(canvasId, path) {
    return new Promise((resolve) => {
        const cvs = document.getElementById(canvasId);
        if(!cvs) return resolve(null);
        cvs.toBlob(async (blob) => {
            if(!blob) return resolve(null);
            
            const { data, error } = await supabaseClient.storage
                .from('repair-documents')
                .upload(path, blob, { contentType: 'image/png', uppercase: true, cacheControl: '3600' });
                
            if (error) { 
                console.error("Storage Upload Error:", error); 
                resolve(null); 
            } else { 
                const { data: url } = supabaseClient.storage.from('repair-documents').getPublicUrl(path); 
                resolve(url.publicUrl); 
            }
        }, 'image/png');
    });
}


// ====================================================================
// 🔥 7. ฟังก์ชันดึงข้อมูลคลาวด์มาเรนเดอร์ลงใน SERVICE REPORT (Preview ใบงาน)
// ====================================================================
async function viewFullDocument(jobId, jobNum, custName) {
    const previewContainer = document.getElementById('docPreviewContainer');
    if(!previewContainer) return;

    try {
        const { data: checklists, error: checkErr } = await supabaseClient
            .from('job_checklists')
            .select('*')
            .eq('job_id', jobId);
            
        const { data: photos, error: photoErr } = await supabaseClient
            .from('job_photos')
            .select('*')
            .eq('job_id', jobId);

        if (checkErr || photoErr) throw new Error("ไม่สามารถโหลดรายละเอียดงานซ่อมย้อนหลังได้");

        const jobDetail = localCachedJobs.find(j => j.id == jobId);
        const jobUUID = jobDetail ? (jobDetail.job_number || jobDetail.job_uuid) : jobNum;
        const finalCustomer = jobDetail ? (jobDetail.customer_name || jobDetail.customer) : custName;
        const finalJobType = jobDetail ? jobDetail.job_type : '-';
        const itemName = jobDetail && jobDetail.item_name ? jobDetail.item_name : "-";
        const itemQty = jobDetail && jobDetail.quantity ? jobDetail.quantity : "1";
        const itemModel = jobDetail && jobDetail.model ? jobDetail.model : "-";
        const jobDescription = jobDetail && jobDetail.job_description ? jobDetail.job_description : "ไม่มีระบุรายละเอียดเพิ่มเติม";
        const techName = jobDetail && jobDetail.technician_name ? jobDetail.technician_name : "-";
        const printedCustomerName = jobDetail && jobDetail.printed_customer_name ? jobDetail.printed_customer_name : "-";
        
        const targetDate = jobDetail ? (jobDetail.repair_date || jobDetail.created_at) : null;
        const repairDate = targetDate ? new Date(targetDate).toLocaleDateString('th-TH', {year: 'numeric', month: 'long', day: 'numeric'}) : '-';

        let checklistHTML = "";

        // 1. กรองรายการอะไหล่
        const partChecklists = checklists ? checklists.filter(c => c.checklist_item.includes("[อะไหล่ขาด]")) : [];
        if(partChecklists.length > 0) {
            checklistHTML += `
            <div style="margin-top: 15px;"><b style="font-size:13px; color:#c53030;">📦 รายการอะไหล่ที่ขาด</b>
            <table style="width:100%; border-collapse:collapse; margin-top:5px; font-size:12px;">`;
            partChecklists.forEach((c, i) => {
                const partName = c.checklist_item.replace("[อะไหล่ขาด]: ", "");
                checklistHTML += `
                    <tr style="background-color: #fff5f5;">
                        <td style="border: 1px solid #feb2b2; padding: 6px; width: 5%; text-align:center;">${i + 1}</td>
                        <td style="border: 1px solid #feb2b2; padding: 6px; color:#c53030; font-weight:bold;">⚠️ ${partName}</td>
                        <td style="border: 1px solid #feb2b2; padding: 6px; width: 25%; text-align:center; color:#c53030;">สถานะ: ขาด</td>
                    </tr>`;
            });
            checklistHTML += `</table></div>`;
        }

        // 2. กรองรายการ Checklist ปกติ
        const normalChecklists = checklists ? checklists.filter(c => !c.checklist_item.includes("[อะไหล่ขาด]")) : [];
        if(normalChecklists.length > 0) {
            checklistHTML += `
            <div style="margin-top: 15px;"><b style="font-size:13px; color:#1a365d;">📋 ผลการตรวจสอบหน้างาน (Checklist)</b>
            <table style="width:100%; border-collapse:collapse; margin-top:5px; font-size:12px;">`;
            normalChecklists.forEach((c, i) => {
                let badgeColor = c.status.includes("ปกติ") || c.status.includes("Pass") ? "#2f855a" : "#c53030";
                checklistHTML += `
                    <tr>
                        <td style="border: 1px solid #cbd5e0; padding: 6px; width: 5%; text-align:center; background:#f7fafc;">${i + 1}</td>
                        <td style="border: 1px solid #cbd5e0; padding: 6px;">${c.checklist_item}</td>
                        <td style="border: 1px solid #cbd5e0; padding: 6px; width: 25%; text-align:center; font-weight:bold; color:${badgeColor}">${c.status}</td>
                    </tr>`;
            });
            checklistHTML += `</table></div>`;
        }

        let photosHTML = "";
        if(photos && photos.length > 0) {
            photosHTML += `<div style="margin-top: 15px; page-break-inside: avoid;"><b style="font-size:13px; color:#1a365d;">📷 ภาพถ่ายจุดขัดข้องและการวิเคราะห์หน้างาน</b><div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 5px;">`;
            photos.forEach(p => {
                photosHTML += `
                    <div style="flex: 1; min-width: 45%; max-width: 48%; border: 1px solid #cbd5e0; padding: 5px; border-radius: 4px; background: #f7fafc; text-align: center; box-sizing: border-box;">
                        <img src="${p.photo_url}" style="width: 100%; height: auto; max-height: 160px; object-fit: contain; border-radius: 2px;">
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: #4a5568; text-align: left;"><b>คำอธิบาย:</b> ${p.photo_description || '-'}</p>
                    </div>`;
            });
            photosHTML += `</div></div>`;
        }

        const custSigImg = jobDetail && jobDetail.customer_signature_url ? `<img src="${jobDetail.customer_signature_url}" style="max-height: 50px; max-width: 100%; object-fit: contain;">` : '<div style="border-bottom: 1px solid #718096; width: 75%; height: 40px;"></div>';
        const techSigImg = jobDetail && jobDetail.technician_signature_url ? `<img src="${jobDetail.technician_signature_url}" style="max-height: 50px; max-width: 100%; object-fit: contain;">` : '<div style="border-bottom: 1px solid #718096; width: 75%; height: 40px;"></div>';

        previewContainer.innerHTML = `
            <div id="pdfActiveArea" style="font-family: 'Sarabun', sans-serif; color: #000; padding: 20px; box-sizing: border-box; background: white; border: 1px solid #cbd5e0; border-radius: 4px;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1a365d; padding-bottom: 12px; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="LGRT11.jpg" alt="GRT LOGO" style="height: 65px; width: auto; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none'; document.getElementById('modalFallback').style.display='block';">
                        <div id="modalFallback" style="display:none; width:50px; height:50px; background:#1a365d; color:white; font-weight:bold; text-align:center; line-height:50px; border-radius:4px;">GRT</div>
                        <div>
                            <h2 style="margin: 0; color: #1a365d; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">GRT SERVICE REPORT</h2>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: #4a5568; font-weight: bold;">GRAPHIC RT DESIGNS CO.,LTD.</p>
                            <p style="margin: 1px 0 0 0; font-size: 11px; color: #718096; line-height: 1.2;">1/2 Moo 3 T.Samnakbok A.Muang Chonburi ,Chonburi 20000 Thailand </p>
                        </div>
                    </div>

                     <div style="text-align: right;">
                         <div style="font-size: 10px; color: #4a5568; background: #ebf8ff; padding: 3px 8px; border-radius: 4px; border: 1px solid #bee3f8; display: inline-block; font-weight: bold; margin-bottom: 4px;">เลขที่เอกสาร</div>
                         <div style="font-size: 11px; color: #1a365d; white-space: nowrap;">
                         <b>Job No:</b> <span style="color:#e53e3e; font-weight:bold;">${jobUUID}</span>
                     </div>
                </div>
                </div>

                <div class="report-action-group" data-html2pdf-ignore="true" style="margin-top: -5px; margin-bottom: 15px; background: #f7fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                    <button type="button" onclick="executeReportPDF('${jobUUID}')" class="btn-report-ctrl btn-pdf-row">📥 เซฟเป็นไฟล์ PDF</button>
                    <button type="button" onclick="executeReportPrint('${jobUUID}', '${finalCustomer}')" class="btn-report-ctrl btn-print-row">🖨️ สั่งพิมพ์ใบงาน</button>
                    <button type="button" onclick="deleteJobRow('${jobId}', '${jobUUID}'); closeViewDocModal();" style="background:#f56565; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-size:12px; margin-left: 5px;">🗑️ ลบใบงาน</button>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: #4a5568;">
                    <div><b>ประเภทบริการ (Service Type):</b> <span style="color:#2b6cb0; font-weight:bold;">${finalJobType}</span></div>
                    <div><b>วันที่ดำเนินการ:</b> ${repairDate}</div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; table-layout: fixed;">
                    <tr>
                        <td style="padding: 8px; border: 1px solid #cbd5e0; background: #f7fafc; width: 22%;"><b>ชื่อบริษัทลูกค้า:</b></td>
                        <td style="padding: 8px; border: 1px solid #cbd5e0; word-wrap: break-word; font-weight: bold; color: #2d3748;">${finalCustomer}</td>
                        <td style="padding: 8px; border: 1px solid #cbd5e0; background: #f7fafc; width: 22%;"><b>จำนวนอุปกรณ์:</b></td>
                        <td style="padding: 8px; border: 1px solid #cbd5e0; font-weight: bold; color: #2b6cb0;">${itemQty} รายการ</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #cbd5e0; background: #f7fafc;"><b>ชื่อชิ้นงาน / อุปกรณ์:</b></td>
                        <td style="padding: 8px; border: 1px solid #cbd5e0; word-wrap: break-word; color: #2d3748;">${itemName}</td>
                        <td style="padding: 8px; border: 1px solid #cbd5e0; background: #f7fafc;"><b>โมเดล / รุ่น / ซีเรียล:</b></td>
                        <td style="padding: 8px; border: 1px solid #cbd5e0; word-wrap: break-word;">${itemModel}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #cbd5e0; background: #f7fafc; height: 65px; vertical-align: top;"><b>รายละเอียดงาน / อาการ:</b></td>
                        <td colspan="3" style="padding: 8px; border: 1px solid #cbd5e0; vertical-align: top; word-wrap: break-word; white-space: pre-line; line-height: 1.4; color: #4a5568;">${jobDescription}</td>
                    </tr>
                </table>

                ${checklistHTML}
                ${photosHTML}

                <div style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 12px; page-break-inside: avoid;">
                    <div style="text-align: center; width: 45%;">
                        <div style="height: 50px; display: flex; justify-content: center; align-items: center; margin-bottom: 5px;">
                            ${custSigImg}
                        </div>
                        <div style="border-top: 1px solid #cbd5e0; width: 85%; margin: 5px auto;"></div>
                        <p style="margin: 0; color: #2d3748;">( ลงชื่อ: <b>${printedCustomerName || '...........................................'}</b> )</p>
                        <p style="margin: 3px 0 0 0; font-size: 11px; color: #718096;">ตัวแทนผู้ตรวจรับงานจากลูกค้า</p>
                    </div>
                    
                    <div style="text-align: center; width: 45%;">
                        <div style="height: 50px; display: flex; justify-content: center; align-items: center; margin-bottom: 5px;">
                            ${techSigImg}
                        </div>
                        <div style="border-top: 1px solid #cbd5e0; width: 85%; margin: 5px auto;"></div>
                        <p style="margin: 0; color: #2d3748;">( ลงชื่อ: <b>${techName || '...........................................'}</b> )</p>
                        <p style="margin: 3px 0 0 0; font-size: 11px; color: #718096;">ช่างผู้บันทึกรายงาน (GRT Tech)</p>
                    </div>
                </div>
            </div>
        `;
        
        if(document.getElementById('viewDocModal')) {
            document.getElementById('viewDocModal').style.display = 'flex';
        }

    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาดในการดึงข้อมูลรายงานฉบับเต็ม: " + err.message);
    }
}


// ==========================================
// 🛠️ 8. ฟังก์ชันควบคุมโมดอลและการแก้ไขข้อมูลย้อนหลัง
// ==========================================
function openEditModal(id, currentCust, currentJobType, currentTech) {
    document.getElementById('editJobId').value = id;
    document.getElementById('editCustomerName').value = currentCust;
    document.getElementById('editJobType').value = currentJobType;
    document.getElementById('editTechName').value = currentTech;
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }

async function updateJobData() {
    const id = document.getElementById('editJobId').value;
    const newCust = document.getElementById('editCustomerName').value;
    const newJobType = document.getElementById('editJobType').value;
    const newTech = document.getElementById('editTechName').value;

    try {
        const { error } = await supabaseClient
            .from('repair_jobs')
            .update({ customer_name: newCust, job_type: newJobType, technician_name: newTech })
            .eq('id', id);

        if(error) throw error;
        alert("🎉 อัปเดตการแก้ไขข้อมูลลงคลาวด์สำเร็จเรียบร้อย!");
        closeEditModal();
        loadHistoryData(); 
    } catch(err) { alert("อัปเดตไม่สำเร็จ: " + err.message); }
}

function printSingleJob(jobNum, custName) {
    alert(`🖨️ ระบบกำลังเตรียมคิวปริ้นสำหรับใบงาน ${jobNum} ของบริษัท ${custName}...`);
    window.print();
}

function shareJobReport(jobNum, custName) {
    const shareText = `⚙️ รายงานผลงานซ่อมบำรุงหมายเลข: ${jobNum}\n🏢 ลูกค้าบริษัท: ${custName}\n🌐 ตรวจสอบสถานะและลิงก์ประวัติผ่านคลาวด์องค์กรได้ทันที!`;
    if (navigator.share) {
        navigator.share({ title: 'GRT Service Report Share', text: shareText, url: window.location.href })
        .catch((error) => console.log('Error sharing', error));
    } else {
        navigator.clipboard.writeText(shareText);
        alert("📋 คัดลอกรายละเอียดลงคลิปบอร์ดแล้ว นำไปกดวางส่งต่อในแอป Line ได้ทันที!");
    }
}


// ==========================================
// 📊 9. ระบบดึงประวัติงานซ่อมและเรนเดอร์ข้อมูลลงตาราง (พร้อมระบบค้นหา/คัดกรอง)
// ==========================================
let localCachedJobs = []; 

async function loadHistoryData() {
    const tableBody = document.getElementById('historyTableBody');
    if(!tableBody) return;
    
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #718096;">⏳ กำลังโหลดข้อมูลประวัติคลาวด์...</td></tr>`;
    
    try {
        const { data, error } = await supabaseClient
            .from('repair_jobs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        localCachedJobs = data; 
        renderTable(localCachedJobs); 
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">❌ โหลดประวัติไม่สำเร็จ: ${err.message}</td></tr>`;
    }
}

function filterData() {
    const customerFilter = document.getElementById('filterCustomer').value;
    const dateStart = document.getElementById('filterDateStart').value;
    const dateEnd = document.getElementById('filterDateEnd').value;
    
    let filtered = localCachedJobs;

    // 1. กรองตามชื่อบริษัทลูกค้า
    if (customerFilter !== "ALL") {
        filtered = filtered.filter(job => job.customer_name === customerFilter);
    }

    // 2. กรองตามช่วงวันที่ซ่อมบำรุง
    filtered = filtered.filter(job => {
        if (!job.repair_date) return false;
        const jobDate = job.repair_date.split('T')[0]; // ตัดเวลาเหลือเฉพาะ YYYY-MM-DD
        
        let isAfterStart = dateStart ? jobDate >= dateStart : true;
        let isBeforeEnd = dateEnd ? jobDate <= dateEnd : true;
        
        return isAfterStart && isBeforeEnd;
    });

    renderTable(filtered);
}

function resetFilters() {
    document.getElementById('filterCustomer').value = "ALL";
    document.getElementById('filterDateStart').value = "";
    document.getElementById('filterDateEnd').value = "";
    renderTable(localCachedJobs);
}

function renderTable(jobsList) {
    const tableBody = document.getElementById('historyTableBody');
    if(!tableBody) return;
    
    if(jobsList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #718096;">ไม่พบข้อมูลประวัติที่ตรงเงื่อนไข</td></tr>`;
        return;
    }

    tableBody.innerHTML = jobsList.map(job => {
        const formattedDate = job.repair_date ? new Date(job.repair_date).toLocaleDateString('th-TH', {year: 'numeric', month: 'short', day: 'numeric'}) : '-';
        return `
            <tr>
                <td><b>${formattedDate}</b></td>
                <td><span style="color:#2b6cb0; font-weight:bold;">${job.job_number}</span></td>
                <td>${job.customer_name}</td>
                <td style="font-weight: 500; color: #2d3748;">${job.item_name || '-'}</td>
                <td><mark style="background:#feebc8; padding:2px 5px; border-radius:3px;">${job.job_type}</mark></td>
                <td>${job.technician_name || '-'}</td>
                <td>
                    <button class="action-btn btn-view-doc" onclick="viewFullDocument('${job.id}', '${job.job_number}', '${job.customer_name}')">📄 ดูเอกสาร</button>
                    <button class="action-btn btn-edit" onclick="openEditModal('${job.id}', '${job.customer_name}', '${job.job_type}', '${job.technician_name || ''}')">✏️ แก้ไข</button>
                </td>
            </tr>
        `;
    }).join('');
}


// ==========================================
// ⏳ 10. บูตระบบกระดานวาด/เซ็นชื่อ และโหลดข้อมูลตารางทันทีเมื่อเว็บพร้อมทำงาน
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. โหลดข้อมูลประวัติและตารางจากคลาวด์ค้างไว้ทันที
    loadHistoryData();

    // 2. 🔥 เปิดระบบกระดานเซ็นชื่อลูกค้า ช่าง และทำเครื่องหมายบนรูปภาพใบแรกสุดให้อัตโนมัติ
    initCanvasDrawing('customerSigCanvas', '#0f172a', 3.5); // ลายเซ็นลูกค้า (สีน้ำเงินเข้ม ปากกาหนา 3.5)
    initCanvasDrawing('techSigCanvas', '#0f172a', 3.5);     // ลายเซ็นช่าง (สีน้ำเงินเข้ม ปากกาหนา 3.5)
    initCanvasDrawing('markupCanvas_1', 'red', 4);          // รูปมาร์กจุดเสียใบแรก (สีแดง ปากกาหนา 4)

    // 3. ผูกระบบคำสั่งปุ่มล้างลายเซ็นต์และล้างรูปวาดให้ปลอดภัย
    if(document.getElementById('btnClearCustSig')) {
        document.getElementById('btnClearCustSig').addEventListener('click', () => clearCanvasContent('customerSigCanvas'));
    }
    if(document.getElementById('btnClearTechSig')) {
        document.getElementById('btnClearTechSig').addEventListener('click', () => clearCanvasContent('techSigCanvas'));
    }
});