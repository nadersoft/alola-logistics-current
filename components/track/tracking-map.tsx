"use client";
import { useEffect, useRef, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

type LatLng = [number, number];

const MAPBOX_JS = "https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js";
const MAPBOX_CSS = "https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.css";

type MapInstance = {
  on: (event: string, cb: () => void) => void;
  addControl: (c: unknown, pos?: string) => void;
  fitBounds: (b: BoundsHandle, o: unknown) => void;
  addSource: (id: string, s: unknown) => void;
  addLayer: (l: unknown) => void;
  remove: () => void;
};

type MarkerHandle = {
  setLngLat: (p: LatLng) => MarkerHandle;
  setPopup: (p: PopupHandle) => MarkerHandle;
  addTo: (m: MapInstance) => MarkerHandle;
};

type PopupHandle = {
  setLngLat: (p: LatLng) => PopupHandle;
  setHTML: (h: string) => PopupHandle;
};

type BoundsHandle = { extend: (p: LatLng) => BoundsHandle };

type MapboxGl = {
  accessToken: string;
  Map: new (opts: Record<string, unknown>) => MapInstance;
  NavigationControl: new (o: Record<string, unknown>) => unknown;
  Marker: new (o: Record<string, unknown>) => MarkerHandle;
  Popup: new (o: Record<string, unknown>) => PopupHandle;
  LngLatBounds: new () => BoundsHandle;
};

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const el = document.createElement("script");
    el.id = id;
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("script-load-failed"));
    document.head.appendChild(el);
  });
}

function loadCss(href: string, id: string) {
  if (document.getElementById(id)) return;
  const el = document.createElement("link");
  el.id = id;
  el.rel = "stylesheet";
  el.href = href;
  document.head.appendChild(el);
}

export function TrackingMap({
  origin,
  destination,
  mapboxToken,
  originLabel,
  destinationLabel,
  locale = "en",
}: {
  origin: LatLng;
  destination: LatLng;
  mapboxToken: string;
  originLabel?: string;
  destinationLabel?: string;
  locale?: Locale;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback" | "error">(
    mapboxToken ? "loading" : "fallback"
  );

  useEffect(() => {
    if (!mapboxToken) return;
    let cancelled = false;
    let mapInstance: MapInstance | null = null;

    (async () => {
      try {
        loadCss(MAPBOX_CSS, "mapbox-gl-css");
        await loadScript(MAPBOX_JS, "mapbox-gl-js");
        const mb = (globalThis as unknown as { mapboxgl: MapboxGl }).mapboxgl;
        if (!mb || cancelled || !containerRef.current) return;
        mb.accessToken = mapboxToken;

        mapInstance = new mb.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [(origin[1] + destination[1]) / 2, (origin[0] + destination[0]) / 2],
          zoom: 4,
          attributionControl: true,
        });
        mapInstance.addControl(new mb.NavigationControl({ showCompass: true }), "top-right");

        mapInstance.on("load", () => {
          if (!mapInstance) return;
          const bounds = new mb.LngLatBounds().extend(origin).extend(destination);
          mapInstance.fitBounds(bounds, { padding: 60 });
          mapInstance.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: [origin, destination] },
            },
          });
          mapInstance.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#2563eb", "line-width": 3, "line-dasharray": [2, 1.5] },
          });
          new mb.Marker({ color: "#16a34a" })
            .setLngLat(origin)
            .setPopup(new mb.Popup({ offset: 25 }).setLngLat(origin).setHTML(`<b>${escapeHtml(originLabel ?? "Origin")}</b>`))
            .addTo(mapInstance);
          new mb.Marker({ color: "#ef4444" })
            .setLngLat(destination)
            .setPopup(new mb.Popup({ offset: 25 }).setLngLat(destination).setHTML(`<b>${escapeHtml(destinationLabel ?? "Destination")}</b>`))
            .addTo(mapInstance);
        });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      mapInstance?.remove();
    };
  }, [mapboxToken, origin, destination, originLabel, destinationLabel]);

  if (status === "fallback") {
    return <SvgMapFallback origin={origin} destination={destination} originLabel={originLabel} destinationLabel={destinationLabel} locale={locale} />;
  }

  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-xl border bg-muted">
      <div ref={containerRef} className="h-full w-full" />
      {status === "error" ? <SvgMapFallback origin={origin} destination={destination} originLabel={originLabel} destinationLabel={destinationLabel} locale={locale} /> : null}
      {status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Loading map…</div>
      ) : null}
    </div>
  );
}

function SvgMapFallback({ origin, destination, originLabel, destinationLabel, locale = "en" }: { origin: LatLng; destination: LatLng; originLabel?: string; destinationLabel?: string; locale?: Locale }) {
  const x1 = ((origin[1] + 180) / 360) * 100;
  const y1 = ((90 - origin[0]) / 180) * 100;
  const x2 = ((destination[1] + 180) / 360) * 100;
  const y2 = ((90 - destination[0]) / 180) * 100;

  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-xl border bg-slate-100 dark:bg-slate-900">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full opacity-80">
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.2" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        <path
          d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
          fill="none"
          stroke="#2563eb"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="3 2"
        />
        <circle cx={x1} cy={y1} r="2.2" fill="#16a34a" />
        <circle cx={x2} cy={y2} r="2.2" fill="#ef4444" />
      </svg>
      <div className="absolute inset-0 flex flex-col justify-end p-3 text-[0.7rem] text-muted-foreground">
        <div className="rounded-lg bg-background/90 p-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-green-600" />
            <span>{originLabel ?? t(locale, "track.origin")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-red-600" />
            <span>{destinationLabel ?? t(locale, "track.destination")}</span>
          </div>
          <p className="mt-1 text-amber-600 dark:text-amber-400">{t(locale, "track.mapFallback")}</p>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
