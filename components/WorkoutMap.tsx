import React,{useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import {LocateFixed,Route,Navigation} from 'lucide-react';
import {routeKilometers,validMapPoint,type MapPoint} from '../utils/mapRoute';

interface WorkoutMapProps {
 points?:MapPoint[];
 height?:string;
 interactive?:boolean;
 currentPosition?:MapPoint|null;
 live?:boolean;
}
const endpointIcon=(finish:boolean)=>L.divIcon({className:'prorun-map-endpoint',iconSize:[30,30],iconAnchor:finish?[4,29]:[15,15],html:finish?
 '<div style="width:30px;height:30px;filter:drop-shadow(0 1px 2px #000)"><svg viewBox="0 0 30 30" width="30" height="30"><path d="M5 28V3" stroke="white" stroke-width="4"/><path d="M6 3h20v16H6z" fill="white"/><path d="M6 3h5v5H6zm10 0h5v5h-5zM11 8h5v5h-5zm10 0h5v5h-5zM6 13h5v5H6zm10 0h5v5h-5z" fill="#064e3b"/></svg></div>':
 '<div style="width:30px;height:30px;border-radius:50%;background:#065f46;border:3px solid white;box-shadow:0 1px 6px #0008;display:grid;place-items:center;color:white;font-size:15px">▶</div>'});

export const WorkoutMap:React.FC<WorkoutMapProps>=({points=[],height='240px',interactive=true,currentPosition=null,live=false})=>{
 const container=useRef<HTMLDivElement>(null),mapRef=useRef<L.Map|null>(null);
 const lineRef=useRef<L.Polyline|null>(null),outlineRef=useRef<L.Polyline|null>(null),markersRef=useRef<L.LayerGroup|null>(null);
 const positionRef=useRef<L.CircleMarker|null>(null),initializedRef=useRef(false);
 const followRef=useRef(live),dataRef=useRef({points,currentPosition,live});dataRef.current={points,currentPosition,live};
 const [following,setFollowing]=useState(live);
 const setFollow=(value:boolean)=>{followRef.current=value;setFollowing(value);};
 const fitRoute=()=>{
  const map=mapRef.current;if(!map)return;
  const recorded=dataRef.current.points.filter(validMapPoint);
  setFollow(false);
  if(recorded.length>1)map.fitBounds(L.latLngBounds(recorded),{padding:[36,42],maxZoom:17,animate:false});
  else if(recorded[0]||dataRef.current.currentPosition)map.setView(recorded[0]||dataRef.current.currentPosition!,16,{animate:false});
 };
 const centerPosition=()=>{
  const map=mapRef.current,position=dataRef.current.currentPosition;if(!map||!position||!validMapPoint(position))return;
  setFollow(dataRef.current.live);map.setView(position,Math.max(map.getZoom(),16),{animate:false});
 };
 useEffect(()=>{
  if(!container.current)return;
  const map=L.map(container.current,{zoomControl:false,attributionControl:true,dragging:interactive,touchZoom:interactive,scrollWheelZoom:false,doubleClickZoom:interactive,keyboard:interactive,boxZoom:interactive}).setView([-23.5505,-46.6333],13);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri — Esri, HERE, Garmin, USGS, OpenStreetMap contributors'}).addTo(map);
  mapRef.current=map;markersRef.current=L.layerGroup().addTo(map);
  outlineRef.current=L.polyline([],{color:'#fff',weight:9,opacity:.95,lineCap:'round',lineJoin:'round',interactive:false}).addTo(map);
  lineRef.current=L.polyline([],{color:'#059669',weight:5,opacity:1,lineCap:'round',lineJoin:'round',interactive:false}).addTo(map);
  const manual=()=>setFollow(false);map.on('dragstart',manual);
  const resize=()=>map.invalidateSize({pan:false});const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(container.current);
  const timer=window.setTimeout(resize,100);
  return()=>{window.clearTimeout(timer);observer?.disconnect();map.remove();mapRef.current=null;markersRef.current=null;lineRef.current=null;outlineRef.current=null;positionRef.current=null;initializedRef.current=false;};
 },[interactive]);
 useEffect(()=>{setFollow(live);},[live]);
 useEffect(()=>{
  const map=mapRef.current;if(!map)return;
  const recorded=points.filter(validMapPoint);lineRef.current?.setLatLngs(recorded);outlineRef.current?.setLatLngs(recorded);
  if(currentPosition&&validMapPoint(currentPosition)){
   if(!positionRef.current)positionRef.current=L.circleMarker(currentPosition,{radius:8,color:'#fff',weight:3,fillColor:'#059669',fillOpacity:1}).bindTooltip('Sua posição GPS').addTo(map);
   else positionRef.current.setLatLng(currentPosition);
  }else if(positionRef.current){positionRef.current.remove();positionRef.current=null;}
  if(!initializedRef.current&&(recorded.length||currentPosition)){
   initializedRef.current=true;
   if(live&&currentPosition)map.setView(currentPosition,16,{animate:false});else fitRoute();
  }else if(live&&followRef.current&&currentPosition)map.panTo(currentPosition,{animate:false});
 },[points,currentPosition,live,interactive]);
 useEffect(()=>{
  const map=mapRef.current,group=markersRef.current;if(!map||!group)return;
  const recorded=points.filter(validMapPoint),kilometers=routeKilometers(points);
  const draw=()=>{
   group.clearLayers();if(!recorded.length)return;
   let previous:L.Point|null=null;
   for(const marker of kilometers){
    const pixel=map.latLngToContainerPoint(marker.point);if(previous&&pixel.distanceTo(previous)<48)continue;
    if(!map.getBounds().contains(marker.point))continue;previous=pixel;
    const icon=L.divIcon({className:'prorun-map-km',iconSize:[25,25],iconAnchor:[12,12],html:`<div style="width:25px;height:25px;border:2px solid white;border-radius:50%;background:#064e3b;color:white;box-shadow:0 1px 5px #0007;display:grid;place-items:center;font:700 11px system-ui">${marker.km}</div>`});
    L.marker(marker.point,{icon,keyboard:interactive}).bindTooltip(`${marker.km} km · estimado pelo traçado`).addTo(group);
   }
   L.marker(recorded[0],{icon:endpointIcon(false),keyboard:interactive,zIndexOffset:500}).bindTooltip('Início do percurso').addTo(group);
   if(!live&&recorded.length>1)L.marker(recorded[recorded.length-1],{icon:endpointIcon(true),keyboard:interactive,zIndexOffset:600}).bindTooltip('Chegada').addTo(group);
  };
  draw();map.on('zoomend moveend',draw);return()=>{map.off('zoomend moveend',draw);};
 },[points,live,interactive]);
 const button='flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-950 shadow-md disabled:opacity-50';
 return <div style={{height,width:'100%',position:'relative',borderRadius:'1.25rem',overflow:'hidden',zIndex:0}} className="border border-emerald-500/20 shadow-inner">
  <div ref={container} style={{height:'100%',width:'100%'}} aria-label="Mapa do percurso de corrida"/>
  {interactive&&<div className="absolute top-3 right-3 flex flex-col items-end gap-2" style={{zIndex:500}}>
   {currentPosition&&<button type="button" onClick={centerPosition} className={button} aria-pressed={live?following:undefined} title="Centralizar na posição GPS"><LocateFixed size={16}/>{live?(following?'Seguindo':'Seguir posição'):'Minha posição'}</button>}
   {points.length>1&&<button type="button" onClick={fitRoute} className={button} title="Enquadrar o percurso completo"><Route size={16}/>Percurso</button>}
  </div>}
  {live&&following&&<span className="absolute bottom-7 left-3 rounded-lg bg-emerald-950 px-2 py-1 text-[10px] font-bold text-white flex items-center gap-1" style={{zIndex:500}}><Navigation size={11}/>Acompanhando GPS</span>}
 </div>;
};
