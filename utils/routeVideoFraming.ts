/** Framing affects only the map panel; the saved GPS and workout metrics stay intact. */
export interface RouteVideoFraming { zoom:number; panX:number; panY:number; }
export const DEFAULT_VIDEO_FRAMING:Readonly<RouteVideoFraming>={zoom:1,panX:0,panY:0};
const finite=(n:number,fallback=0)=>Number.isFinite(n)?n:fallback;
export function normalizeVideoFraming(value:RouteVideoFraming):RouteVideoFraming {
 const zoom=Math.max(1,Math.min(3,finite(value.zoom,1))),limit=(zoom-1)/2;
 if(zoom===1)return {...DEFAULT_VIDEO_FRAMING};
 return {zoom,panX:Math.max(-limit,Math.min(limit,finite(value.panX))),panY:Math.max(-limit,Math.min(limit,finite(value.panY)))};
}
/** Anchor and drag positions are fractions of the visible map panel, independent of screen size. */
export function gestureVideoFraming(previous:RouteVideoFraming,from:{x:number;y:number},to:{x:number;y:number},factor=1):RouteVideoFraming {
 const current=normalizeVideoFraming(previous),zoom=Math.max(1,Math.min(3,current.zoom*finite(factor,1))),ratio=zoom/current.zoom;
 return normalizeVideoFraming({zoom,panX:(current.panX-(from.x-.5))*ratio+(to.x-.5),panY:(current.panY-(from.y-.5))*ratio+(to.y-.5)});
}
