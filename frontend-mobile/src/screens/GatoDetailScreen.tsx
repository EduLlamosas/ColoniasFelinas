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
import { GATOS_QUERY } from "../features/gatos/gatos.graphql";
import {
	REGISTRAR_INTERVENCION_MEDICA_MUTATION,
	REGISTROS_CLINICOS_QUERY,
} from "../features/gatos/registros-clinicos.graphql";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { useAuth } from "../features/auth/useAuth";
import { getErrorMessage } from "../lib/graphqlErrors";
import { resolveMediaUrl } from "../lib/config";
import { ESTADO_CER_LABELS, SEXO_LABELS, TIPO_EVENTO_CLINICO_LABELS } from "../lib/enums";
import type { Colonia, EstadoCer, Gato, RegistroClinico, TipoEventoClinico } from "../types/graphql";
import type { GatosStackScreenProps } from "../navigation/types";

type Props = GatosStackScreenProps<"GatoDetail">;

const TIPO_EVENTO_VALUES = Object.keys(TIPO_EVENTO_CLINICO_LABELS) as TipoEventoClinico[];
const ESTADO_CER_VALUES = Object.keys(ESTADO_CER_LABELS) as EstadoCer[];

// "Registrar Intervención Médica y Flujo CER" (Tabla 3.8): cada envío crea una tupla nueva del
// historial (no se edita ni se borra, es trazabilidad clínica inalterable) y, en la misma
// transacción del backend, actualiza el estado_cer del gato - por eso refrescamos también Gatos.
export function GatoDetailScreen({ route, navigation }: Props) {
	const { isAdmin } = useAuth();
	const { id } = route.params;
	const { data, loading, error } = useQuery<{ gatos: Gato[] }>(GATOS_QUERY);
	const { data: coloniasData } = useQuery<{ colonias: Colonia[] }>(COLONIAS_QUERY);
	const { data: registrosData } = useQuery<{ registrosClinicos: RegistroClinico[] }>(REGISTROS_CLINICOS_QUERY, {
		variables: { gatoId: Number(id) },
	});
	const gato = data?.gatos.find((g) => g.id === id);
	const colonia = coloniasData?.colonias.find((c) => c.id === String(gato?.coloniaId));

	const [formOpen, setFormOpen] = useState(false);
	const [tipo, setTipo] = useState<TipoEventoClinico | "">("");
	const [fecha, setFecha] = useState("");
	const [diagnostico, setDiagnostico] = useState("");
	const [nuevoEstadoCer, setNuevoEstadoCer] = useState<EstadoCer | "">("");
	const [formError, setFormError] = useState<string | null>(null);

	const [registrarIntervencion, { loading: registrando }] = useMutation(
		REGISTRAR_INTERVENCION_MEDICA_MUTATION,
		{
			refetchQueries: [
				{ query: REGISTROS_CLINICOS_QUERY, variables: { gatoId: Number(id) } },
				{ query: GATOS_QUERY },
			],
			awaitRefetchQueries: true,
		},
	);

	function openForm() {
		setTipo("");
		setFecha("");
		setDiagnostico("");
		setNuevoEstadoCer(gato?.estadoCer ?? "");
		setFormError(null);
		setFormOpen(true);
	}

	async function handleRegistrarIntervencion() {
		setFormError(null);

		if (!tipo || !fecha.trim() || !diagnostico.trim() || !nuevoEstadoCer) {
			setFormError("Completa el tipo de evento, la fecha, el diagnóstico y el nuevo estado.");
			return;
		}

		try {
			await registrarIntervencion({
				variables: {
					data: { gatoId: Number(id), tipo, fecha: fecha.trim(), diagnostico: diagnostico.trim(), nuevoEstadoCer },
				},
			});
			setFormOpen(false);
		} catch (err) {
			setFormError(getErrorMessage(err));
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

	if (!gato) {
		return (
			<View style={styles.centered}>
				<Text style={styles.emptyText}>Gato no encontrado. Puede que haya sido eliminado.</Text>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<View style={styles.topRow}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Text style={styles.back}>‹ Gatos</Text>
				</TouchableOpacity>
				{isAdmin && (
					<TouchableOpacity onPress={() => navigation.navigate("GatoForm", { id: gato.id })}>
						<Text style={styles.edit}>Editar</Text>
					</TouchableOpacity>
				)}
			</View>

			{gato.fotoUrl ? (
				<Image source={{ uri: resolveMediaUrl(gato.fotoUrl)! }} style={styles.photo} />
			) : (
				<View style={[styles.photo, styles.photoPlaceholder]} />
			)}

			<Text style={styles.title}>{gato.nombre ?? "Sin nombre"}</Text>
			{colonia ? (
				<TouchableOpacity
					onPress={() => navigation.navigate("ColoniasTab", { screen: "ColoniaDetail", params: { id: colonia.id } })}
				>
					<Text style={styles.subtitleLink}>{colonia.nombre}</Text>
				</TouchableOpacity>
			) : (
				<Text style={styles.subtitle}>—</Text>
			)}

			<View style={styles.factsRow}>
				<View style={styles.fact}>
					<Text style={styles.factLabel}>Sexo</Text>
					<Text style={styles.factValue}>{SEXO_LABELS[gato.sexo]}</Text>
				</View>
				<View style={styles.fact}>
					<Text style={styles.factLabel}>Capa</Text>
					<Text style={styles.factValue}>{gato.capaPelaje}</Text>
				</View>
				<View style={styles.fact}>
					<Text style={styles.factLabel}>Estado</Text>
					<Text style={styles.factValue}>{ESTADO_CER_LABELS[gato.estadoCer]}</Text>
				</View>
			</View>

			<Text style={styles.sectionTitle}>Identificación</Text>
			<Text style={styles.identText}>
				{gato.tieneMicrochip ? `Microchip${gato.numMicrochip ? `: ${gato.numMicrochip}` : " (sin número registrado)"}` : "Sin microchip"}
			</Text>
			<Text style={styles.identText}>{gato.marcajeOreja ? "Con marcaje en la oreja" : "Sin marcaje en la oreja"}</Text>
			<Text style={styles.identText}>
				Nacimiento estimado:{" "}
				{gato.fechaNacimiento ? new Date(gato.fechaNacimiento).toLocaleDateString("es-ES") : "Desconocido"}
			</Text>

			{gato.observaciones && (
				<>
					<Text style={styles.sectionTitle}>Observaciones</Text>
					<Text style={styles.identText}>{gato.observaciones}</Text>
				</>
			)}

			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Historial clínico</Text>
					{!formOpen && (
						<TouchableOpacity onPress={openForm}>
							<Text style={styles.edit}>Añadir registro</Text>
						</TouchableOpacity>
					)}
				</View>

				{formOpen && (
					<View style={styles.form}>
						<Text style={styles.label}>Tipo de evento *</Text>
						<View style={styles.chipRow}>
							{TIPO_EVENTO_VALUES.map((value) => (
								<TouchableOpacity
									key={value}
									style={[styles.chip, tipo === value && styles.chipSelected]}
									onPress={() => setTipo(value)}
								>
									<Text style={[styles.chipText, tipo === value && styles.chipTextSelected]}>
										{TIPO_EVENTO_CLINICO_LABELS[value]}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						<Text style={styles.label}>Fecha *</Text>
						<TextInput style={styles.input} value={fecha} onChangeText={setFecha} placeholder="AAAA-MM-DD" />

						<Text style={styles.label}>Diagnóstico *</Text>
						<TextInput
							style={[styles.input, styles.textArea]}
							value={diagnostico}
							onChangeText={setDiagnostico}
							multiline
							numberOfLines={3}
						/>

						<Text style={styles.label}>Nuevo estado (protocolo CER) *</Text>
						<View style={styles.chipRow}>
							{ESTADO_CER_VALUES.map((value) => (
								<TouchableOpacity
									key={value}
									style={[styles.chip, nuevoEstadoCer === value && styles.chipSelected]}
									onPress={() => setNuevoEstadoCer(value)}
								>
									<Text style={[styles.chipText, nuevoEstadoCer === value && styles.chipTextSelected]}>
										{ESTADO_CER_LABELS[value]}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						{formError && <Text style={styles.error}>{formError}</Text>}

						<View style={styles.formActions}>
							<TouchableOpacity onPress={() => setFormOpen(false)} disabled={registrando}>
								<Text style={styles.cancelText}>Cancelar</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.submitButton, registrando && styles.submitButtonDisabled]}
								onPress={handleRegistrarIntervencion}
								disabled={registrando}
							>
								{registrando ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Guardar</Text>}
							</TouchableOpacity>
						</View>
					</View>
				)}

				{(registrosData?.registrosClinicos ?? []).length === 0 ? (
					<Text style={styles.emptyText}>Aún no se ha registrado ninguna intervención médica.</Text>
				) : (
					registrosData?.registrosClinicos.map((registro) => (
						<View key={registro.id} style={styles.registroItem}>
							<View style={styles.registroHeaderRow}>
								<Text style={styles.registroTipo}>{TIPO_EVENTO_CLINICO_LABELS[registro.tipo]}</Text>
								<Text style={styles.registroFecha}>{new Date(registro.fecha).toLocaleDateString("es-ES")}</Text>
							</View>
							<Text style={styles.registroDiagnostico}>{registro.diagnostico}</Text>
							<Text style={styles.registroAutor}>
								Registrado por {registro.usuario?.nombreCompleto ?? "un usuario ya no disponible"}
							</Text>
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
	factsRow: { flexDirection: "row", marginTop: 20, gap: 12 },
	fact: {
		flex: 1,
		backgroundColor: "#fff",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		padding: 12,
	},
	factLabel: { fontSize: 11, color: "#94a3b8", textTransform: "uppercase" },
	factValue: { fontSize: 14, fontWeight: "600", color: "#0f172a", marginTop: 4 },
	sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginTop: 24, marginBottom: 8 },
	identText: { fontSize: 14, color: "#334155", marginTop: 4 },
	section: { marginTop: 12 },
	sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	form: {
		borderWidth: 1,
		borderColor: "#e2e8f0",
		borderRadius: 8,
		backgroundColor: "#f8fafc",
		padding: 12,
		marginTop: 8,
		marginBottom: 12,
	},
	label: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 6, marginTop: 12 },
	input: {
		borderWidth: 1,
		borderColor: "#cbd5e1",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
		backgroundColor: "#fff",
	},
	textArea: { minHeight: 70, textAlignVertical: "top" },
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
	formActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 16, marginTop: 16 },
	cancelText: { color: "#64748b", fontWeight: "600", fontSize: 14 },
	submitButton: { backgroundColor: "#0f172a", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 },
	submitButtonDisabled: { opacity: 0.6 },
	submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
	registroItem: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingVertical: 10 },
	registroHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	registroTipo: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
	registroFecha: { fontSize: 12, color: "#64748b" },
	registroDiagnostico: { fontSize: 13, color: "#334155", marginTop: 4 },
	registroAutor: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
});
