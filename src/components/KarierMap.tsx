import React, { useEffect, useState } from "react";
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L, { LatLngBoundsExpression, LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { Equipment, fetchEquipment, createEquipment } from "../lib/api";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ⚠️ У вас JPG, поэтому .jpg. Если переименуете в .png — поменяйте здесь.
const MAP_IMAGE_URL = "/karier-map.jpg";
const MAP_WIDTH = Number(import.meta.env.VITE_MAP_WIDTH) || 2048;
const MAP_HEIGHT = Number(import.meta.env.VITE_MAP_HEIGHT) || 1152;

const bounds: LatLngBoundsExpression = [
  [0, 0],
  [MAP_HEIGHT, MAP_WIDTH],
];

interface Props {
  canEdit: boolean;
}

const ClickHandler: React.FC<{
  canEdit: boolean;
  onAdd: (x: number, y: number) => void;
}> = ({ canEdit, onAdd }) => {
  useMapEvents({
    click(e) {
      if (!canEdit) return;
      onAdd(e.latlng.lng, e.latlng.lat);
    },
  });
  return null;
};

const KarierMap: React.FC<Props> = ({ canEdit }) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const list = await fetchEquipment();
    setEquipment(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (x: number, y: number) => {
    const name = window.prompt("Название объекта:");
    if (!name) return;
    const type = window.prompt("Тип (Экскаватор, Насос, Буровая и т.д.):") || "";

    const created = await createEquipment({
      name,
      type,
      x_coord: Math.round(x),
      y_coord: Math.round(y),
    });
    setEquipment((prev) => [...prev, created]);
  };

  const getPosition = (eq: Equipment): LatLngTuple => [eq.y_coord, eq.x_coord];

  return (
    <div style={{ height: "calc(100vh - 50px)", width: "100%", position: "relative" }}>
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        minZoom={-2}
        maxZoom={4}
        style={{ height: "100%", width: "100%" }}
      >
        <ImageOverlay url={MAP_IMAGE_URL} bounds={bounds} />
        <ClickHandler canEdit={canEdit} onAdd={handleAdd} />
        {equipment.map((eq, idx) => (
          <Marker key={eq.id ?? eq.client_id ?? idx} position={getPosition(eq)}>
            <Popup>
              <strong>{eq.name}</strong>
              <br />
              Тип: {eq.type || "—"}
              <br />
              Статус: {eq.status || "—"}
              <br />
              Координаты: ({eq.x_coord}, {eq.y_coord})
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "white",
            padding: 8,
          }}
        >
          Загрузка...
        </div>
      )}
    </div>
  );
};

export default KarierMap;