import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'gympass_auth_token';
const USER_KEY = 'gympass_user';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveUser(user: any): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<any | null> {
  const userStr = await SecureStore.getItemAsync(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

export async function removeUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function logout(): Promise<void> {
  await removeToken();
  await removeUser();
}
