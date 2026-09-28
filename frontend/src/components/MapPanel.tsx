import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ApiAsset } from '../services/api';
import type { ConditionKey } from '../tokens';
import { COLORS } from '../tokens';
import { AlertTriangle, Maximize2 } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const AHM_CENTER: [number, number] = [72.5714, 23.0225];
const INIT_ZOOM = 11.5;

const COND_COLORS: Record<ConditionKey, string> = {
  excellent: '#2E7D5B',
  good:      '#8BA63A',
  fair:      '#E3B02F',
  poor:      '#D9682B',
  critical:  '#B3261E',
};

const COND_LABELS: ConditionKey[] = ['excellent', 'good', 'fair', 'poor', 'critical'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function scoreToCondition(score: number | null | undefined): ConditionKey {
  if (score == null) return 'fair';
  if (score >= 5) return 'excellent';
  if (score >= 4) return 'good';
  if (score >= 3) return 'fair';
  if (score >= 2) return 'poor';
  return 'critical';
}

function parseWKTPoint(wkt: string | null): [number, number] | null {
  if (!wkt) return null;
  const m = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2])]; // [lng, lat]
}

function buildConditionExpression(): maplibregl.ExpressionSpecification {
  // Map property "condition" → color
  const expr: any[] = ['match', ['get', 'condition']];
  for (const [k, v] of Object.entries(COND_COLORS)) {
    expr.push(k, v);
  }
  expr.push('#8C99A2'); // fallback
  return expr as maplibregl.ExpressionSpecification;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MapPanelProps {
  assets: ApiAsset[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  highlightedId: string | null;           // unique_id highlighted by row hover
  onAssetHover: (id: string | null) => void;
  onAssetClick: (id: string) => void;
  attentionIds: Set<string>;
}

// ─── Component ───────────────────────────────────────────────────────────────

const MapPanel: React.FC<MapPanelProps> = ({
  assets, loading, error, onRetry,
  highlightedId, onAssetHover, onAssetClick, attentionIds,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // Lookup tables built when GeoJSON is loaded
  const featureIdByUniqueId = useRef(new Map<string, number>());
  const coordsByUniqueId = useRef(new Map<string, [number, number]>());

  // Track feature-state IDs so we can clear them
  const prevExtHLRef = useRef<number | null>(null);  // external (row-hover) highlight
  const prevSelRef    = useRef<number | null>(null);  // selected (click)

  const [filterMode, setFilterMode] = useState<'all' | 'attention'>('all');
  const [condFilter, setCondFilter] = useState<ConditionKey | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; props: Record<string, unknown> } | null>(null);

  // Stable ref so init-effect can call setupMap without it being a dep
  const setupMapRef = useRef<((map: maplibregl.Map, data: GeoJSON.FeatureCollection) => void) | null>(null);

  // Per-condition counts for legend
  const condCounts = useMemo<Record<ConditionKey, number>>(() => {
    const c = { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 } as Record<ConditionKey, number>;
    for (const a of assets) c[scoreToCondition(a.condition_score)]++;
    return c;
  }, [assets]);

  // ── Build GeoJSON ──────────────────────────────────────────────────────────
  const buildGeoJSON = useCallback((
    assets: ApiAsset[],
    mode: 'all' | 'attention',
    cFilter: ConditionKey | null,
  ): GeoJSON.FeatureCollection => {
    featureIdByUniqueId.current.clear();
    coordsByUniqueId.current.clear();
    const features: GeoJSON.Feature[] = [];

    for (const a of assets) {
      const coords = parseWKTPoint(a.geometry);
      if (!coords) continue;
      const condition = scoreToCondition(a.condition_score);
      if (mode === 'attention' && !attentionIds.has(a.unique_id)) continue;
      if (cFilter && condition !== cFilter) continue;

      featureIdByUniqueId.current.set(a.unique_id, a.id);
      coordsByUniqueId.current.set(a.unique_id, coords);

      features.push({
        type: 'Feature',
        id: a.id,
        properties: {
          unique_id:       a.unique_id,
          name:            a.name,
          status:          a.status,
          condition,
          condition_score: a.condition_score,
          is_attention:    attentionIds.has(a.unique_id),
          cond_color:      COND_COLORS[condition],
        },
        geometry: { type: 'Point', coordinates: coords },
      });
    }

    console.log(
      `[MapPanel] GeoJSON built: ${features.length} features from ${assets.length} total assets`,
    );
    return { type: 'FeatureCollection', features };
  }, [attentionIds]);

  // ── Add sources + layers after style loads ─────────────────────────────────
  const setupMap = useCallback((map: maplibregl.Map, data: GeoJSON.FeatureCollection) => {
    // ── Source ──
    map.addSource('assets', {
      type: 'geojson',
      data,
      cluster: true,
      clusterMaxZoom: 13,
      clusterRadius: 50,
    });

    // ── Clusters ──
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'assets',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#14212B',
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 30],
        'circle-opacity': 0.88,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF',
      },
    });

    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'assets',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: { 'text-color': '#FFFFFF' },
    });

    // ── Unclustered: selection ring ──
    map.addLayer({
      id: 'point-ring',
      type: 'circle',
      source: 'assets',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 15, 16],
        'circle-color': 'transparent',
        'circle-stroke-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false], 3,
          ['boolean', ['feature-state', 'exthl'], false], 2,
          ['boolean', ['get', 'is_attention'], false], 1.5,
          0,
        ],
        'circle-stroke-color': '#FFFFFF',
      },
    });

    // ── Unclustered: fill by condition ──
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'assets',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          10, ['case', ['boolean', ['feature-state', 'exthl'], false], 9, 6],
          14, ['case', ['boolean', ['feature-state', 'exthl'], false], 13, 9],
        ],
        'circle-color': buildConditionExpression(),
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#FFFFFF',
        'circle-opacity': 0.92,
      },
    });

    // ── fitBounds ──
    if (data.features.length > 1) {
      const allCoords = data.features
        .filter(f => f.geometry.type === 'Point')
        .map(f => (f.geometry as GeoJSON.Point).coordinates as [number, number]);
      const bounds = allCoords.reduce(
        (b, [lng, lat]) => b.extend([lng, lat] as [number, number]),
        new maplibregl.LngLatBounds(allCoords[0], allCoords[0]),
      );
      map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 1200 });
    }

    // ── Cluster click → expand ──
    map.on('click', 'clusters', (e) => {
      const [feat] = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!feat) return;
      const clusterId = feat.properties.cluster_id as number;
      (map.getSource('assets') as maplibregl.GeoJSONSource)
        .getClusterExpansionZoom(clusterId)
        .then(zoom => {
          map.easeTo({
            center: (feat.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom,
          });
        });
    });

    // ── Cursor on clusters ──
    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });

    // ── Unclustered hover ──
    map.on('mousemove', 'unclustered-point', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const feat = e.features?.[0];
      if (!feat) return;
      const rect = containerRef.current!.getBoundingClientRect();
      setTooltip({
        x: e.originalEvent.clientX - rect.left,
        y: e.originalEvent.clientY - rect.top,
        props: feat.properties as Record<string, unknown>,
      });
      onAssetHover((feat.properties as any).unique_id);
    });

    map.on('mouseleave', 'unclustered-point', () => {
      map.getCanvas().style.cursor = '';
      setTooltip(null);
      onAssetHover(null);
    });

    // ── Unclustered click → popup + selection state ──
    map.on('click', 'unclustered-point', (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const p = feat.properties as any;
      const coords = (feat.geometry as GeoJSON.Point).coordinates as [number, number];
      const fid = feat.id as number;

      // Clear prev selection
      if (prevSelRef.current !== null) {
        map.setFeatureState({ source: 'assets', id: prevSelRef.current }, { selected: false });
      }
      map.setFeatureState({ source: 'assets', id: fid }, { selected: true });
      prevSelRef.current = fid;

      // Remove prev popup
      popupRef.current?.remove();

      const el = document.createElement('div');
      el.style.cssText = `
        font-family: 'IBM Plex Sans', sans-serif;
        font-size: 13px;
        color: #14212B;
        min-width: 220px;
        padding: 2px 0;
      `;
      const condColor = COND_COLORS[p.condition as ConditionKey] || COLORS.inkMuted;
      el.innerHTML = `
        <p style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:${COLORS.inkFaint};margin:0 0 4px">${p.unique_id}</p>
        <p style="font-weight:600;font-size:14px;margin:0 0 6px">${p.name}</p>
        <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:500;color:${condColor};background:${condColor}22;padding:2px 8px;border-radius:4px;margin-bottom:8px">
          ${p.condition.charAt(0).toUpperCase() + p.condition.slice(1)}
        </span>
        <p style="font-size:12px;color:${COLORS.inkMuted};margin:4px 0 2px">Status: <strong style="color:${COLORS.ink}">${p.status}</strong></p>
        <p style="font-size:12px;color:${COLORS.inkMuted};margin:0 0 10px">Score: <strong style="font-family:'IBM Plex Mono',monospace">${p.condition_score ?? '—'} / 5</strong></p>
        <a href="/assets/${p.unique_id}" style="font-size:12px;color:${COLORS.primary};font-weight:500;text-decoration:none">Open profile →</a>
      `;

      popupRef.current = new maplibregl.Popup({
        offset: 14,
        closeButton: true,
        maxWidth: '280px',
        className: 'infra-popup',
      })
        .setLngLat(coords)
        .setDOMContent(el)
        .addTo(map);

      onAssetClick(p.unique_id);
    });
  }, [buildConditionExpression, onAssetHover, onAssetClick]);

  // Keep setupMapRef in sync with latest version of setupMap
  useEffect(() => { setupMapRef.current = setupMap; });

  // ── Initialise map (once) ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: AHM_CENTER,
      zoom: INIT_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '© OpenStreetMap contributors © CARTO',
      }),
      'bottom-right',
    );

    mapRef.current = map;

    map.on('error', (e) => {
      console.error('[MapPanel] Map error:', e.error);
    });

    map.on('load', () => {
      mapLoadedRef.current = true;
      // If assets already arrived, set up layers now
      if (assets.length > 0) {
        const geojson = buildGeoJSON(assets, filterMode, condFilter);
        setupMapRef.current?.(map, geojson);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update map when assets / filters change ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current || loading) return;
    if (assets.length === 0) return;

    const geojson = buildGeoJSON(assets, filterMode, condFilter);
    const src = map.getSource('assets') as maplibregl.GeoJSONSource | undefined;

    if (src) {
      src.setData(geojson);
    } else if (mapLoadedRef.current) {
      setupMap(map, geojson);
    }
  }, [assets, filterMode, condFilter, loading, buildGeoJSON, setupMap]);

  // ── Cross-highlight: respond to external row hover ─────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    // Clear previous external highlight
    if (prevExtHLRef.current !== null) {
      try {
        map.setFeatureState({ source: 'assets', id: prevExtHLRef.current }, { exthl: false });
      } catch { /* feature may not exist in current viewport */ }
      prevExtHLRef.current = null;
    }

    if (!highlightedId) return;

    const fid = featureIdByUniqueId.current.get(highlightedId);
    const coords = coordsByUniqueId.current.get(highlightedId);

    if (fid !== undefined) {
      try {
        map.setFeatureState({ source: 'assets', id: fid }, { exthl: true });
        prevExtHLRef.current = fid;
      } catch { /* ignore */ }
    }
    if (coords) {
      map.easeTo({ center: coords, duration: 300, zoom: Math.max(map.getZoom(), 13) });
    }
  }, [highlightedId]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#EAE6DE' }}>
      {/* Map mount target — must have explicit height */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading skeleton */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{ background: '#EAE6DE' }}>
          <div className="w-8 h-8 rounded-full border-2 border-[#0F6B6E] border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: COLORS.inkMuted }}>Loading map data…</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: '#EAE6DE' }}>
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center"
            style={{ background: COLORS.condition.critical + '18' }}>
            <AlertTriangle className="w-5 h-5" style={{ color: COLORS.condition.critical }} />
          </div>
          <p className="text-sm font-medium" style={{ color: COLORS.ink }}>Could not load map data</p>
          <p className="text-xs" style={{ color: COLORS.inkMuted }}>{error}</p>
          <button onClick={onRetry}
            className="text-sm font-medium px-4 py-2 rounded-md transition-colors duration-150"
            style={{ background: COLORS.primary, color: 'white' }}>
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && assets.length === 0 && mapLoadedRef.current && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-[10px] px-5 py-4 text-center"
            style={{ background: 'rgba(255,255,255,0.9)', border: `1px solid ${COLORS.line}` }}>
            <p className="text-sm font-medium" style={{ color: COLORS.ink }}>No assets match current filters</p>
            <p className="text-xs mt-1" style={{ color: COLORS.inkMuted }}>Clear the condition filter to see all assets</p>
          </div>
        </div>
      )}

      {/* Filter toggle — top left */}
      {!loading && !error && (
        <div className="absolute top-3 left-3 z-10 flex rounded-md overflow-hidden"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)', border: `1px solid ${COLORS.line}` }}>
          {(['all', 'attention'] as const).map(mode => (
            <button key={mode} onClick={() => setFilterMode(mode)}
              className="px-3 py-1.5 text-xs font-medium transition-colors duration-150"
              style={{
                background: filterMode === mode ? COLORS.primary : COLORS.surfaceRaised,
                color: filterMode === mode ? '#FFFFFF' : COLORS.inkMuted,
              }}>
              {mode === 'all' ? 'All assets' : 'Needs attention'}
            </button>
          ))}
        </div>
      )}

      {/* Expand button — top right, beside nav control */}
      {!loading && !error && (
        <a href="/map"
          className="absolute top-3 right-12 z-10 w-8 h-8 flex items-center justify-center rounded-md transition-colors duration-150"
          style={{
            background: COLORS.surfaceRaised,
            border: `1px solid ${COLORS.line}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}
          title="Open full map">
          <Maximize2 className="w-3.5 h-3.5" style={{ color: COLORS.inkMuted }} strokeWidth={1.5} />
        </a>
      )}

      {/* Hover tooltip */}
      {tooltip && !loading && (
        <div className="absolute z-20 pointer-events-none rounded-md px-3 py-2"
          style={{
            left: tooltip.x + 16,
            top: tooltip.y - 12,
            background: COLORS.surfaceRaised,
            border: `1px solid ${COLORS.line}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
            minWidth: 180,
          }}>
          <p className="font-mono text-xs" style={{ color: COLORS.inkFaint }}>
            {String(tooltip.props.unique_id)}
          </p>
          <p className="text-sm font-medium mt-0.5" style={{ color: COLORS.ink }}>
            {String(tooltip.props.name)}
          </p>
          <p className="text-xs mt-0.5 capitalize font-medium"
            style={{ color: COND_COLORS[tooltip.props.condition as ConditionKey] || COLORS.inkMuted }}>
            ● {String(tooltip.props.condition)}
          </p>
        </div>
      )}

      {/* Legend — bottom left, above scale control */}
      {!loading && !error && (
        <div className="absolute z-10 rounded-md px-3 py-2 space-y-1"
          style={{
            bottom: 40,
            left: 10,
            background: 'rgba(255,255,255,0.93)',
            border: `1px solid ${COLORS.line}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
          {COND_LABELS.map(cond => (
            <button key={cond} onClick={() => setCondFilter(p => p === cond ? null : cond)}
              className="flex items-center gap-2 w-full text-left transition-opacity duration-150"
              style={{ opacity: condFilter && condFilter !== cond ? 0.35 : 1 }}>
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COND_COLORS[cond] }} />
              <span className="text-xs capitalize" style={{ color: COLORS.inkMuted }}>{cond}</span>
              <span className="font-mono text-xs ml-auto pl-3" style={{ color: COLORS.inkFaint }}>
                {condCounts[cond]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Popup styles */}
      <style>{`
        .maplibregl-popup-content {
          padding: 14px 16px !important;
          border-radius: 10px !important;
          border: 1px solid #E2DED5 !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.10) !important;
          font-family: 'IBM Plex Sans', sans-serif !important;
        }
        .maplibregl-popup-close-button {
          font-size: 18px !important;
          color: #8C99A2 !important;
          padding: 4px 8px !important;
          line-height: 1 !important;
        }
        .maplibregl-popup-tip { display: none !important; }
        .maplibregl-ctrl-group { border-radius: 6px !important; }
        .maplibregl-ctrl button { border-radius: 0 !important; }
      `}</style>
    </div>
  );
};

export default MapPanel;
export { scoreToCondition as conditionFromScore };
