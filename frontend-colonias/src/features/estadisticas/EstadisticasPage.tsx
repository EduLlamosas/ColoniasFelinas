import { useQuery } from "@apollo/client/react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Spinner } from "../../components/ui/Spinner";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass, trClass } from "../../components/ui/table";
import { ESTADO_CER_BADGE_CLASSES, ESTADO_CER_LABELS } from "../../lib/enums";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { ESTADISTICAS_QUERY } from "./estadisticas.graphql";
import type { EstadoCer, Estadisticas } from "../../types/graphql";

const DIAS_SIN_VISITA = 7;

const ORDEN_ESTADO_CER: EstadoCer[] = ["AVISTADO", "CAPTURADO", "ESTERILIZADO", "RETORNADO", "ADOPTADO"];

function diasDesde(fecha: string): number {
	return Math.floor((Date.now() - new Date(fecha).getTime()) / (24 * 60 * 60 * 1000));
}

export function EstadisticasPage() {
	const { data, loading, error } = useQuery<{ estadisticas: Estadisticas }>(ESTADISTICAS_QUERY, {
		variables: { diasSinVisita: DIAS_SIN_VISITA },
	});

	if (loading) {
		return (
			<div className="flex justify-center py-14">
				<Spinner size="lg" />
			</div>
		);
	}

	if (error) return <Alert message={getErrorMessage(error)} />;

	const cantidadPorEstado = new Map(
		data?.estadisticas.gatosPorEstadoCer.map((g) => [g.estadoCer, g.cantidad]) ?? [],
	);
	const comederosSinVisita = data?.estadisticas.comederosSinVisitaReciente ?? [];

	return (
		<div>
			<PageHeader
				title="Estadísticas"
				description="Un vistazo rápido al estado del censo: gatos por fase del protocolo CER, comederos desatendidos y esterilizaciones recientes."
			/>

			<div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
				{ORDEN_ESTADO_CER.map((estado) => (
					<div key={estado} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
						<p className="text-2xl font-semibold tabular-nums text-slate-900">
							{cantidadPorEstado.get(estado) ?? 0}
						</p>
						<Badge className={`mt-2 ${ESTADO_CER_BADGE_CLASSES[estado]}`}>{ESTADO_CER_LABELS[estado]}</Badge>
					</div>
				))}
				<div className="rounded-lg border border-teal-200 bg-teal-50 p-4 shadow-sm">
					<p className="text-2xl font-semibold tabular-nums text-teal-900">
						{data?.estadisticas.esterilizacionesTrimestreActual ?? 0}
					</p>
					<p className="mt-2 text-xs font-medium uppercase tracking-wide text-teal-700">
						Esterilizaciones este trimestre
					</p>
				</div>
			</div>

			<section>
				<h2 className="mb-3 text-sm font-semibold text-slate-900">
					Comederos sin visita en más de {DIAS_SIN_VISITA} días ({comederosSinVisita.length})
				</h2>
				{comederosSinVisita.length === 0 ? (
					<EmptyState
						title="Todos los comederos tienen visitas recientes"
						description={`Ningún comedero lleva más de ${DIAS_SIN_VISITA} días sin una visita registrada.`}
					/>
				) : (
					<div className={tableWrapperClass}>
						<table className={tableClass}>
							<thead className={theadClass}>
								<tr>
									<th className={thClass}>Ubicación</th>
									<th className={thClass}>Última visita</th>
								</tr>
							</thead>
							<tbody>
								{comederosSinVisita.map((comedero) => (
									<tr key={comedero.id} className={trClass}>
										<td className={tdClass}>{comedero.ubicacionDetallada}</td>
										<td className={tdClass}>
											{comedero.ultimaVisita ? (
												<Badge className="bg-amber-100 text-amber-800">
													hace {diasDesde(comedero.ultimaVisita)} días
												</Badge>
											) : (
												<Badge className="bg-red-100 text-red-700">Nunca visitado</Badge>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</div>
	);
}
