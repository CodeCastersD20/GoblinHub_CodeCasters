import { useState } from "react";
import "./crearProductos.css";

export interface Producto {
  id: number;

  nombre: string;
  marca?: string;

  categoria: "WARGAMES" | "ROL" | "MESA" | "PINTURA" | "ACCESORIOS";

  descripcion?: string;

  precio: number;
  precio_original?: number;

  stock: number;
  stock_minimo: number;

  imagen_url?: string;

  popular: boolean;
  es_nuevo: boolean;
  activo: boolean;
}

interface Props {
  onClose: () => void;
  onCrear: (producto: Producto) => void;
}

function CrearProductos({ onClose, onCrear }: Props) {

  const [form, setForm] = useState<Omit<Producto, "id">>({

    nombre: "",
    marca: "",

    categoria: "WARGAMES",

    descripcion: "",

    precio: 0,
    precio_original: undefined,

    stock: 0,
    stock_minimo: 2,

    imagen_url: "",

    popular: false,
    es_nuevo: true,
    activo: true,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {

    const { name, value, type } = e.target;

    if (type === "checkbox") {

      const checked = (e.target as HTMLInputElement).checked;

      setForm({
        ...form,
        [name]: checked,
      });

    } else {

      setForm({
        ...form,
        [name]: type === "number" ? Number(value) : value,
      });

    }

  };

  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    if (!form.nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    if (form.precio < 0) {
      alert("El precio debe ser mayor o igual a 0");
      return;
    }

    const nuevoProducto: Producto = {
      id: Date.now(),
      ...form,
    };

    onCrear(nuevoProducto);
    onClose();

  };

  return (

    <div className="modal-overlay">

      <div className="modal">

        <h2>Crear Producto</h2>

        <form onSubmit={handleSubmit} className="form-producto">

          <label>Nombre *</label>
          <input
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
          />

          <label>Marca</label>
          <input
            type="text"
            name="marca"
            value={form.marca}
            onChange={handleChange}
          />

          <label>Categoría *</label>
          <select
            name="categoria"
            value={form.categoria}
            onChange={handleChange}
          >
            <option value="WARGAMES">WARGAMES</option>
            <option value="ROL">ROL</option>
            <option value="MESA">MESA</option>
            <option value="PINTURA">PINTURA</option>
            <option value="ACCESORIOS">ACCESORIOS</option>
          </select>

          <label>Descripción</label>
          <textarea
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
          />

          <label>Precio *</label>
          <input
            type="number"
            name="precio"
            min="0"
            value={form.precio}
            onChange={handleChange}
            required
          />

          <label>Precio original</label>
          <input
            type="number"
            name="precio_original"
            min="0"
            value={form.precio_original ?? ""}
            onChange={handleChange}
          />

          <label>Stock</label>
          <input
            type="number"
            name="stock"
            min="0"
            value={form.stock}
            onChange={handleChange}
          />

          <label>Stock mínimo</label>
          <input
            type="number"
            name="stock_minimo"
            min="0"
            value={form.stock_minimo}
            onChange={handleChange}
          />

          <label>URL de imagen</label>
          <input
            type="text"
            name="imagen_url"
            value={form.imagen_url}
            onChange={handleChange}
          />

          <div className="checkbox-group">

            <label>
              <input
                type="checkbox"
                name="popular"
                checked={form.popular}
                onChange={handleChange}
              />
              Popular
            </label>

            <label>
              <input
                type="checkbox"
                name="es_nuevo"
                checked={form.es_nuevo}
                onChange={handleChange}
              />
              Es nuevo
            </label>

            <label>
              <input
                type="checkbox"
                name="activo"
                checked={form.activo}
                onChange={handleChange}
              />
              Activo
            </label>

          </div>

          <div className="form-buttons">

            <button
              type="button"
              onClick={onClose}
              className="btn-cancelar"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn-guardar"
            >
              Crear Producto
            </button>

          </div>

        </form>

      </div>

    </div>

  );

}

export default CrearProductos;