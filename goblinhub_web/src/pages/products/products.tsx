import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./products.css";
// Ajusta la ruta de importación de tu servicio según tu estructura
import { productsService } from "../../services/products.service"; 
// Importas tu imagen por defecto por si algún producto no tiene imagen en la BD
import defaultImage from "../../assets/images.jpg";

// Actualizamos la interfaz para que coincida con lo que devuelve tu backend
export interface Producto {
  id: string | number;
  nombre: string;
  precio: number;
  imagen_url?: string; // Suele llamarse así en BD, ajusta si es diferente
  imagen?: string;
  popular?: boolean;
  nuevo?: boolean;
  categoria: string;
  descripcion: string;
}

const CATEGORIAS = [
  "Wargames", 
  "Juegos de rol", 
  "Juegos de mesa", 
  "Pinturas", 
  "Accesorios"
];

function ProductsPage() {
  // 1. Nuevos Estados (Req: Carga, Error y Datos reales)
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);

  // 2. Efecto para consumir la API
  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let data;
        // Si hay una categoría seleccionada, llamamos al endpoint de filtro
        if (categoriaActiva) {
          data = await productsService.getProductsByCategory(categoriaActiva);
        } else {
          // Si no, traemos todo el catálogo
          data = await productsService.getAllProducts();
        }
        setProductos(data);
      } catch (err) {
        console.error("Error al cargar productos:", err);
        setError("No pudimos conectar con la base de datos de la Guarida. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, [categoriaActiva]); // Se vuelve a ejecutar si cambias de categoría

  return (
    <div className="product-page">
      <h1 className="products-title">Nuestro inventario</h1>
      <h2 className="products-subtitle">
        Explora nuestra selección de wargames, juegos de rol, juegos de mesa y
        accesorios. Control de stock en tiempo real.
      </h2>

      {/* --- BOTONES DE FILTRO --- */}
      <div className="list-category">
        <button 
          className={`category-button ${!categoriaActiva ? 'active' : ''}`}
          onClick={() => setCategoriaActiva(null)}
          style={{ backgroundColor: !categoriaActiva ? '#4a148c' : '', color: !categoriaActiva ? 'white' : '' }}
        >
          Todos
        </button>

        {CATEGORIAS.map((cat) => (
          <button 
            key={cat}
            className={`category-button ${categoriaActiva === cat ? 'active' : ''}`}
            onClick={() => setCategoriaActiva(cat)}
            // Un pequeño estilo en línea rápido para indicar cuál está activo, 
            // aunque lo ideal es que lo manejes en tu products.css con la clase .active
            style={{ backgroundColor: categoriaActiva === cat ? '#4a148c' : '', color: categoriaActiva === cat ? 'white' : '' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* --- ESTADOS DE CARGA Y ERROR --- */}
      {loading && (
        <div className="loading-container" style={{ textAlign: 'center', padding: '40px' }}>
          <p className="animate-pulse text-xl">Cargando inventario de la guarida...</p>
        </div>
      )}

      {error && (
        <div className="error-container" style={{ textAlign: 'center', color: 'red', padding: '20px' }}>
          <p>{error}</p>
        </div>
      )}

      {/* --- GRID DE PRODUCTOS --- */}
      {!loading && !error && (
        <div className="products-grid">
          {productos.length > 0 ? (
            productos.map((producto) => (
              <Link
                to={`/productos/${producto.id}`}
                key={producto.id}
                className="product-card"
              >
                {producto.popular && <p className="product-popular">Popular</p>}
                {producto.nuevo && <p className="product-nuevo">Nuevo</p>}

                <div className="product-image">
                  {/* Usamos la imagen de la BD o la imagen por defecto si viene vacía */}
                  <img 
                    src={producto.imagen_url || producto.imagen || defaultImage} 
                    alt={producto.nombre} 
                    onError={(e) => { e.currentTarget.src = defaultImage }} // Fallback si la URL está rota
                  />
                </div>

                <p className="product-category">{producto.categoria}</p>
                <h3 className="product-name">{producto.nombre}</h3>
                <p className="product-description">{producto.descripcion}</p>
                <p className="product-price">${producto.precio}</p>
              </Link>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
              <p>No se encontraron productos en esta categoría.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProductsPage;