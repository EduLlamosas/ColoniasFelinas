import { useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";

interface DatePickerFieldProps {
	// Se guarda y se manda al backend como "AAAA-MM-DD" (lo que ya esperaban las mutaciones);
	// el componente solo cambia cómo se elige, no el formato que viaja por la red.
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	minimumDate?: Date;
	maximumDate?: Date;
	// Solo tiene sentido en campos opcionales (p. ej. fecha de nacimiento estimada) - un selector
	// de calendario no deja "borrar" tecleando como sí dejaba el TextInput libre que sustituye.
	clearable?: boolean;
}

// El propio value ("AAAA-MM-DD") interpretado con `new Date(value)` se parsea en UTC y puede
// mostrar el día anterior según la zona horaria del dispositivo - construir la fecha a partir de
// sus partes numéricas la ancla en el huso horario local, que es como el usuario la eligió.
function parseIsoDate(value: string): Date | null {
	const partes = value.split("-").map(Number);
	if (partes.length !== 3 || partes.some((n) => Number.isNaN(n))) return null;
	const [anio, mes, dia] = partes;
	return new Date(anio, mes - 1, dia);
}

function toIsoDate(date: Date): string {
	const anio = date.getFullYear();
	const mes = String(date.getMonth() + 1).padStart(2, "0");
	const dia = String(date.getDate()).padStart(2, "0");
	return `${anio}-${mes}-${dia}`;
}

export function DatePickerField({
	value,
	onChange,
	placeholder = "Selecciona una fecha",
	minimumDate,
	maximumDate,
	clearable = false,
}: DatePickerFieldProps) {
	const [showPicker, setShowPicker] = useState(false);
	const selectedDate = parseIsoDate(value);

	function handleChange(event: DateTimePickerEvent, date?: Date) {
		// En Android el diálogo nativo se cierra solo (sea "set" o "dismissed"); en iOS el
		// picker "inline" se queda montado en la pantalla, así que solo lo ocultamos en Android.
		if (Platform.OS === "android") {
			setShowPicker(false);
		}
		if (event.type === "dismissed" || !date) return;
		onChange(toIsoDate(date));
	}

	return (
		<View>
			<TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
				<Text style={selectedDate ? styles.valueText : styles.placeholderText}>
					{selectedDate ? selectedDate.toLocaleDateString("es-ES") : placeholder}
				</Text>
			</TouchableOpacity>

			{clearable && selectedDate && (
				<TouchableOpacity onPress={() => onChange("")}>
					<Text style={styles.clearText}>Quitar fecha</Text>
				</TouchableOpacity>
			)}

			{showPicker && (
				<DateTimePicker
					value={selectedDate ?? maximumDate ?? new Date()}
					mode="date"
					display={Platform.OS === "ios" ? "inline" : "calendar"}
					onChange={handleChange}
					minimumDate={minimumDate}
					maximumDate={maximumDate}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	input: {
		borderWidth: 1,
		borderColor: "#cbd5e1",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		backgroundColor: "#fff",
		justifyContent: "center",
		minHeight: 42,
	},
	valueText: { fontSize: 15, color: "#0f172a" },
	placeholderText: { fontSize: 15, color: "#94a3b8" },
	clearText: { fontSize: 12, color: "#dc2626", fontWeight: "600", marginTop: 6, alignSelf: "flex-start" },
});
