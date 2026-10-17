import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMapGesture } from '../utils/mapGestures';
import { generateMapTileLayout } from '../utils/socialCardUtils';
const base = {zoomOffset:0,panX:0,panY:0,bearing:0};
test('off-center pinch retains the location under the fingers', () => {
 const view = applyMapGesture(base,{from:{x:.75,y:.25},to:{x:.75,y:.25},zoomDelta:1,rotationDelta:0,width:400,height:800});
 assert.equal(view.zoomOffset,1); assert.equal(view.panX,.25); assert.equal(view.panY,-.25);
});
test('dragging a turned map follows the screen direction', () => {
 const view=applyMapGesture({...base,bearing:90},{from:{x:.5,y:.5},to:{x:.75,y:.5},zoomDelta:0,rotationDelta:0,width:400,height:800});
 assert.ok(Math.abs(view.panX)<1e-12); assert.ok(Math.abs(view.panY-.125)<1e-12);
});
test('pinch limits preserve pan and rotation across zoom button updates', () => {
 const view=applyMapGesture({...base,zoomOffset:4,panX:.3,bearing:45},{from:{x:.5,y:.5},to:{x:.5,y:.5},zoomDelta:1,rotationDelta:0,width:400,height:800});
 assert.equal(view.panX,.3);assert.equal(view.bearing,45);assert.equal(view.zoomOffset,4);
});
test('fractional zoom uses integer tile sources and fills rotated corners', () => {
 const route=[[-23.3,-51.16],[-23.31,-51.16]];
 const layout=generateMapTileLayout(route,450,800,'standard',22,undefined,{...base,zoomOffset:.5,bearing:90});
 assert.equal(layout.zoom%1,.5);
 assert.ok(layout.tiles.every(tile=> /\/tile\/\d+\/\d+\/\d+$/.test(tile.url)));
 assert.ok(Math.min(...layout.tiles.map(tile=>tile.x))<=-175);
 assert.ok(Math.max(...layout.tiles.map(tile=>tile.x+tile.width))>=625);
});
