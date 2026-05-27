# Project Context: Smart Repair Webapp (Corporate Version)

## 1. ภาพรวมระบบ (Project Overview)
ระบบบันทึกงานซ่อมบำรุงดิจิทัลระดับองค์กร (Corporate Webapp) ออกแบบมาสำหรับการใช้งานหน้างานของช่างเทคนิคผ่าน **iPad mini (A17 Pro), มือถือ (iOS/Android)** และรองรับการจัดการตรวจคัดกรองข้อมูลผ่าน **คอมพิวเตอร์ (PC/Notebook)** ในออฟฟิศได้อย่างลื่นไหล ระบบสามารถบันทึกข้อมูลแบบ Dynamic, ถ่ายรูปมาร์กจุดดีเฟกต์, เซ็นชื่อดิจิทัล และอัปโหลดไฟล์แยกโฟลเดอร์ตามชื่อลูกค้าและเลขที่ใบงานขึ้นสู่คลาวด์โดยอัตโนมัติ

## 2. เงื่อนไขและข้อกำหนดทางธุรกิจ (Business Rules & Logic)
- **ข้อมูลลูกค้า (Customer):** ตัวเลือกสำเร็จรูปคือ **CAC** และ **CBI** หากเลือก **"อื่นๆ (ระบุเอง)"** จะมีช่องข้อความงอกออกมาให้พิมพ์ชื่อบริษัทใหม่
- **ประเภทงาน (Job Type):** ตัวเลือกสำเร็จรูปคือ **เคลม (Claim), ซ่อม (Repair), ผลิตใหม่ (Remanufacture), RE-MACHINE** และมีตัวเลือก **"อื่นๆ (ระบุเอง)"** เช่นกัน
- **การตรวจสอบอะไหล่ (Parts Checklist):** - หากเลือก "อะไหล่ครบถ้วน" ระบบจะบันทึกสถานะปกติ
  - หากเลือก "อะไหล่ไม่ครบ" ระบบจะเปิดกล่องข้อความให้ช่างกดเพิ่มรายการอะไหล่ที่ขาดได้เรื่อยๆ ไม่จำกัดจำนวนข้อ (-1, -2, -3...)
- **รายการตรวจสอบหน้างาน (Checklist):** ระบบจะโหลดรายการมาตรฐานขึ้นมาเริ่มต้น 2 ข้อ และช่างสามารถกดปุ่มสวิตช์ขยายเพื่อเพิ่มหัวข้อตรวจหน้างานได้เองไม่จำกัดข้อ
- **กระดานวาดรูปและลายเซ็น (Canvas Drawing):** รองรับระบบ Touch Event (นิ้ว/ปากกา Apple Pencil) บนมือถือ และ Mouse Event (คลิกซ้ายลากเมาส์) บนคอมพิวเตอร์
- **โครงสร้างการจัดเก็บไฟล์ (Storage Directory):** เมื่อกดบันทึก ระบบจะสร้างโฟลเดอร์และแยกไฟล์ใน Storage Bucket ชื่อ `repair-documents` อัตโนมัติในรูปแบบ:
  `[ชื่อบริษัทลูกค้า] / [เลขที่ใบงาน] / [ชื่อไฟล์].png`

## 3. สถาปัตยกรรมและเทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend:** HTML5, CSS3 (Modern Corporate Theme - Glassmorphism Effect), JavaScript (Vanilla JS)
- **Backend/Database:** Supabase Cloud (PostgreSQL)
- **SDK Connection:** เชื่อมต่อผ่าน Supabase JS SDK (CDN) โดยเรียกใช้งานผ่านวัตถุส่วนกลาง `supabase.supabaseJs.createClient`

## 4. โครงสร้างฐานข้อมูลหลังบ้าน (Supabase Database Schema)

### ตารางที่ 1: `repair_jobs` (ตารางใบงานหลัก)
```sql
CREATE TABLE repair_jobs (
    id SERIAL PRIMARY KEY,
    job_number VARCHAR(50) UNIQUE NOT NULL,       
    customer_name VARCHAR(255) NOT NULL,          
    job_type VARCHAR(100) NOT NULL,              
    repair_date DATE DEFAULT CURRENT_DATE,        
    technician_name VARCHAR(255) NOT NULL,        
    customer_signature_url TEXT,                 
    technician_signature_url TEXT,               
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);