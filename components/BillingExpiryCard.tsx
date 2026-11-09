import React from 'react';
import {Link} from 'react-router-dom';
import {Bell,MessageCircle,ChevronRight} from 'lucide-react';
import {useApp} from '../contexts/AppContext';
import {billingWhatsappLink} from '../utils/billing';
export function BillingExpiryCard({expanded=false}:{expanded?:boolean}){
 const {billingAlerts,userRole}=useApp();
 if(!billingAlerts.length)return null;
 const visible=expanded?billingAlerts:billingAlerts.slice(0,3);
 return <section aria-label="Avisos de vencimento" className="rounded-3xl border border-amber-400/35 bg-amber-50 dark:bg-amber-500/5 p-5 text-slate-900 dark:text-slate-100 space-y-4">
  <div className="flex flex-wrap gap-3 justify-between items-center"><h2 className="font-black uppercase italic flex items-center gap-2"><Bell className="text-amber-600" size={20}/>{userRole==='coach'?'Planos a vencer e pendências':'Seu plano e pagamentos'} <span className="text-sm">({billingAlerts.length})</span></h2><Link className="text-sm font-bold inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400" to="/subscriptions">Ver mensalidades<ChevronRight size={16}/></Link></div>
  {visible.map(alert=><article key={alert.id} className="border-t border-amber-400/25 pt-3 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1"><h3 className="font-bold break-words">{alert.title}</h3><p className="text-sm mt-1">{alert.message}</p></div>{alert.audience==='issuer'&&<a href={billingWhatsappLink(alert)} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 text-white font-bold text-sm px-4 py-3"><MessageCircle size={17}/>Entrar em contato</a>}</article>)}
  {!expanded&&billingAlerts.length>visible.length&&<Link className="block text-sm font-bold underline" to="/subscriptions">Ver outros {billingAlerts.length-visible.length} avisos</Link>}
 </section>;
}
