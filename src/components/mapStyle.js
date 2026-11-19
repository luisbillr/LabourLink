const tileUrl = process.env.EXPO_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const mapStyle = {
  version: 8,
  sources: {
    openstreetmap: {
      type: "raster",
      tiles: [tileUrl],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm-raster", type: "raster", source: "openstreetmap" }],
};

export const mapTileUrl = tileUrl;
