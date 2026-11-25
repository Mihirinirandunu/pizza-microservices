export type Role = 'CUSTOMER' | 'ADMIN';
export type PizzaSize = 'MEDIUM' | 'LARGE' | 'XL';
export type OrderStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface PizzaVariant {
  id: string;
  pizzaId: string;
  size: PizzaSize;
  price: number;
  stock: number;
}

export interface Pizza {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  isActive: boolean;
  variants: PizzaVariant[];
}

export interface CartItem {
  productId: string;
  pizzaName: string;
  imageUrl: string;
  size: PizzaSize;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  pizzaName: string;
  size: PizzaSize;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  customerEmail: string;
  status: OrderStatus;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface NotificationRecord {
  id: string;
  orderId: string;
  eventType: string;
  recipient: string;
  subject: string;
  message: string;
  status: 'SENT' | 'FAILED';
  errorMessage: string | null;
  createdAt: string;
}
