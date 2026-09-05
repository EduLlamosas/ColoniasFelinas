import {
	ActivityIndicator,
	Alert as RNAlert,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useMutation, useQuery } from "@apollo/client/react";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { GATOS_QUERY } from "../features/gatos/gatos.graphql";
import { COMEDEROS_QUERY } from "../features/comederos/comederos.graphql";
import {
	ASIGNACIONES_QUERY,
	REMOVE_ASIGNACION_MUTATION,
} from "../features/asignaciones/asignaciones.graphql";
import { VOLUNTARIOS_QUERY } from "../features/voluntarios/voluntarios.graphql";
import { getErrorMessage } from "../lib/graphqlErrors";
import { resolveMediaUrl } from "../lib/config";
import { ESTADO_CER_LABELS, SEXO_LABELS, TIPO_SUELO_LABELS } from "../lib/enums";
import { ColoniasMap } from "../components/ColoniasMap";
import type { Asignacion, Colonia, Comedero, Gato, Voluntario } from "../types/graphql";
import type { ColoniasStackScreenProps } from "../navigation/types";

type Props = ColoniasStackScreenProps<"ColoniaDetail">;

export function ColoniaDetailScreen({ route, navigation }: Props) {
	const { id } = route.params;
	const { data: coloniasData, loading: loadingColonia, error: coloniaError } = useQuery<{ colonias: Colonia[] }>(
		COLONIAS_QUERY,
	);
	const { data: gatosData, loading: loadingGatos } = useQuery<{ gatos: Gato[] }>(GATOS_QUERY);
	const { data: comederosData, loading: loadingComederos } = useQuery<{ comederos: Comedero[] }>(COMEDEROS_QUERY);
	const { data: asignacionesData, loading: loadingAsignaciones } = useQuery<{ asignaciones: Asignacion[] }>(
		ASIGNACIONES_QUERY,
	);
	const { data: voluntariosData } = useQuery<{ voluntarios: Voluntario[] }>(VOLUNTARIOS_QUERY);
	const voluntariosById = new Map((voluntariosData?.voluntarios ?? []).map((v) => [v.id, v]));
	const [removeAsignacion] = useMutation(REMOVE_ASIGNACION_MUTATION, {
		refetchQueries: [{ query: ASIGNACIONES_QUERY }],
	});

	const colonia = coloniasData?.colonias.find((c) => c.id === id);
	const gatos = (gatosData?.gatos ?? []).filter((g) => g.coloniaId === Number(id));
	const comederos = (comederosData?.comederos ?? []).filter((c) => c.coloniaId === Number(id));
	const asignaciones = (asignacionesData?.asignaciones ?? []).filter((a) => a.coloniaId === Number(id));

	function confirmRemove(asignacion: Asignacion) {
		RNAlert.alert(
			"Quitar asignación",
			`¿Seguro que quieres quitar a ${voluntariosById.get(String(asignacion.voluntarioId))?.nombre ?? "este voluntario"} de esta colonia?`,
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Quitar",
					style: "destructive",
					onPress: async () => {
						try {
							await removeAsignacion({
								variables: { voluntarioId: asignacion.voluntarioId, coloniaId: asignacion.coloniaId },
							});
						} catch (err) {
							RNAlert.alert("Error", getErrorMessage(err));
						}
					},
				},
			],
		);
	}

	if (loadingColonia) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (coloniaError) {
		return (
			<View style={styles.centered}>
				<Text style={styles.error}>{getErrorMessage(coloniaError)}</Text>
			</View>
		);
	}

	if (!colonia) {
		return (
			<View style={styles.centered}>
				<Text style={styles.emptyText}>Colonia no encontrada. Puede que haya sido eliminada.</Text>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<View style={styles.topRow}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Text style={styles.back}>‹ Colonias</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={() => navigation.navigate("ColoniaForm", { id: colonia.id })}>
					<Text style={styles.edit}>Editar</Text>
				</TouchableOpacity>
			</View>

			{colonia.fotoUrl ? (
				<Image source={{ uri: resolveMediaUrl(colonia.fotoUrl)! }} style={styles.photo} />
			) : (
				<View style={[styles.photo, styles.photoPlaceholder]} />
			)}

			<Text style={styles.title}>{colonia.nombre}</Text>
			<Text style={styles.subtitle}>
				{colonia.codigoOficial} · {TIPO_SUELO_LABELS[colonia.tipoSuelo]}
			</Text>
			<Text style={styles.coords}>
				{colonia.latitud.toFixed(5)}, {colonia.longitud.toFixed(5)}
			</Text>
			{colonia.observaciones && <Text style={styles.observaciones}>{colonia.observaciones}</Text>}

			<View style={styles.mapWrapper}>
				<ColoniasMap colonias={[colonia]} height={200} />
			</View>

			<Text style={styles.sectionTitle}>Gatos ({loadingGatos ? "…" : gatos.length})</Text>
			{gatos.length === 0 && !loadingGatos && <Text style={styles.emptySection}>Sin gatos censados.</Text>}
			{gatos.map((gato) => (
				<TouchableOpacity
					key={gato.id}
					style={styles.itemRow}
					onPress={() => navigation.navigate("GatosTab", { screen: "GatoDetail", params: { id: gato.id } })}
				>
					<Text style={styles.itemTitle}>{gato.nombre ?? "Sin nombre"}</Text>
					<Text style={styles.itemSubtitle}>
						{SEXO_LABELS[gato.sexo]} · {ESTADO_CER_LABELS[gato.estadoCer]}
					</Text>
				</TouchableOpacity>
			))}

			<Text style={styles.sectionTitle}>Comederos ({loadingComederos ? "…" : comederos.length})</Text>
			{comederos.length === 0 && !loadingComederos && <Text style={styles.emptySection}>Sin comederos registrados.</Text>}
			{comederos.map((comedero) => (
				<TouchableOpacity
					key={comedero.id}
					style={styles.itemRow}
					onPress={() =>
						navigation.navigate("ComederosTab", { screen: "ComederoDetail", params: { id: comedero.id } })
					}
				>
					<Text style={styles.itemTitle}>{comedero.ubicacionDetallada}</Text>
				</TouchableOpacity>
			))}

			<View style={styles.sectionHeader}>
				<Text style={[styles.sectionTitle, styles.sectionTitleInline]}>
					Voluntarios asignados ({loadingAsignaciones ? "…" : asignaciones.length})
				</Text>
				<TouchableOpacity
					onPress={() => navigation.navigate("VoluntariosTab", { screen: "AsignacionForm", params: { coloniaId: id } })}
				>
					<Text style={styles.assignLink}>Asignar</Text>
				</TouchableOpacity>
			</View>
			{asignaciones.length === 0 && !loadingAsignaciones && (
				<Text style={styles.emptySection}>Sin voluntarios asignados a esta colonia.</Text>
			)}
			{asignaciones.map((asignacion) => (
				<View key={asignacion.voluntarioId} style={[styles.itemRow, styles.assignmentRow]}>
					<TouchableOpacity
						style={styles.itemRowMain}
						onPress={() =>
							navigation.navigate("VoluntariosTab", {
								screen: "AsignacionForm",
								params: { voluntarioId: String(asignacion.voluntarioId), coloniaId: id },
							})
						}
					>
						<Text style={styles.itemTitle}>{voluntariosById.get(String(asignacion.voluntarioId))?.nombre ?? "—"}</Text>
						<Text style={styles.itemSubtitle}>{asignacion.rolAsignado}</Text>
					</TouchableOpacity>
					<TouchableOpacity onPress={() => confirmRemove(asignacion)}>
						<Text style={styles.removeLink}>Quitar</Text>
					</TouchableOpacity>
				</View>
			))}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#f8fafc" },
	content: { padding: 16, paddingTop: 56, paddingBottom: 40 },
	centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
	error: { color: "#dc2626", textAlign: "center" },
	emptyText: { color: "#64748b", textAlign: "center" },
	topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
	back: { color: "#0f172a", fontWeight: "600", fontSize: 15 },
	edit: { color: "#0f766e", fontWeight: "600", fontSize: 15 },
	photo: { width: "100%", height: 180, borderRadius: 12, backgroundColor: "#e2e8f0" },
	photoPlaceholder: {},
	title: { fontSize: 20, fontWeight: "700", color: "#0f172a", marginTop: 16 },
	subtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },
	coords: { fontSize: 12, color: "#94a3b8", marginTop: 4, fontFamily: "monospace" },
	observaciones: { fontSize: 14, color: "#334155", marginTop: 12, lineHeight: 20 },
	mapWrapper: { marginTop: 16 },
	sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginTop: 24, marginBottom: 8 },
	sectionTitleInline: { marginTop: 0, marginBottom: 0 },
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 24,
		marginBottom: 8,
	},
	assignLink: { fontSize: 14, color: "#0f766e", fontWeight: "600" },
	emptySection: { fontSize: 13, color: "#94a3b8" },
	itemRow: {
		backgroundColor: "#fff",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		padding: 12,
		marginBottom: 8,
	},
	assignmentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	itemRowMain: { flex: 1, marginRight: 12 },
	itemTitle: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
	itemSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
	removeLink: { fontSize: 13, color: "#dc2626", fontWeight: "600" },
});
