import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import { OSM_ATTRIBUTION, OSM_TILE_URL } from "./osmTiles";
import "./leafletIconSetup";

const DEFAULT_CENTER: [number, number] = [43.4623, -3.8099];

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
	useMapEvents({
		click(event: LeafletMouseEvent) {
			onPick(event.latlng.lat, event.latlng.lng);
		},
	});
	return null;
}

interface LocationPickerProps {
	latitud: number | null;
	longitud: number | null;
	onChange: (lat: number, lng: number) => void;
}

export function LocationPicker({ latitud, longitud, onChange }: LocationPickerProps) {
	const hasPosition = latitud !== null && longitud !== null;
	const center: [number, number] = hasPosition ? [latitud, longitud] : DEFAULT_CENTER;

	return (
		<div>
			<p className="mb-1 text-xs text-slate-500">Haz clic en el mapa para fijar la ubicación exacta.</p>
			<div className="h-52 w-full overflow-hidden rounded-md border border-slate-300">
				<MapContainer center={center} zoom={hasPosition ? 14 : 6} className="h-full w-full">
					<TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
					<ClickHandler onPick={onChange} />
					{hasPosition && <Marker position={[latitud, longitud]} />}
				</MapContainer>
			</div>
		</div>
	);
}
