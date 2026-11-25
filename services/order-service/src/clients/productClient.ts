import axios, { AxiosError } from 'axios';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

export type PizzaSize = 'MEDIUM' | 'LARGE' | 'XL';

export interface ProductVariantDto {
  id: string;
  pizzaId: string;
  size: PizzaSize;
  price: number;
  stock: number;
}

export interface ProductDto {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  variants: ProductVariantDto[];
}

export interface ProductClient {
  getProduct(productId: string): Promise<ProductDto>;
  adjustStock(
    productId: string,
    size: PizzaSize,
    delta: number
  ): Promise<ProductVariantDto>;
}

export class HttpProductClient implements ProductClient {
  private readonly baseUrl = env.productServiceUrl;

  async getProduct(productId: string): Promise<ProductDto> {
    try {
      const res = await axios.get<{ product: ProductDto }>(
        `${this.baseUrl}/products/${productId}`,
        { timeout: 5000 }
      );
      return res.data.product;
    } catch (err) {
      throw this.mapAxiosError(err, `Product ${productId} unavailable`);
    }
  }

  async adjustStock(
    productId: string,
    size: PizzaSize,
    delta: number
  ): Promise<ProductVariantDto> {
    try {
      const res = await axios.patch<{ variant: ProductVariantDto }>(
        `${this.baseUrl}/products/${productId}/stock`,
        { size, delta },
        {
          timeout: 5000,
          headers: {
            'x-internal-key': env.internalApiKey,
          },
        }
      );
      return res.data.variant;
    } catch (err) {
      throw this.mapAxiosError(err, 'Failed to update product inventory');
    }
  }

  private mapAxiosError(err: unknown, fallbackMessage: string): AppError {
    if (err instanceof AxiosError && err.response) {
      const data = err.response.data as { error?: string } | undefined;
      return new AppError(
        err.response.status,
        data?.error ?? fallbackMessage
      );
    }
    return new AppError(503, 'Product service is temporarily unavailable');
  }
}
