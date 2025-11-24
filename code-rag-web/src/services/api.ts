import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

// API 基础 URL，从环境变量读取
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// 创建 Axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 用于添加 JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => {
    // 如果后端返回的是统一格式 { code, message, data }
    // 直接返回 data 部分
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data;
    }
    return response.data;
  },
  (error: AxiosError) => {
    // 统一错误处理
    if (error.response) {
      // 服务器返回了错误响应
      const { status, data } = error.response;
      const errorMessage =
        (data as { message?: string })?.message || error.message || '请求失败';

      // 根据状态码处理不同错误
      switch (status) {
        case 401:
          // 未授权，清除 token 并跳转到登录页
          localStorage.removeItem('token');
          if (window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
          break;
        case 403:
          // 禁止访问
          console.error('无权限访问');
          break;
        case 404:
          // 资源不存在
          console.error('资源不存在');
          break;
        case 500:
          // 服务器错误
          console.error('服务器错误');
          break;
        default:
          console.error('请求失败:', errorMessage);
      }

      return Promise.reject({
        status,
        message: errorMessage,
        data: (data as { data?: unknown })?.data,
      });
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('网络错误，请检查网络连接');
      return Promise.reject({
        status: 0,
        message: '网络错误，请检查网络连接',
      });
    } else {
      // 其他错误
      console.error('请求配置错误:', error.message);
      return Promise.reject({
        status: -1,
        message: error.message || '请求配置错误',
      });
    }
  },
);

export default apiClient;

