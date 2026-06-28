-- ═══════════════════════════════════════════════════════
-- Migration 003: Add email column, fix reporting_manager type
-- ═══════════════════════════════════════════════════════

-- Add email column to profiles (for storing actual sign-in email)
alter table tap_hub_project.profiles
  add column if not exists email text;

-- Change reporting_manager from uuid to text (UI sends names, not IDs)
alter table tap_hub_project.profiles
  alter column reporting_manager type text using reporting_manager::text;
