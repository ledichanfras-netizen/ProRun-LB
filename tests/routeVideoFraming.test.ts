import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_VIDEO_FRAMING,normalizeVideoFraming,gestureVideoFraming} from '../utils/routeVideoFraming';

test('zoom and drag keep a valid crop of the loaded map, including extreme and invalid input',()=>{
 assert.deepEqual(normalizeVideoFraming({zoom:NaN,panX:Infinity,panY:NaN}),DEFAULT_VIDEO_FRAMING);
 assert.deepEqual(normalizeVideoFraming({zoom:20,panX:30,panY:-30}),{zoom:3,panX:1,panY:-1});
 for(const zoom of [1,1.5,2,3])for(const panX of [-5,0,5])for(const panY of [-5,0,5]){
  const f=normalizeVideoFraming({zoom,panX,panY});
  for(const [position,pan] of [[0,f.panX],[1,f.panX],[0,f.panY],[1,f.panY]]){
   const source=(position-.5-pan)/f.zoom+.5;assert.ok(source>=-1e-9&&source<=1+1e-9);
  }
 }
});
test('pinch preserves the point under the fingers while drag follows screen direction',()=>{
 const initial={zoom:2,panX:.1,panY:-.1},anchor={x:.6,y:.4};
 const zoomed=gestureVideoFraming(initial,anchor,anchor,1.2);
 for(const [axis,pan] of [['x','panX'],['y','panY']] as const){
  const sourceBefore=(anchor[axis]-.5-initial[pan])/initial.zoom;
  const sourceAfter=(anchor[axis]-.5-zoomed[pan])/zoomed.zoom;assert.ok(Math.abs(sourceBefore-sourceAfter)<1e-10);
 }
 const moved=gestureVideoFraming(initial,{x:.5,y:.5},{x:.6,y:.55});
 assert.ok(Math.abs(moved.panX-.2)<1e-10);assert.ok(Math.abs(moved.panY+.05)<1e-10);
 assert.deepEqual(initial,{zoom:2,panX:.1,panY:-.1});
 assert.deepEqual(gestureVideoFraming(initial,anchor,anchor,.1),DEFAULT_VIDEO_FRAMING);
});
