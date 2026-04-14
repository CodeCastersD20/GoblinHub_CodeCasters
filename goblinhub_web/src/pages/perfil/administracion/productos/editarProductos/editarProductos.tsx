import { useState } from "react";
import "../crearProductos/crearProductos.css";
import type { Producto } from "../crearProductos/crearProductos";

interface Props {
  producto: Producto;
  onClose: () => void;
  onGuardar: (producto: Producto) => void;
}

function EditarProducto({ producto, onClose, onGuardar }: Props) {

  const [formData, setFormData] = useState<Producto>(producto);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {

    const { name, value, type } = e.target;

    if (type === "checkbox") {

      const checked = (e.target as HTMLInputElement).checked;

      setFormData({
        ...formData,
        [name]: checked,
      });

      return;
    }

    setFormData({
      ...formData,
      [name]:
        name === "precio" ||
        name === "precio_original" ||
        name === "stock" ||
        name === "stock_minimo"
          ? Number(value)
          : value,
    });

  };

  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    if (formData.precio < 0) {
      alert("El precio no puede ser negativo");
      return;
    }

    onGuardar(formData);

    onClose();

  };

  return (

    <div className="modal-overlay">

      <div className="modal">

        <button
          className="close-btn"
          onClick={onClose}
        >
          ✕
        </button>

        <h2>Editar Producto</h2>

        <form
          className="modal-form"
          onSubmit={handleSubmit}
        >

          {/* NOMBRE */}

          <label>Nombre *</label>
          <input
            name="nombre"
            value={formData.nombre}
            required
            onChange={handleChange}
          />

          {/* MARCA */}

          <label>Marca</label>
          <input
            name="marca"
            value={formData.marca || ""}
            onChange={handleChange}
          />

          {/* CATEGORIA */}

          <label>Categoría *</label>

          <select
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
          >

            <option value="WARGAMES">WARGAMES</option>
            <option value="ROL">ROL</option>
            <option value="MESA">MESA</option>
            <option value="PINTURA">PINTURA</option>
            <option value="ACCESORIOS">ACCESORIOS</option>

          </select>

          {/* DESCRIPCION */}

          <label>Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion || ""}
            onChange={handleChange}
          />

          {/* PRECIO */}

          <label>Precio *</label>
          <input
            type="number"
            min="0"
            name="precio"
            value={formData.precio}
            required
            onChange={handleChange}
          />

          {/* PRECIO ORIGINAL */}

          <label>Precio original</label>
          <input
            type="number"
            min="0"
            name="precio_original"
            value={formData.precio_original || ""}
            onChange={handleChange}
          />

          {/* STOCK */}

          <label>Stock</label>
          <input
            type="number"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
          />

          {/* STOCK MINIMO */}

          <label>Stock mínimo</label>
          <input
            type="number"
            name="stock_minimo"
            value={formData.stock_minimo}
            onChange={handleChange}
          />

          {/* IMAGEN */}

          <label>URL de imagen</label>
          <input
            type="url"
            name="imagen_url"
            value={formData.imagen_url || ""}
            onChange={handleChange}
          />

          {/* CHECKBOXES */}

          <label>
            <input
              type="checkbox"
              name="popular"
              checked={formData.popular}
              onChange={handleChange}
            />
            Popular
          </label>

          <label>
            <input
              type="checkbox"
              name="es_nuevo"
              checked={formData.es_nuevo}
              onChange={handleChange}
            />
            Es nuevo
          </label>

          <label>
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
            />
            Activo
          </label>

          {/* BOTONES */}

          <div className="modal-buttons">

            <button className="save-btn">
              Guardar cambios
            </button>

            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
            >
              Cancelar
            </button>

          </div>

        </form>

      </div>

    </div>

  );

}

export default EditarProducto;