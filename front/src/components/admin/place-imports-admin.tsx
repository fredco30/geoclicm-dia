/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, CheckSquare, ExternalLink, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import type { Commune, PlaceCategory, PlaceImportCandidate } from "@/types/api";

function csrf(){const match=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);return match?decodeURIComponent(match[1]):null;}

function isReliable(row: PlaceImportCandidate) {
  return row.commune != null && row.category != null && row.extraction_evidence.length > 0;
}

export function PlaceImportsAdmin({initialCandidates,communes,categories,filterStatus,page,hasNextPage}:{initialCandidates:PlaceImportCandidate[];communes:Commune[];categories:PlaceCategory[];filterStatus:string;page:number;hasNextPage:boolean}){
 const [rows,setRows]=useState(initialCandidates);
 const [selected,setSelected]=useState<Set<number>>(new Set());
 const [prevInitial,setPrevInitial]=useState(initialCandidates);
 if(prevInitial!==initialCandidates){setPrevInitial(initialCandidates);setRows(initialCandidates);setSelected(new Set());}
 const [message,setMessage]=useState<string|null>(null);
 const [pending,startTransition]=useTransition();

 const pendingRows=useMemo(()=>rows.filter(row=>row.status==="pending"),[rows]);
 const reliableCount=useMemo(()=>pendingRows.filter(isReliable).length,[pendingRows]);
 const selectedCount=selected.size;

 const update=(id:number,field:"commune"|"category",value:string)=>setRows(current=>current.map(row=>row.id===id?{...row,[field]:value?Number(value):null}:row));
 const toggle=(id:number)=>setSelected(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next;});
 const selectReliable=()=>setSelected(new Set(pendingRows.filter(isReliable).map(row=>row.id)));
 const clearSelection=()=>setSelected(new Set());
 const ensureCsrf=async()=>{let token=csrf();if(!token){await apiFetch("/api/auth/csrf/");token=csrf();}return token;};

 const act=(row:PlaceImportCandidate,action:"approve"|"reject")=>startTransition(async()=>{const token=await ensureCsrf();const response=await apiFetch(`/api/admin/place-imports/${row.id}/${action}/`,{method:"POST",headers:token?{"X-CSRFToken":token}:{},body:JSON.stringify(action==="approve"?{commune:row.commune,category:row.category}:{})});const payload=await response.json().catch(()=>null);if(!response.ok){setMessage(payload?.detail??JSON.stringify(payload)??"Action impossible");return;}setRows(current=>current.filter(item=>item.id!==row.id));setSelected(current=>{const next=new Set(current);next.delete(row.id);return next;});setMessage(action==="approve"?`« ${row.title} » publié dans Découvrir.`:`« ${row.title} » rejeté.`);});

 const bulkApprove=()=>startTransition(async()=>{const token=await ensureCsrf();const response=await apiFetch("/api/admin/place-imports/bulk-approve/",{method:"POST",headers:token?{"X-CSRFToken":token}:{},body:JSON.stringify({ids:Array.from(selected)})});const payload=await response.json().catch(()=>null);if(!response.ok){setMessage(payload?.detail??"Approbation en masse impossible");return;}const imported:number=payload?.imported??0;const errors:string[]=payload?.errors??[];setRows(current=>current.filter(row=>!(selected.has(row.id)&&row.status==="pending"&&row.commune&&row.category)));setSelected(new Set());setMessage(`${imported} lieu(x) publié(s).`+(errors.length?` ${errors.length} échec(s) : ${errors[0]}`:""));});

 return <div><div className="mb-4"><Link href="/admin/decouvrir" className="text-sm text-slate-600">← Découvrir</Link><h1 className="text-xl font-bold">Candidats Découvrir</h1><p className="text-sm text-slate-500">Lieux détectés automatiquement par l&apos;assistant dans le corpus crawlé. Chaque lieu doit être vérifié avant publication : rien n&apos;est publié automatiquement.</p><nav className="mt-3 flex flex-wrap gap-2">{[["pending","À valider"],["invalid","Incomplets"]].map(([value,label])=><Link key={value} href={`/admin/decouvrir/imports?status=${value}`} className={`rounded-full border px-3 py-1 text-xs ${filterStatus===value?"bg-[#1a4d6e] text-white":"bg-white text-slate-700"}`}>{label}</Link>)}</nav>
 {filterStatus==="pending"&&pendingRows.length>0?<div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3 shadow-sm"><Button variant="secondary" disabled={pending} onClick={selectReliable}><CheckSquare className="h-4 w-4"/> Sélectionner les fiables ({reliableCount})</Button><Button variant="secondary" disabled={pending||selectedCount===0} onClick={clearSelection}><Square className="h-4 w-4"/> Tout décocher</Button><Button disabled={pending||selectedCount===0} onClick={bulkApprove}><Check className="h-4 w-4"/> Approuver la sélection ({selectedCount})</Button><span className="text-xs text-slate-500">Les « fiables » ont commune + catégorie + preuve vérifiée. Décoche ceux à exclure avant d&apos;approuver.</span></div>:null}
 </div>{message?<p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{message}</p>:null}
 {rows.length===0?<div className="rounded-xl border border-dashed bg-white p-12 text-center text-sm text-slate-500">Aucun candidat dans ce filtre.</div>:<div className="space-y-4">{rows.map(row=><article key={row.id} className="relative grid overflow-hidden rounded-xl border bg-white shadow-sm md:grid-cols-[220px_minmax(0,1fr)]">
 {row.status==="pending"?<label className="absolute left-2 top-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-white/90 shadow" title={selected.has(row.id)?"Désélectionner":"Sélectionner"}><input type="checkbox" className="h-5 w-5 accent-[#1a4d6e]" checked={selected.has(row.id)} onChange={()=>toggle(row.id)} aria-label={`Sélectionner ${row.title}`}/></label>:null}
 {row.image_url?<img src={row.image_url} alt="" loading="lazy" decoding="async" className="h-full min-h-48 w-full object-cover" referrerPolicy="no-referrer"/>:<div className="flex min-h-48 items-center justify-center bg-slate-100 text-xs text-slate-400">Pas d&apos;image détectée</div>}<div className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-medium uppercase text-[#a8533a]">{row.crawl_source_label} · {row.extraction_method==="ai"?"Extraction IA à vérifier":"JSON-LD"}</p><h2 className="font-serif text-xl font-semibold">{row.title}</h2><p className="mt-1 text-sm text-slate-600">{row.address||row.commune_name||"Adresse manquante"}</p></div><a href={row.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#1a4d6e] underline">Source officielle <ExternalLink className="h-3 w-3"/></a></div>{row.short_description?<p className="mt-3 line-clamp-3 text-sm text-slate-600">{row.short_description}</p>:null}{row.extraction_evidence.length?<blockquote className="mt-3 border-l-2 border-[#1a4d6e] pl-3 text-xs italic text-slate-600">Preuve détectée : « {row.extraction_evidence[0]} »</blockquote>:null}{row.validation_errors.length?<p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-900">{row.validation_errors.join(" · ")}</p>:null}<div className="mt-4 grid gap-3 sm:grid-cols-2"><Select aria-label="Commune" value={row.commune??""} onChange={event=>update(row.id,"commune",event.target.value)}><option value="">Choisir la commune *</option>{communes.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</Select><Select aria-label="Catégorie" value={row.category??""} onChange={event=>update(row.id,"category",event.target.value)}><option value="">Choisir la catégorie *</option>{categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</Select></div><div className="mt-4 flex justify-end gap-2"><Button variant="secondary" disabled={pending} onClick={()=>act(row,"reject")}><X className="h-4 w-4"/> Rejeter</Button><Button disabled={pending||!row.commune||!row.category} onClick={()=>act(row,"approve")}><Check className="h-4 w-4"/> Approuver et publier</Button></div></div></article>)}</div>}<nav className="mt-6 flex items-center justify-between"><span className="text-sm text-slate-500">Page {page}</span><div className="flex gap-2">{page>1?<Link href={`/admin/decouvrir/imports?status=${filterStatus}&page=${page-1}`} className="rounded border bg-white px-3 py-2 text-sm">← Précédente</Link>:null}{hasNextPage?<Link href={`/admin/decouvrir/imports?status=${filterStatus}&page=${page+1}`} className="rounded border bg-white px-3 py-2 text-sm">Suivante →</Link>:null}</div></nav></div>;
}
