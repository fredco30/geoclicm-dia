/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, CheckSquare, ExternalLink, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import type { Commune, EventCategory, EventImportCandidate } from "@/types/api";
function csrf(){const match=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);return match?decodeURIComponent(match[1]):null;}
function date(value:string|null){return value?new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Paris"}).format(new Date(value)):"Date manquante";}
function schedule(row:EventImportCandidate){if(row.occurrences&&row.occurrences.length>0&&row.starts_at)return date(row.starts_at);const hint=row.extraction_evidence&&row.extraction_evidence.length?` ? ? ${row.extraction_evidence[0]} ?`:"";return `R?currence ou p?riode non dat?e ? ? pr?ciser${hint}`;}

// Un ?v?nement ? fiable ? a commune + cat?gorie + preuve v?rifi?e + une date
// de fin future (on n'auto-valide jamais un ?v?nement pass? ou non dat?).
function isReliable(row:EventImportCandidate){
  if(row.commune==null||row.category==null||row.extraction_evidence.length===0)return false;
  const end=row.ends_at||row.starts_at;
  if(!end)return false;
  return new Date(end).getTime()>=Date.now();
}

export function EventImportsAdmin({initialCandidates,communes,categories,filterStatus,page,hasNextPage}:{initialCandidates:EventImportCandidate[];communes:Commune[];categories:EventCategory[];filterStatus:string;page:number;hasNextPage:boolean}){
 const [rows,setRows]=useState(initialCandidates);
 const [selected,setSelected]=useState<Set<number>>(new Set());
 const [prevInitial,setPrevInitial]=useState(initialCandidates);
 if(prevInitial!==initialCandidates){setPrevInitial(initialCandidates);setRows(initialCandidates);setSelected(new Set());}
 const [message,setMessage]=useState<string|null>(null);const [pending,startTransition]=useTransition();

 const pendingRows=useMemo(()=>rows.filter(row=>row.status==="pending"),[rows]);
 const reliableCount=useMemo(()=>pendingRows.filter(isReliable).length,[pendingRows]);
 const selectedCount=selected.size;

 const update=(id:number,field:"commune"|"category",value:string)=>setRows(current=>current.map(row=>row.id===id?{...row,[field]:value?Number(value):null}:row));
 const toggle=(id:number)=>setSelected(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next;});
 const selectReliable=()=>setSelected(new Set(pendingRows.filter(isReliable).map(row=>row.id)));
 const clearSelection=()=>setSelected(new Set());
 const ensureCsrf=async()=>{let token=csrf();if(!token){await apiFetch("/api/auth/csrf/");token=csrf();}return token;};

 const act=(row:EventImportCandidate,action:"approve"|"reject")=>startTransition(async()=>{const token=await ensureCsrf();const response=await apiFetch(`/api/admin/event-imports/${row.id}/${action}/`,{method:"POST",headers:token?{"X-CSRFToken":token}:{},body:JSON.stringify(action==="approve"?{commune:row.commune,category:row.category}:{})});const payload=await response.json().catch(()=>null);if(!response.ok){setMessage(payload?.detail??JSON.stringify(payload)??"Action impossible");return;}setRows(current=>current.filter(item=>item.id!==row.id));setSelected(current=>{const next=new Set(current);next.delete(row.id);return next;});setMessage(action==="approve"?`? ${row.title} ? publi? et synchronis?.`:`? ${row.title} ? rejet?.`);});

 const bulkApprove=()=>startTransition(async()=>{const token=await ensureCsrf();const response=await apiFetch("/api/admin/event-imports/bulk-approve/",{method:"POST",headers:token?{"X-CSRFToken":token}:{},body:JSON.stringify({ids:Array.from(selected)})});const payload=await response.json().catch(()=>null);if(!response.ok){setMessage(payload?.detail??"Approbation en masse impossible");return;}const imported:number=payload?.imported??0;const errors:string[]=payload?.errors??[];setRows(current=>current.filter(row=>!(selected.has(row.id)&&row.status==="pending"&&row.commune&&row.category&&row.starts_at&&row.ends_at)));setSelected(new Set());setMessage(`${imported} ?v?nement(s) publi?(s).`+(errors.length?` ${errors.length} ?chec(s) : ${errors[0]}`:""));});

 return <div><div className="mb-4"><Link href="/admin/agenda" className="text-sm text-slate-600">? Agenda</Link><h1 className="text-xl font-bold">Candidats Agenda</h1><p className="text-sm text-slate-500">Les ?v?nements termin?s avant le crawl sont conserv?s comme expir?s, mais ne sont jamais propos?s ? la validation.</p><nav className="mt-3 flex flex-wrap gap-2">{[["pending","? valider"],["invalid","Incomplets"],["expired","Expir?s"]].map(([value,label])=><Link key={value} href={`/admin/agenda/imports?status=${value}`} className={`rounded-full border px-3 py-1 text-xs ${filterStatus===value?"bg-[#1a4d6e] text-white":"bg-white text-slate-700"}`}>{label}</Link>)}</nav>
 {filterStatus==="pending"&&pendingRows.length>0?<div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3 shadow-sm"><Button variant="secondary" disabled={pending} onClick={selectReliable}><CheckSquare className="h-4 w-4"/> S?lectionner les fiables ({reliableCount})</Button><Button variant="secondary" disabled={pending||selectedCount===0} onClick={clearSelection}><Square className="h-4 w-4"/> Tout d?cocher</Button><Button disabled={pending||selectedCount===0} onClick={bulkApprove}><Check className="h-4 w-4"/> Approuver la s?lection ({selectedCount})</Button><span className="text-xs text-slate-500">Les ? fiables ? ont commune + cat?gorie + preuve + une date future. D?coche ceux ? exclure avant d&apos;approuver.</span></div>:null}
 </div>{message?<p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{message}</p>:null}
 {rows.length===0?<div className="rounded-xl border border-dashed bg-white p-12 text-center text-sm text-slate-500">Aucun candidat dans ce filtre.</div>:<div className="space-y-4">{rows.map(row=><article key={row.id} className="relative grid overflow-hidden rounded-xl border bg-white shadow-sm md:grid-cols-[220px_minmax(0,1fr)]">
 {row.status==="pending"?<label className="absolute left-2 top-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-white/90 shadow" title={selected.has(row.id)?"D?s?lectionner":"S?lectionner"}><input type="checkbox" className="h-5 w-5 accent-[#1a4d6e]" checked={selected.has(row.id)} onChange={()=>toggle(row.id)} aria-label={`S?lectionner ${row.title}`}/></label>:null}
 {row.image_url?<img src={row.image_url} alt="" loading="lazy" decoding="async" className="h-full min-h-48 w-full object-cover" referrerPolicy="no-referrer"/>:<div className="flex min-h-48 items-center justify-center bg-slate-100 text-xs text-slate-400">Pas d?image d?tect?e</div>}<div className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-medium uppercase text-[#a8533a]">{row.status==="expired"?"Expir? ? consultation uniquement":`${row.source_label} ? ${row.extraction_method==="ai"?"Extraction IA ? v?rifier":row.extraction_method==="ics"?"ICS":"JSON-LD"}`}</p><h2 className="font-serif text-xl font-semibold">{row.title}</h2><p className="mt-1 text-sm text-slate-600">{schedule(row)} ? {row.venue_name||row.address||"Lieu manquant"}</p></div><a href={row.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#1a4d6e] underline">Source officielle <ExternalLink className="h-3 w-3"/></a></div>{row.short_description?<p className="mt-3 line-clamp-3 text-sm text-slate-600">{row.short_description}</p>:null}{row.extraction_evidence.length?<blockquote className="mt-3 border-l-2 border-[#1a4d6e] pl-3 text-xs italic text-slate-600">Preuve d?tect?e : ? {row.extraction_evidence[0]} ?</blockquote>:null}{row.validation_errors.length?<p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-900">{row.validation_errors.join(" ? ")}</p>:null}{row.status!=="expired"?<><div className="mt-4 grid gap-3 sm:grid-cols-2"><Select aria-label="Commune" value={row.commune??""} onChange={event=>update(row.id,"commune",event.target.value)}><option value="">Choisir la commune *</option>{communes.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</Select><Select aria-label="Cat?gorie" value={row.category??""} onChange={event=>update(row.id,"category",event.target.value)}><option value="">Choisir la cat?gorie *</option>{categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</Select></div><div className="mt-4 flex justify-end gap-2"><Button variant="secondary" disabled={pending} onClick={()=>act(row,"reject")}><X className="h-4 w-4"/> Rejeter</Button><Button disabled={pending||!row.commune||!row.category||!row.starts_at||!row.ends_at} onClick={()=>act(row,"approve")}><Check className="h-4 w-4"/> Approuver et publier</Button></div></>:null}</div></article>)}</div>}<nav className="mt-6 flex items-center justify-between"><span className="text-sm text-slate-500">Page {page}</span><div className="flex gap-2">{page>1?<Link href={`/admin/agenda/imports?status=${filterStatus}&page=${page-1}`} className="rounded border bg-white px-3 py-2 text-sm">? Pr?c?dente</Link>:null}{hasNextPage?<Link href={`/admin/agenda/imports?status=${filterStatus}&page=${page+1}`} className="rounded border bg-white px-3 py-2 text-sm">Suivante ?</Link>:null}</div></nav></div>;
}
