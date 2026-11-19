import React, { Children, isValidElement, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Camera, Map as NativeMap, Marker as NativeMarker, TransformRequestManager } from "@maplibre/maplibre-react-native";
import { mapStyle, mapTileUrl } from "./mapStyle";

const osmTileHost = mapTileUrl.startsWith("https://tile.openstreetmap.org/");
if (osmTileHost) {
  TransformRequestManager.addHeader({
    id: "toreparo-osm-identification",
    match: "^https://tile\\.openstreetmap\\.org/",
    name: "User-Agent",
    value: "ToReparo/1.0",
  });
}

export default function PlatformMap({ children, initialRegion, style }) {
  const camera = useRef(null);
  const [ready, setReady] = useState(false);
  const markers = Children.toArray(children).filter((child) =>
    isValidElement(child) && child.type === Marker && child.props.coordinate,
  );
  const center = initialRegion || markers[0]?.props.coordinate || { latitude: -16.5, longitude: -68.15 };
  useEffect(() => {
    if (ready) camera.current?.flyTo({ center: [center.longitude, center.latitude], duration: 500 });
  }, [ready, center.latitude, center.longitude]);

  return (
    <View style={style}>
      <NativeMap style={{ flex: 1 }} mapStyle={mapStyle} onDidFinishLoadingStyle={() => setReady(true)}>
        <Camera ref={camera} initialViewState={{ center: [center.longitude, center.latitude], zoom: initialRegion?.latitudeDelta < 0.05 ? 14 : 11 }} />
        {markers.map((marker, index) => {
          const { coordinate, title, children: markerChildren } = marker.props;
          const callout = Children.toArray(markerChildren).find((item) => isValidElement(item) && item.type === Callout);
          return (
            <NativeMarker
              key={marker.key || index}
              id={String(marker.key || index)}
              lngLat={[Number(coordinate.longitude), Number(coordinate.latitude)]}
              onPress={() => callout?.props.onPress?.()}
            >
              <View accessibilityLabel={title || "Ubicación"} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: marker.props.pinColor || "#F97300", borderWidth: 3, borderColor: "white" }} />
            </NativeMarker>
          );
        })}
      </NativeMap>
      <Text style={{ position: "absolute", right: 6, bottom: 4, backgroundColor: "rgba(255,255,255,0.85)", fontSize: 10, paddingHorizontal: 4 }}>© OpenStreetMap contributors</Text>
    </View>
  );
}

export function Marker() { return null; }
export function Callout({ children }) { return <>{children}</>; }
