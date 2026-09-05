import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { DEFAULT_CENTER } from "./osmTiles";
import { LEAFLET_HEAD, LEAFLET_SCRIPT_TAG, TILE_LAYER_JS } from "./leafletHtml";
import { TIPO_SUELO_LABELS } from "../lib/enums";
import type { Colonia } from "../types/graphql";

interface ColoniasMapProps {
	colonias: Pick<Colonia, "id" | "nombre" | "codigoOficial" | "tipoSuelo" | "latitud" | "longitud">[];
	onSelect?: (id: string) => void;
	// Sin height, el mapa ocupa todo el espacio disponible del contenedor padre (flex: 1) —
	// se usa así en el toggle "Mapa" del listado; con height fijo se usa como miniatura (detalle).
	height?: number;
}

function escapeJs(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildHtml(colonias: ColoniasMapProps["colonias"]): string {
	const center =
		colonias.length > 0
			? [
					colonias.reduce((sum, c) => sum + c.latitud, 0) / colonias.length,
					colonias.reduce((sum, c) => sum + c.longitud, 0) / colonias.length,
				]
			: DEFAULT_CENTER;
	const zoom = colonias.length > 0 ? 13 : 6;

	const markersJs = colonias
		.map(
			(c) => `
				L.marker([${c.latitud}, ${c.longitud}])
					.addTo(map)
					.bindPopup('<b>${escapeJs(c.nombre)}</b><br/>${escapeJs(c.codigoOficial)}<br/>${escapeJs(TIPO_SUELO_LABELS[c.tipoSuelo])}')
					.on('click', function () {
						window.ReactNativeWebView.postMessage(${JSON.stringify(c.id)});
					});
			`,
		)
		.join("\n");

	return `
		<!DOCTYPE html>
		<html>
			<head>${LEAFLET_HEAD}</head>
			<body>
				<div id="map"></div>
				${LEAFLET_SCRIPT_TAG}
				<script>
					var map = L.map('map').setView([${center[0]}, ${center[1]}], ${zoom});
					${TILE_LAYER_JS}
					${markersJs}
				</script>
			</body>
		</html>
	`;
}

export function ColoniasMap({ colonias, onSelect, height }: ColoniasMapProps) {
	return (
		<View style={[styles.container, height ? { height } : styles.fill]}>
			<WebView
				source={{ html: buildHtml(colonias) }}
				onMessage={(event) => onSelect?.(event.nativeEvent.data)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		borderRadius: 8,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	fill: { flex: 1 },
});
