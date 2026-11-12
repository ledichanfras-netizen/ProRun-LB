import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareFollowPlan,followPoint,followPose,projectFollowPoint,normalizeFollowSettings,DEFAULT_FOLLOW_SETTINGS} from '../utils/routeVideoFollow';
import {DEFAULT_VIDEO_FRAMING} from '../utils/routeVideoFraming';
import type {MapPoint} from '../utils/mapRoute';
const route:MapPoint[]=[[-23.3,-51.2],[-23.304,-51.2],[-23.305,-51.196],[-23.307,-51.195],[-23.31,-51.198],[-23.31,-51.201],[-23.307,-51.203],[-23.303,-51.204],[-23.3,-51.2]];
test('corridor planning bounds image requests and preserves saved GPS, including repeated samples',()=>{
 const input=[route[0],route[0],...route.slice(1)],before=JSON.stringify(input),plan=prepareFollowPlan(input,'satellite');
 assert.equal(JSON.stringify(input),before);assert.ok(plan.tiles.length>0&&plan.tiles.length<=128);assert.ok(plan.zoom<=17);assert.ok(plan.headings.length<=2002);
 assert.deepEqual(followPoint(plan,0),plan.points[0]);assert.deepEqual(followPoint(plan,plan.route.totalMeters),plan.points[plan.points.length-1]);
 assert.equal(prepareFollowPlan(route,'transparent').tiles.length,0);
 const long=prepareFollowPlan([[0,0],[0,1],[1,1]],'satellite');assert.ok(long.tiles.length<=128);assert.ok(long.zoom<17);
});
test('camera travels with route distance, stays deterministic and keeps the athlete in frame',()=>{
 const plan=prepareFollowPlan(route,'transparent');let previous;
 for(let step=0;step<=100;step++){
  const pose=followPose(plan,step/100,DEFAULT_FOLLOW_SETTINGS,DEFAULT_VIDEO_FRAMING),pin=projectFollowPoint(pose.head,pose);
  assert.ok(pin);assert.ok(Math.abs(pin.x-328)<1e-6);assert.ok(Math.abs(pin.y-481)<1e-6);
  assert.deepEqual(pose,followPose(plan,step/100,DEFAULT_FOLLOW_SETTINGS,DEFAULT_VIDEO_FRAMING));
  if(previous)assert.ok(Math.hypot(pose.camera.x-previous.camera.x,pose.camera.y-previous.camera.y)>0);previous=pose;
 }
});
test('heading across north and the date line follows the short direction without an accidental full spin',()=>{
 for(const input of [[[-23,-51],[-22.999,-51.0001],[-22.998,-51],[-22.997,-50.9999]],[[-23,179.999],[-23,-179.999],[-22.999,-179.998]]]){
  const plan=prepareFollowPlan(input as MapPoint[],'satellite');assert.ok(plan.tiles.length<=128);
  for(let i=1;i<plan.headings.length;i++)assert.ok(Math.abs(plan.headings[i]-plan.headings[i-1])<Math.PI/2);
  for(let i=1;i<plan.points.length;i++)assert.ok(Math.abs(plan.points[i].x-plan.points[i-1].x)<256*2**plan.zoom/2);
 }
});
test('camera controls and gestures are bounded and affect pose without changing geometry',()=>{
 assert.deepEqual(normalizeFollowSettings({height:NaN,pitch:Infinity,distance:-30}),{height:45,pitch:25,distance:15});
 const plan=prepareFollowPlan(route,'transparent'),before=JSON.stringify(plan.points);
 const base=followPose(plan,.4,DEFAULT_FOLLOW_SETTINGS,DEFAULT_VIDEO_FRAMING);
 for(const settings of [{height:15,pitch:15,distance:15},{height:120,pitch:65,distance:150}]){
  const pose=followPose(plan,.4,settings,{zoom:3,panX:.1,panY:-.1,rotation:30});assert.ok(Object.values(pose).filter(x=>typeof x==='number').every(Number.isFinite));assert.notDeepEqual(pose,base);assert.ok(projectFollowPoint(pose.head,pose));
 }
 assert.equal(JSON.stringify(plan.points),before);
});
