import { decodePolyline } from './gpsUtils';

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
  fallbackUrl?: string;
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

// Default fallback coordinates if no GPS track exists anywhere
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

/**
 * Normaliza qualquer formato de rota GPS (arrays [lat, lng], objetos {lat, lng}, polylines codificadas, objetos de rota, JSON stringificado)
 * garantindo uma lista estrita de coordenadas reais [latitude, longitude][].
 * Corrige automaticamente inversões de coordenadas GeoJSON [longitude, latitude] para o padrão geográfico.
 */
export function normalizeGpsPoints(input: any): [number, number][] {
  if (!input) return [];

  // Se for uma string (pode ser JSON stringificado ou polyline codificada)
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const res = normalizeGpsPoints(parsed);
        if (res.length > 0) return res;
      } catch {}
    }

    if (trimmed.length > 5) {
      try {
        const decoded = decodePolyline(trimmed);
        if (decoded && decoded.length > 0) return decoded;
      } catch (e) {
        console.warn('Falha ao decodificar polyline:', e);
      }
    }
    return [];
  }

  // Se for um objeto com propriedades de rota (RouteData, GpsRoute, etc.)
  if (typeof input === 'object' && !Array.isArray(input)) {
    // 1. Tenta pontos diretos
    const candidateArrays = [
      input.points,
      input.gpsPoints,
      input.routePoints,
      input.coordinates,
      input.latLngs,
      input.path,
      input.track
    ];

    for (const arr of candidateArrays) {
      if (Array.isArray(arr) && arr.length > 0) {
        const normalized = normalizeGpsPoints(arr);
        if (normalized.length > 0) return normalized;
      }
    }

    // 2. Tenta extrair de amostras de telemetria se disponível
    if (Array.isArray(input.telemetrySamples) && input.telemetrySamples.length > 0) {
      const fromTelemetry = normalizeGpsPoints(input.telemetrySamples);
      if (fromTelemetry.length > 0) return fromTelemetry;
    }

    // 3. Tenta polylines codificadas
    const polylineStr = 
      input.polyline || 
      input.encodedPolyline || 
      input.summary_polyline || 
      input.overview_polyline;

    if (typeof polylineStr === 'string' && polylineStr.trim().length > 5) {
      try {
        const decoded = decodePolyline(polylineStr.trim());
        if (decoded && decoded.length > 0) return decoded;
      } catch (e) {
        console.warn('Falha ao decodificar polyline do objeto:', e);
      }
    }

    // 4. Tenta propriedades aninhadas
    const nestedCandidates = [
      input.gpsRoute,
      input.route,
      input.data?.gpsRoute,
      input.data?.route,
      input.workout?.gpsRoute,
      input.workout?.route,
      input.rawRoute
    ];

    for (const nested of nestedCandidates) {
      if (nested && nested !== input) {
        const res = normalizeGpsPoints(nested);
        if (res.length > 0) return res;
      }
    }

    return [];
  }

  // Se for um array de itens
  if (Array.isArray(input)) {
    const result: [number, number][] = [];
    for (const item of input) {
      if (!item) continue;

      // Formato [lat, lng] ou [lng, lat] (GeoJSON)
      if (Array.isArray(item) && item.length >= 2) {
        let lat = Number(item[0]);
        let lng = Number(item[1]);

        // Detecta e corrige inversão GeoJSON [longitude, latitude] no hemisfério sul / Américas
        if (Math.abs(lat) > 35 && Math.abs(lng) <= 35 && Math.abs(lng) > 0.0001) {
          const temp = lat;
          lat = lng;
          lng = temp;
        }

        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          result.push([lat, lng]);
        }
      } 
      // Formato { lat, lng } ou { latitude, longitude } ou { lat, lon }
      else if (typeof item === 'object') {
        let lat = Number(item.lat ?? item.latitude ?? item.y);
        let lng = Number(item.lng ?? item.lon ?? item.longitude ?? item.x);

        // Detecta e corrige inversão GeoJSON
        if (Math.abs(lat) > 35 && Math.abs(lng) <= 35 && Math.abs(lng) > 0.0001) {
          const temp = lat;
          lat = lng;
          lng = temp;
        }

        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          result.push([lat, lng]);
        }
      }
    }
    return result;
  }

  return [];
}

/**
 * Salva a localização GPS real conhecida do atleta localmente
 */
export function saveAthleteGpsLocation(lat: number, lng: number): void {
  try {
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      localStorage.setItem('prorun_last_gps_position', JSON.stringify([lat, lng]));
    }
  } catch {}
}

/**
 * Obtém a última localização GPS real conhecida do atleta armazenada localmente
 */
export function getSavedAthleteGpsLocation(): [number, number] | null {
  try {
    const saved = localStorage.getItem('prorun_last_gps_position');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= 2 && !isNaN(parsed[0]) && !isNaN(parsed[1])) {
        return [Number(parsed[0]), Number(parsed[1])];
      }
    }
  } catch {}
  return null;
}

/**
 * Tenta obter silenciosamente a localização atual do dispositivo do atleta via Geolocation API
 */
export function requestCurrentAthletePosition(): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve(getSavedAthleteGpsLocation());
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!isNaN(latitude) && !isNaN(longitude)) {
          saveAthleteGpsLocation(latitude, longitude);
          resolve([latitude, longitude]);
          return;
        }
        resolve(getSavedAthleteGpsLocation());
      },
      () => {
        resolve(getSavedAthleteGpsLocation());
      },
      { timeout: 4000, maximumAge: 600000, enableHighAccuracy: false }
    );
  });
}

function latLngToWorldPixel(lat: number, lng: number, zoom: number): { wx: number; wy: number } {
  const scale = 256 * Math.pow(2, zoom);
  const wx = ((lng + 180) / 360) * scale;
  const clippedLat = Math.min(Math.max(lat, -85.05112878), 85.05112878);
  const sinLat = Math.sin((clippedLat * Math.PI) / 180);
  const wy = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { wx, wy };
}

/**
 * Calculates map tile layout and precise overlay route path for Standard and Satellite maps.
 * Mostra o local exato da corrida do atleta em alta definição, sem marca d'água de API.
 */
export interface MapViewAdjustment {
  bearing?: number;
  zoomOffset: number;
  panX: number;
  panY: number;
}

export function generateMapTileLayout(
  points: any,
  width: number,
  height: number,
  mapMode: MapDisplayMode = 'standard',
  padding = 24,
  fallbackLocation?: [number, number] | null,
  view?: MapViewAdjustment
): RenderedMapLayout {
  const normalized = normalizeGpsPoints(points);
  const hasRealTrack = normalized.length >= 2;

  // Se não houver percurso com múltiplos pontos, obtém ponto de referência real do atleta
  const athleteCenter = fallbackLocation || getSavedAthleteGpsLocation() || (normalized.length === 1 ? normalized[0] : null);

  // Pontos utilizados para dimensionar e centralizar o mapa
  const pts: [number, number][] = hasRealTrack
    ? normalized
    : athleteCenter
    ? [athleteCenter]
    : SAMPLE_GPS_POINTS;

  // Proteção contra dimensões inválidas
  const safeWidth = Math.max(width || 450, 100);
  const safeHeight = Math.max(height || 200, 80);

  // Cálculo do zoom ideal para cobrir todo o percurso mantendo margem de segurança
  let bestZoom = 15;
  const usableW = Math.max(safeWidth - padding * 2, 60);
  const usableH = Math.max(safeHeight - padding * 2, 60);

  if (hasRealTrack) {
    for (let z = 18; z >= 3; z--) {
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
  } else {
    // Para ponto único ou visão local, zoom 15 focado no bairro/rua real
    bestZoom = 15;
  }

  bestZoom = Math.max(3, Math.min(19, bestZoom + (view?.zoomOffset || 0)));

  // Coordenadas mundiais dos pontos no bestZoom
  let minWx = Infinity, maxWx = -Infinity, minWy = Infinity, maxWy = -Infinity;
  const worldPoints = pts.map(([lat, lng]) => {
    const { wx, wy } = latLngToWorldPixel(lat, lng, bestZoom);
    if (wx < minWx) minWx = wx;
    if (wx > maxWx) maxWx = wx;
    if (wy < minWy) minWy = wy;
    if (wy > maxWy) maxWy = wy;
    return { wx, wy };
  });

  const centerWx = (minWx + maxWx) / 2 + (view?.panX || 0) * safeWidth;
  const centerWy = (minWy + maxWy) / 2 + (view?.panY || 0) * safeHeight;

  // Coordenadas na tela
  const screenPoints = worldPoints.map(({ wx, wy }) => ({
    x: safeWidth / 2 + (wx - centerWx),
    y: safeHeight / 2 + (wy - centerWy)
  }));

  // Constrói o traçado SVG apenas se houver percurso real gravado
  let pathData = '';
  if (hasRealTrack && screenPoints.length > 0) {
    pathData = `M ${screenPoints[0].x.toFixed(1)} ${screenPoints[0].y.toFixed(1)}`;
    for (let i = 1; i < screenPoints.length; i++) {
      pathData += ` L ${screenPoints[i].x.toFixed(1)} ${screenPoints[i].y.toFixed(1)}`;
    }
  }

  const tiles: MapTileInfo[] = [];
  const tileZoom = Math.floor(bestZoom);
  const tileSize = 256 * 2 ** (bestZoom - tileZoom);
  const angle = (view?.bearing || 0) * Math.PI / 180;
  const coverageWidth = Math.abs(Math.cos(angle)) * safeWidth + Math.abs(Math.sin(angle)) * safeHeight;
  const coverageHeight = Math.abs(Math.sin(angle)) * safeWidth + Math.abs(Math.cos(angle)) * safeHeight;

  if (mapMode === 'standard' || mapMode === 'satellite') {
    const minTileX = Math.floor((centerWx - coverageWidth / 2) / tileSize);
    const maxTileX = Math.floor((centerWx + coverageWidth / 2) / tileSize);
    const minTileY = Math.floor((centerWy - coverageHeight / 2) / tileSize);
    const maxTileY = Math.floor((centerWy + coverageHeight / 2) / tileSize);
    const numTilesX = 1 << tileZoom;

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        if (ty < 0 || ty >= (1 << tileZoom)) continue;
        const normalizedTx = ((tx % numTilesX) + numTilesX) % numTilesX;

        const tileScreenX = safeWidth / 2 + (tx * tileSize - centerWx);
        const tileScreenY = safeHeight / 2 + (ty * tileSize - centerWy);

        // Servidores Oficiais Esri ArcGIS:
        // Modo Satélite: World_Imagery (Foto aérea e satélite real em altíssima resolução)
        // Modo Padrão: World_Street_Map (Ruas, avenidas, nomes e relevo com dados geográficos reais e livres de marcas d'água de API)
        // Ambos possuem CORS total (Access-Control-Allow-Origin: *), garantindo exportação transparente sem falha no canvas
        const url = mapMode === 'satellite'
          ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${tileZoom}/${ty}/${normalizedTx}`
          : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${tileZoom}/${ty}/${normalizedTx}`;

        const fallbackUrl = mapMode === 'satellite'
          ? `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/${tileZoom}/${ty}/${normalizedTx}`
          : `https://tile.openstreetmap.org/${tileZoom}/${normalizedTx}/${ty}.png`;

        tiles.push({
          url,
          fallbackUrl,
          x: tileScreenX,
          y: tileScreenY,
          width: tileSize + 0.5,
          height: tileSize + 0.5,
          key: `${tileZoom}-${normalizedTx}-${ty}`
        });
      }
    }
  }

  return {
    tiles,
    pathData,
    startPoint: hasRealTrack && screenPoints.length > 0 ? screenPoints[0] : (screenPoints.length === 1 ? screenPoints[0] : null),
    finishPoint: hasRealTrack && screenPoints.length > 1 ? screenPoints[screenPoints.length - 1] : null,
    width: safeWidth,
    height: safeHeight,
    zoom: bestZoom
  };
}

/**
 * Converts GPS Coordinates into an SVG Path string fitted to a given box
 */
export function convertGpsPointsToSvgPath(
  points: any,
  targetWidth = 400,
  targetHeight = 400,
  padding = 32
): SvgRouteResult {
  const valid = normalizeGpsPoints(points);

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
