import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@apollo/client/react";
import { GATOS_QUERY } from "../features/gatos/gatos.graphql";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { getErrorMessage } from "../lib/graphqlErrors";
import { resolveMediaUrl } from "../lib/config";
import { ESTADO_CER_LABELS, SEXO_LABELS } from "../lib/enums";
import type { Colonia, Gato } from "../types/graphql";
import type { GatosStackScreenProps } from "../navigation/types";

type Props = GatosStackScreenProps<"GatoDetail">;

export function GatoDetailScreen({ route, navigation }: Props) {
	const { id } = route.params;
	const { data, loading, error } = useQuery<{ gatos: Gato[] }>(GATOS_QUERY);
	const { data: coloniasData } = useQuery<{ colonias: Colonia[] }>(COLONIAS_QUERY);
	const gato = data?.gatos.find((g) => g.id === id);
	const colonia = coloniasData?.colonias.find((c) => c.id === String(gato?.coloniaId));

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
				<TouchableOpacity onPress={() => navigation.navigate("GatoForm", { id: gato.id })}>
					<Text style={styles.edit}>Editar</Text>
				</TouchableOpacity>
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
});
