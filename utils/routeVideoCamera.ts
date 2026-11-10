/** Deterministic camera: preview, recording and codec retries render identical frames. */
export type RouteVideoView = 'overhead' | 'immersive';
export interface CameraPoint { x:number; y:number; }
export interface RouteCamera { width:number;height:number;center:CameraPoint;scale:number;angle:number; }
const clamp=(value:number)=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
export function routeCamera(width:number,height:number,progress:number,head:CameraPoint,fixed=false):RouteCamera {
 const p=clamp(progress),motion=fixed?0:Math.sin(Math.PI*p)**2;
 return {width,height,center:{x:width/2+(head.x-width/2)*motion*.28,y:height/2+(head.y-height/2)*motion*.28},scale:.9+motion*.26,angle:fixed?0:Math.sin(2*Math.PI*p)*.12};
}
export function orientCameraPoint(point:CameraPoint,camera:RouteCamera):CameraPoint {
 const x=(point.x-camera.center.x)*camera.scale,y=(point.y-camera.center.y)*camera.scale,c=Math.cos(camera.angle),s=Math.sin(camera.angle);
 return {x:camera.width/2+x*c-y*s,y:camera.height/2+x*s+y*c};
}
/** Perspective projection shared by the raster strips and GPS marker positions. */
export function perspectivePoint(point:CameraPoint,width:number,height:number):CameraPoint {
 const v=point.y/height,depth=1+.68*(1-v);
 return {x:width/2+(point.x-width/2)/depth,y:72+(height-112)*v/depth};
}
export function projectCameraPoint(point:CameraPoint,camera:RouteCamera):CameraPoint {
 return perspectivePoint(orientCameraPoint(point,camera),camera.width,camera.height);
}
/** Warp the actual export canvas, never just its CSS preview. No extra tile requests. */
export function drawPerspectivePlane(ctx:CanvasRenderingContext2D,plane:HTMLCanvasElement,camera:RouteCamera,surface:HTMLCanvasElement){
 const {width,height}=camera,oriented=surface.getContext('2d');if(!oriented)throw new Error('Não foi possível preparar a perspectiva.');
 oriented.fillStyle='#0b2627';oriented.fillRect(0,0,width,height);
 oriented.save();oriented.translate(width/2,height/2);oriented.rotate(camera.angle);oriented.scale(camera.scale,camera.scale);oriented.translate(-camera.center.x,-camera.center.y);oriented.drawImage(plane,0,0);oriented.restore();
 // Narrow strips approximate a projective texture while retaining native Canvas export.
 const strips=160;
 for(let i=0;i<strips;i++){
  const y=i*height/strips,next=(i+1)*height/strips;
  const a=perspectivePoint({x:0,y},width,height),b=perspectivePoint({x:width,y:next},width,height);
  const middle=perspectivePoint({x:0,y:(y+next)/2},width,height),stripWidth=width-2*middle.x;
  ctx.drawImage(surface,0,y,width,next-y,middle.x,a.y,stripWidth,b.y-a.y+.4);
 }
}
