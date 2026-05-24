-- ============================================================
-- Ura Security – Seeder 004
-- Regions, Service Types, and Sample Data
-- Safe to re-run — INSERT IGNORE skips duplicates
-- ============================================================

-- ── Regions ───────────────────────────────────────────────────────────────────
INSERT IGNORE INTO regions (name) VALUES
  ('Dar es Salaam'),
  ('Mwanza'),
  ('Arusha'),
  ('Mbeya'),
  ('Dodoma'),
  ('Tanga'),
  ('Morogoro'),
  ('Zanzibar'),
  ('Kilimanjaro'),
  ('Lindi'),
  ('Ruvuma'),
  ('Songwe'),
  ('Iringa'),
  ('Mara'),
  ('Kagera'),
  ('Geita'),
  ('Simiyu'),
  ('Katavi'),
  ('Rukwa'),
  ('Tabora'),
  ('Shinyanga'),
  ('Singida'),
  ('Kigoma'),
  ('Njombe'),
  ('Pwani'),
  ('Mtwara');

-- ── Service Types ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO service_types (name) VALUES
  ('Guarding'),
  ('Patrol'),
  ('Alarm Response'),
  ('VIP Protection'),
  ('Event Security'),
  ('Investigation'),
  ('Cash in Transit'),
  ('Access Control'),
  ('CCTV Monitoring'),
  ('Canine Unit');

-- ── Sample Clients ────────────────────────────────────────────────────────────
INSERT IGNORE INTO clients
  (client_id, name, contact_person, email, phone, address, region,
   contract_number, service_type, guards_required, contract_start, contract_end,
   emergency_name, emergency_phone, emergency_relation, status, notes)
VALUES
  (1, 'Azania Bank Ltd',
   'James Mwale', 'jmwale@azania.co.tz', '+255712345001',
   'Samora Avenue, Dar es Salaam', 'Dar es Salaam',
   'CTR-2024-001', 'Guarding', 12, '2024-01-01', '2024-12-31',
   'Patricia Mwale', '+255712345099', 'Deputy Manager',
   'active', NULL),

  (2, 'CRDB Bank PLC',
   'Sarah Kimaro', 'skimaro@crdb.co.tz', '+255712345002',
   'Garden Avenue, Arusha', 'Arusha',
   'CTR-2024-002', 'Alarm Response', 5, '2024-03-15', '2025-03-14',
   'John Kimaro', '+255712345098', 'Security Manager',
   'active', NULL),

  (3, 'TanzaniaPost',
   'Ali Hassan', 'ahassan@tzpost.go.tz', '+255712345003',
   'Dodoma Central', 'Dodoma',
   'CTR-2024-003', 'Guarding', 8, '2024-06-01', NULL,
   'Mariam Hassan', '+255712345097', 'Operations Director',
   'pending', 'Pending final contract signature'),

  (4, 'Karibu Hotel Group',
   'Mary Shuma', 'mshuma@karibu.co.tz', '+255712345004',
   'Mwanza Waterfront', 'Mwanza',
   'CTR-2023-008', 'Event Security', 20, '2023-08-10', '2025-08-09',
   'David Shuma', '+255712345096', 'General Manager',
   'active', NULL),

  (5, 'TANESCO',
   'Peter Ngowi', 'pngowi@tanesco.co.tz', '+255712345005',
   'Ubungo, Dar es Salaam', 'Dar es Salaam',
   'CTR-2022-015', 'Guarding', 30, '2022-01-01', '2023-12-31',
   'Agnes Ngowi', '+255712345095', 'Head of Security',
   'inactive', 'Contract expired — renewal in progress');

-- ── Sample Post Sites ─────────────────────────────────────────────────────────
INSERT IGNORE INTO post_sites
  (site_id, client_id, name, location, guards_required,
   shift_details, supervisor_name, risk_level, status)
VALUES
  (1, 1, 'Main Branch',      'Kariakoo, Dar es Salaam',     4, 'Day Shift (06:00–18:00)', 'Juma Ally',   'high',   'active'),
  (2, 1, 'ATM Point – Ubungo','Ubungo Plaza, Dar es Salaam', 2, 'Night Shift (18:00–06:00)','Amina Said', 'high',   'active'),
  (3, 2, 'HQ Building',      'Mwenge, Dar es Salaam',       2, '24 Hours',                'Mary John',   'medium', 'active'),
  (4, 3, 'Dodoma Office',    'Dodoma Central',               3, 'Day Shift (06:00–18:00)', 'Peter Said',  'low',    'inactive'),
  (5, 4, 'Resort Grounds',   'Mwanza City Waterfront',       8, 'Night Shift (18:00–06:00)','Grace Mwita','medium', 'active');

-- ── Sample Security Guards ────────────────────────────────────────────────────
INSERT IGNORE INTO security_guards
  (guard_id, full_name, phone, email, national_id, address, gender,
   date_of_birth, next_of_kin_name, next_of_kin_phone, next_of_kin_relation,
   employment_date, guard_status)
VALUES
  (1, 'Hassan Juma Ally',    '+255712000001', 'hjally@ura.co.tz',   '19900101-12345-00001-1',
   'Kariakoo, Dar es Salaam',        'male',   '1990-01-01', 'Fatuma Ally',    '+255712000011', 'Wife',   '2022-03-01', 'active'),
  (2, 'Grace Peter Mwita',   '+255712000002', 'gpmwita@ura.co.tz',  '19920515-12345-00002-1',
   'Mwanza City',                    'female', '1992-05-15', 'Peter Mwita',    '+255712000012', 'Father', '2023-01-10', 'active'),
  (3, 'Juma Mohammed Said',  '+255712000003', 'jmsaid@ura.co.tz',   '19880320-12345-00003-1',
   'Arusha City',                    'male',   '1988-03-20', 'Aisha Said',     '+255712000013', 'Sister', '2021-06-01', 'active'),
  (4, 'Mary Michael Shuma',  '+255712000004', 'mmshuma@ura.co.tz',  '19950710-12345-00004-1',
   'Sinza, Dar es Salaam',           'female', '1995-07-10', 'Michael Shuma',  '+255712000014', 'Brother','2023-08-15', 'inactive'),
  (5, 'Ali Rashid Hamad',    '+255712000005', 'arhamad@ura.co.tz',  '19930218-12345-00005-1',
   'Temeke, Dar es Salaam',          'male',   '1993-02-18', 'Zainab Hamad',   '+255712000015', 'Mother', '2022-11-01', 'active'),
  (6, 'Amina Soud Omar',     '+255712000006', 'asomar@ura.co.tz',   '19961105-12345-00006-1',
   'Stone Town, Zanzibar',           'female', '1996-11-05', 'Soud Omar',      '+255712000016', 'Father', '2024-01-15', 'active'),
  (7, 'Bernard Elias Mlay',  '+255712000007', 'bemlay@ura.co.tz',   '19870612-12345-00007-1',
   'Moshi, Kilimanjaro',             'male',   '1987-06-12', 'Rose Mlay',      '+255712000017', 'Wife',   '2020-05-01', 'active');

-- ── Sample Assignments ────────────────────────────────────────────────────────
INSERT IGNORE INTO guard_assignments
  (assignment_id, guard_id, client_id, site_id, shift, start_date, end_date, status)
VALUES
  (1, 1, 1, 1, 'Day Shift (06:00–18:00)',    '2024-01-01', NULL,         'active'),
  (2, 2, 4, 5, 'Night Shift (18:00–06:00)',  '2023-08-10', NULL,         'active'),
  (3, 3, 3, 4, 'Day Shift (06:00–18:00)',    '2021-06-01', '2022-05-31', 'completed'),
  (4, 5, 2, 3, '24 Hours',                   '2022-11-01', NULL,         'active'),
  (5, 6, 1, 2, 'Night Shift (18:00–06:00)',  '2024-01-15', NULL,         'active');

-- ── Seed assignment history ───────────────────────────────────────────────────
INSERT IGNORE INTO assignment_history
  (assignment_id, action, notes)
VALUES
  (1, 'created',   'Initial assignment'),
  (2, 'created',   'Initial assignment'),
  (3, 'created',   'Initial assignment'),
  (3, 'completed', 'Contract ended after 12 months'),
  (4, 'created',   'Initial assignment'),
  (5, 'created',   'Initial assignment');
