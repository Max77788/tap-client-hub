-- Dedicated, current TAP contact records for the Contacts tab.
-- Contacts are tied to an active TAP client and are no longer inferred from client email/phone fields.
create table if not exists tap_hub_project.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references tap_hub_project.clients(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_client_id_idx on tap_hub_project.contacts (client_id);
create index if not exists contacts_name_idx on tap_hub_project.contacts (name);

-- Preserve the existing current-contact values from every active TAP client.
-- New Contacts-tab records remain independent of future client field changes.
insert into tap_hub_project.contacts (client_id, name, email, phone, is_primary)
select
  client.id,
  coalesce(nullif(trim(client.key_name), ''), client.name),
  nullif(split_part(trim(both '{}\"' from coalesce(client.emails, '')), ',', 1), ''),
  nullif(split_part(trim(both '{}\"' from coalesce(client.phones, '')), ',', 1), ''),
  true
from tap_hub_project.clients client
where client.status = 'active'
  and not exists (select 1 from tap_hub_project.contacts contact where contact.client_id = client.id);

grant select, insert, update, delete on tap_hub_project.contacts to service_role;
alter table tap_hub_project.contacts enable row level security;
notify pgrst, 'reload schema';
