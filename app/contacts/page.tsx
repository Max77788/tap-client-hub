"use client";

import { useMemo, useState } from "react";
import type { Client } from "@/lib/types";
import { matchesClientSearch } from "@/lib/data";
import { useClients } from "@/hooks/use-clients-context";
import { PageSkeleton } from "@/components/loading-skeleton";

/**
 * Temporary Google Contacts-style directory.
 * It projects only the existing TAP Hub Client fields. A dedicated contact
 * schema can replace these mappings without changing the directory layout.
 */
export default function ContactsPage() {
  const { clients, loading } = useClients();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const contacts = useMemo(
    () => clients
      .filter((client) => matchesClientSearch(client, search))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [clients, search],
  );
  const selected = useMemo(
    () => (selectedId ? clients.find((client) => client.id === selectedId) ?? null : null),
    [clients, selectedId],
  );

  if (loading) return <PageSkeleton rows={8} />;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="search max-w-2xl flex-1" aria-label="Search contacts">
            <span className="mag"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts" />
          </label>
          <p className="text-xs text-[var(--muted)]">Contact records currently mirror existing client fields.</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div>
            <h2 className="text-xl font-medium text-[var(--ink)]">Contacts <span className="text-sm text-[var(--muted)]">({contacts.length})</span></h2>
            <p className="mt-1 text-xs text-[var(--muted)]">A-z directory based on current TAP Hub client records</p>
          </div>
          <div className="flex items-center gap-2 text-[var(--muted)]" aria-label="Directory actions">
            <span className="rounded-full p-2 text-lg" title="Print available when contact data is finalized">⎙</span>
            <span className="rounded-full p-2 text-lg" title="Export available when contact data is finalized">⇧</span>
            <span className="rounded-full p-2 text-lg">⋮</span>
          </div>
        </div>
        <div className="hidden grid-cols-[44px_minmax(220px,1.4fr)_minmax(200px,1fr)_minmax(170px,0.8fr)] items-center gap-4 border-b border-[var(--line)] bg-[var(--paper)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] md:grid">
          <span /><span>Name</span><span>Email</span><span>Phone number</span>
        </div>
        {contacts.length ? contacts.map((client) => <ContactRow key={client.id} client={client} onOpen={() => setSelectedId(client.id)} />) : (
          <div className="px-5 py-16 text-center"><p className="font-medium text-[var(--ink)]">No contacts found</p><button onClick={() => setSearch("")} className="mt-2 text-sm font-medium text-[var(--teal)] hover:underline">Clear search</button></div>
        )}
      </section>

      {selected && <ContactProfile client={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function ContactRow({ client, onOpen }: { client: Client; onOpen: () => void }) {
  const initial = (client.name || "?").trim().charAt(0).toUpperCase();
  const email = client.emails?.find(Boolean) || "No email on file";
  const phone = client.phones?.find(Boolean) || "No phone on file";

  return (
    <button onClick={onOpen} className="group grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-3 border-b border-[var(--line)] px-5 py-3 text-left transition-colors hover:bg-[var(--teal-soft)]/50 md:grid-cols-[44px_minmax(220px,1.4fr)_minmax(200px,1fr)_minmax(170px,0.8fr)] md:gap-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dbe7f6] text-sm font-semibold text-[#325f94]">{initial}</span>
      <span className="min-w-0"><span className="block truncate text-sm font-medium text-[var(--ink)]">{client.name}</span><span className="mt-0.5 block truncate text-xs text-[var(--muted)] md:hidden">{email}</span></span>
      <span className="hidden truncate text-sm text-[var(--ink)] md:block">{email}</span>
      <span className="hidden truncate text-sm text-[var(--ink)] md:block">{phone}</span>
    </button>
  );
}

function ContactProfile({ client, onClose }: { client: Client; onClose: () => void }) {
  const initial = (client.name || "?").trim().charAt(0).toUpperCase();
  const email = client.emails?.find(Boolean);
  const phone = client.phones?.find(Boolean);
  const location = [client.address, [client.city, client.state, client.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const subtitle = client.group || `${client.type} contact`;

  return (
    <section className="fixed inset-0 z-[60] overflow-y-auto bg-[var(--paper)] text-[var(--ink)]" aria-label={`Contact profile for ${client.name}`}>
      <div className="mx-auto min-h-full max-w-6xl px-5 py-5 sm:px-8 sm:py-7">
        <header className="flex items-center justify-between gap-4">
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[var(--muted)] hover:bg-[var(--teal-soft)]" aria-label="Back to contacts">←</button>
          <div className="flex items-center gap-2"><button className="hidden h-10 w-10 rounded-full text-lg text-[#2367d1] hover:bg-[#e8f0fe] sm:block" aria-label="Favorite contact">★</button><button className="rounded-full bg-[#1a73e8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm">Edit</button><button className="hidden h-10 w-10 rounded-full text-[var(--muted)] sm:block" aria-label="More contact actions">⋮</button></div>
        </header>

        <div className="mt-10 flex flex-col items-center gap-6 text-center sm:mt-12 sm:flex-row sm:items-center sm:text-left">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-[#5f6ec5] text-6xl font-medium text-white shadow-sm">{initial}</div>
          <div className="min-w-0"><h2 className="truncate text-3xl font-normal tracking-tight sm:text-4xl">{client.name}</h2><p className="mt-2 text-base text-[var(--muted)]">{subtitle}</p></div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-5 border-b border-[var(--line)] pb-7">
          <ProfileAction icon="✉" label="Email" href={email ? `mailto:${email}` : undefined} />
          <ProfileAction icon="◷" label="Schedule" />
          <ProfileAction icon="▢" label="Chat" />
          <ProfileAction icon="◉" label="Video" />
        </div>

        <div className="mt-6"><span className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium text-[#1a73e8]">+ Label</span></div>
        <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
          <article className="rounded-2xl bg-[#eef3fb] p-5 sm:p-6"><h3 className="text-lg font-semibold">Contact details</h3><div className="mt-4 space-y-4"><ContactDetail icon="✉" value={email || "Add email"} href={email ? `mailto:${email}` : undefined} /><ContactDetail icon="☎" value={phone || "Add phone"} hint={phone ? "Primary" : undefined} href={phone ? `tel:${phone}` : undefined} /><ContactDetail icon="⌖" value={location || "Add address"} /><ContactDetail icon="▣" value={client.cid ? `CID ${client.cid}` : "Client ID pending"} /></div></article>
          <aside className="px-1 py-4"><h3 className="text-lg font-semibold">History</h3><p className="mt-4 text-sm text-[var(--muted)]">Contact activity will appear here when the dedicated contact data is uploaded.</p><div className="mt-5 border-t border-[var(--line)] pt-4 text-sm"><p className="font-medium">Existing TAP Hub client record</p><p className="mt-1 text-[var(--muted)]">Current record fields are displayed as a temporary contact projection.</p></div></aside>
        </div>
      </div>
    </section>
  );
}

function ProfileAction({ icon, label, href }: { icon: string; label: string; href?: string }) {
  const inner = <><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e5e8eb] text-lg text-[#5f6368]">{icon}</span><span className="text-xs font-medium">{label}</span></>;
  return href ? <a href={href} className="flex flex-col items-center gap-1.5 text-[var(--ink)] hover:text-[#1a73e8]">{inner}</a> : <button type="button" className="flex flex-col items-center gap-1.5 text-[var(--ink)]">{inner}</button>;
}

function ContactDetail({ icon, value, hint, href }: { icon: string; value: string; hint?: string; href?: string }) {
  const content = <><span className="w-7 shrink-0 text-lg text-[#4f5963]">{icon}</span><span className="min-w-0"><span className="block break-words text-[15px] text-[#1a73e8]">{value}</span>{hint && <span className="mt-0.5 block text-xs text-[var(--muted)]">{hint}</span>}</span></>;
  return href ? <a href={href} className="flex items-center gap-3">{content}</a> : <div className="flex items-center gap-3">{content}</div>;
}
