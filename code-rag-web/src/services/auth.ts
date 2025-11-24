import apiClient from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    roles: string[];
  };
}

export interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
}

/**
 * 用户注册
 */
export async function register(
  data: RegisterRequest,
): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    '/api/v1/auth/register',
    data,
  );
  return response as unknown as AuthResponse;
}

/**
 * 用户登录
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    '/api/v1/auth/login',
    data,
  );
  return response as unknown as AuthResponse;
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<UserInfo> {
  const response = await apiClient.get<UserInfo>('/api/v1/auth/me');
  return response as unknown as UserInfo;
}

/**
 * 用户登出
 */
export async function logout(): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    '/api/v1/auth/logout',
  );
  return response as unknown as { success: boolean; message: string };
}

/**
 * 保存 token 到 localStorage
 */
export function saveToken(token: string): void {
  localStorage.setItem('token', token);
}

/**
 * 从 localStorage 获取 token
 */
export function getToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * 从 localStorage 删除 token
 */
export function removeToken(): void {
  localStorage.removeItem('token');
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

