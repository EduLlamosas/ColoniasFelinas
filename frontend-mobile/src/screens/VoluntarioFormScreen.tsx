import { useState } from "react";
import {
	ActivityIndicator,
	Alert as RNAlert,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useMutation, useQuery } from "@apollo/client/react";
import * as ImagePicker from "expo-image-picker";
import {
	CREATE_VOLUNTARIO_MUTATION,
	UPDATE_VOLUNTARIO_MUTATION,
	VOLUNTARIOS_QUERY,
} from "../features/voluntarios/voluntarios.graphql";
import { getErrorMessage } from "../lib/graphqlErrors";
import { resolveMediaUrl } from "../lib/config";
import { uploadImage } from "../lib/uploads";
import type { Voluntario } from "../types/graphql";
import type { VoluntariosStackScreenProps } from "../navigation/types";

type Props = VoluntariosStackScreenProps<"VoluntarioForm">;

const DNI_PATTERN = /^\d{8}[A-Za-z]$/;

interface FormState {
	dni: string;
	nombre: string;
	telefono: string;
	urlCesionDatos: string | null;
}

function toFormState(voluntario?: Voluntario): FormState {
	if (!voluntario) {
		return { dni: "", nombre: "", telefono: "", urlCesionDatos: null };
	}
	return {
		dni: voluntario.dni,
		nombre: voluntario.nombre,
		telefono: voluntario.telefono ?? "",
		urlCesionDatos: voluntario.urlCesionDatos,
	};
}

export function VoluntarioFormScreen({ route, navigation }: Props) {
	const editingId = route.params?.id;
	const isEditing = Boolean(editingId);

	const { data: voluntariosData } = useQuery<{ voluntarios: Voluntario[] }>(VOLUNTARIOS_QUERY);
	const voluntario = editingId ? voluntariosData?.voluntarios.find((v) => v.id === editingId) : undefined;

	const [form, setForm] = useState<FormState>(() => toFormState(voluntario));
	const [error, setError] = useState<string | null>(null);
	const [uploadingDoc, setUploadingDoc] = useState(false);

	const mutationOptions = { refetchQueries: [{ query: VOLUNTARIOS_QUERY }], awaitRefetchQueries: true };
	const [createVoluntario, { loading: creating }] = useMutation(CREATE_VOLUNTARIO_MUTATION, mutationOptions);
	const [updateVoluntario, { loading: updating }] = useMutation(UPDATE_VOLUNTARIO_MUTATION, mutationOptions);
	const saving = creating || updating;

	function update<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	async function handlePickDocument() {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			setError("Necesitamos permiso para acceder a tus fotos.");
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
		if (result.canceled || !result.assets[0]) return;

		const asset = result.assets[0];
		setError(null);
		setUploadingDoc(true);
		try {
			const url = await uploadImage({ uri: asset.uri, width: asset.width, mimeType: asset.mimeType });
			update("urlCesionDatos", url);
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setUploadingDoc(false);
		}
	}

	async function handleSubmit() {
		setError(null);

		if (!DNI_PATTERN.test(form.dni.trim())) {
			setError("El DNI debe tener 8 dígitos seguidos de una letra.");
			return;
		}
		if (!form.nombre.trim()) {
			setError("El nombre es obligatorio.");
			return;
		}
		if (!form.urlCesionDatos) {
			setError(
				"La Ley 7/2023 y el RGPD exigen el documento de cesión de datos firmado antes de dar de alta al voluntario.",
			);
			return;
		}

		const data = {
			dni: form.dni.trim(),
			nombre: form.nombre.trim(),
			telefono: form.telefono.trim() || undefined,
			urlCesionDatos: form.urlCesionDatos,
		};

		try {
			if (isEditing && editingId) {
				await updateVoluntario({ variables: { id: editingId, data } });
			} else {
				await createVoluntario({ variables: { data } });
			}
			navigation.goBack();
		} catch (err) {
			setError(getErrorMessage(err));
		}
	}

	function confirmDiscard() {
		RNAlert.alert("Descartar cambios", "¿Seguro que quieres salir sin guardar?", [
			{ text: "Seguir editando", style: "cancel" },
			{ text: "Descartar", style: "destructive", onPress: () => navigation.goBack() },
		]);
	}

	const previewUrl = resolveMediaUrl(form.urlCesionDatos);

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<TouchableOpacity onPress={confirmDiscard}>
				<Text style={styles.back}>‹ Cancelar</Text>
			</TouchableOpacity>

			<Text style={styles.title}>{isEditing ? "Editar voluntario" : "Nuevo voluntario"}</Text>

			<Text style={styles.label}>DNI *</Text>
			<TextInput
				style={styles.input}
				value={form.dni}
				onChangeText={(v) => update("dni", v)}
				placeholder="12345678A"
				autoCapitalize="characters"
			/>

			<Text style={styles.label}>Nombre *</Text>
			<TextInput style={styles.input} value={form.nombre} onChangeText={(v) => update("nombre", v)} />

			<Text style={styles.label}>Teléfono</Text>
			<TextInput
				style={styles.input}
				value={form.telefono}
				onChangeText={(v) => update("telefono", v)}
				keyboardType="phone-pad"
			/>

			<Text style={styles.label}>Documento de cesión de datos (RGPD) *</Text>
			<Text style={styles.hint}>
				Obligatorio: foto o escaneo de la firma de cesión de datos. Sin este documento no se pueden tratar los
				datos del voluntario.
			</Text>
			<View style={styles.photoRow}>
				<View style={styles.photoPreview}>
					{previewUrl && <Image source={{ uri: previewUrl }} style={styles.photoPreviewImg} />}
					{uploadingDoc && (
						<View style={styles.photoPreviewOverlay}>
							<ActivityIndicator color="#fff" />
						</View>
					)}
				</View>
				<View>
					<TouchableOpacity style={styles.linkButton} onPress={handlePickDocument} disabled={uploadingDoc}>
						<Text style={styles.linkButtonText}>{form.urlCesionDatos ? "Cambiar documento" : "Subir documento"}</Text>
					</TouchableOpacity>
					{form.urlCesionDatos && (
						<TouchableOpacity onPress={() => update("urlCesionDatos", null)}>
							<Text style={styles.removePhoto}>Quitar</Text>
						</TouchableOpacity>
					)}
				</View>
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
	hint: { fontSize: 12, color: "#94a3b8", marginBottom: 8 },
	input: {
		borderWidth: 1,
		borderColor: "#cbd5e1",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
		backgroundColor: "#fff",
	},
	linkButton: { marginTop: 8, alignSelf: "flex-start" },
	linkButtonText: { color: "#0f766e", fontWeight: "600", fontSize: 13 },
	photoRow: { flexDirection: "row", alignItems: "center", gap: 16 },
	photoPreview: {
		width: 80,
		height: 80,
		borderRadius: 8,
		backgroundColor: "#e2e8f0",
		overflow: "hidden",
		justifyContent: "center",
		alignItems: "center",
	},
	photoPreviewImg: { width: "100%", height: "100%" },
	photoPreviewOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
	},
	removePhoto: { color: "#dc2626", fontSize: 12, marginTop: 6 },
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
