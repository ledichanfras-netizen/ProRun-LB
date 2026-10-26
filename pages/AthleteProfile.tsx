import React,{useEffect,useState} from 'react';
import {useApp} from '../contexts/AppContext';
import {AthletePhotoEditor} from '../components/AthletePhoto';
export default function AthleteProfile(){
 const {athletes,selectedAthleteId,updateAthlete}=useApp();
 const athlete=athletes.find(a=>a.id===selectedAthleteId);
 const [name,setName]=useState(''),[photo,setPhoto]=useState(''),[weight,setWeight]=useState(''),[height,setHeight]=useState(''),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{setName(athlete?.name||'');setPhoto(athlete?.profilePhoto||'');setWeight(String(athlete?.weight||''));setHeight(String(athlete?.height||''));setMessage('');},[athlete?.id]);
 if(!athlete)return <p>Selecione seu perfil para editar.</p>;
 return <form className="max-w-2xl mx-auto space-y-6 rounded-3xl border border-emerald-500/30 bg-white dark:bg-slate-900 p-5 text-slate-900 dark:text-white" onSubmit={async e=>{e.preventDefault();setSaving(true);setMessage('');try{await updateAthlete(athlete.id,{name:name.trim(),profilePhoto:photo,weight:Number(weight),height:Number(height)});setMessage('Perfil salvo.');}catch{setMessage('Não foi possível sincronizar. Tente salvar novamente.');}finally{setSaving(false);}}}>
 <h1 className="text-2xl font-black uppercase italic">Meu Perfil</h1><AthletePhotoEditor name={name} value={photo} onChange={setPhoto}/>
 <label className="block font-bold">Nome completo<input required value={name} onChange={e=>setName(e.target.value)} className="pro-input w-full mt-2"/></label><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="block font-bold">Peso (kg)<input type="number" min="1" max="500" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)} className="pro-input w-full mt-2"/></label><label className="block font-bold">Altura (cm)<input type="number" min="30" max="260" step="0.1" value={height} onChange={e=>setHeight(e.target.value)} className="pro-input w-full mt-2"/></label></div>
 <button disabled={saving} className="w-full bg-emerald-600 text-white rounded-2xl p-4 font-black uppercase italic">{saving?'Salvando…':'Salvar perfil'}</button>{message&&<p role="status">{message}</p>}</form>;
}
