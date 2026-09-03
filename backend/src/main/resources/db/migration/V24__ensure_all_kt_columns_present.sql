-- V21: Ensure all Knowledge Transfer and HR columns exist

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_status VARCHAR(30) DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date DATE;

-- Drop and recreate knowledge_transfer_cases cleanly if old schema exists or ensure all columns
CREATE TABLE IF NOT EXISTS knowledge_transfer_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL DEFAULT '',
    employee_id UUID NOT NULL REFERENCES users(id),
    manager_id UUID REFERENCES users(id),
    hr_rep_id UUID REFERENCES users(id),
    successor_id UUID REFERENCES users(id),
    department_id UUID REFERENCES departments(id),
    reason_type VARCHAR(50) NOT NULL DEFAULT 'RESIGNATION',
    start_date DATE,
    expected_completion_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
    priority VARCHAR(30) DEFAULT 'MEDIUM',
    notes TEXT,
    clearance_status VARCHAR(50) DEFAULT 'PENDING',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES users(id);
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id);
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS hr_rep_id UUID REFERENCES users(id);
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS successor_id UUID REFERENCES users(id);
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS reason_type VARCHAR(50) DEFAULT 'RESIGNATION';
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS expected_completion_date DATE;
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'INITIATED';
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS priority VARCHAR(30) DEFAULT 'MEDIUM';
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS clearance_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

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

ALTER TABLE knowledge_transfer_plans ADD COLUMN IF NOT EXISTS responsibilities TEXT;
ALTER TABLE knowledge_transfer_plans ADD COLUMN IF NOT EXISTS projects_handled TEXT;
ALTER TABLE knowledge_transfer_plans ADD COLUMN IF NOT EXISTS systems_maintained TEXT;
ALTER TABLE knowledge_transfer_plans ADD COLUMN IF NOT EXISTS business_processes TEXT;
ALTER TABLE knowledge_transfer_plans ADD COLUMN IF NOT EXISTS critical_knowledge_areas TEXT;
ALTER TABLE knowledge_transfer_plans ADD COLUMN IF NOT EXISTS risks TEXT;
ALTER TABLE knowledge_transfer_plans ADD COLUMN IF NOT EXISTS required_actions TEXT;
ALTER TABLE knowledge_transfer_plans ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE knowledge_transfer_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE knowledge_transfer_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS knowledge_transfer_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES knowledge_transfer_cases(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    category VARCHAR(100) DEFAULT 'GENERAL',
    assigned_to UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE knowledge_transfer_checklists ADD COLUMN IF NOT EXISTS item_name VARCHAR(255) DEFAULT '';
ALTER TABLE knowledge_transfer_checklists ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'PENDING';
ALTER TABLE knowledge_transfer_checklists ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'GENERAL';
ALTER TABLE knowledge_transfer_checklists ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
ALTER TABLE knowledge_transfer_checklists ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE knowledge_transfer_checklists ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE knowledge_transfer_checklists ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
ALTER TABLE knowledge_transfer_checklists ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE knowledge_transfer_checklists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS knowledge_transfer_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES knowledge_transfer_cases(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
    title VARCHAR(255) NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    document_id UUID REFERENCES documents(id),
    submitted_by UUID NOT NULL REFERENCES users(id),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
    review_comments TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE knowledge_transfer_submissions ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'GENERAL';
ALTER TABLE knowledge_transfer_submissions ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT '';
ALTER TABLE knowledge_transfer_submissions ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE knowledge_transfer_submissions ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id);
ALTER TABLE knowledge_transfer_submissions ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id);
ALTER TABLE knowledge_transfer_submissions ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50) DEFAULT 'PENDING_REVIEW';
ALTER TABLE knowledge_transfer_submissions ADD COLUMN IF NOT EXISTS review_comments TEXT;
ALTER TABLE knowledge_transfer_submissions ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE knowledge_transfer_submissions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE knowledge_transfer_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE knowledge_transfer_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS knowledge_transfer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES knowledge_transfer_cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT '',
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    location_or_link VARCHAR(500),
    meeting_notes TEXT,
    recording_document_id UUID REFERENCES documents(id),
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE knowledge_transfer_sessions ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT '';
ALTER TABLE knowledge_transfer_sessions ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE knowledge_transfer_sessions ADD COLUMN IF NOT EXISTS location_or_link VARCHAR(500);
ALTER TABLE knowledge_transfer_sessions ADD COLUMN IF NOT EXISTS meeting_notes TEXT;
ALTER TABLE knowledge_transfer_sessions ADD COLUMN IF NOT EXISTS recording_document_id UUID REFERENCES documents(id);
ALTER TABLE knowledge_transfer_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'SCHEDULED';
ALTER TABLE knowledge_transfer_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE knowledge_transfer_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS knowledge_transfer_session_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES knowledge_transfer_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    attended BOOLEAN DEFAULT FALSE,
    notes VARCHAR(255),
    CONSTRAINT uk_kt_session_attendee UNIQUE (session_id, user_id)
);

ALTER TABLE knowledge_transfer_session_attendees ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT FALSE;
ALTER TABLE knowledge_transfer_session_attendees ADD COLUMN IF NOT EXISTS notes VARCHAR(255);
