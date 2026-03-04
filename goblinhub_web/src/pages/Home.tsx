import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

const TIENDA_COORDS = { lat: 29.0847174, lng: -110.9521039 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function Home() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: API_KEY ?? "",
  });

  return (
    <div>
      <h1>Página de Inicio</h1>
      <p style={{ color: "black" }}>Visítanos en: Av Jalisco 8A, Centro, 83000 Hermosillo, Son.</p>
      {!API_KEY ? (
        <p>No se pudo cargar el mapa: falta la API Key de Google Maps.</p>
      ) : isLoaded ? (
        <GoogleMap
          mapContainerStyle={{ width: "600px", height: "400px" }}
          center={TIENDA_COORDS}
          zoom={16}
        >
          <Marker position={TIENDA_COORDS} title="GoblinHub" />
        </GoogleMap>
      ) : (
        <p>Cargando mapa...</p>
      )}
    </div>
  );
}

export default Home;
