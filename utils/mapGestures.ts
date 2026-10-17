import type { MapViewAdjustment } from './socialCardUtils';

export interface MapGesture {
  from: { x: number; y: number };
  to: { x: number; y: number };
  zoomDelta: number;
  rotationDelta: number;
  width: number;
  height: number;
}

/** Keep the location under the fingers fixed while zooming, turning and dragging. */
export function applyMapGesture(previous: MapViewAdjustment, gesture: MapGesture): MapViewAdjustment {
  const zoomOffset = Math.max(-3, Math.min(4, previous.zoomOffset + gesture.zoomDelta));
  const scale = 2 ** (zoomOffset - previous.zoomOffset);
  const bearing = ((previous.bearing || 0) + gesture.rotationDelta + 360) % 360;
  const unrotate = (point: {x: number; y: number}, angle: number) => {
    const x = (point.x - .5) * gesture.width, y = (point.y - .5) * gesture.height;
    const radians = angle * Math.PI / 180;
    return { x: x * Math.cos(radians) + y * Math.sin(radians), y: -x * Math.sin(radians) + y * Math.cos(radians) };
  };
  const from = unrotate(gesture.from, previous.bearing || 0), to = unrotate(gesture.to, bearing);
  return { zoomOffset, bearing,
    panX: previous.panX * scale + (from.x * scale - to.x) / gesture.width,
    panY: previous.panY * scale + (from.y * scale - to.y) / gesture.height };
}
