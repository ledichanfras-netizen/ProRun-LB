import test from 'node:test';
import assert from 'node:assert/strict';
import {routeCamera,orientCameraPoint,perspectivePoint,projectCameraPoint} from '../utils/routeVideoCamera';

test('camera returns to full-route overview and is deterministic across recording retries',()=>{
 const head={x:608,y:602},a=routeCamera(656,650,.4,head);
 assert.deepEqual(a,routeCamera(656,650,.4,head));
 assert.deepEqual(routeCamera(656,650,-1,head),routeCamera(656,650,0,head));
 assert.deepEqual(routeCamera(656,650,2,head),routeCamera(656,650,1,head));
 for(const p of [0,1])for(const x of [48,608])for(const y of [48,602]){
  const projected=projectCameraPoint({x,y},routeCamera(656,650,p,head));
  assert.ok(projected.x>=0&&projected.x<=656);assert.ok(projected.y>=0&&projected.y<=650);
 }
});
test('GPS cursor stays inside the tilted map throughout camera movement',()=>{
 for(let step=0;step<=100;step++)for(const x of [48,328,608])for(const y of [48,325,602]){
  const head={x,y},camera=routeCamera(656,650,step/100,head),point=projectCameraPoint(head,camera);
  assert.ok(Number.isFinite(point.x)&&point.x>=0&&point.x<=656);
  assert.ok(Number.isFinite(point.y)&&point.y>=0&&point.y<=650);
  assert.deepEqual(point,perspectivePoint(orientCameraPoint(head,camera),656,650));
 }
});
test('perspective narrows the far edge and preserves map-plane alignment without mutating GPS',()=>{
 const point={x:123,y:234},before={...point},camera=routeCamera(656,650,.6,{x:400,y:300});
 projectCameraPoint(point,camera);assert.deepEqual(point,before);
 const topLeft=perspectivePoint({x:0,y:0},656,650),bottomLeft=perspectivePoint({x:0,y:650},656,650);
 assert.ok(topLeft.x>bottomLeft.x);assert.ok(topLeft.y<bottomLeft.y);
 assert.ok(Number.isFinite(routeCamera(656,650,NaN,point).angle));
});

test('manual framing fixes the immersive camera through the entire animation',()=>{
 const fixed=routeCamera(656,650,0,{x:48,y:48},true);
 for(let i=0;i<=100;i++)assert.deepEqual(routeCamera(656,650,i/100,{x:48+i*5,y:600-i*4},true),fixed);
 assert.notDeepEqual(routeCamera(656,650,.5,{x:48,y:48}),fixed);
});
