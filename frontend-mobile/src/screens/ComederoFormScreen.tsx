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
	COMEDEROS_QUERY,
	CREATE_COMEDERO_MUTATION,
	UPDATE_COMEDERO_MUTATION,
} from "../features/comederos/comederos.graphql";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { getErrorMessage } from "../lib/graphqlErrors";
import { resolveMediaUrl } from "../lib/config";
import { uploadImage } from "../lib/uploads";
import type { Colonia, Comedero } from "../types/graphql";
import type { ComederosStackScreenProps } from "../navigation/types";

type Props = ComederosStackScreenProps<"ComederoForm">;

interface FormState {
	coloniaId: string;
	ubicacionDetallada: string;
	fotoUrl: string | null;
}

function toFormState(comedero?: Comedero, defaultColoniaId?: string): FormState {
	if (!comedero) {
		return { coloniaId: defaultColoniaId ?? "", ubicacionDetallada: "", fotoUrl: null };
	}
	return {
		coloniaId: String(comedero.coloniaId),
		ubicacionDetallada: comedero.ubicacionDetallada,
		fotoUrl: comedero.fotoUrl,
	};
}

export function ComederoFormScreen({ route, navigation }: Props) {
	const editingId = route.params?.id;
	const defaultColoniaId = route.params?.defaultColoniaId;
	const isEditing = Boolean(editingId);

	const { data: comederosData } = useQuery<{ comederos: Comedero[] }>(COMEDEROS_QUERY);
	const comedero = editingId ? comederosData?.comederos.find((c) => c.id === editingId) : undefined;
	const { data: coloniasData } = useQuery<{ colonias: Colonia[] }>(COLONIAS_QUERY);
	const colonias = coloniasData?.colonias ?? [];

	const [form, setForm] = useState<FormState>(() => toFormState(comedero, defaultColoniaId));
	const [error, setError] = useState<string | null>(null);
	const [uploadingPhoto, setUploadingPhoto] = useState(false);

	const mutationOptions = { refetchQueries: [{ query: COMEDEROS_QUERY }], awaitRefetchQueries: true };
	const [createComedero, { loading: creating }] = useMutation(CREATE_COMEDERO_MUTATION, mutationOptions);
	const [updateComedero, { loading: updating }] = useMutation(UPDATE_COMEDERO_MUTATION, mutationOptions);
	const saving = creating || updating;

	function update<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	async function handlePickPhoto() {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			setError("Necesitamos permiso para acceder a tus fotos.");
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
		if (result.canceled || !result.assets[0]) return;

		const asset = result.assets[0];
		setError(null);
		setUploadingPhoto(true);
		try {
			const url = await uploadImage({ uri: asset.uri, width: asset.width, mimeType: asset.mimeType });
			update("fotoUrl", url);
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setUploadingPhoto(false);
		}
	}

	async function handleSubmit() {
		setError(null);

		if (!form.coloniaId || !form.ubicacionDetallada.trim()) {
			setError("Completa la colonia y la ubicación del comedero.");
			return;
		}

		const data = {
			coloniaId: Number(form.coloniaId),
			ubicacionDetallada: form.ubicacionDetallada.trim(),
			fotoUrl: form.fotoUrl ?? undefined,
		};

		try {
			if (isEditing && editingId) {
				await updateComedero({ variables: { id: editingId, data } });
			} else {
				await createComedero({ variables: { data } });
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

	const previewUrl = resolveMediaUrl(form.fotoUrl);

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<TouchableOpacity onPress={confirmDiscard}>
				<Text style={styles.back}>‹ Cancelar</Text>
			</TouchableOpacity>

			<Text style={styles.title}>{isEditing ? "Editar comedero" : "Nuevo comedero"}</Text>

			<Text style={styles.label}>Colonia *</Text>
			<View style={styles.chipRow}>
				{colonias.map((colonia) => (
					<TouchableOpacity
						key={colonia.id}
						style={[styles.chip, form.coloniaId === colonia.id && styles.chipSelected]}
						onPress={() => update("coloniaId", colonia.id)}
					>
						<Text style={[styles.chipText, form.coloniaId === colonia.id && styles.chipTextSelected]}>
							{colonia.nombre}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<Text style={styles.label}>Ubicación detallada *</Text>
			<TextInput
				style={styles.input}
				value={form.ubicacionDetallada}
				onChangeText={(v) => update("ubicacionDetallada", v)}
				placeholder="Junto al contenedor azul, esquina calle..."
			/>

			<Text style={styles.label}>Foto</Text>
			<View style={styles.photoRow}>
				<View style={styles.photoPreview}>
					{previewUrl && <Image source={{ uri: previewUrl }} style={styles.photoPreviewImg} />}
					{uploadingPhoto && (
						<View style={styles.photoPreviewOverlay}>
							<ActivityIndicator color="#fff" />
						</View>
					)}
				</View>
				<View>
					<TouchableOpacity style={styles.linkButton} onPress={handlePickPhoto} disabled={uploadingPhoto}>
						<Text style={styles.linkButtonText}>{form.fotoUrl ? "Cambiar imagen" : "Subir imagen"}</Text>
					</TouchableOpacity>
					{form.fotoUrl && (
						<TouchableOpacity onPress={() => update("fotoUrl", null)}>
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
	input: {
		borderWidth: 1,
		borderColor: "#cbd5e1",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
		backgroundColor: "#fff",
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
