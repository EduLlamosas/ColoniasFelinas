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
import * as Location from "expo-location";
import {
	COLONIAS_QUERY,
	CREATE_COLONIA_MUTATION,
	UPDATE_COLONIA_MUTATION,
} from "../features/colonias/colonias.graphql";
import { getErrorMessage } from "../lib/graphqlErrors";
import { resolveMediaUrl } from "../lib/config";
import { uploadImage } from "../lib/uploads";
import { TIPO_SUELO_LABELS } from "../lib/enums";
import { LocationPicker } from "../components/LocationPicker";
import type { Colonia, TipoSuelo } from "../types/graphql";
import type { ColoniasStackScreenProps } from "../navigation/types";

type Props = ColoniasStackScreenProps<"ColoniaForm">;

const TIPO_SUELO_VALUES = Object.keys(TIPO_SUELO_LABELS) as TipoSuelo[];

interface FormState {
	codigoOficial: string;
	nombre: string;
	tipoSuelo: TipoSuelo | "";
	latitud: string;
	longitud: string;
	observaciones: string;
	fotoUrl: string | null;
}

function toFormState(colonia?: Colonia): FormState {
	if (!colonia) {
		return { codigoOficial: "", nombre: "", tipoSuelo: "", latitud: "", longitud: "", observaciones: "", fotoUrl: null };
	}
	return {
		codigoOficial: colonia.codigoOficial,
		nombre: colonia.nombre,
		tipoSuelo: colonia.tipoSuelo,
		latitud: String(colonia.latitud),
		longitud: String(colonia.longitud),
		observaciones: colonia.observaciones ?? "",
		fotoUrl: colonia.fotoUrl,
	};
}

export function ColoniaFormScreen({ route, navigation }: Props) {
	const editingId = route.params?.id;
	const isEditing = Boolean(editingId);

	const { data: coloniasData } = useQuery<{ colonias: Colonia[] }>(COLONIAS_QUERY);
	const colonia = editingId ? coloniasData?.colonias.find((c) => c.id === editingId) : undefined;

	const [form, setForm] = useState<FormState>(() => toFormState(colonia));
	const [error, setError] = useState<string | null>(null);
	const [uploadingPhoto, setUploadingPhoto] = useState(false);
	const [locating, setLocating] = useState(false);

	const mutationOptions = { refetchQueries: [{ query: COLONIAS_QUERY }], awaitRefetchQueries: true };
	const [createColonia, { loading: creating }] = useMutation(CREATE_COLONIA_MUTATION, mutationOptions);
	const [updateColonia, { loading: updating }] = useMutation(UPDATE_COLONIA_MUTATION, mutationOptions);
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

	async function handleUseCurrentLocation() {
		const permission = await Location.requestForegroundPermissionsAsync();
		if (!permission.granted) {
			setError("Necesitamos permiso de ubicación para usar tu posición actual.");
			return;
		}
		setError(null);
		setLocating(true);
		try {
			const position = await Location.getCurrentPositionAsync({});
			update("latitud", String(position.coords.latitude));
			update("longitud", String(position.coords.longitude));
		} catch {
			setError("No se pudo obtener tu ubicación actual.");
		} finally {
			setLocating(false);
		}
	}

	async function handleSubmit() {
		setError(null);

		const codigoOficial = form.codigoOficial.trim();
		const nombre = form.nombre.trim();
		const latitud = form.latitud === "" ? null : Number(form.latitud);
		const longitud = form.longitud === "" ? null : Number(form.longitud);

		if (!codigoOficial || !nombre || !form.tipoSuelo) {
			setError("Completa código oficial, nombre y tipo de suelo.");
			return;
		}
		if (latitud === null || longitud === null || Number.isNaN(latitud) || Number.isNaN(longitud)) {
			setError("Introduce una latitud y longitud válidas.");
			return;
		}

		const data = {
			codigoOficial,
			nombre,
			tipoSuelo: form.tipoSuelo,
			latitud,
			longitud,
			observaciones: form.observaciones.trim() || undefined,
			fotoUrl: form.fotoUrl ?? undefined,
		};

		try {
			if (isEditing && editingId) {
				await updateColonia({ variables: { id: editingId, data } });
			} else {
				await createColonia({ variables: { data } });
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

			<Text style={styles.title}>{isEditing ? "Editar colonia" : "Nueva colonia"}</Text>

			<Text style={styles.label}>Código oficial *</Text>
			<TextInput
				style={styles.input}
				value={form.codigoOficial}
				onChangeText={(v) => update("codigoOficial", v)}
				autoCapitalize="characters"
			/>

			<Text style={styles.label}>Nombre *</Text>
			<TextInput style={styles.input} value={form.nombre} onChangeText={(v) => update("nombre", v)} />

			<Text style={styles.label}>Tipo de suelo *</Text>
			<View style={styles.chipRow}>
				{TIPO_SUELO_VALUES.map((value) => (
					<TouchableOpacity
						key={value}
						style={[styles.chip, form.tipoSuelo === value && styles.chipSelected]}
						onPress={() => update("tipoSuelo", value)}
					>
						<Text style={[styles.chipText, form.tipoSuelo === value && styles.chipTextSelected]}>
							{TIPO_SUELO_LABELS[value]}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<Text style={styles.label}>Ubicación *</Text>
			<LocationPicker
				latitud={form.latitud === "" ? null : Number(form.latitud)}
				longitud={form.longitud === "" ? null : Number(form.longitud)}
				onChange={(lat, lng) => {
					update("latitud", String(lat));
					update("longitud", String(lng));
				}}
			/>
			<View style={styles.coordsRow}>
				<TextInput
					style={[styles.input, styles.coordsInput]}
					placeholder="Latitud"
					keyboardType="numbers-and-punctuation"
					value={form.latitud}
					onChangeText={(v) => update("latitud", v)}
				/>
				<TextInput
					style={[styles.input, styles.coordsInput]}
					placeholder="Longitud"
					keyboardType="numbers-and-punctuation"
					value={form.longitud}
					onChangeText={(v) => update("longitud", v)}
				/>
			</View>
			<TouchableOpacity style={styles.linkButton} onPress={handleUseCurrentLocation} disabled={locating}>
				{locating ? <ActivityIndicator size="small" /> : <Text style={styles.linkButtonText}>Usar mi ubicación actual</Text>}
			</TouchableOpacity>

			<Text style={styles.label}>Observaciones</Text>
			<TextInput
				style={[styles.input, styles.textarea]}
				value={form.observaciones}
				onChangeText={(v) => update("observaciones", v)}
				multiline
				numberOfLines={4}
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
	textarea: { minHeight: 90, textAlignVertical: "top" },
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
	coordsRow: { flexDirection: "row", gap: 12 },
	coordsInput: { flex: 1 },
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
