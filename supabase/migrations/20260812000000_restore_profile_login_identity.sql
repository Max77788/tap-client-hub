-- The self-hosted database restore omitted two application-level profile columns.
-- TAP Hub resolves usernames through profiles.email and determines edit access through
-- allow_edit_client_data. Restore both fields and the known login identities.

BEGIN;

ALTER TABLE tap_hub_project.profiles
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE tap_hub_project.profiles
  ADD COLUMN IF NOT EXISTS allow_edit_client_data boolean NOT NULL DEFAULT false;

UPDATE tap_hub_project.profiles
SET email = CASE
  WHEN full_name = 'Patil, Tushar' THEN 'tushar@tapallc.com'
  WHEN full_name = 'Esparza, Lizette' THEN 'lizette@tapallc.com'
  WHEN replace(full_name, ' ', '') = 'Kulkarni,Shilpa' THEN 'shilpa@tapallc.com'
  WHEN replace(full_name, ' ', '') = 'Noguera,Janeth' THEN 'janeth@tapallc.com'
  WHEN replace(full_name, ' ', '') = 'Edwards,Bonnie' THEN 'bonnie@tapallc.com'
  WHEN full_name = 'Patil, Sam' THEN 'sam@tapallc.com'
  WHEN full_name = 'Patil, Amruta' THEN 'amruta@tapallc.com'
  WHEN replace(full_name, ' ', '') = 'Ortega,Alvaro' THEN 'alvaro@tapallc.com'
  WHEN replace(full_name, ' ', '') = 'Panchasara,Sanket' THEN 'sanket@tapallc.com'
  WHEN full_name = 'Ben' THEN 'ben@aifusioniqlabs.com'
  WHEN full_name = 'Matronin, Max' THEN 'mmatronin@gmail.com'
  WHEN full_name = 'Staff Test' THEN 'staff@tapallc.com'
  ELSE email
END
WHERE email IS NULL;

UPDATE tap_hub_project.profiles
SET allow_edit_client_data = true
WHERE lower(role) IN ('owner', 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tap_hub_project.profiles
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
