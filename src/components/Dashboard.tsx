import React, { useState } from "react";
import KarierMap from "../components/KarierMap";
import { logout, syncPendingChanges } from "../lib/api";

interface Props {
  onLogout: () => void;
}

const Dashboard: React.FC<Props> = ({ onLogout }) => {
  const [canEdit, setCanEdit] = useState(true);

  return (
    <div>
      <div
        style={{
          padding: 10,
          background: "#222",
          color: "white",
          display: "flex",
          gap: 12,
          alignItems: "center",
          fontFamily: "sans-serif",
        }}
      >
        <strong>Karier App</strong>
        <label style={{ marginLeft: "auto" }}>
          <input
            type="checkbox"
            checked={canEdit}
            onChange={(e) => setCanEdit(e.target.checked)}
          />{" "}
          Режим редактирования
        </label>
        <button onClick={() => syncPendingChanges()}>Синхронизировать</button>
        <button
          onClick={() => {
            logout();
            onLogout();
          }}
        >
          Выйти
        </button>
      </div>
      <KarierMap canEdit={canEdit} />
    </div>
  );
};

export default Dashboard;