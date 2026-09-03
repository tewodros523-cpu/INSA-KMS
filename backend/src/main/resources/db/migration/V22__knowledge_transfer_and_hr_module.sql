-- V19: Knowledge Transfer and HR Employee Management Schema

-- 1. Enhance users table with HR fields (non-destructive, nullable/defaults)
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_status VARCHAR(30) DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date DATE;

-- 2. Knowledge Transfer Cases
CREATE TABLE IF NOT EXISTS knowledge_transfer_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    employee_id UUID NOT NULL REFERENCES users(id),
    manager_id UUID REFERENCES users(id),
    hr_rep_id UUID REFERENCES users(id),
    successor_id UUID REFERENCES users(id),
    department_id UUID REFERENCES departments(id),
    reason_type VARCHAR(50) NOT NULL, -- RESIGNATION, TERMINATION, RETIREMENT, TRANSFER
    start_date DATE,
    expected_completion_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'INITIATED', -- INITIATED, IN_PROGRESS, UNDER_REVIEW, CHANGES_REQUESTED, COMPLETED, CANCELLED
    priority VARCHAR(30) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    notes TEXT,
    clearance_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, READY_FOR_CLEARANCE, CLEARED
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kt_cases_employee ON knowledge_transfer_cases(employee_id);
CREATE INDEX IF NOT EXISTS idx_kt_cases_successor ON knowledge_transfer_cases(successor_id);
CREATE INDEX IF NOT EXISTS idx_kt_cases_manager ON knowledge_transfer_cases(manager_id);
CREATE INDEX IF NOT EXISTS idx_kt_cases_department ON knowledge_transfer_cases(department_id);
CREATE INDEX IF NOT EXISTS idx_kt_cases_status ON knowledge_transfer_cases(status);

-- 3. Knowledge Transfer Plans
CREATE TABLE IF NOT EXISTS knowledge_transfer_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES knowledge_transfer_cases(id) ON DELETE CASCADE,
    responsibilities TEXT,
    projects_handled TEXT,
    systems_maintained TEXT,
    business_processes TEXT,
    critical_knowledge_areas TEXT,
    risks TEXT,
    required_actions TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_kt_plan_case UNIQUE (case_id)
);

-- 4. Knowledge Transfer Checklists
CREATE TABLE IF NOT EXISTS knowledge_transfer_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES knowledge_transfer_cases(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, NOT_APPLICABLE
    category VARCHAR(100) DEFAULT 'GENERAL',
    assigned_to UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kt_checklist_case ON knowledge_transfer_checklists(case_id);

-- 5. Knowledge Transfer Submissions
CREATE TABLE IF NOT EXISTS knowledge_transfer_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES knowledge_transfer_cases(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- DAILY_ACTIVITIES, BUSINESS_PROCESSES, SYSTEM_KNOWLEDGE, TROUBLESHOOTING_PROCEDURES, IMPORTANT_CONTACTS, LESSONS_LEARNED, ADDITIONAL_NOTES
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    document_id UUID REFERENCES documents(id),
    submitted_by UUID NOT NULL REFERENCES users(id),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW, APPROVED, CHANGES_REQUESTED
    review_comments TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kt_submissions_case ON knowledge_transfer_submissions(case_id);

-- 6. Knowledge Transfer Sessions
CREATE TABLE IF NOT EXISTS knowledge_transfer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES knowledge_transfer_cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    location_or_link VARCHAR(500),
    meeting_notes TEXT,
    recording_document_id UUID REFERENCES documents(id),
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, COMPLETED, CANCELLED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kt_sessions_case ON knowledge_transfer_sessions(case_id);

-- 7. Knowledge Transfer Session Attendees
CREATE TABLE IF NOT EXISTS knowledge_transfer_session_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES knowledge_transfer_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    attended BOOLEAN DEFAULT FALSE,
    notes VARCHAR(255),
    CONSTRAINT uk_kt_session_attendee UNIQUE (session_id, user_id)
);
