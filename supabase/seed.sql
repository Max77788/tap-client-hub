-- TAP Client Hub: Seed data from Google Sheets
-- 50 clients, 6 service types, ~121 service assignments
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, type TEXT DEFAULT 'Business',
  group_owner TEXT, city TEXT, state TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  frequency TEXT DEFAULT 'monthly', processor TEXT,
  assigned_to TEXT, expected_annual INTEGER DEFAULT 12,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, service_id)
);

CREATE TABLE IF NOT EXISTS public.period_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_service_id UUID REFERENCES public.client_services(id) ON DELETE CASCADE,
  period TEXT NOT NULL, processed INTEGER DEFAULT 0,
  expected INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_service_id, period)
);

-- Service types
INSERT INTO public.services (code, label) VALUES
('FN', 'Financials'),
('PR', 'Payroll'),
('ST', 'Sales Tax'),
('T9', '1099S'),
('RD', 'Renditions'),
('TR', 'Tax Returns')
ON CONFLICT (code) DO NOTHING;

-- 50 clients
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'ASC Anesthesia Associates Inc', 'Business', 'Unassigned', 'Saratoga', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'ASC Anesthesia Associates Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Aaron Edwards PLLC (dba Katy Dental Studio)', 'Business', 'Unassigned', 'Katy', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Aaron Edwards PLLC (dba Katy Dental Studio)');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Acclaimed Trading Inc', 'Business', 'RPBS/Outside Shareholders', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Acclaimed Trading Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'American Book Buy.Com Inc (MI)', 'Business', 'RPBS/Outside Shareholders', 'Detroit', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'American Book Buy.Com Inc (MI)');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Back to Naturel LLC', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Back to Naturel LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Barclay Operations LLC', 'Business', 'Malik', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Barclay Operations LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Bdantowitz LLC', 'Business', 'Unassigned', 'Brighton', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Bdantowitz LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Benry Utility Services LLC', 'Business', 'Unassigned', 'Cypress', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Benry Utility Services LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Bianca Asan Borja MD PLLC', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Bianca Asan Borja MD PLLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'C&H Transportation & Bus Rentals LLC', 'Business', 'Ron', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'C&H Transportation & Bus Rentals LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Carlin Barnes MD PA', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Carlin Barnes MD PA');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Chimique International Inc', 'Business', 'Unassigned', 'Round Rock', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Chimique International Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Clark, Duncan & Morris Inc', 'Business', 'Peter M', 'Sugar Land', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Clark, Duncan & Morris Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'D\''''Souza Inc (Wallisville Dry Clean Super Center)', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'D\''''Souza Inc (Wallisville Dry Clean Super Center)');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'DMW Food Services LLC', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'DMW Food Services LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Devyani Management LLC', 'Business', 'Shonali', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Devyani Management LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Diastar Inc', 'Business', 'Shefali', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Diastar Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Drift Dynamics LLC', 'Business', 'Assem & Saood', 'Missouri City', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Drift Dynamics LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Dunn\''''s Valve Testers Inc', 'Business', 'Micah Simmons', 'Spring', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Dunn\''''s Valve Testers Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'ERE Industrial LLC', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'ERE Industrial LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'FF&E Solutions LLC', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'FF&E Solutions LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'GV Steel LLC', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'GV Steel LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Galaxy Interests Inc', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Galaxy Interests Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Galloper Chauffeured Services LLC', 'Business', 'Ghaz Hamdani', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Galloper Chauffeured Services LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Gastro Concepts LP', 'Business', 'Shammi', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Gastro Concepts LP');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Global Dealership Services LLC', 'Business', 'Moe Elmorabit', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Global Dealership Services LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Global Omni LLC', 'Business', 'Manish Maheshwari', 'Fulshear', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Global Omni LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Grindmasters Inc', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Grindmasters Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Gulf Shores Auto Traders LLC', 'Business', 'Unassigned', 'Rosenberg', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Gulf Shores Auto Traders LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'H & P Wealth Management LLC', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'H & P Wealth Management LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Hadimba Travel Inc', 'Business', 'Unassigned', 'Cypress', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Hadimba Travel Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Hot and Buttered LLC', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Hot and Buttered LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'India House Inc', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'India House Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Iqbal M Mirza MD Professional Corporation', 'Business', 'Unassigned', 'Saratoga', 'CA'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Iqbal M Mirza MD Professional Corporation');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'JAP Construction Company LLC', 'Business', 'Unassigned', 'Sugar Land', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'JAP Construction Company LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Jai Ganesh Hospitality Inc', 'Business', 'Unassigned', 'Canaan', 'ME'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Jai Ganesh Hospitality Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Jhan Foods LLC (dba Khaugully Indian Kitchen)', 'Business', 'Unassigned', 'Spring', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Jhan Foods LLC (dba Khaugully Indian Kitchen)');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'KB Kitchen & Bath Remodeling LLC', 'Business', 'Sam Samara Group', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'KB Kitchen & Bath Remodeling LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'LDH 2020 LLC (dba Diamond Food Mart)', 'Business', 'Unassigned', 'Beaumont', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'LDH 2020 LLC (dba Diamond Food Mart)');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Lonestar Steel & Tubing Inc', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Lonestar Steel & Tubing Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Marace Realty Co LLC', 'Business', 'Josh Davis', 'Pearland', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Marace Realty Co LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Max Box Rentals LLC', 'Business', 'Josh Davis', 'Pearland', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Max Box Rentals LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Mohan Lal Enterprises Inc', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Mohan Lal Enterprises Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'NIC Group Inc', 'Business', 'Unassigned', 'Spring', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'NIC Group Inc');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Pramukh Drashti PA (dba Vision Source Richmond)', 'Business', 'Unassigned', 'Richmond', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Pramukh Drashti PA (dba Vision Source Richmond)');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Pristine Energy LLC (dba San Marcos Apartment)', 'Business', 'Shonali', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Pristine Energy LLC (dba San Marcos Apartment)');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Revived Wellness 2 LLC', 'Business', 'Unassigned', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Revived Wellness 2 LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Sarriya LLC', 'Business', 'Unassigned', 'Sugar Land', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Sarriya LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'The Cedar Tree Mediterranean Grill & Café LLC', 'Business', 'Kafil M', 'Lago Vista', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'The Cedar Tree Mediterranean Grill & Café LLC');
INSERT INTO public.clients (name, type, group_owner, city, state)
SELECT 'Valvitalia USA Inc', 'Business', 'Leslie Bernal', 'Houston', 'TX'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Valvitalia USA Inc');

-- Client-Service links
DO $$
DECLARE
  v_client_id UUID;
  v_service_id UUID;
BEGIN

  -- ASC Anesthesia Associates Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'ASC Anesthesia Associates Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Shilpa', 'Shilpa', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Shilpa', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Aaron Edwards PLLC (dba Katy Dental Studio)
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Aaron Edwards PLLC (dba Katy Dental Studio)' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Janeth', 'Janeth', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Acclaimed Trading Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Acclaimed Trading Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Sam', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- American Book Buy.Com Inc (MI)
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'American Book Buy.Com Inc (MI)' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Sam', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Back to Naturel LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Back to Naturel LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Quarterly', 'Sam', 'Sam', 4, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Barclay Operations LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Barclay Operations LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Sam', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Bdantowitz LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Bdantowitz LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Benry Utility Services LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Benry Utility Services LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Weekly', 'Lizette', 'Lizette', 52, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Lizette', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Lizette', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Bianca Asan Borja MD PLLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Bianca Asan Borja MD PLLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- C&H Transportation & Bus Rentals LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'C&H Transportation & Bus Rentals LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Janeth', 'Janeth', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Carlin Barnes MD PA
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Carlin Barnes MD PA' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Semi-Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Chimique International Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Chimique International Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Quarterly', 'Sam', 'Janeth', 4, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Clark, Duncan & Morris Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Clark, Duncan & Morris Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Sam', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'RD' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'LB', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'T9' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'JD', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- D\''Souza Inc (Wallisville Dry Clean Super Center)
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'D\''''Souza Inc (Wallisville Dry Clean Super Center)' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'weekly', 'Lizette', 'Lizette', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Lizette', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Lizette', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- DMW Food Services LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'DMW Food Services LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Janeth', 'Janeth', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Devyani Management LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Devyani Management LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'RD' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'LB', 'LB', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'T9' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'JD', 'LB', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'LB', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Diastar Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Diastar Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Yearly', 'Sam', 'Sam', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Drift Dynamics LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Drift Dynamics LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Quarterly', 'Sam', 'Sam', 4, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Dunn\''s Valve Testers Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Dunn\''''s Valve Testers Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Sam', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- ERE Industrial LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'ERE Industrial LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Janeth', 'Janeth', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- FF&E Solutions LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'FF&E Solutions LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Janeth', 'Janeth', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- GV Steel LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'GV Steel LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Quarterly', 'Sam', 'Sam', 4, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Galaxy Interests Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Galaxy Interests Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Galloper Chauffeured Services LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Galloper Chauffeured Services LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Gastro Concepts LP
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Gastro Concepts LP' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Sam', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Global Dealership Services LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Global Dealership Services LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Janeth', 'Janeth', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Quarterly', 'Sam', 'Janeth', 4, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Global Omni LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Global Omni LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Sam', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Grindmasters Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Grindmasters Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Quarterly', 'Sam', 'Sam', 4, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Gulf Shores Auto Traders LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Gulf Shores Auto Traders LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Quarterly', 'Sam', 'Sam', 4, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- H & P Wealth Management LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'H & P Wealth Management LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Semi-Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Hadimba Travel Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Hadimba Travel Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Hot and Buttered LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Hot and Buttered LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Sam', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- India House Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'India House Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Semi-Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Iqbal M Mirza MD Professional Corporation
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Iqbal M Mirza MD Professional Corporation' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Janeth', 'Janeth', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- JAP Construction Company LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'JAP Construction Company LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Jai Ganesh Hospitality Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Jai Ganesh Hospitality Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Jhan Foods LLC (dba Khaugully Indian Kitchen)
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Jhan Foods LLC (dba Khaugully Indian Kitchen)' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Semi-Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- KB Kitchen & Bath Remodeling LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'KB Kitchen & Bath Remodeling LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Quarterly', 'Sam', 'Sam', 4, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- LDH 2020 LLC (dba Diamond Food Mart)
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'LDH 2020 LLC (dba Diamond Food Mart)' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Janeth', 'Janeth', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Lonestar Steel & Tubing Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Lonestar Steel & Tubing Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Janeth', 'Janeth', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Quarterly', 'Sam', 'Janeth', 4, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Marace Realty Co LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Marace Realty Co LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'RD' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'LB', 'LB', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'T9' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'JD', 'LB', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'LB', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Max Box Rentals LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Max Box Rentals LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Sam', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'RD' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'LB', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'T9' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'JD', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Sam', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Mohan Lal Enterprises Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Mohan Lal Enterprises Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- NIC Group Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'NIC Group Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Janeth', 'Janeth', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Yearly', 'Sam', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Pramukh Drashti PA (dba Vision Source Richmond)
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Pramukh Drashti PA (dba Vision Source Richmond)' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Janeth', 'Janeth', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Quarterly', 'Sam', 'Janeth', 4, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Pristine Energy LLC (dba San Marcos Apartment)
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Pristine Energy LLC (dba San Marcos Apartment)' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'RD' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'LB', 'LB', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'T9' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'JD', 'LB', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'LB', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Revived Wellness 2 LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Revived Wellness 2 LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Janeth', 'Janeth', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Monthly', 'Sam', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Sarriya LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Sarriya LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Semi-Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Quarterly', 'Sam', 'Janeth', 4, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- The Cedar Tree Mediterranean Grill & Café LLC
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'The Cedar Tree Mediterranean Grill & Café LLC' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Bi-Weekly', 'Janeth', 'Janeth', 26, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Quarterly', 'Sam', 'Janeth', 4, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;

  -- Valvitalia USA Inc
  SELECT id INTO v_client_id FROM public.clients WHERE name = 'Valvitalia USA Inc' LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE code = 'PR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Semi-Monthly', 'Janeth', 'Janeth', 12, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'ST' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Quarterly', 'Sam', 'Janeth', 4, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
    SELECT id INTO v_service_id FROM public.services WHERE code = 'TR' LIMIT 1;
    INSERT INTO public.client_services (client_id, service_id, frequency, processor, assigned_to, expected_annual, active)
    VALUES (v_client_id, v_service_id, 'Annually', 'TA', 'Janeth', 1, true)
    ON CONFLICT (client_id, service_id) DO NOTHING;
  END IF;
END $$;

-- Stats: 50 clients, 121 service links, 6 service types