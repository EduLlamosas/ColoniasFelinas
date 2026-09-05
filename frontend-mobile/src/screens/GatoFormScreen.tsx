import { useState } from "react";
import {
	ActivityIndicator,
	Alert as RNAlert,
	Image,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useMutation, useQuery } from "@apollo/client/react";
import * as ImagePicker from "expo-image-picker";
import { CREATE_GATO_MUTATION, GATOS_QUERY, UPDATE_GATO_MUTATION } from "../features/gatos/gatos.graphql";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { getErrorMessage } from "../lib/graphqlErrors";
import { resolveMediaUrl } from "../lib/config";
import { uploadImage } from "../lib/uploads";
import { ESTADO_CER_LABELS, SEXO_LABELS } from "../lib/enums";
import type { Colonia, EstadoCer, Gato, Sexo } from "../types/graphql";
import type { GatosStackScreenProps } from "../navigation/types";

type Props = GatosStackScreenProps<"GatoForm">;

const SEXO_VALUES = Object.keys(SEXO_LABELS) as Sexo[];
const ESTADO_CER_VALUES = Object.keys(ESTADO_CER_LABELS) as EstadoCer[];

interface FormState {
	coloniaId: string;
	nombre: string;
	sexo: Sexo | "";
	fechaNacimiento: string;
	capaPelaje: string;
	estadoCer: EstadoCer | "";
	tieneMicrochip: boolean;
	numMicrochip: string;
	marcajeOreja: boolean;
	fotoUrl: string | null;
	observaciones: string;
}

function toFormState(gato?: Gato, defaultColoniaId?: string): FormState {
	if (!gato) {
		return {
			coloniaId: defaultColoniaId ?? "",
			nombre: "",
			sexo: "",
			fechaNacimiento: "",
			capaPelaje: "",
			estadoCer: "",
			tieneMicrochip: false,
			numMicrochip: "",
			marcajeOreja: false,
			fotoUrl: null,
			observaciones: "",
		};
	}
	return {
		coloniaId: String(gato.coloniaId),
		nombre: gato.nombre ?? "",
		sexo: gato.sexo,
		fechaNacimiento: gato.fechaNacimiento ? gato.fechaNacimiento.slice(0, 10) : "",
		capaPelaje: gato.capaPelaje,
		estadoCer: gato.estadoCer,
		tieneMicrochip: gato.tieneMicrochip,
		numMicrochip: gato.numMicrochip ?? "",
		marcajeOreja: gato.marcajeOreja,
		fotoUrl: gato.fotoUrl,
		observaciones: gato.observaciones ?? "",
	};
}

export function GatoFormScreen({ route, navigation }: Props) {
	const editingId = route.params?.id;
	const defaultColoniaId = route.params?.defaultColoniaId;
	const isEditing = Boolean(editingId);

	const { data: gatosData } = useQuery<{ gatos: Gato[] }>(GATOS_QUERY);
	const gato = editingId ? gatosData?.gatos.find((g) => g.id === editingId) : undefined;
	const { data: coloniasData } = useQuery<{ colonias: Colonia[] }>(COLONIAS_QUERY);
	const colonias = coloniasData?.colonias ?? [];

	const [form, setForm] = useState<FormState>(() => toFormState(gato, defaultColoniaId));
	const [error, setError] = useState<string | null>(null);
	const [uploadingPhoto, setUploadingPhoto] = useState(false);

	const mutationOptions = { refetchQueries: [{ query: GATOS_QUERY }], awaitRefetchQueries: true };
	const [createGato, { loading: creating }] = useMutation(CREATE_GATO_MUTATION, mutationOptions);
	const [updateGato, { loading: updating }] = useMutation(UPDATE_GATO_MUTATION, mutationOptions);
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

		if (!form.coloniaId || !form.sexo || !form.estadoCer || !form.capaPelaje.trim()) {
			setError("Completa la colonia, el sexo, el estado y la capa de pelaje.");
			return;
		}

		const data = {
			coloniaId: Number(form.coloniaId),
			nombre: form.nombre.trim() || undefined,
			sexo: form.sexo,
			fechaNacimiento: form.fechaNacimiento.trim() || undefined,
			capaPelaje: form.capaPelaje.trim(),
			estadoCer: form.estadoCer,
			tieneMicrochip: form.tieneMicrochip,
			numMicrochip: form.numMicrochip.trim() || undefined,
			marcajeOreja: form.marcajeOreja,
			fotoUrl: form.fotoUrl ?? undefined,
			observaciones: form.observaciones.trim() || undefined,
		};

		try {
			if (isEditing && editingId) {
				await updateGato({ variables: { id: editingId, data } });
			} else {
				await createGato({ variables: { data } });
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

			<Text style={styles.title}>{isEditing ? "Editar gato" : "Nuevo gato"}</Text>

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

			<Text style={styles.label}>Nombre</Text>
			<TextInput
				style={styles.input}
				value={form.nombre}
				onChangeText={(v) => update("nombre", v)}
				placeholder="Opcional si el gato no tiene nombre"
			/>

			<Text style={styles.label}>Capa de pelaje *</Text>
			<TextInput
				style={styles.input}
				value={form.capaPelaje}
				onChangeText={(v) => update("capaPelaje", v)}
				placeholder="Atigrado, negro, tricolor..."
			/>

			<Text style={styles.label}>Fecha de nacimiento estimada</Text>
			<TextInput
				style={styles.input}
				value={form.fechaNacimiento}
				onChangeText={(v) => update("fechaNacimiento", v)}
				placeholder="AAAA-MM-DD (opcional)"
			/>

			<Text style={styles.label}>Sexo *</Text>
			<View style={styles.chipRow}>
				{SEXO_VALUES.map((value) => (
					<TouchableOpacity
						key={value}
						style={[styles.chip, form.sexo === value && styles.chipSelected]}
						onPress={() => update("sexo", value)}
					>
						<Text style={[styles.chipText, form.sexo === value && styles.chipTextSelected]}>{SEXO_LABELS[value]}</Text>
					</TouchableOpacity>
				))}
			</View>

			<Text style={styles.label}>Estado (protocolo CER) *</Text>
			<View style={styles.chipRow}>
				{ESTADO_CER_VALUES.map((value) => (
					<TouchableOpacity
						key={value}
						style={[styles.chip, form.estadoCer === value && styles.chipSelected]}
						onPress={() => update("estadoCer", value)}
					>
						<Text style={[styles.chipText, form.estadoCer === value && styles.chipTextSelected]}>
							{ESTADO_CER_LABELS[value]}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<View style={styles.switchRow}>
				<Text style={styles.switchLabel}>Tiene microchip</Text>
				<Switch value={form.tieneMicrochip} onValueChange={(v) => update("tieneMicrochip", v)} />
			</View>
			<View style={styles.switchRow}>
				<Text style={styles.switchLabel}>Marcaje en la oreja</Text>
				<Switch value={form.marcajeOreja} onValueChange={(v) => update("marcajeOreja", v)} />
			</View>

			<Text style={styles.label}>Número de microchip</Text>
			<TextInput
				style={styles.input}
				value={form.numMicrochip}
				onChangeText={(v) => update("numMicrochip", v)}
				placeholder="Déjalo vacío si no se conoce"
			/>

			<Text style={styles.label}>Observaciones</Text>
			<TextInput
				style={[styles.input, styles.textArea]}
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
	textArea: { minHeight: 90, textAlignVertical: "top" },
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
	switchRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 16,
	},
	switchLabel: { fontSize: 14, color: "#334155", fontWeight: "500" },
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
