/**
 * Utilities for Activity Share / Story Card Generation
 * Handles GPS coordinate to SVG path transformation and Logo transparency processing
 */

/**
 * Removes black/dark background from an image using HTML5 canvas alpha keying
 */
export async function processLogoTransparency(
  imageSrc: string, 
  mode: 'original' | 'white' | 'black' | 'emerald' = 'original'
): Promise<string> {
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

          // If pixel is black / near black background (brightness < 42), remove black background
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
