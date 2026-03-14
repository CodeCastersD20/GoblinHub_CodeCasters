import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { productsService } from "../../../services/products.service";

// Definimos la interfaz para que TypeScript esté feliz
interface Product {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  descripcion: string;
  imagen_url: string;
  stock: number;
}

const ProductosDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (id) {
          const data = await productsService.getProductById(id);
          setProduct(data);
        }
      } catch (error) {
        console.error("Error al cargar el detalle:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <p>Revisando los pergaminos de inventario...</p>;
  if (!product) return <p>Producto no encontrado.</p>;

  return (
    <div className="product-detail-container">
      <h2>Detalle del producto</h2>
      <p>ID del producto: {product.id}</p>
      <h3>{product.nombre}</h3>
      <p>Precio: ${product.precio}</p>
      {/* Resto de tu UI */}
    </div>
  );
};

// ESTA LÍNEA es la que resuelve el error "has no default export"
export default ProductosDetalle;