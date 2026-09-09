-- Run this migration once in Supabase SQL Editor.
-- Existing jobs remain active because the default status is "กำลังดำเนินการ".

ALTER TABLE repair_jobs
    ADD COLUMN IF NOT EXISTS job_status TEXT NOT NULL DEFAULT 'กำลังดำเนินการ';

ALTER TABLE repair_jobs
    ADD COLUMN IF NOT EXISTS sent_date DATE;

CREATE TABLE IF NOT EXISTS job_progress (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
    job_number VARCHAR(50),
    quotation_number VARCHAR(100),
    po_number VARCHAR(100),
    delivery_note_number VARCHAR(100),
    operation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    operation_detail TEXT NOT NULL,
    technician_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_progress_job_id ON job_progress(job_id);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_status ON repair_jobs(job_status);

ALTER TABLE job_progress
    ADD COLUMN IF NOT EXISTS job_number VARCHAR(50);

ALTER TABLE job_progress
    ADD COLUMN IF NOT EXISTS quotation_number VARCHAR(100);

ALTER TABLE job_progress
    ADD COLUMN IF NOT EXISTS po_number VARCHAR(100);

ALTER TABLE job_progress
    ADD COLUMN IF NOT EXISTS delivery_note_number VARCHAR(100);
