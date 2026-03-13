import { useState } from "react";
import "./productosAdmin.css";

import CrearProductos from "./crearProductos/crearProductos";
import EditarProducto from "./editarProductos/editarProductos";

import type { Producto } from "./crearProductos/crearProductos";

const productosMock: Producto[] = [
  {
    id: 1,
    nombre: "Space Marine Battle Sector",
    marca: "Focus",
    categoria: "WARGAMES",
    descripcion: "Juego basado en Warhammer 40k",

    precio: 1200,
    precio_original: 1500,

    stock: 10,
    stock_minimo: 2,

    imagen_url:
      "https://images.unsplash.com/photo-1606813907291-d86efa9b94db",

    popular: true,
    es_nuevo: false,
    activo: true,
  },
  {
    id: 2,
    nombre: "Set Dados D&D",
    marca: "Chessex",
    categoria: "ROL",
    descripcion: "Set de dados para rol",

    precio: 250,
    precio_original: undefined,

    stock: 25,
    stock_minimo: 2,

    imagen_url:
      "https://images.unsplash.com/photo-1611606063065-ee7946f0787a",

    popular: false,
    es_nuevo: true,
    activo: true,
  },
];

function ProductosAdmin() {

  const [productos, setProductos] = useState<Producto[]>(productosMock);

  const [mostrarCrear, setMostrarCrear] = useState(false);

  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);


  const crearProducto = (producto: Producto) => {
    setProductos([...productos, producto]);
  };


  const editarProducto = (productoActualizado: Producto) => {

    setProductos(
      productos.map((p) =>
        p.id === productoActualizado.id ? productoActualizado : p
      )
    );

  };


  const eliminarProducto = (id: number) => {

    setProductos(productos.filter((p) => p.id !== id));

  };


  return (

    <div className="productos-admin-container">

      <div className="productos-header">

        <h1>Administración de Productos</h1>

        <button
          className="btn-crear-producto"
          onClick={() => setMostrarCrear(true)}
        >
          + Crear Producto
        </button>

      </div>


      <div className="productos-grid">

        {productos.map((producto) => (

          <div
            key={producto.id}
            className="producto-card"
          >

            <img
              src={producto.imagen_url}
              alt={producto.nombre}
            />

            <div className="producto-info">

              <h3>{producto.nombre}</h3>

              <p>{producto.categoria}</p>

              <p>${producto.precio}</p>

              {producto.stock === 0 && (
                <span className="sin-stock">
                  Sin stock
                </span>
              )}

              <div className="producto-botones">

                <button
                  className="btn-editar"
                  onClick={() => setProductoEditar(producto)}
                >
                  Editar
                </button>

                <button
                  className="btn-eliminar"
                  onClick={() => eliminarProducto(producto.id)}
                >
                  Eliminar
                </button>

              </div>

            </div>

          </div>

        ))}

      </div>


      {mostrarCrear && (

        <CrearProductos
          onClose={() => setMostrarCrear(false)}
          onCrear={crearProducto}
        />

      )}


      {productoEditar && (

        <EditarProducto
          producto={productoEditar}
          onClose={() => setProductoEditar(null)}
          onGuardar={editarProducto}
        />

      )}

    </div>

  );

}

export default ProductosAdmin;