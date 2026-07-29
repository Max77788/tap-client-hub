"use client";

import { useEffect, useMemo, useState } from "react";
import { PageSkeleton } from "@/components/loading-skeleton";

type ClientOption = { id: string; name: string; cid?: string | null };
type Contact = {
  id: string;
  client_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_primary: boolean;
  client: {
    id: string;
    name: string;
    cid?: string | null;
    type?: string | null;
    group_name?: string | null;
    group_owner?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
};

const inputClass = "mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#dbeafe]";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [adding, setAdding] = useState(false);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/contacts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load contacts");
      setContacts(data.contacts || []);
      setClients(data.clients || []);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadContacts(); }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter(contact => [contact.name, contact.email, contact.phone, contact.client?.name, contact.client?.cid]
      .some(value => String(value || "").toLowerCase().includes(query)));
  }, [contacts, search]);

  if (loading) return <PageSkeleton rows={8} />;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="search max-w-2xl flex-1" aria-label="Search contacts">
            <span className="mag"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search current TAP contacts" />
          </label>
          <button onClick={() => setAdding(true)} className="rounded-lg bg-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1558b0]">+ Add</button>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">Only contacts saved in the current TAP database appear here.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div>
            <h2 className="text-xl font-medium text-[var(--ink)]">Contacts <span className="text-sm text-[var(--muted)]">({filtered.length})</span></h2>
            <p className="mt-1 text-xs text-[var(--muted)]">A-z directory of current TAP contact records</p>
          </div>
        </div>
        <div className="hidden grid-cols-[44px_minmax(180px,1.1fr)_minmax(180px,1fr)_minmax(160px,0.8fr)_minmax(180px,1fr)] items-center gap-4 border-b border-[var(--line)] bg-[var(--paper)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] lg:grid">
          <span /><span>Name</span><span>Email</span><span>Phone number</span><span>Client</span>
        </div>
        {loadError ? <div className="px-5 py-16 text-center"><p className="font-medium text-red-700">{loadError}</p><button onClick={() => void loadContacts()} className="mt-2 text-sm font-medium text-[var(--teal)] hover:underline">Try again</button></div>
          : filtered.length ? filtered.map(contact => <ContactRow key={contact.id} contact={contact} onOpen={() => setSelected(contact)} />)
            : <div className="px-5 py-16 text-center"><p className="font-medium text-[var(--ink)]">No contacts found</p><p className="mt-1 text-sm text-[var(--muted)]">Use + Add to create the first contact for a current TAP client.</p></div>}
      </section>

      {selected && <ContactProfile contact={selected} onClose={() => setSelected(null)} />}
      {adding && <AddContactModal clients={clients} onClose={() => setAdding(false)} onCreated={async () => { setAdding(false); await loadContacts(); }} />}
    </div>
  );
}

function ContactRow({ contact, onOpen }: { contact: Contact; onOpen: () => void }) {
  const initial = (contact.name || "?").trim().charAt(0).toUpperCase();
  return <button onClick={onOpen} className="group grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-3 border-b border-[var(--line)] px-5 py-3 text-left transition-colors hover:bg-[var(--teal-soft)]/50 lg:grid-cols-[44px_minmax(180px,1.1fr)_minmax(180px,1fr)_minmax(160px,0.8fr)_minmax(180px,1fr)] lg:gap-4">
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dbe7f6] text-sm font-semibold text-[#325f94]">{initial}</span>
    <span className="min-w-0"><span className="block truncate text-sm font-medium text-[var(--ink)]">{contact.name}</span><span className="mt-0.5 block truncate text-xs text-[var(--muted)] lg:hidden">{contact.email || "No email on file"}</span></span>
    <span className="hidden truncate text-sm text-[var(--ink)] lg:block">{contact.email || "No email on file"}</span>
    <span className="hidden truncate text-sm text-[var(--ink)] lg:block">{contact.phone || "No phone on file"}</span>
    <span className="hidden truncate text-sm text-[var(--ink)] lg:block">{contact.client?.name || "Current TAP client"}</span>
  </button>;
}

function ContactProfile({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const initial = (contact.name || "?").trim().charAt(0).toUpperCase();
  const client = contact.client;
  const location = [client?.address, [client?.city, client?.state, client?.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return <section className="fixed inset-0 z-[60] overflow-y-auto bg-[var(--paper)] text-[var(--ink)]" aria-label={`Contact profile for ${contact.name}`}>
    <div className="mx-auto min-h-full max-w-6xl px-5 py-5 sm:px-8 sm:py-7">
      <header className="flex items-center justify-between gap-4"><button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[var(--muted)] hover:bg-[var(--teal-soft)]" aria-label="Back to contacts">←</button><button onClick={onClose} className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold">Done</button></header>
      <div className="mt-10 flex flex-col items-center gap-6 text-center sm:mt-12 sm:flex-row sm:items-center sm:text-left"><div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-[#5f6ec5] text-6xl font-medium text-white shadow-sm">{initial}</div><div className="min-w-0"><h2 className="truncate text-3xl font-normal tracking-tight sm:text-4xl">{contact.name}</h2><p className="mt-2 text-base text-[var(--muted)]">{client?.name || "Current TAP client contact"}{contact.is_primary ? " · Primary contact" : ""}</p></div></div>
      {contact.email && <div className="mt-8 flex border-b border-[var(--line)] pb-7"><a href={`mailto:${contact.email}`} className="flex flex-col items-center gap-1.5 text-[var(--ink)] hover:text-[#1a73e8]"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e5e8eb] text-lg text-[#5f6368]">✉</span><span className="text-xs font-medium">Email</span></a></div>}
      <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]"><article className="rounded-2xl bg-[#eef3fb] p-5 sm:p-6"><h3 className="text-lg font-semibold">Contact details</h3><div className="mt-4 space-y-4"><ContactDetail icon="✉" value={contact.email || "No email on file"} href={contact.email ? `mailto:${contact.email}` : undefined} /><ContactDetail icon="☎" value={contact.phone || "No phone on file"} href={contact.phone ? `tel:${contact.phone}` : undefined} /><ContactDetail icon="⌖" value={location || "No address on file"} /><ContactDetail icon="▣" value={client?.cid ? `CID ${client.cid}` : "Client ID pending"} /></div></article><aside className="px-1 py-4"><h3 className="text-lg font-semibold">TAP client</h3><p className="mt-4 text-sm text-[var(--muted)]">{client?.name || "Current TAP client"}</p><p className="mt-1 text-sm text-[var(--muted)]">{client?.group_name || client?.group_owner || client?.type || ""}</p></aside></div>
    </div>
  </section>;
}

function AddContactModal({ clients, onClose, onCreated }: { clients: ClientOption[]; onClose: () => void; onCreated: () => Promise<void> }) {
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try { const response = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, name, email, phone, isPrimary }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to add contact"); await onCreated(); } catch (err) { setError(err instanceof Error ? err.message : "Unable to add contact"); } finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-5" onClick={onClose}><form onSubmit={submit} onClick={event => event.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-[var(--paper)] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Add contact</h2><p className="mt-1 text-sm text-[var(--muted)]">Attach the contact to a current TAP client.</p></div><button type="button" onClick={onClose} aria-label="Close">✕</button></div><label className="mt-5 block text-sm font-medium">TAP client<select required value={clientId} onChange={event => setClientId(event.target.value)} className={inputClass}><option value="">Select client</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}{client.cid ? ` (${client.cid})` : ""}</option>)}</select></label><label className="mt-4 block text-sm font-medium">Contact name<input required value={name} onChange={event => setName(event.target.value)} className={inputClass} placeholder="Full name" autoFocus /></label><label className="mt-4 block text-sm font-medium">Email<input value={email} onChange={event => setEmail(event.target.value)} className={inputClass} placeholder="name@example.com" type="email" /></label><label className="mt-4 block text-sm font-medium">Phone<input value={phone} onChange={event => setPhone(event.target.value)} className={inputClass} placeholder="(713) 555-0100" type="tel" /></label><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={isPrimary} onChange={event => setIsPrimary(event.target.checked)} /> Primary contact for this client</label>{error && <p className="mt-4 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-lg bg-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Adding…" : "Add contact"}</button></div></form></div>;
}

function ContactDetail({ icon, value, href }: { icon: string; value: string; href?: string }) { const content = <><span className="w-7 shrink-0 text-lg text-[#4f5963]">{icon}</span><span className="min-w-0 break-words text-[15px] text-[#1a73e8]">{value}</span></>; return href ? <a href={href} className="flex items-center gap-3">{content}</a> : <div className="flex items-center gap-3">{content}</div>; }
