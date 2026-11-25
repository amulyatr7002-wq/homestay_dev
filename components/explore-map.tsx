"use client";

import { useEffect, useRef, useState } from "react";
import type { ListingWithDetails } from "@/types/listing";

type Props = {
  listings: ListingWithDetails[];
  activeId: string | null;
  onSelect: (slug: string) => void;
};

type MapInstance = import("mapbox-gl").Map;
type GeoJSONSource = import("mapbox-gl").GeoJSONSource;

export default function ExploreMap({ listings, activeId, onSelect }: Props) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    let disposed = false;
    let map: MapInstance | null = null;
    if (!token || !mapElement.current) return;
    if ((window.devicePixelRatio || 1) > 2) {
      setMapError(true);
      return;
    }

    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (disposed || !mapElement.current) return;
      mapboxgl.accessToken = token;
      map = new mapboxgl.Map({
        container: mapElement.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: [75.7, 13.15],
        zoom: 6,
        pitch: 35,
        bearing: -8,
        cooperativeGestures: true,
        attributionControl: true,
      });
      mapRef.current = map;

      map.on("error", (event) => {
        console.error("Mapbox reported a map error:", event.error);
        map?.remove();
        map = null;
        mapRef.current = null;
        setMapError(true);
      });
      map.on("load", () => {
        if (!map) return;
        map.addSource("karnataka-terrain", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: "karnataka-terrain", exaggeration: 1.15 });
        const features = listings.map((listing) => ({
          type: "Feature" as const,
          id: listing.slug,
          geometry: { type: "Point" as const, coordinates: [listing.longitude, listing.latitude] },
          properties: { slug: listing.slug, price: listing.pricePerNight },
        }));
        map.addSource("stays", {
          type: "geojson",
          data: { type: "FeatureCollection", features },
          cluster: true,
          clusterMaxZoom: 13,
          clusterRadius: 48,
        });
        map.addLayer({
          id: "stay-clusters",
          type: "circle",
          source: "stays",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#263d31",
            "circle-radius": ["step", ["get", "point_count"], 19, 5, 24, 10, 30],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#f4f1e9",
          },
        });
        map.addLayer({
          id: "stay-cluster-count",
          type: "symbol",
          source: "stays",
          filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
          paint: { "text-color": "#ffffff" },
        });
        map.addLayer({
          id: "stay-points",
          type: "circle",
          source: "stays",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": ["case", ["boolean", ["feature-state", "active"], false], "#b9684e", "#263d31"],
            "circle-radius": ["case", ["boolean", ["feature-state", "active"], false], 12, 9],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#f4f1e9",
          },
        });
        map.addLayer({
          id: "stay-prices",
          type: "symbol",
          source: "stays",
          filter: ["!", ["has", "point_count"]],
          layout: {
            "text-field": ["concat", "₹", ["to-string", ["get", "price"]]],
            "text-offset": [0, 2.2],
            "text-size": 10,
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#263d31", "text-halo-color": "#f4f1e9", "text-halo-width": 2 },
        });
        map.on("click", "stay-clusters", (event) => {
          const feature = map?.queryRenderedFeatures(event.point, { layers: ["stay-clusters"] })[0];
          const clusterId = feature?.properties?.cluster_id;
          if (typeof clusterId !== "number") return;
          const source = map?.getSource("stays") as GeoJSONSource | undefined;
          source?.getClusterExpansionZoom(clusterId, (error, zoom) => {
            if (error) {
              console.error("Could not zoom into the selected map cluster:", error);
              return;
            }
            if (!map || !feature || typeof zoom !== "number") return;
            const coordinates = (feature.geometry as import("geojson").Point).coordinates as [number, number];
            map.flyTo({ center: coordinates, zoom, duration: 900, essential: true });
          });
        });
        map.on("click", "stay-points", (event) => {
          const feature = map?.queryRenderedFeatures(event.point, { layers: ["stay-points"] })[0];
          const slug = feature?.properties?.slug;
          if (typeof slug === "string") onSelect(slug);
        });
        map.on("mouseenter", "stay-points", () => { if (map) map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "stay-points", () => { if (map) map.getCanvas().style.cursor = ""; });
        map.on("mouseenter", "stay-clusters", () => { if (map) map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "stay-clusters", () => { if (map) map.getCanvas().style.cursor = ""; });
        setMapLoaded(true);
      });
    }).catch((error: unknown) => {
      console.error("Mapbox could not be initialized:", error);
      setMapError(true);
    });

    const handleVisibility = () => {
      if (document.hidden) map?.stop();
      else map?.resize();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      map?.remove();
      mapRef.current = null;
    };
  }, [listings, onSelect, token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !activeId) return;
    const listing = listings.find((item) => item.slug === activeId);
    if (!listing) return;
    for (const item of listings) {
      map.setFeatureState({ source: "stays", id: item.slug }, { active: item.slug === activeId });
    }
    map.flyTo({
      center: [listing.longitude, listing.latitude],
      zoom: Math.max(map.getZoom(), 8.5),
      duration: 850,
      essential: true,
    });
  }, [activeId, listings, mapLoaded]);

  if (!token || mapError) {
    return (
      <div className="map-fallback" aria-label="Map of sample homestay locations">
        <div className="map-ridge ridge-one" />
        <div className="map-ridge ridge-two" />
        <span className="map-region-label">KARNATAKA · INDIA</span>
        <span className="map-water-label">ARABIAN SEA</span>
        <span className="map-town-label town-coorg">COORG</span>
        <span className="map-town-label town-ghats">WESTERN GHATS</span>
        {listings.map((listing) => {
          const left = 10 + ((listing.longitude - 74) / 4) * 80;
          const top = 10 + (1 - (listing.latitude - 11.5) / 4.2) * 80;
          return (
            <button
              type="button"
              key={listing.id}
              className={`fallback-pin${activeId === listing.slug ? " active" : ""}`}
              style={{ left: `${left}%`, top: `${top}%` }}
              onClick={() => onSelect(listing.slug)}
              title={`${listing.title} — ₹${listing.pricePerNight} / night`}
              aria-label={`${listing.title}, ₹${listing.pricePerNight.toLocaleString("en-IN")} per night`}
            >
              ₹{listing.pricePerNight.toLocaleString("en-IN")}
            </button>
          );
        })}
        <p className="map-token-note">{mapError ? "Showing a lightweight map while terrain tiles are unavailable." : "Add a Mapbox token to enable terrain tiles and clustered map zoom."}</p>
      </div>
    );
  }

  return (
    <div className="mapbox-wrap">
      <div ref={mapElement} className="mapbox-canvas" role="region" aria-label="Interactive map of Karnataka homestays" />
      {!mapLoaded && !mapError && <div className="map-loading">Finding the scenic route…</div>}
      {mapError && <p className="map-error" role="alert">Map tiles couldn&apos;t load. Check your Mapbox access token.</p>}
      <div className="map-legend"><span /> Locally loved stays</div>
    </div>
  );
}
