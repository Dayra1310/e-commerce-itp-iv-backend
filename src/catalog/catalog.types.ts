export interface Category {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: string | null;
  categoriaPadreId: number | null;
}

export interface Product {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: string;
  sku: string | null;
  stock: number | null;
  peso: string | null;
  tamano: string | null;
  estado: string | null;
  categoriaId: number | null;
}

export interface StandardResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProductQuery {
  category?: string;
}
