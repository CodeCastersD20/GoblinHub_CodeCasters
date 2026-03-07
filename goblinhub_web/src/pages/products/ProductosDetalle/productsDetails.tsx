import { useParams } from "react-router-dom";

function ProductosDetalle() {

  const { id } = useParams();

  return (
    <div>
      <h1>Detalle del producto</h1>
      <p>ID del producto: {id}</p>
    </div>
  );
}

export default ProductosDetalle;