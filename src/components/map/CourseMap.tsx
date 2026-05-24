"use client";

import { AlertTriangle, MapPinned } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { type ExpressionSpecification } from "mapbox-gl";

import {
  buildAssetFeatureCollection,
  buildIssueFeatureCollection,
  PRESIDIO_COURSE,
  type DemoIssue,
} from "@/data/presidio-demo";
import {
  assetColors,
  layerIds,
  MAPBOX_STYLE,
  PRESIDIO_INITIAL_VIEW,
  severityColors,
  type LayerVisibility,
} from "@/lib/map-style";
import type { MapboxClientHealth } from "@/lib/readiness";

type CourseMapProps = {
  selectedAssetId: string | null;
  issues: DemoIssue[];
  highlightedIssueId: string | null;
  layers: LayerVisibility;
  onAssetSelect: (assetId: string) => void;
  onMapHealthChange: (health: MapboxClientHealth) => void;
};

const clickableLayerIds = [
  layerIds.assetSprinklers,
  layerIds.assetValves,
  layerIds.assetControllers,
  layerIds.assetPipes,
  layerIds.issueMarkers,
];

function severityColorExpression(): ExpressionSpecification {
  return [
    "match",
    ["get", "severity"],
    "critical",
    severityColors.critical,
    "high",
    severityColors.high,
    "medium",
    severityColors.medium,
    "low",
    severityColors.low,
    "#ffffff",
  ] as ExpressionSpecification;
}

export function CourseMap({
  selectedAssetId,
  issues,
  highlightedIssueId,
  layers,
  onAssetSelect,
  onMapHealthChange,
}: CourseMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onAssetSelectRef = useRef(onAssetSelect);
  const onMapHealthChangeRef = useRef(onMapHealthChange);
  const selectedAssetIdRef = useRef(selectedAssetId);
  const highlightedIssueIdRef = useRef(highlightedIssueId);
  const [styleReady, setStyleReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const assetCollection = useMemo(() => buildAssetFeatureCollection(), []);
  const issueCollection = useMemo(
    () => buildIssueFeatureCollection(issues),
    [issues],
  );
  const issueCollectionRef = useRef(issueCollection);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const tokenError = mapboxToken
    ? null
    : "Mapbox token missing. Add NEXT_PUBLIC_MAPBOX_TOKEN to .env and restart the dev server.";
  const visibleMapError = tokenError ?? mapError;
  const highlightedIssue = useMemo(
    () => issues.find((issue) => issue.id === highlightedIssueId) ?? null,
    [highlightedIssueId, issues],
  );

  useEffect(() => {
    onAssetSelectRef.current = onAssetSelect;
  }, [onAssetSelect]);

  useEffect(() => {
    onMapHealthChangeRef.current = onMapHealthChange;
  }, [onMapHealthChange]);

  useEffect(() => {
    issueCollectionRef.current = issueCollection;
  }, [issueCollection]);

  useEffect(() => {
    selectedAssetIdRef.current = selectedAssetId;
  }, [selectedAssetId]);

  useEffect(() => {
    highlightedIssueIdRef.current = highlightedIssueId;
  }, [highlightedIssueId]);

  useEffect(() => {
    if (tokenError) {
      onMapHealthChangeRef.current({
        status: "red",
        reason: tokenError,
        checkedAt: new Date().toISOString(),
      });
    }
  }, [tokenError]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    if (!mapboxToken) {
      return;
    }

    onMapHealthChangeRef.current({
      status: "yellow",
      reason: "Mapbox loading.",
      checkedAt: new Date().toISOString(),
    });
    mapboxgl.accessToken = mapboxToken;

    const mapContainer = containerRef.current;
    const map = new mapboxgl.Map({
      container: mapContainer,
      style: MAPBOX_STYLE,
      center: PRESIDIO_INITIAL_VIEW.center,
      zoom: PRESIDIO_INITIAL_VIEW.zoom,
      pitch: PRESIDIO_INITIAL_VIEW.pitch,
      bearing: PRESIDIO_INITIAL_VIEW.bearing,
      attributionControl: false,
    });
    let isMounted = true;
    const resizeObserver = new ResizeObserver(() => {
      if (isMounted) {
        map.resize();
      }
    });
    resizeObserver.observe(mapContainer);
    requestAnimationFrame(() => {
      if (isMounted) {
        map.resize();
      }
    });

    mapRef.current = map;
    map.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      "bottom-right",
    );
    map.addControl(
      new mapboxgl.AttributionControl({
        compact: true,
      }),
      "bottom-left",
    );

    map.on("load", () => {
      map.addSource("gdm-assets", {
        type: "geojson",
        data: assetCollection as GeoJSON.FeatureCollection,
      });
      map.addSource("gdm-issues", {
        type: "geojson",
        data: issueCollectionRef.current as GeoJSON.FeatureCollection,
      });

      map.addLayer({
        id: layerIds.assetPipes,
        type: "line",
        source: "gdm-assets",
        filter: ["==", ["get", "assetType"], "pipe"],
        paint: {
          "line-color": assetColors.pipe,
          "line-opacity": 0.9,
          "line-width": 5,
        },
      });

      map.addLayer({
        id: layerIds.selectedPipes,
        type: "line",
        source: "gdm-assets",
        filter: [
          "all",
          ["==", ["get", "assetType"], "pipe"],
          ["==", ["get", "assetId"], selectedAssetIdRef.current ?? "__none__"],
        ],
        paint: {
          "line-color": "#004225",
          "line-opacity": 0.95,
          "line-width": 10,
        },
      });

      map.addLayer({
        id: layerIds.assetSprinklers,
        type: "circle",
        source: "gdm-assets",
        filter: ["==", ["get", "assetType"], "sprinkler"],
        paint: {
          "circle-color": assetColors.sprinkler,
          "circle-radius": 7,
          "circle-stroke-color": "#052e1c",
          "circle-stroke-width": 2,
        },
      });

      map.addLayer({
        id: layerIds.assetValves,
        type: "circle",
        source: "gdm-assets",
        filter: ["==", ["get", "assetType"], "valve"],
        paint: {
          "circle-color": assetColors.valve,
          "circle-radius": 8,
          "circle-stroke-color": "#451a03",
          "circle-stroke-width": 2,
        },
      });

      map.addLayer({
        id: layerIds.assetControllers,
        type: "circle",
        source: "gdm-assets",
        filter: ["==", ["get", "assetType"], "controller"],
        paint: {
          "circle-color": assetColors.controller,
          "circle-radius": 9,
          "circle-stroke-color": "#2e1065",
          "circle-stroke-width": 2,
        },
      });

      map.addLayer({
        id: layerIds.selectedPoints,
        type: "circle",
        source: "gdm-assets",
        filter: [
          "all",
          ["!=", ["get", "assetType"], "pipe"],
          ["==", ["get", "assetId"], selectedAssetIdRef.current ?? "__none__"],
        ],
        paint: {
          "circle-color": "#004225",
          "circle-radius": 14,
          "circle-opacity": 0.24,
          "circle-stroke-color": "#004225",
          "circle-stroke-width": 3,
        },
      });

      map.addLayer({
        id: layerIds.issueMarkers,
        type: "circle",
        source: "gdm-issues",
        paint: {
          "circle-color": severityColorExpression(),
          "circle-radius": 9,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      map.addLayer({
        id: layerIds.prioritizedIssueGlow,
        type: "circle",
        source: "gdm-issues",
        filter: [
          "==",
          ["get", "issueId"],
          highlightedIssueIdRef.current ?? "__none__",
        ],
        paint: {
          "circle-color": "#fef08a",
          "circle-radius": 30,
          "circle-opacity": 0.42,
          "circle-blur": 0.2,
          "circle-stroke-color": "#fde047",
          "circle-stroke-width": 4,
          "circle-stroke-opacity": 0.95,
        },
      });

      map.on("click", (event) => {
        const visibleClickableLayers = clickableLayerIds.filter((layerId) =>
          map.getLayer(layerId),
        );
        const [feature] = map.queryRenderedFeatures(event.point, {
          layers: visibleClickableLayers,
        });
        const properties = feature?.properties as
          | { assetId?: string }
          | undefined;

        if (properties?.assetId) {
          onAssetSelectRef.current(properties.assetId);
        }
      });

      map.on("mousemove", (event) => {
        const visibleClickableLayers = clickableLayerIds.filter((layerId) =>
          map.getLayer(layerId),
        );
        const features = map.queryRenderedFeatures(event.point, {
          layers: visibleClickableLayers,
        });
        map.getCanvas().style.cursor = features.length > 0 ? "pointer" : "";
      });

      setStyleReady(true);
      onMapHealthChangeRef.current({
        status: "green",
        reason: "Mapbox satellite map loaded.",
        checkedAt: new Date().toISOString(),
      });
    });

    map.on("error", (event) => {
      const message = event.error?.message ?? "Mapbox failed to render.";
      setMapError(message);
      onMapHealthChangeRef.current({
        status: "red",
        reason: message,
        checkedAt: new Date().toISOString(),
      });
    });

    return () => {
      isMounted = false;
      resizeObserver.disconnect();
      setStyleReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [assetCollection, mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !styleReady) {
      return;
    }

    const source = map.getSource("gdm-issues") as
      | mapboxgl.GeoJSONSource
      | undefined;

    if (!source) {
      return;
    }

    source.setData(issueCollection as GeoJSON.FeatureCollection);
  }, [issueCollection, styleReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !styleReady) {
      return;
    }

    map.setFilter(layerIds.selectedPipes, [
      "all",
      ["==", ["get", "assetType"], "pipe"],
      ["==", ["get", "assetId"], selectedAssetId ?? "__none__"],
    ]);
    map.setFilter(layerIds.selectedPoints, [
      "all",
      ["!=", ["get", "assetType"], "pipe"],
      ["==", ["get", "assetId"], selectedAssetId ?? "__none__"],
    ]);
  }, [selectedAssetId, styleReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !styleReady || !map.getLayer(layerIds.prioritizedIssueGlow)) {
      return;
    }

    map.setFilter(layerIds.prioritizedIssueGlow, [
      "==",
      ["get", "issueId"],
      highlightedIssueId ?? "__none__",
    ]);
  }, [highlightedIssueId, styleReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !styleReady || !highlightedIssueId) {
      return;
    }

    const highlightedIssue = issues.find(
      (issue) => issue.id === highlightedIssueId,
    );

    if (!highlightedIssue) {
      return;
    }

    map.easeTo({
      center: highlightedIssue.coordinates,
      zoom: Math.max(map.getZoom(), 16.7),
      duration: 700,
    });
  }, [highlightedIssueId, issues, styleReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !styleReady) {
      return;
    }

    const visibilityByLayer = new Map<string, boolean>([
      [layerIds.assetPipes, layers.pipes],
      [layerIds.assetSprinklers, layers.sprinklers],
      [layerIds.assetValves, layers.valves],
      [layerIds.assetControllers, layers.controllers],
      [layerIds.issueMarkers, layers.issues],
      [layerIds.prioritizedIssueGlow, layers.issues],
    ]);

    visibilityByLayer.forEach((isVisible, layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          isVisible ? "visible" : "none",
        );
      }
    });
  }, [layers, styleReady]);

  return (
    <section
      className="relative h-full min-h-0 overflow-hidden border border-slate-200 bg-slate-100"
      aria-label="Course operations map"
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{
          inset: 0,
          position: "absolute",
        }}
      />
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur">
        <MapPinned className="h-4 w-4 text-[#004225]" aria-hidden />
        <span>{PRESIDIO_COURSE.name}</span>
      </div>
      {visibleMapError ? (
        <div
          className="absolute inset-x-6 top-24 border border-red-300 bg-white p-4 text-sm text-red-700 shadow-xl"
          role="alert"
        >
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Map unavailable
          </div>
          <p>{visibleMapError}</p>
        </div>
      ) : null}
      {highlightedIssue ? (
        <div className="pointer-events-none absolute left-4 top-24 max-w-[320px] border border-amber-300 bg-white/95 p-3 text-sm text-slate-900 shadow-xl backdrop-blur">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(253,224,71,0.9)]" />
            Top priority
          </div>
          <p className="font-semibold">{highlightedIssue.title}</p>
          <p className="mt-1 text-xs text-slate-600">
            {highlightedIssue.id} / {highlightedIssue.severity}
          </p>
        </div>
      ) : null}
    </section>
  );
}
