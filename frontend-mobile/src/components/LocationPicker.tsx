import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import type WebViewType from "react-native-webview";
import { DEFAULT_CENTER } from "./osmTiles";
import { LEAFLET_HEAD, LEAFLET_SCRIPT_TAG, TILE_LAYER_JS } from "./leafletHtml";

interface LocationPickerProps {
	latitud: number | null;
	longitud: number | null;
	onChange: (lat: number, lng: number) => void;
	height?: number;
}

function buildHtml(latitud: number | null, longitud: number | null): string {
	const hasPosition = latitud !== null && longitud !== null;
	const center = hasPosition ? [latitud, longitud] : DEFAULT_CENTER;
	const zoom = hasPosition ? 14 : 6;

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
					var marker = ${hasPosition ? `L.marker([${latitud}, ${longitud}]).addTo(map)` : "null"};

					window.setMarker = function (lat, lng) {
						if (marker) {
							marker.setLatLng([lat, lng]);
						} else {
							marker = L.marker([lat, lng]).addTo(map);
						}
						map.setView([lat, lng], 14);
					};

					map.on('click', function (event) {
						window.setMarker(event.latlng.lat, event.latlng.lng);
						window.ReactNativeWebView.postMessage(JSON.stringify({ lat: event.latlng.lat, lng: event.latlng.lng }));
					});
				</script>
			</body>
		</html>
	`;
}

export function LocationPicker({ latitud, longitud, onChange, height = 220 }: LocationPickerProps) {
	const webviewRef = useRef<WebViewType>(null);
	const loadedRef = useRef(false);
	// El HTML solo se genera una vez (con la posición inicial); cambios posteriores de
	// latitud/longitud que vengan de fuera del mapa (el botón de GPS) se aplican inyectando JS
	// en la página ya cargada, para no recargar el WebView y perder el zoom/pan del usuario.
	const initialHtml = useRef(buildHtml(latitud, longitud)).current;

	useEffect(() => {
		if (!loadedRef.current || latitud === null || longitud === null) return;
		webviewRef.current?.injectJavaScript(`window.setMarker(${latitud}, ${longitud}); true;`);
	}, [latitud, longitud]);

	return (
		<View>
			<Text style={styles.hint}>Toca el mapa para fijar la ubicación exacta.</Text>
			<View style={[styles.mapContainer, { height }]}>
				<WebView
					ref={webviewRef}
					source={{ html: initialHtml }}
					onLoadEnd={() => {
						loadedRef.current = true;
					}}
					onMessage={(event) => {
						try {
							const { lat, lng } = JSON.parse(event.nativeEvent.data) as { lat: number; lng: number };
							onChange(lat, lng);
						} catch {
							// mensaje inesperado del WebView, se ignora
						}
					}}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	hint: { fontSize: 12, color: "#64748b", marginBottom: 6 },
	mapContainer: {
		borderRadius: 8,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "#cbd5e1",
	},
});
