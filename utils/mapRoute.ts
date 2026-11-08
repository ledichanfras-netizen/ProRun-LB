export type MapPoint=[number,number];
export const validMapPoint=(point:MapPoint)=>Array.isArray(point)&&point.length===2&&Number.isFinite(point[0])&&Number.isFinite(point[1])&&Math.abs(point[0])<=90&&Math.abs(point[1])<=180;
const radians=(n:number)=>n*Math.PI/180;
export function mapSegmentMeters(a:MapPoint,b:MapPoint){
 const lat=radians(b[0]-a[0]),lng=radians(b[1]-a[1]);
 const h=Math.sin(lat/2)**2+Math.cos(radians(a[0]))*Math.cos(radians(b[0]))*Math.sin(lng/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(Math.min(1,h)),Math.sqrt(Math.max(0,1-h)));
}
/** Markers describe the recorded geometry; they do not overwrite GPS workout totals. */
export function routeKilometers(points:MapPoint[]):{km:number;point:MapPoint}[]{
 const result:{km:number;point:MapPoint}[]=[];let total=0,next=1000;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];if(!validMapPoint(a)||!validMapPoint(b))continue;
  const distance=mapSegmentMeters(a,b);if(!distance)continue;
  while(total+distance>=next&&result.length<1000){
   const t=(next-total)/distance;
   result.push({km:next/1000,point:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]});next+=1000;
  }
  total+=distance;
 }
 return result;
}
