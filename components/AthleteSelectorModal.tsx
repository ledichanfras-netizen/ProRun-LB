import {AthletePhoto} from './AthletePhoto';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Search,X,CheckCircle,ArrowRight,Users} from 'lucide-react';
import {useApp} from '../contexts/AppContext';

interface AthleteSelectorModalProps {isOpen:boolean;onClose:()=>void;title?:string;subtitle?:string;}
const searchable=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();

export const AthleteSelectorModal:React.FC<AthleteSelectorModalProps>=({isOpen,onClose,title='Atleta em Foco',subtitle='Selecione o aluno para analisar, periodizar e gerenciar treinos'})=>{
 const {athletes,selectedAthleteId,setSelectedAthleteId,athletePlans}=useApp();
 const [searchTerm,setSearchTerm]=useState('');
 const [filterMode,setFilterMode]=useState<'all'|'with_plan'|'no_plan'>('all');
 const [viewport,setViewport]=useState<{height:number;top:number}|null>(null);
 const dialog=useRef<HTMLDivElement>(null),search=useRef<HTMLInputElement>(null),list=useRef<HTMLDivElement>(null);
 const close=useRef(onClose);close.current=onClose;
 const withPlan=athletes.filter(a=>athletePlans[a.id]?.weeks?.length).length;
 const filteredAthletes=useMemo(()=>{
  const query=searchable(searchTerm);
  return athletes.filter(a=>{
   const matches=[a.name,a.email,a.experience].some(value=>searchable(value||'').includes(query));
   const hasPlan=Boolean(athletePlans[a.id]?.weeks?.length);
   return matches&&(filterMode==='all'||(filterMode==='with_plan'?hasPlan:!hasPlan));
  }).sort((a,b)=>a.id===selectedAthleteId?-1:b.id===selectedAthleteId?1:a.name.localeCompare(b.name,'pt-BR'));
 },[athletes,searchTerm,filterMode,athletePlans,selectedAthleteId]);
 useEffect(()=>{
  if(!isOpen)return;
  setSearchTerm('');setFilterMode('all');
  const previous=document.activeElement as HTMLElement|null;
  const bodyOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const updateViewport=()=>setViewport({height:window.visualViewport?.height||window.innerHeight,top:window.visualViewport?.offsetTop||0});
  updateViewport();window.visualViewport?.addEventListener('resize',updateViewport);window.visualViewport?.addEventListener('scroll',updateViewport);window.addEventListener('resize',updateViewport);
  // Opening the picker must not summon a keyboard and cover the mobile list.
  if(window.matchMedia('(min-width: 640px) and (pointer: fine)').matches)search.current?.focus({preventScroll:true});
  else dialog.current?.focus({preventScroll:true});
  const keyboard=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();close.current();}
   if(event.key==='Tab'){
    const controls=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])')||[]);
    const first=controls[0],last=controls[controls.length-1];if(!first)return;
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',keyboard);
  return()=>{
   document.body.style.overflow=bodyOverflow;document.removeEventListener('keydown',keyboard);
   window.visualViewport?.removeEventListener('resize',updateViewport);window.visualViewport?.removeEventListener('scroll',updateViewport);window.removeEventListener('resize',updateViewport);
   if(previous?.isConnected)previous.focus({preventScroll:true});
  };
 },[isOpen]);
 useEffect(()=>{if(list.current)list.current.scrollTop=0;},[searchTerm,filterMode,isOpen]);
 const select=(id:string|null)=>{setSelectedAthleteId(id);onClose();};
 const compactHeight=viewport!==null&&viewport.height<500;
 if(!isOpen)return null;
 return createPortal(<div className={`fixed inset-x-0 z-[2000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md ${compactHeight?'':'sm:p-6'}`} style={{top:viewport?.top||0,height:viewport?.height||'100dvh'}} onClick={onClose}>
  <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="athlete-picker-title" aria-describedby="athlete-picker-description" tabIndex={-1} className={`athlete-picker relative w-full h-full bg-[#090d1a] text-white shadow-2xl flex flex-col min-h-0 overflow-hidden outline-none border border-white/10 ${compactHeight?'':'sm:max-h-[88%] sm:max-w-2xl sm:rounded-3xl'}`} onClick={event=>event.stopPropagation()}>
   <header className="shrink-0 px-4 pt-3 pb-2 border-b border-white/10" style={{paddingTop:'max(.75rem, env(safe-area-inset-top))'}}>
    <div className="flex items-center justify-between gap-3 mb-2">
     <div className="min-w-0"><h2 id="athlete-picker-title" className="text-base font-black uppercase italic truncate">{title}</h2><p id="athlete-picker-description" className="sr-only">{subtitle}</p></div>
     <button type="button" aria-label="Fechar troca de atleta" onClick={onClose} className="shrink-0 rounded-xl w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-white/10"><X size={22}/></button>
    </div>
    <div className="relative">
     <Search size={19} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none"/>
     <input ref={search} type="search" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label="Buscar atleta" value={searchTerm} onChange={event=>setSearchTerm(event.target.value)} placeholder="Nome, e-mail ou nível" className="w-full rounded-xl bg-white/5 border border-white/15 text-base text-white py-3 pl-10 pr-11 outline-none focus:border-emerald-500 [&::-webkit-search-cancel-button]:hidden"/>
     {searchTerm&&<button type="button" aria-label="Limpar busca" className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-slate-400" onClick={()=>{setSearchTerm('');search.current?.focus();}}><X size={18}/></button>}
    </div>
   </header>
   <div ref={list} data-athlete-picker-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain custom-scrollbar px-3 sm:px-4" style={{paddingBottom:'max(.75rem, env(safe-area-inset-bottom))'}}>
    <div className="flex flex-wrap gap-2 py-3" aria-label="Filtrar atletas">
     {([{value:'all',label:'Todos',count:athletes.length},{value:'with_plan',label:'Com ciclo',count:withPlan},{value:'no_plan',label:'Sem ciclo',count:athletes.length-withPlan}] as const).map(filter=><button key={filter.value} type="button" aria-pressed={filterMode===filter.value} onClick={()=>setFilterMode(filter.value)} className={`min-h-11 px-3 rounded-xl text-xs font-bold border ${filterMode===filter.value?'bg-emerald-600 border-emerald-500 text-white':'border-white/10 text-slate-300 bg-white/5'}`}>{filter.label} ({filter.count})</button>)}
    </div>
    <p aria-live="polite" className="text-xs text-slate-400 mb-2">{filteredAthletes.length} {filteredAthletes.length===1?'atleta encontrado':'atletas encontrados'}</p>
    <div className="space-y-2">
     {filteredAthletes.map(athlete=>{
      const selected=athlete.id===selectedAthleteId,plan=athletePlans[athlete.id];
      return <button type="button" key={athlete.id} data-athlete-choice={athlete.id} aria-label={`Selecionar ${athlete.name}${selected?' (em foco)':''}`} aria-pressed={selected} onClick={()=>select(athlete.id)} className={`w-full text-left flex items-center gap-3 rounded-2xl border p-3 transition-colors ${selected?'bg-emerald-500/15 border-emerald-500/50':'bg-white/[0.03] border-white/10 hover:border-emerald-500/40'}`}>
       <div className="w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-emerald-500/15 text-emerald-300"><AthletePhoto name={athlete.name} src={athlete.profilePhoto} className="w-full h-full"/></div>
       <div className="flex-1 min-w-0">
        <span className="block text-sm font-black uppercase italic text-white truncate" title={athlete.name}>{athlete.name}</span>
        <span className="block text-xs text-slate-400 truncate">{athlete.experience}{selected?' · Em foco':''}</span>
        <span className="block text-xs text-emerald-400 truncate mt-1" title={plan?.specificGoal||undefined}>{plan?.weeks?.length?`${plan.specificGoal||'Ciclo ativo'} · ${plan.weeks.length} sem`:'Sem ciclo ativo'}</span>
       </div>
       {selected?<CheckCircle size={21} className="text-emerald-400 shrink-0"/>:<ArrowRight size={20} className="text-slate-400 shrink-0"/>}
      </button>;
     })}
    </div>
    {!filteredAthletes.length&&<div className="py-10 text-center text-slate-400"><Users className="mx-auto mb-3" size={30}/><p className="font-bold">Nenhum aluno encontrado</p><p className="text-sm mt-1">Tente outro nome ou altere o filtro.</p><button type="button" className="text-emerald-400 font-bold p-3 mt-2" onClick={()=>{setSearchTerm('');setFilterMode('all');}}>Mostrar todos os atletas</button></div>}
    {selectedAthleteId&&<button type="button" onClick={()=>select(null)} className="text-xs text-slate-400 hover:text-white py-4 mt-2 underline underline-offset-4">Remover atleta em foco</button>}
   </div>
  </div>
 </div>,document.body);
};
