"use client";

import { useEffect, useMemo, useState } from "react";
import type { Client } from "@/lib/types";
import { matchesClientSearch } from "@/lib/data";
import { useClients } from "@/hooks/use-clients-context";
import { PageSkeleton } from "@/components/loading-skeleton";

/** Temporary directory projected from current TAP Hub client records. */
export default function ContactsPage() {
  const { clients, loading, updateClient } = useClients();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const contacts = useMemo(() => clients.filter((client) => matchesClientSearch(client, search)).sort((a, b) => a.name.localeCompare(b.name)), [clients, search]);
  const selected = useMemo(() => selectedId ? clients.find((client) => client.id === selectedId) ?? null : null, [clients, selectedId]);

  const saveContact = async (updated: Client) => {
    const response = await fetch("/api/clients", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Unable to save contact changes");
    }
    updateClient(updated.id, updated);
  };

  if (loading) return <PageSkeleton rows={8} />;
  return <div className="space-y-5">
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><label className="search max-w-2xl flex-1" aria-label="Search contacts"><span className="mag"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts" /></label><p className="text-xs text-[var(--muted)]">Contact records currently mirror existing client fields.</p></div></section>
    <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm"><div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4"><div><h2 className="text-xl font-medium text-[var(--ink)]">Contacts <span className="text-sm text-[var(--muted)]">({contacts.length})</span></h2><p className="mt-1 text-xs text-[var(--muted)]">A-z directory based on current TAP Hub client records</p></div></div><div className="hidden grid-cols-[44px_minmax(220px,1.4fr)_minmax(200px,1fr)_minmax(170px,0.8fr)] items-center gap-4 border-b border-[var(--line)] bg-[var(--paper)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] md:grid"><span /><span>Name</span><span>Email</span><span>Phone number</span></div>{contacts.length ? contacts.map((client) => <ContactRow key={client.id} client={client} onOpen={() => setSelectedId(client.id)} />) : <div className="px-5 py-16 text-center"><p className="font-medium text-[var(--ink)]">No contacts found</p><button onClick={() => setSearch("")} className="mt-2 text-sm font-medium text-[var(--teal)] hover:underline">Clear search</button></div>}</section>
    {selected && <ContactProfile client={selected} onClose={() => setSelectedId(null)} onSave={saveContact} />}
  </div>;
}

function ContactRow({ client, onOpen }: { client: Client; onOpen: () => void }) {
  const initial = (client.name || "?").trim().charAt(0).toUpperCase();
  const email = client.emails?.find(Boolean) || "No email on file";
  const phone = client.phones?.find(Boolean) || "No phone on file";
  return <button onClick={onOpen} className="group grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-3 border-b border-[var(--line)] px-5 py-3 text-left transition-colors hover:bg-[var(--teal-soft)]/50 md:grid-cols-[44px_minmax(220px,1.4fr)_minmax(200px,1fr)_minmax(170px,0.8fr)] md:gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dbe7f6] text-sm font-semibold text-[#325f94]">{initial}</span><span className="min-w-0"><span className="block truncate text-sm font-medium text-[var(--ink)]">{client.name}</span><span className="mt-0.5 block truncate text-xs text-[var(--muted)] md:hidden">{email}</span></span><span className="hidden truncate text-sm text-[var(--ink)] md:block">{email}</span><span className="hidden truncate text-sm text-[var(--ink)] md:block">{phone}</span></button>;
}

function ContactProfile({ client, onClose, onSave }: { client: Client; onClose: () => void; onSave: (updated: Client) => Promise<void> }) {
  const [favorite, setFavorite] = useState(false);
  const [editing, setEditing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(client.name);
  const [contact, setContact] = useState(client.contact || "");
  const [email, setEmail] = useState(client.emails?.find(Boolean) || "");
  const [phone, setPhone] = useState(client.phones?.find(Boolean) || "");
  const [address, setAddress] = useState(client.address || "");
  useEffect(() => { setFavorite(localStorage.getItem(`tap-contact-favorite-${client.id}`) === "true"); }, [client.id]);
  const initial = (client.name || "?").trim().charAt(0).toUpperCase();
  const location = [client.address, [client.city, client.state, client.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const subtitle = client.contact || client.group || `${client.type} contact`;
  const toggleFavorite = () => { const next = !favorite; setFavorite(next); localStorage.setItem(`tap-contact-favorite-${client.id}`, String(next)); };
  const copy = async (value: string, label: string) => { if (!value) return; await navigator.clipboard.writeText(value); setNotice(`${label} copied`); setMoreOpen(false); };
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { await onSave({ ...client, name, contact, emails: email ? [email] : [], phones: phone ? [phone] : [], address }); setEditing(false); setNotice("Contact updated"); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save contact changes"); } finally { setSaving(false); } };
  return <section className="fixed inset-0 z-[60] overflow-y-auto bg-[var(--paper)] text-[var(--ink)]" aria-label={`Contact profile for ${client.name}`}><div className="mx-auto min-h-full max-w-6xl px-5 py-5 sm:px-8 sm:py-7"><header className="flex items-center justify-between gap-4"><button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[var(--muted)] hover:bg-[var(--teal-soft)]" aria-label="Back to contacts">←</button><div className="relative flex items-center gap-2"><button type="button" onClick={toggleFavorite} aria-label="Favorite contact" aria-pressed={favorite} className={`hidden h-10 w-10 rounded-full text-lg hover:bg-[#e8f0fe] sm:block ${favorite ? "text-[#f5a000]" : "text-[#2367d1]"}`}>{favorite ? "★" : "☆"}</button><button type="button" onClick={() => setEditing(true)} className="rounded-full bg-[#1a73e8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm">Edit</button><button type="button" onClick={() => setMoreOpen((open) => !open)} className="hidden h-10 w-10 rounded-full text-[var(--muted)] hover:bg-[var(--teal-soft)] sm:block" aria-label="More contact actions" aria-expanded={moreOpen}>⋮</button>{moreOpen && <div className="absolute right-0 top-12 z-10 w-44 rounded-xl border border-[var(--line)] bg-white p-1 shadow-lg"><button type="button" disabled={!email} onClick={() => void copy(email, "Email")} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--teal-soft)] disabled:cursor-not-allowed disabled:opacity-40">Copy email</button><button type="button" disabled={!phone} onClick={() => void copy(phone, "Phone")} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--teal-soft)] disabled:cursor-not-allowed disabled:opacity-40">Copy phone</button><button type="button" onClick={onClose} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--teal-soft)]">Close profile</button></div>}</div></header>{notice && <p className="mt-3 text-right text-sm text-[#16794f]" role="status">{notice}</p>}<div className="mt-10 flex flex-col items-center gap-6 text-center sm:mt-12 sm:flex-row sm:items-center sm:text-left"><div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-[#5f6ec5] text-6xl font-medium text-white shadow-sm">{initial}</div><div className="min-w-0"><h2 className="truncate text-3xl font-normal tracking-tight sm:text-4xl">{client.name}</h2><p className="mt-2 text-base text-[var(--muted)]">{subtitle}</p></div></div><div className="mt-8 flex border-b border-[var(--line)] pb-7">{email && <a href={`mailto:${email}`} className="flex flex-col items-center gap-1.5 text-[var(--ink)] hover:text-[#1a73e8]"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e5e8eb] text-lg text-[#5f6368]">✉</span><span className="text-xs font-medium">Email</span></a>}</div><div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]"><article className="rounded-2xl bg-[#eef3fb] p-5 sm:p-6"><h3 className="text-lg font-semibold">Contact details</h3><div className="mt-4 space-y-4"><ContactDetail icon="✉" value={email || "Add email"} href={email ? `mailto:${email}` : undefined} /><ContactDetail icon="☎" value={phone || "Add phone"} href={phone ? `tel:${phone}` : undefined} /><ContactDetail icon="⌖" value={location || "Add address"} /><ContactDetail icon="▣" value={client.cid ? `CID ${client.cid}` : "Client ID pending"} /></div></article><aside className="px-1 py-4"><h3 className="text-lg font-semibold">History</h3><p className="mt-4 text-sm text-[var(--muted)]">Contact activity will appear here when the dedicated contact data is uploaded.</p></aside></div>{editing && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-5"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Edit contact</h2><p className="mt-1 text-sm text-[var(--muted)]">Updates the current TAP client record.</p></div><button type="button" onClick={() => setEditing(false)} aria-label="Close edit form">✕</button></div><label className="mt-5 block text-sm font-medium">Client name<input required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label><label className="mt-4 block text-sm font-medium">Contact person<input value={contact} onChange={(event) => setContact(event.target.value)} className={inputClass} /></label><label className="mt-4 block text-sm font-medium">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label><label className="mt-4 block text-sm font-medium">Phone<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} /></label><label className="mt-4 block text-sm font-medium">Address<input value={address} onChange={(event) => setAddress(event.target.value)} className={inputClass} /></label>{error && <p className="mt-4 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditing(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-lg bg-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button></div></form></div>}</div></section>;
}

const inputClass = "mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#dbeafe]";
function ContactDetail({ icon, value, href }: { icon: string; value: string; href?: string }) { const content = <><span className="w-7 shrink-0 text-lg text-[#4f5963]">{icon}</span><span className="min-w-0 break-words text-[15px] text-[#1a73e8]">{value}</span></>; return href ? <a href={href} className="flex items-center gap-3">{content}</a> : <div className="flex items-center gap-3">{content}</div>; }
