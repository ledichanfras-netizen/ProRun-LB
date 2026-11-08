import test from 'node:test';
import assert from 'node:assert/strict';
import {shareMapMetrics} from '../utils/shareMapMetrics';
import {generateMapTileLayout,projectShareMapPoint} from '../utils/socialCardUtils';
const split=(km:number,seconds:number)=>({km,durationSeconds:seconds,splitTimeSeconds:km*seconds,pace:'unused',paceSeconds:seconds});
test('km labels follow saved total on compressed geometry, preserving source points',()=>{
 const points:[number,number][]=[[0,0],[0,.03]],before=JSON.stringify(points);
 const result=shareMapMetrics(points,3.2,[split(1,300),split(2,360),split(3,330)]);
 assert.deepEqual(result.markers.map(m=>m.km),[1,2,3]);
 assert.ok(Math.abs(result.markers[0].point[1]-.03/3.2)<1e-9);
 assert.deepEqual(result.markers.map(m=>m.pace),['5:00','6:00','5:30']);
 assert.equal(result.segments.length,4);assert.equal(result.segments[3].color,undefined);
 assert.equal(JSON.stringify(points),before);
 assert.notEqual(result.markers[0].color,result.markers[1].color);
});
test('missing or invalid splits never invent a pace and sub-km routes have no km label',()=>{
 const result=shareMapMetrics([[0,0],[0,.02]],2,[split(1,NaN)]);
 assert.ok(result.markers.every(m=>m.pace===undefined));
 assert.equal(shareMapMetrics([[0,0],[0,.01]],.9).markers.length,0);
 assert.equal(shareMapMetrics([[0,0],[0,0]],10).markers.length,0);
 assert.equal(shareMapMetrics([[0,0],[NaN,0]],3).markers.length,0);
});
test('markers and sections share exact km boundaries across original vertices',()=>{
 const result=shareMapMetrics([[0,0],[0,.01],[.02,.01]],3,[split(1,300)]);
 assert.equal(result.markers.length,3);
 result.markers.forEach((m,i)=>assert.deepEqual(result.segments[i].points[result.segments[i].points.length-1],m.point));
});
test('projected markers align with route at pan, fractional zoom and rotation',()=>{
 const points:[number,number][]=[[-23.3,-51.2],[-23.29,-51.18]];
 const layout=generateMapTileLayout(points,450,800,'standard',22,undefined,{zoomOffset:.4,panX:.2,panY:-.1,bearing:90});
 const start=projectShareMapPoint(layout,points[0]);
 assert.ok(Math.abs(start.x-layout.startPoint!.x)<1e-8);
 assert.ok(Math.abs(start.y-layout.startPoint!.y)<1e-8);
 const rotated=projectShareMapPoint(layout,points[0],90);
 assert.ok(Math.abs(rotated.x-(layout.width/2-(start.y-layout.height/2)))<1e-8);
 assert.ok(Math.abs(rotated.y-(layout.height/2+(start.x-layout.width/2)))<1e-8);
});
