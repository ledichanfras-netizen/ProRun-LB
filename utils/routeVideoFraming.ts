/** Framing affects only the map panel; the saved GPS and workout metrics stay intact. */
export interface RouteVideoFraming { zoom:number; panX:number; panY:number; rotation?:number; }
export const DEFAULT_VIDEO_FRAMING:Readonly<RouteVideoFraming>={zoom:1,panX:0,panY:0,rotation:0};
const finite=(n:number,fallback=0)=>Number.isFinite(n)?n:fallback;
export function normalizeVideoFraming(value:RouteVideoFraming):RouteVideoFraming {
 const zoom=Math.max(1,Math.min(3,finite(value.zoom,1))),limit=(zoom-1)/2;
 const rotation=((finite(value.rotation??0)%360)+360)%360;
 if(zoom===1)return {...DEFAULT_VIDEO_FRAMING,rotation};
 return {zoom,rotation,panX:Math.max(-limit,Math.min(limit,finite(value.panX))),panY:Math.max(-limit,Math.min(limit,finite(value.panY)))};
}
/** Anchor and drag positions are fractions of the visible map panel, independent of screen size. */
export function gestureVideoFraming(previous:RouteVideoFraming,from:{x:number;y:number},to:{x:number;y:number},factor=1,rotationDelta=0,aspect=656/650):RouteVideoFraming {
 const current=normalizeVideoFraming(previous),zoom=Math.max(1,Math.min(3,current.zoom*finite(factor,1))),ratio=zoom/current.zoom;
 const radians=finite(rotationDelta)*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians),x=current.panX-(from.x-.5),y=current.panY-(from.y-.5);
 return normalizeVideoFraming({zoom,rotation:(current.rotation??0)+finite(rotationDelta),panX:(x*c-y*s/aspect)*ratio+(to.x-.5),panY:(x*s*aspect+y*c)*ratio+(to.y-.5)});
}
