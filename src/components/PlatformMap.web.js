import React, { Children, isValidElement, useEffect, useRef } from "react";
import { Text, View } from "react-native";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapStyle } from "./mapStyle";

export default function PlatformMap({ children, initialRegion, style }) {
  const container = useRef(null);
  const map = useRef(null);
  const mapMarkers = useRef([]);
  const markers = Children.toArray(children).filter((child) =>
    isValidElement(child) && child.type === Marker && child.props.coordinate,
  );
  const latitude = Number(initialRegion?.latitude ?? markers[0]?.props.coordinate?.latitude ?? -16.5);
  const longitude = Number(initialRegion?.longitude ?? markers[0]?.props.coordinate?.longitude ?? -68.15);

  useEffect(() => {
    if (!container.current) return undefined;
    const instance = new maplibregl.Map({
      container: container.current,
      style: mapStyle,
      center: [longitude, latitude],
      zoom: initialRegion?.latitudeDelta < 0.05 ? 14 : 11,
      attributionControl: true,
    });
    map.current = instance;
    return () => {
      mapMarkers.current.forEach((item) => item.remove());
      mapMarkers.current = [];
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    map.current.flyTo({ center: [longitude, latitude], duration: 500 });
    mapMarkers.current.forEach((item) => item.remove());
    mapMarkers.current = markers.map((marker, index) => {
      const node = document.createElement("button");
      node.type = "button";
      node.title = marker.props.title || `Ubicación ${index + 1}`;
      node.setAttribute("aria-label", node.title);
      Object.assign(node.style, { width: "20px", height: "20px", borderRadius: "50%", border: "3px solid white", background: marker.props.pinColor || "#F97300", boxShadow: "0 1px 5px #444", cursor: "pointer" });
      const mapMarker = new maplibregl.Marker({ element: node })
        .setLngLat([Number(marker.props.coordinate.longitude), Number(marker.props.coordinate.latitude)])
        .addTo(map.current);
      const callout = Children.toArray(marker.props.children).find((item) => isValidElement(item) && item.type === Callout);
      node.addEventListener("click", () => callout?.props.onPress?.());
      return mapMarker;
    });
  }, [latitude, longitude, markers.length, markers.map((item) => `${item.key}:${item.props.coordinate.latitude}:${item.props.coordinate.longitude}`).join("|")]);

  return <View style={style}><View ref={container} style={{ flex: 1, minHeight: 160 }} />{!markers.length && !initialRegion && <Text>Esperando ubicación…</Text>}</View>;
}

export function Marker() { return null; }
export function Callout({ children }) { return <>{children}</>; }
