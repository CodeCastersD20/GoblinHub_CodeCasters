import api from '../lib/api';

export interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen_url: string;
  stock: number;
}

export const productsService = {
  // Cambiamos '/products' por '/productos'
  getAllProducts: async () => {
    const response = await api.get<Product[]>('/productos');
    return response.data;
  },

  // Cambiamos '/products/${id}' por '/productos/${id}'
  getProductById: async (id: string) => {
    const response = await api.get<Product>(`/productos/${id}`);
    return response.data;
  },

  // Cambiamos '/products/categoria/' por '/productos/categoria/'
  getProductsByCategory: async (categoria: string) => {
    const response = await api.get<Product[]>(`/productos/categoria/${categoria}`);
    return response.data;
  }
};