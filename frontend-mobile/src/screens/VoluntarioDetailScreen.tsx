import {
	ActivityIndicator,
	Alert as RNAlert,
	Linking,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useMutation, useQuery } from "@apollo/client/react";
import { VOLUNTARIOS_QUERY } from "../features/voluntarios/voluntarios.graphql";
import {
	ASIGNACIONES_QUERY,
	REMOVE_ASIGNACION_MUTATION,
} from "../features/asignaciones/asignaciones.graphql";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { getErrorMessage } from "../lib/graphqlErrors";
import type { Asignacion, Colonia, Voluntario } from "../types/graphql";
import type { VoluntariosStackScreenProps } from "../navigation/types";

type Props = VoluntariosStackScreenProps<"VoluntarioDetail">;

export function VoluntarioDetailScreen({ route, navigation }: Props) {
	const { id } = route.params;
	const { data, loading, error } = useQuery<{ voluntarios: Voluntario[] }>(VOLUNTARIOS_QUERY);
	const { data: asignacionesData, loading: loadingAsignaciones } = useQuery<{ asignaciones: Asignacion[] }>(
		ASIGNACIONES_QUERY,
	);
	const { data: coloniasData } = useQuery<{ colonias: Colonia[] }>(COLONIAS_QUERY);
	const coloniasById = new Map((coloniasData?.colonias ?? []).map((c) => [c.id, c]));
	const [removeAsignacion] = useMutation(REMOVE_ASIGNACION_MUTATION, {
		refetchQueries: [{ query: ASIGNACIONES_QUERY }],
	});

	const voluntario = data?.voluntarios.find((v) => v.id === id);
	const asignaciones = (asignacionesData?.asignaciones ?? []).filter((a) => a.voluntarioId === Number(id));

	function confirmRemove(asignacion: Asignacion) {
		RNAlert.alert(
			"Quitar asignación",
			`¿Seguro que quieres quitar a este voluntario de ${coloniasById.get(String(asignacion.coloniaId))?.nombre ?? "esta colonia"}?`,
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

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.centered}>
				<Text style={styles.error}>{getErrorMessage(error)}</Text>
			</View>
		);
	}

	if (!voluntario) {
		return (
			<View style={styles.centered}>
				<Text style={styles.emptyText}>Voluntario no encontrado. Puede que haya sido eliminado.</Text>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<View style={styles.topRow}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Text style={styles.back}>‹ Voluntarios</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={() => navigation.navigate("VoluntarioForm", { id: voluntario.id })}>
					<Text style={styles.edit}>Editar</Text>
				</TouchableOpacity>
			</View>

			<Text style={styles.title}>{voluntario.nombre}</Text>
			<Text style={styles.subtitle}>{voluntario.dni}</Text>

			<View style={styles.card}>
				<Text style={styles.cardLabel}>Teléfono</Text>
				<Text style={styles.cardValue}>{voluntario.telefono ?? "—"}</Text>

				<Text style={[styles.cardLabel, styles.cardLabelSpaced]}>Documento RGPD</Text>
				{voluntario.urlCesionDatos ? (
					<TouchableOpacity onPress={() => Linking.openURL(voluntario.urlCesionDatos!)}>
						<Text style={styles.rgpdLink}>Ver documento firmado</Text>
					</TouchableOpacity>
				) : (
					<Text style={styles.rgpdMissing}>Falta documento</Text>
				)}
			</View>

			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>Colonias asignadas ({loadingAsignaciones ? "…" : asignaciones.length})</Text>
				<TouchableOpacity onPress={() => navigation.navigate("AsignacionForm", { voluntarioId: id })}>
					<Text style={styles.assignLink}>Asignar</Text>
				</TouchableOpacity>
			</View>

			{asignaciones.length === 0 && !loadingAsignaciones && (
				<Text style={styles.emptySection}>Sin colonias asignadas a este voluntario.</Text>
			)}
			{asignaciones.map((asignacion) => (
				<View key={asignacion.coloniaId} style={styles.itemRow}>
					<TouchableOpacity
						style={styles.itemRowMain}
						onPress={() =>
							navigation.navigate("AsignacionForm", { voluntarioId: id, coloniaId: String(asignacion.coloniaId) })
						}
					>
						<Text style={styles.itemTitle}>{coloniasById.get(String(asignacion.coloniaId))?.nombre ?? "—"}</Text>
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
	title: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
	subtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },
	card: {
		backgroundColor: "#fff",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		padding: 14,
		marginTop: 16,
	},
	cardLabel: { fontSize: 11, color: "#94a3b8", textTransform: "uppercase" },
	cardLabelSpaced: { marginTop: 12 },
	cardValue: { fontSize: 14, color: "#0f172a", marginTop: 4 },
	rgpdLink: { fontSize: 14, color: "#0f766e", fontWeight: "600", marginTop: 4 },
	rgpdMissing: { fontSize: 14, color: "#dc2626", fontWeight: "600", marginTop: 4 },
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 24,
		marginBottom: 8,
	},
	sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
	assignLink: { fontSize: 14, color: "#0f766e", fontWeight: "600" },
	emptySection: { fontSize: 13, color: "#94a3b8" },
	itemRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: "#fff",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		padding: 12,
		marginBottom: 8,
	},
	itemRowMain: { flex: 1, marginRight: 12 },
	itemTitle: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
	itemSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
	removeLink: { fontSize: 13, color: "#dc2626", fontWeight: "600" },
});
