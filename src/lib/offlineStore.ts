import localforage from "localforage";

export const equipmentStore = localforage.createInstance({
  name: "karier",
  storeName: "equipment",
});

export const pendingOpsStore = localforage.createInstance({
  name: "karier",
  storeName: "pending_ops",
});

export interface PendingOp {
  id: string;
  op_type: "create" | "update" | "delete";
  entity: "equipment" | "defect" | "media";
  client_id: string;
  data: any;
  timestamp: string;
}

export interface Equipment {
  id?: number;
  client_id?: string;
  name: string;
  type?: string;
  status?: string;
  description?: string;
  x_coord: number;
  y_coord: number;
  updated_at?: string;
}

export function generateClientId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function queueOperation(
  op: Omit<PendingOp, "id" | "timestamp">
): Promise<PendingOp> {
  const full: PendingOp = {
    ...op,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  await pendingOpsStore.setItem(full.id, full);
  return full;
}

export async function getPendingOperations(): Promise<PendingOp[]> {
  const ops: PendingOp[] = [];
  await pendingOpsStore.iterate((value: PendingOp) => {
    ops.push(value);
  });
  return ops.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function clearPendingOperations(ids: string[]): Promise<void> {
  for (const id of ids) {
    await pendingOpsStore.removeItem(id);
  }
}

export async function cacheEquipment(list: Equipment[]): Promise<void> {
  await equipmentStore.clear();
  for (const item of list) {
    const key = String(item.id ?? item.client_id);
    await equipmentStore.setItem(key, item);
  }
}

export async function getCachedEquipment(): Promise<Equipment[]> {
  const result: Equipment[] = [];
  await equipmentStore.iterate((value: Equipment) => {
    result.push(value);
  });
  return result;
}

export async function saveEquipmentLocal(item: Equipment): Promise<void> {
  const key = String(item.id ?? item.client_id);
  await equipmentStore.setItem(key, item);
}

export async function removeEquipmentLocal(
  key: string | number
): Promise<void> {
  await equipmentStore.removeItem(String(key));
}