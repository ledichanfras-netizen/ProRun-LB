import React,{useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useApp} from '../contexts/AppContext';
import {billingRequest} from '../lib/billing';
export function BillingAccessGate({children}:{children:React.ReactNode}){
 const {account,refreshData}=useApp(),location=useLocation();
 const [state,setState]=useState<{owner:string;allowed:boolean}|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  if(!account)return;let alive=true,lastAllowed:boolean|undefined;
  const load=async()=>{try{const response=await billingRequest('access');if(!alive)return;setState({owner:account.user_id,allowed:response.allowed});setError('');if(lastAllowed===false&&response.allowed)void refreshData();lastAllowed=response.allowed;}catch(e:any){if(alive)setError(e.message);}};
  void load();const interval=setInterval(()=>void load(),60000);window.addEventListener('focus',load);window.addEventListener('prorun-billing-changed',load);
  return()=>{alive=false;clearInterval(interval);window.removeEventListener('focus',load);window.removeEventListener('prorun-billing-changed',load);};
 },[account?.user_id]);
 if(location.pathname==='/subscriptions'||account?.platform_admin)return <>{children}</>;
 const current=state?.owner===account?.user_id?state:null;
 if(error)return <section className="max-w-xl mx-auto p-6 rounded-3xl border border-emerald-500/25 space-y-4"><h1 className="text-xl font-black">Não foi possível verificar seu acesso</h1><p>{error}</p><button className="bg-emerald-700 text-white px-4 py-3 rounded-xl" onClick={()=>window.dispatchEvent(new Event('prorun-billing-changed'))}>Tentar novamente</button><Link className="block underline" to="/subscriptions">Ver mensalidade</Link></section>;
 if(!current)return <p role="status" className="p-8 text-center">Verificando acesso…</p>;
 if(!current.allowed)return <section className="max-w-xl mx-auto p-6 rounded-3xl border border-emerald-500/25 space-y-4"><h1 className="text-2xl font-black uppercase italic">Renove seu acesso</h1><p>Seu período de acesso está pendente. Pague a mensalidade ou solicite ao responsável o registro do pagamento feito por fora.</p><Link className="inline-block rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white" to="/subscriptions">Ver mensalidade e pagar</Link></section>;
 return <>{children}</>;
}
