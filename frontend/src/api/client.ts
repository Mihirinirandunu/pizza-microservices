import type { Order, OrderStatus, Pizza, PizzaSize, NotificationRecord, User } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const TOKEN_KEY = 'pizza_shop_jwt';
const USER_KEY = 'pizza_shop_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveAuthSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    details?: Array<{ message: string }>;
  };

  if (!res.ok) {
    const detailMsg = data.details?.[0]?.message;
    throw new Error(detailMsg ?? data.error ?? `Request failed (${res.status})`);
  }

  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  getProducts: (includeInactive = false) =>
    request<{ products: Pizza[] }>(
      `/products${includeInactive ? '?includeInactive=true' : ''}`
    ),

  createProduct: (payload: {
    name: string;
    description: string;
    imageUrl?: string;
    category?: string;
    variants: Array<{ size: PizzaSize; price: number; stock: number }>;
  }) =>
    request<{ product: Pizza }>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProduct: (
    id: string,
    payload: {
      name?: string;
      description?: string;
      category?: string;
      isActive?: boolean;
      variants?: Array<{ size: PizzaSize; price: number; stock: number }>;
    }
  ) =>
    request<{ product: Pizza }>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  updateStock: (id: string, size: PizzaSize, stock: number) =>
    request(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ size, stock }),
    }),

  deleteProduct: (id: string) =>
    request<void>(`/products/${id}`, { method: 'DELETE' }),

  placeOrder: (
    items: Array<{ productId: string; size: PizzaSize; quantity: number }>,
    notes?: string
  ) =>
    request<{ message: string; order: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify({ items, notes }),
    }),

  getMyOrders: () => request<{ orders: Order[] }>('/orders/my'),

  getAllOrders: (status?: OrderStatus) =>
    request<{ orders: Order[] }>(
      status ? `/orders?status=${status}` : '/orders'
    ),

  updateOrderStatus: (id: string, status: OrderStatus) =>
    request<{ order: Order }>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getNotifications: () =>
    request<{ notifications: NotificationRecord[] }>('/notifications'),
};
