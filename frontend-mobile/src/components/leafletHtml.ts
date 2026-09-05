import { OSM_ATTRIBUTION, OSM_TILE_URL } from "./osmTiles";

// Cabecera común: carga Leaflet desde CDN (sin API key, mismos tiles OSM que usa el web) dentro
// del WebView. Necesita conexión a internet, igual que cualquier mapa basado en tiles.
export const LEAFLET_HEAD = `
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	<style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
`;

export const LEAFLET_SCRIPT_TAG = `<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>`;

export const TILE_LAYER_JS = `L.tileLayer(${JSON.stringify(OSM_TILE_URL)}, { attribution: ${JSON.stringify(OSM_ATTRIBUTION)} }).addTo(map);`;
