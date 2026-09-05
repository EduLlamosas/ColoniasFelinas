import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery } from "@apollo/client/react";
import {
	ASIGNACIONES_QUERY,
	CREATE_ASIGNACION_MUTATION,
	UPDATE_ASIGNACION_MUTATION,
} from "../features/asignaciones/asignaciones.graphql";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { VOLUNTARIOS_QUERY } from "../features/voluntarios/voluntarios.graphql";
import { getErrorMessage } from "../lib/graphqlErrors";
import { ROL_ASIGNADO_SUGERENCIAS } from "../lib/enums";
import type { Asignacion, Colonia, Voluntario } from "../types/graphql";
import type { VoluntariosStackScreenProps } from "../navigation/types";

type Props = VoluntariosStackScreenProps<"AsignacionForm">;

export function AsignacionFormScreen({ route, navigation }: Props) {
	const { voluntarioId: fixedVoluntarioId, coloniaId: fixedColoniaId } = route.params;
	const isEditing = Boolean(fixedVoluntarioId && fixedColoniaId);

	const { data: asignacionesData } = useQuery<{ asignaciones: Asignacion[] }>(ASIGNACIONES_QUERY);
	const existing = isEditing
		? asignacionesData?.asignaciones.find(
				(a) => a.voluntarioId === Number(fixedVoluntarioId) && a.coloniaId === Number(fixedColoniaId),
			)
		: undefined;
	const { data: coloniasData } = useQuery<{ colonias: Colonia[] }>(COLONIAS_QUERY);
	const colonias = coloniasData?.colonias ?? [];
	const { data: voluntariosData } = useQuery<{ voluntarios: Voluntario[] }>(VOLUNTARIOS_QUERY);
	const voluntarios = voluntariosData?.voluntarios ?? [];
	const rolSugerencias = Array.from(
		new Set([...ROL_ASIGNADO_SUGERENCIAS, ...(asignacionesData?.asignaciones.map((a) => a.rolAsignado) ?? [])]),
	).sort((a, b) => a.localeCompare(b));

	const [voluntarioId, setVoluntarioId] = useState(fixedVoluntarioId ?? "");
	const [coloniaId, setColoniaId] = useState(fixedColoniaId ?? "");
	const [rolAsignado, setRolAsignado] = useState(existing?.rolAsignado ?? "");
	const [error, setError] = useState<string | null>(null);

	const mutationOptions = { refetchQueries: [{ query: ASIGNACIONES_QUERY }], awaitRefetchQueries: true };
	const [createAsignacion, { loading: creating }] = useMutation(CREATE_ASIGNACION_MUTATION, mutationOptions);
	const [updateAsignacion, { loading: updating }] = useMutation(UPDATE_ASIGNACION_MUTATION, mutationOptions);
	const saving = creating || updating;

	async function handleSubmit() {
		setError(null);

		const rol = rolAsignado.trim();
		if (!voluntarioId || !coloniaId || !rol) {
			setError("Completa el voluntario, la colonia y el rol asignado.");
			return;
		}

		try {
			if (isEditing) {
				await updateAsignacion({
					variables: { voluntarioId: Number(voluntarioId), coloniaId: Number(coloniaId), data: { rolAsignado: rol } },
				});
			} else {
				await createAsignacion({
					variables: { data: { voluntarioId: Number(voluntarioId), coloniaId: Number(coloniaId), rolAsignado: rol } },
				});
			}
			navigation.goBack();
		} catch (err) {
			setError(getErrorMessage(err));
		}
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<TouchableOpacity onPress={() => navigation.goBack()}>
				<Text style={styles.back}>‹ Cancelar</Text>
			</TouchableOpacity>

			<Text style={styles.title}>{isEditing ? "Editar asignación" : "Nueva asignación"}</Text>

			<Text style={styles.label}>Voluntario *</Text>
			{fixedVoluntarioId ? (
				<Text style={styles.lockedValue}>{voluntarios.find((v) => v.id === voluntarioId)?.nombre ?? "—"}</Text>
			) : (
				<View style={styles.chipRow}>
					{voluntarios.map((voluntario) => (
						<TouchableOpacity
							key={voluntario.id}
							style={[styles.chip, voluntarioId === voluntario.id && styles.chipSelected]}
							onPress={() => setVoluntarioId(voluntario.id)}
						>
							<Text style={[styles.chipText, voluntarioId === voluntario.id && styles.chipTextSelected]}>
								{voluntario.nombre}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			)}

			<Text style={styles.label}>Colonia *</Text>
			{fixedColoniaId ? (
				<Text style={styles.lockedValue}>{colonias.find((c) => c.id === coloniaId)?.nombre ?? "—"}</Text>
			) : (
				<View style={styles.chipRow}>
					{colonias.map((colonia) => (
						<TouchableOpacity
							key={colonia.id}
							style={[styles.chip, coloniaId === colonia.id && styles.chipSelected]}
							onPress={() => setColoniaId(colonia.id)}
						>
							<Text style={[styles.chipText, coloniaId === colonia.id && styles.chipTextSelected]}>
								{colonia.nombre}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			)}

			<Text style={styles.label}>Rol asignado *</Text>
			<TextInput
				style={styles.input}
				value={rolAsignado}
				onChangeText={setRolAsignado}
				placeholder="Escribe o elige un rol (p. ej. Alimentador principal)"
			/>
			<View style={styles.chipRow}>
				{rolSugerencias.map((value) => (
					<TouchableOpacity
						key={value}
						style={[styles.chip, rolAsignado === value && styles.chipSelected]}
						onPress={() => setRolAsignado(value)}
					>
						<Text style={[styles.chipText, rolAsignado === value && styles.chipTextSelected]}>{value}</Text>
					</TouchableOpacity>
				))}
			</View>

			{error && <Text style={styles.error}>{error}</Text>}

			<TouchableOpacity
				style={[styles.submitButton, saving && styles.submitButtonDisabled]}
				onPress={handleSubmit}
				disabled={saving}
			>
				{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Guardar</Text>}
			</TouchableOpacity>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#f8fafc" },
	content: { padding: 16, paddingTop: 56, paddingBottom: 40 },
	back: { color: "#0f172a", fontWeight: "600", fontSize: 15, marginBottom: 16 },
	title: { fontSize: 20, fontWeight: "700", color: "#0f172a", marginBottom: 20 },
	label: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 6, marginTop: 16 },
	lockedValue: {
		fontSize: 15,
		color: "#0f172a",
		backgroundColor: "#fff",
		borderWidth: 1,
		borderColor: "#e2e8f0",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	input: {
		borderWidth: 1,
		borderColor: "#cbd5e1",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
		marginBottom: 10,
	},
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
	error: { color: "#dc2626", fontSize: 13, marginTop: 16 },
	submitButton: {
		backgroundColor: "#0f172a",
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 24,
	},
	submitButtonDisabled: { opacity: 0.6 },
	submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
