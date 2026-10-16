import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMapTileLayout } from '../utils/socialCardUtils';
const route: [number, number][] = [[-23.3,-51.16],[-23.301,-51.161],[-23.302,-51.1605]];
test('zoom scales the real route with the tile layer and respects tile limits', () => {
  const normal = generateMapTileLayout(route, 300, 180);
  const closer = generateMapTileLayout(route, 300, 180, 'standard', 24, undefined, {zoomOffset:1,panX:0,panY:0});
  assert.equal(closer.zoom, normal.zoom+1);
  assert.ok(Math.abs((closer.startPoint!.x-150) - 2*(normal.startPoint!.x-150)) < 0.001);
  assert.ok(closer.tiles.every(tile=>tile.url.includes(`/tile/${closer.zoom}/`)));
  assert.equal(generateMapTileLayout(route,300,180,'standard',24,undefined,{zoomOffset:100,panX:0,panY:0}).zoom,19);
});
test('panning translates route and tiles together without changing route data', () => {
  const normal = generateMapTileLayout(route,300,180);
  const panned = generateMapTileLayout(route,300,180,'standard',24,undefined,{zoomOffset:0,panX:0.1,panY:-0.1});
  assert.equal(panned.zoom,normal.zoom);
  assert.ok(Math.abs(panned.startPoint!.x - normal.startPoint!.x + 30) < 0.001);
  assert.ok(Math.abs(panned.startPoint!.y - normal.startPoint!.y - 18) < 0.001);
  const key=normal.tiles.find(tile=>panned.tiles.some(other=>other.key===tile.key))!.key;
  assert.ok(Math.abs(panned.tiles.find(t=>t.key===key)!.x-normal.tiles.find(t=>t.key===key)!.x+30)<=1);
});
