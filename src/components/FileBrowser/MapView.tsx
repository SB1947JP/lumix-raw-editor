import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GpsCoords } from '../../types';
import { UI_COLORS } from '../../lib/palette';

const TILE_SIZE = 256;
const MIN_ZOOM = 2;
const MAX_ZOOM = 18;
const DEFAULT_ZOOM = 13;

// Standard Web Mercator (EPSG:3857) tile maths, the scheme every slippy map
// uses. Returns *fractional* tile coordinates so a position can sit part-way
// across a tile rather than snapping to its corner.
function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * 2 ** zoom;
}

function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * 2 ** zoom;
}

/** Decimal degrees → the degrees/minutes/seconds photographers expect to see. */
function toDms(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  return `${deg}°${String(min).padStart(2, '0')}'${sec.toFixed(1).padStart(4, '0')}"${hemisphere}`;
}

/**
 * A minimal slippy map over OpenStreetMap raster tiles.
 *
 * Written by hand rather than pulling in Leaflet: the whole job is a grid of
 * <img> tiles plus drag-to-pan, and a map library would add a dependency, a
 * stylesheet and marker image assets that all need base-path wrangling for the
 * GitHub Pages subdirectory deploy.
 */
export function MapView({ gps, fileName }: { gps: GpsCoords; fileName?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  // Map centre, in fractional tile coordinates at the current zoom.
  const [center, setCenter] = useState(() => ({
    x: lonToTileX(gps.longitude, DEFAULT_ZOOM),
    y: latToTileY(gps.latitude, DEFAULT_ZOOM),
  }));
  const dragRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);

  const recenter = useCallback(
    (z: number = DEFAULT_ZOOM) => {
      setZoom(z);
      setCenter({ x: lonToTileX(gps.longitude, z), y: latToTileY(gps.latitude, z) });
    },
    [gps.latitude, gps.longitude],
  );

  // Selecting a different photo should jump to its location, not leave the map
  // parked wherever the previous one was panned to.
  useEffect(() => {
    recenter();
  }, [recenter]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const changeZoom = (delta: number) => {
    setZoom((z) => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta));
      if (next === z) return z;
      // Tile coordinates double per zoom level, so rescaling the centre keeps
      // whatever the user panned to under the crosshair instead of teleporting.
      const scale = 2 ** (next - z);
      setCenter((c) => ({ x: c.x * scale, y: c.y * scale }));
      return next;
    });
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    setCenter((c) => ({ x: c.x - dx / TILE_SIZE, y: c.y - dy / TILE_SIZE }));
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      dragRef.current = null;
    }
  };

  const { width, height } = size;
  const n = 2 ** zoom;
  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  if (width > 0 && height > 0) {
    const originX = center.x - width / 2 / TILE_SIZE;
    const originY = center.y - height / 2 / TILE_SIZE;
    const firstX = Math.floor(originX);
    const firstY = Math.floor(originY);
    const cols = Math.ceil(width / TILE_SIZE) + 1;
    const rows = Math.ceil(height / TILE_SIZE) + 1;
    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j <= rows; j++) {
        const tx = firstX + i;
        const ty = firstY + j;
        // Latitude doesn't wrap — above/below the world there is simply no
        // tile, so those slots stay empty rather than requesting a 404.
        if (ty < 0 || ty >= n) continue;
        // Longitude does wrap, so panning past the antimeridian continues
        // into the other side of the world instead of hitting a void.
        const wrappedX = ((tx % n) + n) % n;
        tiles.push({
          key: `${zoom}/${tx}/${ty}`,
          url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`,
          left: (tx - center.x) * TILE_SIZE + width / 2,
          top: (ty - center.y) * TILE_SIZE + height / 2,
        });
      }
    }
  }

  const markerLeft = (lonToTileX(gps.longitude, zoom) - center.x) * TILE_SIZE + width / 2;
  const markerTop = (latToTileY(gps.latitude, zoom) - center.y) * TILE_SIZE + height / 2;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${gps.latitude}&mlon=${gps.longitude}#map=${zoom}/${gps.latitude}/${gps.longitude}`;

  return (
    <div>
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative w-full h-40 overflow-hidden rounded border border-neutral-700 bg-neutral-950 cursor-grab active:cursor-grabbing touch-none select-none"
      >
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            aria-hidden="true"
            draggable={false}
            loading="lazy"
            // Don't leak this app's URL to the tile host with every request.
            referrerPolicy="no-referrer"
            width={TILE_SIZE}
            height={TILE_SIZE}
            className="absolute max-w-none pointer-events-none"
            style={{ left: t.left, top: t.top, width: TILE_SIZE, height: TILE_SIZE }}
          />
        ))}

        {/* Pin, anchored so its point (not its centre) sits on the coordinate. */}
        {width > 0 && (
          <svg
            viewBox="0 0 24 24"
            className="absolute pointer-events-none drop-shadow"
            style={{ left: markerLeft - 12, top: markerTop - 24, width: 24, height: 24 }}
            aria-hidden="true"
          >
            <path
              d="M12 0.5c-4 0-7.2 3.2-7.2 7.2 0 5.4 7.2 15.8 7.2 15.8s7.2-10.4 7.2-15.8c0-4-3.2-7.2-7.2-7.2z"
              fill={UI_COLORS.danger}
              stroke="#f5f5f5"
              strokeWidth="1.2"
            />
            <circle cx="12" cy="7.7" r="2.6" fill="#f5f5f5" />
          </svg>
        )}

        <div className="absolute top-1 right-1 flex flex-col gap-1">
          {[
            { label: '+', delta: 1, title: 'Zoom in' },
            { label: '−', delta: -1, title: 'Zoom out' },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => changeZoom(b.delta)}
              title={b.title}
              aria-label={b.title}
              className="w-6 h-6 flex items-center justify-center rounded bg-neutral-900/85 border border-neutral-600 text-neutral-200 text-sm leading-none hover:bg-neutral-800"
            >
              {b.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => recenter()}
            title="Recentre on photo"
            aria-label="Recentre on photo"
            className="w-6 h-6 flex items-center justify-center rounded bg-neutral-900/85 border border-neutral-600 text-neutral-200 hover:bg-neutral-800"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="3.2" />
              <path d="M8 1v2.2M8 12.8V15M1 8h2.2M12.8 8H15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* OpenStreetMap's tile usage policy requires visible attribution. */}
        <div className="absolute bottom-0 right-0 px-1 text-[9px] leading-tight bg-neutral-950/75 text-neutral-400">
          ©{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer noopener"
            className="underline hover:text-neutral-200"
          >
            OpenStreetMap
          </a>
        </div>
      </div>

      <div className="mt-1.5 flex items-start justify-between gap-2 text-[11px] text-neutral-400">
        {/* One value per line: the panel is too narrow to hold a coordinate
            pair without wrapping mid-number, which reads as garbled digits. */}
        <div className="tabular-nums leading-snug min-w-0">
          <div className="whitespace-nowrap">{toDms(gps.latitude, 'N', 'S')}</div>
          <div className="whitespace-nowrap">{toDms(gps.longitude, 'E', 'W')}</div>
          <div className="text-neutral-500 whitespace-nowrap">
            {gps.latitude.toFixed(4)}, {gps.longitude.toFixed(4)}
          </div>
          {gps.altitude !== undefined && (
            <div className="text-neutral-500 whitespace-nowrap">{Math.round(gps.altitude)} m</div>
          )}
        </div>
        <a
          href={osmUrl}
          target="_blank"
          rel="noreferrer noopener"
          title={fileName ? `Open ${fileName}'s location on OpenStreetMap` : 'Open on OpenStreetMap'}
          className="shrink-0 underline hover:text-neutral-200"
        >
          Open map
        </a>
      </div>
    </div>
  );
}
