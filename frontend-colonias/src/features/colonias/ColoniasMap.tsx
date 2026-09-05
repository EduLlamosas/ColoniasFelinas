import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import type { Colonia } from "../../types/graphql";
import { TIPO_SUELO_LABELS } from "../../lib/enums";
import { OSM_ATTRIBUTION, OSM_TILE_URL } from "./osmTiles";
import "./leafletIconSetup";

const DEFAULT_CENTER: [number, number] = [43.4623, -3.8099];

export function ColoniasMap({ colonias }: { colonias: Colonia[] }) {
	const center: [number, number] =
		colonias.length > 0
			? [
					colonias.reduce((sum, c) => sum + c.latitud, 0) / colonias.length,
					colonias.reduce((sum, c) => sum + c.longitud, 0) / colonias.length,
				]
			: DEFAULT_CENTER;

	return (
		<div className="h-[560px] w-full overflow-hidden rounded-lg border border-slate-200 shadow-sm">
			<MapContainer center={center} zoom={colonias.length > 0 ? 13 : 6} className="h-full w-full">
				<TileLayer
					attribution={OSM_ATTRIBUTION}
					url={OSM_TILE_URL}
				/>
				{colonias.map((colonia) => (
					<Marker key={colonia.id} position={[colonia.latitud, colonia.longitud]}>
						<Popup>
							<div className="text-sm">
								<p className="font-semibold">{colonia.nombre}</p>
								<p className="text-slate-500">{colonia.codigoOficial}</p>
								<p className="text-slate-500">{TIPO_SUELO_LABELS[colonia.tipoSuelo]}</p>
								<Link to={`/colonias/${colonia.id}`} className="mt-1 inline-block text-teal-700 hover:underline">
									Ver ficha →
								</Link>
							</div>
						</Popup>
					</Marker>
				))}
			</MapContainer>
		</div>
	);
}
