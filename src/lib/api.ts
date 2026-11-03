import axios from "axios";
import {
  Equipment,
  PendingOp,
  cacheEquipment,
  clearPendingOperations,
  generateClientId,
  getCachedEquipment,
  getPendingOperations,
  queueOperation,
  saveEquipmentLocal,
  removeEquipmentLocal,
} from "./offlineStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------- Авторизация ----------
export async function login(username: string, password: string): Promise<void> {
  const params = new URLSearchParams();
  params.append("username", username);
  params.append("password", password);

  const { data } = await api.post("/api/auth/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  localStorage.setItem("token", data.access_token);
}

export function logout(): void {
  localStorage.removeItem("token");
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("token");
}

// ---------- Оборудование ----------
export async function fetchEquipment(): Promise<Equipment[]> {
  if (!navigator.onLine) {
    return getCachedEquipment();
  }
  try {
    const { data } = await api.get<Equipment[]>("/api/equipment/");
    await cacheEquipment(data);
    return data;
  } catch (e) {
    console.warn("Не удалось получить с сервера, берём из кэша", e);
    return getCachedEquipment();
  }
}

export async function createEquipment(
  payload: Omit<Equipment, "id" | "client_id">
): Promise<Equipment> {
  const client_id = generateClientId();
  const local: Equipment = { ...payload, client_id, id: undefined };

  await saveEquipmentLocal(local);

  if (navigator.onLine) {
    try {
      const { data } = await api.post<Equipment>("/api/equipment/", {
        ...payload,
        client_id,
      });
      await saveEquipmentLocal(data);
      return data;
    } catch (e) {
      console.warn("Сервер недоступен, ставим в очередь", e);
    }
  }

  await queueOperation({
    op_type: "create",
    entity: "equipment",
    client_id,
    data: payload,
  });
  return local;
}

export async function updateEquipment(
  clientIdOrServerId: string | number,
  payload: Partial<Equipment>
): Promise<void> {
  const cached = await getCachedEquipment();
  const existing = cached.find(
    (e) => e.id === clientIdOrServerId || e.client_id === clientIdOrServerId
  );
  if (existing) {
    const updated = { ...existing, ...payload };
    await saveEquipmentLocal(updated);
  }

  if (navigator.onLine && typeof clientIdOrServerId === "number") {
    try {
      await api.put(`/api/equipment/${clientIdOrServerId}`, payload);
      return;
    } catch (e) {
      console.warn("Сервер недоступен, ставим update в очередь", e);
    }
  }

  await queueOperation({
    op_type: "update",
    entity: "equipment",
    client_id: String(clientIdOrServerId),
    data: payload,
  });
}

export async function deleteEquipment(
  idOrClientId: string | number
): Promise<void> {
  await removeEquipmentLocal(idOrClientId);

  if (navigator.onLine && typeof idOrClientId === "number") {
    try {
      await api.delete(`/api/equipment/${idOrClientId}`);
      return;
    } catch (e) {
      console.warn("Сервер недоступен, ставим delete в очередь", e);
    }
  }

  await queueOperation({
    op_type: "delete",
    entity: "equipment",
    client_id: String(idOrClientId),
    data: {},
  });
}

// ---------- Синхронизация ----------
export async function syncPendingChanges(): Promise<void> {
  const ops: PendingOp[] = await getPendingOperations();
  if (ops.length === 0) return;

  try {
    const { data } = await api.post("/api/sync/push", ops);
    await clearPendingOperations(ops.map((o) => o.id));
    if (data.equipment) {
      await cacheEquipment(data.equipment);
    }
    console.log(`Синхронизировано операций: ${ops.length}`);
  } catch (e) {
    console.warn("Синхронизация не удалась, попробуем позже", e);
  }
}

window.addEventListener("online", () => {
  console.log("Интернет вернулся — синхронизируем...");
  syncPendingChanges();
});

export async function pullChanges(): Promise<Equipment[]> {
  const { data } = await api.get<{ equipment: Equipment[] }>("/api/sync/pull");
  await cacheEquipment(data.equipment);
  return data.equipment;
}