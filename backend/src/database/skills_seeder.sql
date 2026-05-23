-- ============================================================
-- Ura Security – Skills Seeder
-- Run after skills_table.sql
-- INSERT IGNORE is safe to re-run — skips duplicates
-- ============================================================

INSERT IGNORE INTO skills (name, category) VALUES

-- ── Technical ─────────────────────────────────────────────
('Data Analysis',            'Technical'),
('Report Writing',           'Technical'),
('Documentation',            'Technical'),
('GIS & Mapping',            'Technical'),
('Statistics & Research',    'Technical'),
('AutoCAD / Design',         'Technical'),
('Engineering Survey',       'Technical'),
('Quality Control',          'Technical'),
('Environmental Assessment', 'Technical'),

-- ── Managerial ────────────────────────────────────────────
('Project Management',       'Managerial'),
('Risk Assessment',          'Managerial'),
('Team Leadership',          'Managerial'),
('Strategic Planning',       'Managerial'),
('Monitoring & Evaluation',  'Managerial'),
('Stakeholder Management',   'Managerial'),
('Change Management',        'Managerial'),
('Performance Management',   'Managerial'),

-- ── Field ─────────────────────────────────────────────────
('Field Supervision',        'Field'),
('Site Inspection',          'Field'),
('Community Mobilization',   'Field'),
('Construction Oversight',   'Field'),
('Logistics & Supply Chain', 'Field'),
('Health & Safety (HSE)',    'Field'),
('Surveying',                'Field'),

-- ── Finance ───────────────────────────────────────────────
('Budgeting',                'Finance'),
('Financial Reporting',      'Finance'),
('Procurement',              'Finance'),
('Auditing',                 'Finance'),
('Cost Estimation',          'Finance'),
('Grant Management',         'Finance'),
('Accounts Payable',         'Finance'),
('Payroll Management',       'Finance'),

-- ── IT ────────────────────────────────────────────────────
('Network Security',         'IT'),
('System Administration',    'IT'),
('Database Management',      'IT'),
('Software Development',     'IT'),
('Web Development',          'IT'),
('Cybersecurity',            'IT'),
('Cloud Infrastructure',     'IT'),
('Data Engineering',         'IT'),

-- ── Legal ─────────────────────────────────────────────────
('Legal Compliance',         'Legal'),
('Contract Review',          'Legal'),
('Land Acquisition Law',     'Legal'),
('Regulatory Affairs',       'Legal'),
('Dispute Resolution',       'Legal'),
('Intellectual Property',    'Legal');
