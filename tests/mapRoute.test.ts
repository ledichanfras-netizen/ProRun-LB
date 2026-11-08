import test from 'node:test';import assert from 'node:assert/strict';
import {routeKilometers,mapSegmentMeters,validMapPoint} from '../utils/mapRoute';
test('kilometer markers are interpolated along the recorded route without changing it',()=>{
 const points:[number,number][]=[[0,0],[0,.03]],before=JSON.stringify(points);const markers=routeKilometers(points);
 assert.deepEqual(markers.map(m=>m.km),[1,2,3]);for(const m of markers)assert.ok(Math.abs(mapSegmentMeters(points[0],m.point)-m.km*1000)<.01);
 assert.equal(JSON.stringify(points),before);
});
test('stationary fixes, short routes and invalid coordinates do not create invented kilometers',()=>{
 assert.deepEqual(routeKilometers([[0,0],[0,0],[0,.001]]),[]);assert.equal(validMapPoint([NaN,0]),false);assert.equal(validMapPoint([91,0]),false);
 assert.deepEqual(routeKilometers([[0,0],[NaN,0],[0,.03]]),[]);
});
test('markers continue across many recorded segments and follow a turn',()=>{
 const m=routeKilometers([[0,0],[0,.009],[.02,.009]]);assert.equal(m.length,3);assert.ok(m[1].point[0]>0);assert.equal(m[1].point[1],.009);
});
