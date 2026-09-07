import { useState } from "react";
import {
	ActivityIndicator,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useMutation, useQuery } from "@apollo/client/react";
import { COMEDEROS_QUERY } from "../features/comederos/comederos.graphql";
import {
	REGISTRAR_VISITA_COMEDERO_MUTATION,
	VISITAS_COMEDERO_QUERY,
} from "../features/comederos/visitas-comedero.graphql";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { getErrorMessage } from "../lib/graphqlErrors";
import { resolveMediaUrl } from "../lib/config";
import type { Colonia, Comedero, VisitaComedero } from "../types/graphql";
import type { ComederosStackScreenProps } from "../navigation/types";

type Props = ComederosStackScreenProps<"ComederoDetail">;

// "Registrar Evento de Alimentación / Inspección" (Tabla 3.7) - flujo pensado para el trabajo
// de campo desde el móvil: fecha capturada por el servidor, insumos como chips, sin edición
// posterior (es una traza de auditoría, no un dato de ficha).
export function ComederoDetailScreen({ route, navigation }: Props) {
	const { id } = route.params;
	const { data, loading, error } = useQuery<{ comederos: Comedero[] }>(COMEDEROS_QUERY);
	const { data: coloniasData } = useQuery<{ colonias: Colonia[] }>(COLONIAS_QUERY);
	const { data: visitasData } = useQuery<{ visitasComedero: VisitaComedero[] }>(VISITAS_COMEDERO_QUERY, {
		variables: { comederoId: Number(id) },
	});
	const comedero = data?.comederos.find((c) => c.id === id);
	const colonia = coloniasData?.colonias.find((c) => c.id === String(comedero?.coloniaId));

	const [formOpen, setFormOpen] = useState(false);
	const [piensoSeco, setPiensoSeco] = useState(false);
	const [comidaHumeda, setComidaHumeda] = useState(false);
	const [agua, setAgua] = useState(false);
	const [observaciones, setObservaciones] = useState("");
	const [visitaError, setVisitaError] = useState<string | null>(null);

	const [registrarVisita, { loading: registrando }] = useMutation(REGISTRAR_VISITA_COMEDERO_MUTATION, {
		refetchQueries: [{ query: VISITAS_COMEDERO_QUERY, variables: { comederoId: Number(id) } }],
		awaitRefetchQueries: true,
	});

	async function handleRegistrarVisita() {
		setVisitaError(null);
		try {
			await registrarVisita({
				variables: {
					data: {
						comederoId: Number(id),
						piensoSeco,
						comidaHumeda,
						agua,
						observaciones: observaciones.trim() || undefined,
					},
				},
			});
			setPiensoSeco(false);
			setComidaHumeda(false);
			setAgua(false);
			setObservaciones("");
			setFormOpen(false);
		} catch (err) {
			setVisitaError(getErrorMessage(err));
		}
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

	if (!comedero) {
		return (
			<View style={styles.centered}>
				<Text style={styles.emptyText}>Comedero no encontrado. Puede que haya sido eliminado.</Text>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<View style={styles.topRow}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Text style={styles.back}>‹ Comederos</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={() => navigation.navigate("ComederoForm", { id: comedero.id })}>
					<Text style={styles.edit}>Editar</Text>
				</TouchableOpacity>
			</View>

			{comedero.fotoUrl ? (
				<Image source={{ uri: resolveMediaUrl(comedero.fotoUrl)! }} style={styles.photo} />
			) : (
				<View style={[styles.photo, styles.photoPlaceholder]} />
			)}

			<Text style={styles.title}>{comedero.ubicacionDetallada}</Text>
			{colonia ? (
				<TouchableOpacity
					onPress={() => navigation.navigate("ColoniasTab", { screen: "ColoniaDetail", params: { id: colonia.id } })}
				>
					<Text style={styles.subtitleLink}>{colonia.nombre}</Text>
				</TouchableOpacity>
			) : (
				<Text style={styles.subtitle}>Sin colonia asociada</Text>
			)}

			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Visitas registradas</Text>
					{!formOpen && (
						<TouchableOpacity onPress={() => setFormOpen(true)}>
							<Text style={styles.edit}>Registrar visita</Text>
						</TouchableOpacity>
					)}
				</View>

				{formOpen && (
					<View style={styles.form}>
						<Text style={styles.hint}>La fecha y hora se capturan automáticamente al confirmar.</Text>
						<View style={styles.chipRow}>
							<TouchableOpacity
								style={[styles.chip, piensoSeco && styles.chipSelected]}
								onPress={() => setPiensoSeco(!piensoSeco)}
							>
								<Text style={[styles.chipText, piensoSeco && styles.chipTextSelected]}>Pienso seco</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.chip, comidaHumeda && styles.chipSelected]}
								onPress={() => setComidaHumeda(!comidaHumeda)}
							>
								<Text style={[styles.chipText, comidaHumeda && styles.chipTextSelected]}>Comida húmeda</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.chip, agua && styles.chipSelected]} onPress={() => setAgua(!agua)}>
								<Text style={[styles.chipText, agua && styles.chipTextSelected]}>Agua</Text>
							</TouchableOpacity>
						</View>
						<TextInput
							style={styles.input}
							value={observaciones}
							onChangeText={setObservaciones}
							placeholder="Observaciones (suciedad, desperfectos...)"
							multiline
						/>
						{visitaError && <Text style={styles.error}>{visitaError}</Text>}
						<View style={styles.formActions}>
							<TouchableOpacity onPress={() => setFormOpen(false)} disabled={registrando}>
								<Text style={styles.cancelText}>Cancelar</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.submitButton, registrando && styles.submitButtonDisabled]}
								onPress={handleRegistrarVisita}
								disabled={registrando}
							>
								{registrando ? (
									<ActivityIndicator color="#fff" />
								) : (
									<Text style={styles.submitButtonText}>Confirmar registro</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				)}

				{(visitasData?.visitasComedero ?? []).length === 0 ? (
					<Text style={styles.emptyText}>Aún no se ha registrado ninguna visita.</Text>
				) : (
					visitasData?.visitasComedero.map((visita) => (
						<View key={visita.id} style={styles.visitaItem}>
							<Text style={styles.visitaFecha}>{new Date(visita.createdAt).toLocaleString("es-ES")}</Text>
							<Text style={styles.visitaInsumos}>
								{[visita.piensoSeco && "Pienso seco", visita.comidaHumeda && "Comida húmeda", visita.agua && "Agua"]
									.filter(Boolean)
									.join(" · ") || "Sin insumos marcados"}
							</Text>
							{visita.observaciones && <Text style={styles.visitaObservaciones}>{visita.observaciones}</Text>}
						</View>
					))
				)}
			</View>
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
	subtitleLink: { fontSize: 14, color: "#0f766e", fontWeight: "600", marginTop: 4 },
	section: { marginTop: 28 },
	sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
	sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
	form: {
		borderWidth: 1,
		borderColor: "#e2e8f0",
		borderRadius: 8,
		backgroundColor: "#f8fafc",
		padding: 12,
		marginBottom: 12,
		gap: 10,
	},
	hint: { fontSize: 12, color: "#64748b" },
	chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	chip: {
		borderWidth: 1,
		borderColor: "#cbd5e1",
		borderRadius: 999,
		paddingHorizontal: 14,
		paddingVertical: 8,
		backgroundColor: "#fff",
	},
	chipSelected: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
	chipText: { fontSize: 13, color: "#334155", fontWeight: "500" },
	chipTextSelected: { color: "#fff" },
	input: {
		borderWidth: 1,
		borderColor: "#cbd5e1",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
		backgroundColor: "#fff",
		minHeight: 44,
	},
	formActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 16 },
	cancelText: { color: "#64748b", fontWeight: "600", fontSize: 14 },
	submitButton: { backgroundColor: "#0f172a", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 },
	submitButtonDisabled: { opacity: 0.6 },
	submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
	visitaItem: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingVertical: 10 },
	visitaFecha: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
	visitaInsumos: { fontSize: 12, color: "#64748b", marginTop: 2 },
	visitaObservaciones: { fontSize: 13, color: "#334155", marginTop: 4 },
});
