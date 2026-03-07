import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./products.css";
import  images  from "../../assets/images.jpg";

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imagen: string;
  popular?: boolean;
  nuevo?: boolean;
  categoria: string;
  descripcion: string;
}

function ProductsPage() {
  const [productos, setProductos] = useState<Producto[]>([]);

  useEffect(() => {
    const data: Producto[] = [
      {
        id: 1,
        nombre: "Space Marine Battle Sector",
        precio: 1200,
        imagen: images,
        popular: true,
        categoria: "Wargames",
        descripcion: "Juego de estrategia basado en el universo de Warhammer 40K.",
      },
      {
        id: 2,
        nombre: "Tyranid Prime",
        precio: 800,
        imagen: "https://via.placeholder.com/400x300",
        categoria: "Wargames",
        descripcion: "Miniatura del comandante Tyranid para Warhammer 40K.",
      },
      {
        id: 3,
        nombre: "Roboute Guilliman",
        precio: 3500,
        imagen: "https://via.placeholder.com/400x300",
        nuevo: true,
        categoria: "Wargames",
        descripcion: "Primarca de los Ultramarines para Warhammer 40K.",
      },
      {
        id: 4,
        nombre: "Rey silente",
        precio: 1200,
        imagen: "https://via.placeholder.com/400x300",
        popular: true,
        categoria: "Wargames",
        descripcion: "Gran señor de los necrones, dinastia Sharekan",
      },
    ];

    setProductos(data);
  }, []);

  return (
    <div className="product-page">
      <h1 className="products-title">Nuestro inventario</h1>
      <h2 className="products-subtitle">Explora nuestra selección de wargames, juegos de rol, juegos de mesa y accesorios. Control de stock en tiempo real. </h2>
      <div className="list-category">
        <button className="category-button">Wargames</button>
        <button className="category-button">Juegos de rol</button>
        <button className="category-button">Juegos de mesa</button>
        <button className="category-button">Pinturas</button>
        <button className="category-button">Accesorios</button>
      </div>
      <div className="products-grid">
        {productos.map((producto) => (
          <Link
            to={`/productos/${producto.id}`}
            key={producto.id}
            className="product-card"
          >
            {producto.popular && (
              <p className="product-popular">Popular</p>
            )}

            {producto.nuevo && (
              <p className="product-nuevo">Nuevo</p>
            )}

            <div className="product-image">
              <img src={producto.imagen} alt={producto.nombre} />
            </div>

            <p className="product-category">{producto.categoria}</p>

            <h3 className="product-name">{producto.nombre}</h3>

            <p className="product-description">
              {producto.descripcion}
            </p>

            <p className="product-price">
              ${producto.precio}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default ProductsPage;