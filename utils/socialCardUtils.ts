/**
 * Utilities for Activity Share / Story Card Generation
 * Handles GPS coordinate to SVG path transformation and Logo transparency processing
 */

/**
 * Removes black/dark background from an image using HTML5 canvas alpha keying
 */
export async function processLogoTransparency(
  imageSrc: string, 
  mode: 'original' | 'transparent' | 'white' | 'black' | 'emerald' = 'original'
): Promise<string> {
  // If original mode is requested, return the source directly to preserve the authentic black background and full-color branding
  if (mode === 'original') {
    return imageSrc;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a === 0) continue;

          // Calculate brightness (perceptual luminance)
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;

          // For transparent/white/emerald/black modes, remove the dark background
          if (brightness < 42) {
            const alphaFactor = Math.max(0, (brightness - 12) / 30);
            data[i + 3] = Math.round(a * alphaFactor);
          } else {
            // Apply color mode if requested
            if (mode === 'white') {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
            } else if (mode === 'black') {
              data[i] = 15;
              data[i + 1] = 23;
              data[i + 2] = 42;
            } else if (mode === 'emerald') {
              data[i] = 16;
              data[i + 1] = 185;
              data[i + 2] = 129;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        console.warn('Canvas transparency extraction error:', e);
        resolve(imageSrc);
      }
    };

    img.onerror = () => {
      resolve(imageSrc);
    };
  });
}

export interface SvgRouteResult {
  pathData: string;
  startPoint: { x: number; y: number } | null;
  finishPoint: { x: number; y: number } | null;
  viewBox: string;
}

export type MapDisplayMode = 'transparent' | 'standard' | 'satellite';

export interface MapTileInfo {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  key: string;
}

export interface RenderedMapLayout {
  tiles: MapTileInfo[];
  pathData: string;
  startPoint: { x: number; y: number } | null;
  finishPoint: { x: number; y: number } | null;
  width: number;
  height: number;
  zoom: number;
}

// Default stylized running circuit coordinates (e.g. Parque Ibirapuera) when previewing with no GPS track
export const SAMPLE_GPS_POINTS: [number, number][] = [
  [-23.5874, -46.6576],
  [-23.5862, -46.6558],
  [-23.5841, -46.6542],
  [-23.5823, -46.6560],
  [-23.5835, -46.6588],
  [-23.5855, -46.6612],
  [-23.5878, -46.6605],
  [-23.5892, -46.6585],
  [-23.5874, -46.6576]
];

function latLngToWorldPixel(lat: number, lng: number, zoom: number): { wx: number; wy: number } {
  const scale = 256 * Math.pow(2, zoom);
  const wx = ((lng + 180) / 360) * scale;
  const clippedLat = Math.min(Math.max(lat, -85.05112878), 85.05112878);
  const sinLat = Math.sin((clippedLat * Math.PI) / 180);
  const wy = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { wx, wy };
}

/**
 * Calculates map tile layout and precise overlay route path for Standard and Satellite maps
 */
export function generateMapTileLayout(
  points: [number, number][],
  width: number,
  height: number,
  mapMode: MapDisplayMode = 'standard',
  padding = 28
): RenderedMapLayout {
  const validPoints = (points && points.length >= 2)
    ? points.filter(p => Array.isArray(p) && !isNaN(p[0]) && !isNaN(p[1]))
    : SAMPLE_GPS_POINTS;

  const pts = validPoints.length >= 2 ? validPoints : SAMPLE_GPS_POINTS;

  // Find best zoom (between 18 and 1)
  let bestZoom = 15;
  const usableW = Math.max(width - padding * 2, 80);
  const usableH = Math.max(height - padding * 2, 80);

  for (let z = 18; z >= 2; z--) {
    let minWx = Infinity, maxWx = -Infinity, minWy = Infinity, maxWy = -Infinity;
    for (const [lat, lng] of pts) {
      const { wx, wy } = latLngToWorldPixel(lat, lng, z);
      if (wx < minWx) minWx = wx;
      if (wx > maxWx) maxWx = wx;
      if (wy < minWy) minWy = wy;
      if (wy > maxWy) maxWy = wy;
    }
    const spanX = maxWx - minWx;
    const spanY = maxWy - minWy;
    if (spanX <= usableW && spanY <= usableH) {
      bestZoom = z;
      break;
    }
  }

  // Calculate coordinates at bestZoom
  let minWx = Infinity, maxWx = -Infinity, minWy = Infinity, maxWy = -Infinity;
  const worldPoints = pts.map(([lat, lng]) => {
    const { wx, wy } = latLngToWorldPixel(lat, lng, bestZoom);
    if (wx < minWx) minWx = wx;
    if (wx > maxWx) maxWx = wx;
    if (wy < minWy) minWy = wy;
    if (wy > maxWy) maxWy = wy;
    return { wx, wy };
  });

  const centerWx = (minWx + maxWx) / 2;
  const centerWy = (minWy + maxWy) / 2;

  // Screen coordinates
  const screenPoints = worldPoints.map(({ wx, wy }) => ({
    x: width / 2 + (wx - centerWx),
    y: height / 2 + (wy - centerWy)
  }));

  // Build SVG path
  let pathData = '';
  if (screenPoints.length > 0) {
    pathData = `M ${screenPoints[0].x.toFixed(1)} ${screenPoints[0].y.toFixed(1)}`;
    for (let i = 1; i < screenPoints.length; i++) {
      pathData += ` L ${screenPoints[i].x.toFixed(1)} ${screenPoints[i].y.toFixed(1)}`;
    }
  }

  const tiles: MapTileInfo[] = [];

  if (mapMode === 'standard' || mapMode === 'satellite') {
    const minTileX = Math.floor((centerWx - width / 2) / 256);
    const maxTileX = Math.floor((centerWx + width / 2) / 256);
    const minTileY = Math.floor((centerWy - height / 2) / 256);
    const maxTileY = Math.floor((centerWy + height / 2) / 256);
    const numTilesX = 1 << bestZoom;

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        if (ty < 0 || ty >= (1 << bestZoom)) continue;
        const normalizedTx = ((tx % numTilesX) + numTilesX) % numTilesX;

        const tileScreenX = width / 2 + (tx * 256 - centerWx);
        const tileScreenY = height / 2 + (ty * 256 - centerWy);

        const url = mapMode === 'satellite'
          ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${bestZoom}/${ty}/${normalizedTx}`
          : `https://a.basemaps.cartocdn.com/rastertiles/voyager/${bestZoom}/${normalizedTx}/${ty}.png`;

        tiles.push({
          url,
          x: Math.round(tileScreenX),
          y: Math.round(tileScreenY),
          width: 256,
          height: 256,
          key: `${bestZoom}-${normalizedTx}-${ty}`
        });
      }
    }
  }

  return {
    tiles,
    pathData,
    startPoint: screenPoints.length > 0 ? screenPoints[0] : null,
    finishPoint: screenPoints.length > 1 ? screenPoints[screenPoints.length - 1] : null,
    width,
    height,
    zoom: bestZoom
  };
}

/**
 * Converts GPS Coordinates ([lat, lng][]) into an SVG Path string fitted to a given box
 */
export function convertGpsPointsToSvgPath(
  points: [number, number][],
  targetWidth = 400,
  targetHeight = 400,
  padding = 32
): SvgRouteResult {
  if (!points || points.length < 2) {
    return {
      pathData: '',
      startPoint: null,
      finishPoint: null,
      viewBox: `0 0 ${targetWidth} ${targetHeight}`
    };
  }

  // Filter valid points
  const valid = points.filter(p => Array.isArray(p) && !isNaN(p[0]) && !isNaN(p[1]));
  if (valid.length < 2) {
    return {
      pathData: '',
      startPoint: null,
      finishPoint: null,
      viewBox: `0 0 ${targetWidth} ${targetHeight}`
    };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [lat, lng] of valid) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  const midLat = (minLat + maxLat) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);

  // Scaled dimensions
  const latSpan = Math.max(maxLat - minLat, 0.0001);
  const lngSpan = Math.max((maxLng - minLng) * cosLat, 0.0001);

  const usableWidth = targetWidth - padding * 2;
  const usableHeight = targetHeight - padding * 2;

  // Preserve aspect ratio
  const scaleX = usableWidth / lngSpan;
  const scaleY = usableHeight / latSpan;
  const scale = Math.min(scaleX, scaleY);

  const drawnWidth = lngSpan * scale;
  const drawnHeight = latSpan * scale;

  const offsetX = padding + (usableWidth - drawnWidth) / 2;
  const offsetY = padding + (usableHeight - drawnHeight) / 2;

  const svgCoords: { x: number; y: number }[] = valid.map(([lat, lng]) => {
    const x = offsetX + (lng - minLng) * cosLat * scale;
    // Invert Y because latitude goes North (+) and SVG Y goes South (+)
    const y = offsetY + (maxLat - lat) * scale;
    return { x, y };
  });

  // Build SVG Path
  let path = `M ${svgCoords[0].x.toFixed(2)} ${svgCoords[0].y.toFixed(2)}`;
  for (let i = 1; i < svgCoords.length; i++) {
    path += ` L ${svgCoords[i].x.toFixed(2)} ${svgCoords[i].y.toFixed(2)}`;
  }

  return {
    pathData: path,
    startPoint: svgCoords[0],
    finishPoint: svgCoords[svgCoords.length - 1],
    viewBox: `0 0 ${targetWidth} ${targetHeight}`
  };
}
