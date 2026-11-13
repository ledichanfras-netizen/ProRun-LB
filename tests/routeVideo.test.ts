import test from 'node:test';
import assert from 'node:assert/strict';
import {ROUTE_VIDEO_DURATIONS,routeVideoKilometerCheck,prepareVideoRoute,videoRoutePosition,routeAnimationProgress,supportedVideoMime,videoFileExtension,safeVideoFilename} from '../utils/routeVideo';
import type {MapPoint} from '../utils/mapRoute';

test('video requires real nonzero GPS geometry and never modifies saved points',()=>{
 for(const route of [[],[[0,0]],[[0,0],[0,0]],[[91,0],[0,1]],[[NaN,0],[0,1]]])assert.throws(()=>prepareVideoRoute(route as MapPoint[]));
 const input:MapPoint[]=[[-23.3,-51.2],[-23.301,-51.2],[-23.301,-51.199]];const before=JSON.stringify(input);
 const prepared=prepareVideoRoute(input);assert.ok(prepared.totalMeters>100);assert.equal(JSON.stringify(input),before);
 prepared.points[0][0]=0;assert.equal(input[0][0],-23.3);
});
test('marker follows distance along the original bends, including repeated samples and exact endpoints',()=>{
 const route=prepareVideoRoute([[0,0],[0,0],[0,.001],[.009,.001]]);
 assert.deepEqual(videoRoutePosition(route,0).point,[0,0]);
 assert.deepEqual(videoRoutePosition(route,1).point,[.009,.001]);
 const halfway=videoRoutePosition(route,.5);assert.ok(halfway.point[0]>.0039&&halfway.point[0]<.0041);assert.equal(halfway.point[1],.001);
 assert.deepEqual(videoRoutePosition(route,2).point,[.009,.001]);
 assert.deepEqual(videoRoutePosition(route,-1).point,[0,0]);
});
test('animation has an intro and a final summary hold for every offered duration',()=>{
 for(const duration of ROUTE_VIDEO_DURATIONS){assert.equal(routeAnimationProgress(0,duration),0);assert.equal(routeAnimationProgress(1,duration),0);assert.equal(routeAnimationProgress(duration-2,duration),1);assert.equal(routeAnimationProgress(duration,duration),1);assert.ok(routeAnimationProgress(duration/2,duration)>0);}
});
test('format negotiation prefers native MP4 and provides an honestly named WebM fallback',()=>{
 assert.match(supportedVideoMime(()=>true)!,/^video\/mp4/);
 assert.equal(supportedVideoMime(t=>t==='video/webm;codecs=vp8'),'video/webm;codecs=vp8');
 assert.equal(supportedVideoMime(()=>false),null);
 assert.equal(supportedVideoMime(()=>{throw new Error('Unsupported codec');}),null);
 assert.equal(videoFileExtension('video/mp4;codecs=avc1'),'mp4');assert.equal(videoFileExtension('video/webm'),'webm');assert.throws(()=>videoFileExtension('image/png'));
 assert.equal(safeVideoFilename('../Treino de sábado!',5.34,'video/webm'),'ProRunLB__Treino_de_sabado__5_34km.webm');
});

test('kilometre checks trigger at every boundary, persist, and never invent pace or a partial km',()=>{
 const markers=Array.from({length:10},(_,i)=>({km:i+1,point:[0,0] as MapPoint,color:'#fff',...(i===0?{pace:'5:12'}:{})}));
 assert.equal(routeVideoKilometerCheck(markers,10.03,0),null);
 for(const marker of markers){const p=marker.km/10.03;assert.equal(routeVideoKilometerCheck(markers,10.03,p)?.km,marker.km);assert.notEqual(routeVideoKilometerCheck(markers,10.03,p-1e-5)?.km,marker.km);}
 assert.equal(routeVideoKilometerCheck(markers,10.03,.15)?.pace,'5:12');
 assert.equal(routeVideoKilometerCheck(markers,10.03,.25)?.pace,undefined);
 assert.equal(routeVideoKilometerCheck(markers,10.03,1)?.km,10);
 assert.equal(routeVideoKilometerCheck(markers,.8,1),null);
 assert.equal(routeVideoKilometerCheck(markers,NaN,1),null);
 assert.equal(routeVideoKilometerCheck(markers,10,NaN),null);
});
