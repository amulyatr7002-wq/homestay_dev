"use client";

import { useEffect, useRef, useState } from "react";

type Props = { latitude: number; longitude: number; onChange: (latitude: number, longitude: number) => void };
type MapInstance = import("mapbox-gl").Map;
type MarkerInstance = import("mapbox-gl").Marker;

export default function LocationPicker({ latitude, longitude, onChange }: Props) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markerRef = useRef<MarkerInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const positionRef = useRef({ latitude, longitude });
  const [mapError, setMapError] = useState(false);
  positionRef.current = { latitude, longitude };
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

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
      const position = positionRef.current;
      map = new mapboxgl.Map({
        container: mapElement.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: [position.longitude, position.latitude],
        zoom: 11,
        cooperativeGestures: true,
      });
      mapRef.current = map;
      markerRef.current = new mapboxgl.Marker({ color: "#b9684e", draggable: true })
        .setLngLat([position.longitude, position.latitude])
        .addTo(map);
      markerRef.current.on("dragend", () => {
        const point = markerRef.current?.getLngLat();
        if (point) onChangeRef.current(point.lat, point.lng);
      });
      map.on("click", (event) => {
        markerRef.current?.setLngLat(event.lngLat);
        onChangeRef.current(event.lngLat.lat, event.lngLat.lng);
      });
    }).catch((error: unknown) => {
      console.error("Could not load listing location map:", error);
      setMapError(true);
    });
    return () => {
      disposed = true;
      map?.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
  }, [latitude, longitude]);

  return token && !mapError
    ? <div ref={mapElement} className="location-picker-map" aria-label="Click to place the listing location pin" />
    : <p className="form-note">{mapError ? "The map is unavailable or disabled on this high-density screen; set the approximate coordinates in the fields below." : "Add a public Mapbox token to place a pin on the map. You can still enter coordinates below."}</p>;
}
