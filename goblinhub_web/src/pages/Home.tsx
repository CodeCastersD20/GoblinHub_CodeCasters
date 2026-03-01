import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

const TIENDA_COORDS = { lat: 29.0847174, lng: -110.9521039 };

function Home() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
  });

  return (
    <div>
      <h1>Página de Inicio</h1>
      <p style={{ color: "black" }}>Visítanos en: Av Jalisco 8A, Centro, 83000 Hermosillo, Son.</p>
      {isLoaded ? (
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
