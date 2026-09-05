import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "colonias.accessToken";

export function getStoredToken(): Promise<string | null> {
	return AsyncStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): Promise<void> {
	return AsyncStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): Promise<void> {
	return AsyncStorage.removeItem(TOKEN_KEY);
}
