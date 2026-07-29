-- Contacts can represent either a current client contact or TAP's internal team.
alter table tap_hub_project.contacts
  add column if not exists category text not null default 'client';

alter table tap_hub_project.contacts
  alter column client_id drop not null;

alter table tap_hub_project.contacts
  drop constraint if exists contacts_category_check;

alter table tap_hub_project.contacts
  add constraint contacts_category_check
  check (category in ('client', 'internal'));

create index if not exists contacts_category_idx
  on tap_hub_project.contacts (category);

grant select, insert, update, delete on tap_hub_project.contacts
  to service_role;

notify pgrst, 'reload schema';
