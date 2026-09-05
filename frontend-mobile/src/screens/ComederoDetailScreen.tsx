import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@apollo/client/react";
import { COMEDEROS_QUERY } from "../features/comederos/comederos.graphql";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { getErrorMessage } from "../lib/graphqlErrors";
import { resolveMediaUrl } from "../lib/config";
import type { Colonia, Comedero } from "../types/graphql";
import type { ComederosStackScreenProps } from "../navigation/types";

type Props = ComederosStackScreenProps<"ComederoDetail">;

export function ComederoDetailScreen({ route, navigation }: Props) {
	const { id } = route.params;
	const { data, loading, error } = useQuery<{ comederos: Comedero[] }>(COMEDEROS_QUERY);
	const { data: coloniasData } = useQuery<{ colonias: Colonia[] }>(COLONIAS_QUERY);
	const comedero = data?.comederos.find((c) => c.id === id);
	const colonia = coloniasData?.colonias.find((c) => c.id === String(comedero?.coloniaId));

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
});
