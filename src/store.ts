import { create } from 'zustand'
import { db } from './firebase'
import { ref, onValue, set as firebaseSet, push, remove, update } from 'firebase/database'

export interface Yacheyka {
  id: string
  number: number
  name: string
  description: string
  rlnd: string
  status: 'вкл' | 'выкл'
  grounding: boolean
  fiderName?: string
}

export interface BKRU {
  id: string
  name: string
  karierId: string
  yacheykas: Yacheyka[]
  sectionBreaker: boolean
}

export interface Equipment {
  id: string
  type: string
  name: string
  karierId: string
  bkruId: string
  yacheykaId: string
  opora?: string
  rlnd?: string
  model?: string
  power?: string
  location?: string
  status?: 'вкл' | 'выкл'
  photoUrl?: string
  installedAtName?: string
  installedAtType?: string
  installedAtId?: string
  cableId?: string
  cableName?: string
  connectionType?: 'air' | 'cable'
  baseType?: 'main' | 'reserve'
}

export interface Cable {
  id: string
  name: string
  length: number
  fromYacheykaId: string
  toEquipmentId: string
  status: string
}

export interface ReserveItem {
  id: string
  type: string
  name: string
  model?: string
  power?: string
  length?: number
  location?: string
  status?: 'вкл' | 'выкл'
  opora?: string
  rlnd?: string
  cableType?: 'main' | 'reserve'
}

export interface KSR {
  id: string
  name: string
  number?: string
  type: string
  location: string
  cableId?: string
  cableName?: string
}

export interface LightingMast {
  id: string
  name: string
  type: 'electric' | 'diesel'
  location: string
  status: 'active' | 'inactive' | 'maintenance'
  power?: string
  fuelLevel?: number
  notes?: string
  createdAt: number
}

export interface Connection {
  id: string
  fromType: string
  fromId: string
  fromName: string
  toType: string
  toId: string
  toName: string
  cableId?: string
  cableName?: string
}

export interface Log {
  id: string
  action: string
  user: string
  timestamp: number
  details: any
}

interface AppState {
  loading: boolean
  equipment: Equipment[]
  cables: Cable[]
  reserve: ReserveItem[]
  ksr: KSR[]
  lightingMasts: LightingMast[]
  logs: Log[]
  bkruList: BKRU[]
  currentUser: string | null
  loadData: () => void
  setCurrentUser: (name: string | null) => void
  addEquipment: (eq: any) => Promise<void>
  updateEquipment: (id: string, data: any) => Promise<void>
  deleteEquipment: (id: string) => Promise<void>
  updateEquipmentStatus: (id: string, status: 'вкл' | 'выкл') => Promise<void>
  updateEquipmentPhoto: (id: string, photoUrl: string) => Promise<void>
  returnToReserve: (id: string, equipmentData: any) => Promise<void>
  addCable: (cable: any) => Promise<void>
  deleteCable: (id: string) => Promise<void>
  addReserveItem: (item: any) => Promise<void>
  deleteReserveItem: (id: string) => Promise<void>
  updateReserveItem: (id: string, data: any) => Promise<void>
  updateReserveItemStatus: (id: string, status: 'вкл' | 'выкл') => Promise<void>
  addKSR: (ksr: any) => Promise<void>
  updateKSRCable: (id: string, cableId: string | null, cableName: string | null) => Promise<void>
  deleteKSR: (id: string) => Promise<void>
  addLightingMast: (mast: any) => Promise<void>
  updateLightingMast: (id: string, data: any) => Promise<void>
  deleteLightingMast: (id: string) => Promise<void>
  addLog: (action: string, details: any) => Promise<void>
  addBKRU: (karierId: string, bkruName: string) => Promise<void>
  updateYacheyka: (bkruId: string, yacheykaId: string, data: Partial<Yacheyka>) => Promise<void>
  toggleYacheykaStatus: (bkruId: string, yacheykaId: string, currentStatus: string) => Promise<void>
  toggleGrounding: (bkruId: string, yacheykaId: string, currentGrounding: boolean) => Promise<void>
}

const cleanObject = (obj: any) => {
  const result: any = {}
  for (const key in obj) {
    const value = obj[key]
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value
    }
  }
  return result
}

// Функция для форматирования деталей лога в человекочитаемый вид
const formatLogDetails = (details: any): string => {
  if (!details) return '—'
  if (typeof details === 'string') return details
  
  if (typeof details === 'object') {
    // Ячейка с именем (приоритет)
    if (details.name && (details.action?.includes('Ячейка') || details.action?.includes('ячейка'))) {
      return details.name
    }
    // Для логов ячеек без action
    if (details.name && (details.name.includes('Ячейка') || details.name.includes('БКРУ'))) {
      return details.name
    }
    // Оборудование (имя, тип)
    if (details.name && details.type) {
      return `${details.type} "${details.name}"`
    }
    // Только имя
    if (details.name) {
      return details.name
    }
    // Мачта освещения
    if (details.type === 'diesel' && details.name) {
      return `дизельная мачта "${details.name}"`
    }
    if (details.type === 'electric' && details.name) {
      return `электрическая мачта "${details.name}"`
    }
    // Статус оборудования
    if (details.newStatus) {
      return `статус изменён на ${details.newStatus === 'вкл' ? 'Включено' : 'Выключено'}`
    }
    // Заземление
    if (details.grounding !== undefined) {
      return `заземление ${details.grounding ? 'установлено' : 'снято'}`
    }
    // Кабель
    if (details.cableName) {
      return `кабель "${details.cableName}"`
    }
    // Подключение оборудования
    if (details.equipment && details.targetName) {
      return `${details.equipment} → ${details.targetName}`
    }
    // Обновления
    if (details.updates) {
      const changed = Object.keys(details.updates).filter(k => details.updates[k]).join(', ')
      return `изменены поля: ${changed}`
    }
    // БКРУ
    if (details.bkruName) {
      return `БКРУ "${details.bkruName}"`
    }
    // Если ничего не подошло
    const firstValue = Object.values(details)[0]
    if (typeof firstValue === 'string') {
      return firstValue
    }
  }
  
  return JSON.stringify(details)
}

const addLogToDB = async (user: string | null, action: string, details: any) => {
  try {
    const logRef = push(ref(db, 'logs'))
    const formattedDetails = formatLogDetails(details)
    
    await firebaseSet(logRef, {
      action,
      user: user || 'неизвестный',
      timestamp: Date.now(),
      details: formattedDetails
    })
  } catch (error) {
    console.error("❌ Ошибка записи лога:", error)
  }
}

const getInitialYacheykas = (bkruName: string, karierId: string): Yacheyka[] => {
  if (karierId === 'zapadny1' && bkruName === 'БКРУ-1') {
    return [
      { id: 'y1', number: 1, name: 'Ввод №1', description: 'ф.21К от ПС-35/6кВ Карьер', rlnd: 'РЛНД №1 ф.21К', status: 'вкл', grounding: false, fiderName: 'Ф.21К' },
      { id: 'y2', number: 2, name: 'Отходящая', description: 'Ячейка №2 (секция 1)', rlnd: '', status: 'выкл', grounding: false },
      { id: 'y3', number: 3, name: 'Отходящая', description: 'Ячейка №3 (секция 1)', rlnd: '', status: 'выкл', grounding: false },
      { id: 'y4', number: 4, name: 'Секционный', description: 'Секционный выключатель', rlnd: '', status: 'выкл', grounding: false },
      { id: 'y5', number: 5, name: 'Отходящая', description: 'Ячейка №5 (секция 2)', rlnd: '', status: 'выкл', grounding: false },
      { id: 'y6', number: 6, name: 'Ввод №2', description: 'ф.7К от ПС-35/6кВ Карьер', rlnd: 'РЛНД №1 ф.7К', status: 'выкл', grounding: false, fiderName: 'Ф.7К' }
    ]
  } else if (karierId === 'zapadny2' && bkruName === 'БКРУ-2') {
    return [
      { id: 'y1', number: 1, name: 'Ввод №1', description: 'ф.16К от ПС-35/6кВ Карьер', rlnd: 'РЛНД №1 ф.16К', status: 'вкл', grounding: false, fiderName: 'Ф.16К' },
      { id: 'y2', number: 2, name: 'Отходящая', description: 'Ячейка №2 (секция 1)', rlnd: '', status: 'выкл', grounding: false },
      { id: 'y3', number: 3, name: 'Отходящая', description: 'Ячейка №3 (секция 1)', rlnd: '', status: 'выкл', grounding: false },
      { id: 'y4', number: 4, name: 'Секционный', description: 'Секционный выключатель', rlnd: '', status: 'выкл', grounding: false },
      { id: 'y5', number: 5, name: 'Отходящая', description: 'Ячейка №5 (секция 2)', rlnd: '', status: 'выкл', grounding: false },
      { id: 'y6', number: 6, name: 'Ввод №2', description: 'ф.5К от ПС-35/6кВ Карьер', rlnd: 'РЛНД №1 ф.5К', status: 'выкл', grounding: false, fiderName: 'Ф.5К' }
    ]
  }
  return []
}

export const useStore = create<AppState>((set, get) => ({
  loading: true,
  equipment: [],
  cables: [],
  reserve: [],
  ksr: [],
  lightingMasts: [],
  logs: [],
  bkruList: [],
  currentUser: null,

  setCurrentUser: (name) => set({ currentUser: name }),

  loadData: () => {
    const equipmentRef = ref(db, 'equipment')
    const cablesRef = ref(db, 'cables')
    const reserveRef = ref(db, 'reserve')
    const ksrRef = ref(db, 'ksr')
    const mastsRef = ref(db, 'lightingMasts')
    const logsRef = ref(db, 'logs')
    const bkruRef = ref(db, 'bkru')

    onValue(equipmentRef, (snapshot) => {
      const data = snapshot.val()
      const list = data ? Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })) : []
      set({ equipment: list, loading: false })
    })

    onValue(cablesRef, (snapshot) => {
      const data = snapshot.val()
      const list = data ? Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })) : []
      set({ cables: list })
    })

    onValue(reserveRef, (snapshot) => {
      const data = snapshot.val()
      const list = data ? Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })) : []
      set({ reserve: list })
    })

    onValue(ksrRef, (snapshot) => {
      const data = snapshot.val()
      const list = data ? Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })) : []
      set({ ksr: list })
    })

    onValue(mastsRef, (snapshot) => {
      const data = snapshot.val()
      const list = data ? Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })) : []
      set({ lightingMasts: list })
    })

    onValue(logsRef, (snapshot) => {
      const data = snapshot.val()
      const list = data ? Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })) : []
      set({ logs: list.reverse() })
    })

    onValue(bkruRef, async (snapshot) => {
      const data = snapshot.val()
      let list = data ? Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })) : []
      
      if (list.length === 0) {
        const bkru1Ref = push(bkruRef)
        await firebaseSet(bkru1Ref, cleanObject({
          name: 'БКРУ-1',
          karierId: 'zapadny1',
          sectionBreaker: true,
          yacheykas: getInitialYacheykas('БКРУ-1', 'zapadny1')
        }))
        
        const bkru2Ref = push(bkruRef)
        await firebaseSet(bkru2Ref, cleanObject({
          name: 'БКРУ-2',
          karierId: 'zapadny2',
          sectionBreaker: true,
          yacheykas: getInitialYacheykas('БКРУ-2', 'zapadny2')
        }))
        
        const newData = (await new Promise((resolve) => {
          onValue(bkruRef, (snap) => resolve(snap.val()), { onlyOnce: true })
        })) as any
        
        list = newData ? Object.entries(newData).map(([id, val]: [string, any]) => ({ id, ...val })) : []
      }
      
      set({ bkruList: list })
    })
  },

  addEquipment: async (eq) => {
    try {
      const newRef = push(ref(db, 'equipment'))
      const cleanEq = cleanObject(eq)
      await firebaseSet(newRef, cleanEq)
      await addLogToDB(get().currentUser, 'Добавлено оборудование', { name: cleanEq.name, type: cleanEq.type })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  updateEquipment: async (id, data) => {
    try {
      const equipment = get().equipment.find(e => e.id === id)
      const cleanData = cleanObject(data)
      await update(ref(db, `equipment/${id}`), cleanData)
      await addLogToDB(get().currentUser, 'Обновлено оборудование', { name: equipment?.name, type: equipment?.type })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  deleteEquipment: async (id) => {
    try {
      const equipment = get().equipment.find(e => e.id === id)
      await remove(ref(db, `equipment/${id}`))
      await addLogToDB(get().currentUser, 'Удалено оборудование', { name: equipment?.name, type: equipment?.type })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  updateEquipmentStatus: async (id, status) => {
    try {
      const equipment = get().equipment.find(e => e.id === id)
      await update(ref(db, `equipment/${id}`), { status })
      await addLogToDB(get().currentUser, 
        status === 'вкл' ? 'Оборудование включено' : 'Оборудование выключено', 
        { name: equipment?.name, type: equipment?.type }
      )
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  updateEquipmentPhoto: async (id, photoUrl) => {
    try {
      const equipment = get().equipment.find(e => e.id === id)
      await update(ref(db, `equipment/${id}`), { photoUrl })
      await addLogToDB(get().currentUser, 'Обновлено фото оборудования', { name: equipment?.name })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  returnToReserve: async (id, equipmentData) => {
    try {
      const reserveRef = ref(db, 'reserve')
      const newReserveRef = push(reserveRef)
      await firebaseSet(newReserveRef, cleanObject({
        type: equipmentData.type,
        name: equipmentData.name,
        location: equipmentData.location || '',
        status: 'выкл',
        opora: equipmentData.opora || '',
        rlnd: equipmentData.rlnd || '',
        returnedAt: Date.now()
      }))
      
      await remove(ref(db, `equipment/${id}`))
      
      await addLogToDB(get().currentUser, 'Оборудование возвращено в резерв', { name: equipmentData.name, type: equipmentData.type })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  addCable: async (cable) => {
    try {
      const newRef = push(ref(db, 'cables'))
      const cleanCable = cleanObject(cable)
      await firebaseSet(newRef, cleanCable)
      await addLogToDB(get().currentUser, 'Добавлен кабель', { name: cleanCable.name })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  deleteCable: async (id) => {
    try {
      const cable = get().cables.find(c => c.id === id)
      await remove(ref(db, `cables/${id}`))
      await addLogToDB(get().currentUser, 'Удалён кабель', { name: cable?.name })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  addReserveItem: async (item) => {
    try {
      const newRef = push(ref(db, 'reserve'))
      const cleanItem = cleanObject({
        type: item.type || '',
        name: item.name || '',
        location: item.location || '',
        status: item.status || 'выкл',
        opora: item.opora || '',
        rlnd: item.rlnd || '',
        ...(item.model && item.model !== '' ? { model: item.model } : {}),
        ...(item.power && item.power !== '' ? { power: item.power } : {}),
        ...(item.length && item.length > 0 ? { length: item.length } : {}),
        ...(item.cableType && item.cableType !== '' ? { cableType: item.cableType } : {})
      })
      await firebaseSet(newRef, cleanItem)
      await addLogToDB(get().currentUser, 'Добавлено в резерв', { name: cleanItem.name, type: cleanItem.type })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  deleteReserveItem: async (id) => {
    try {
      const item = get().reserve.find(i => i.id === id)
      await remove(ref(db, `reserve/${id}`))
      await addLogToDB(get().currentUser, 'Удалено из резерва', { name: item?.name, type: item?.type })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  updateReserveItem: async (id, data) => {
    try {
      const item = get().reserve.find(i => i.id === id)
      const cleanData = cleanObject(data)
      await update(ref(db, `reserve/${id}`), cleanData)
      await addLogToDB(get().currentUser, 'Обновлено в резерве', { name: item?.name, type: item?.type })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  updateReserveItemStatus: async (id, status) => {
    try {
      const item = get().reserve.find(i => i.id === id)
      await update(ref(db, `reserve/${id}`), { status })
      await addLogToDB(get().currentUser, 
        status === 'вкл' ? 'Резервное оборудование включено' : 'Резервное оборудование выключено',
        { name: item?.name, type: item?.type }
      )
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  addKSR: async (ksrItem) => {
    try {
      const newRef = push(ref(db, 'ksr'))
      const cleanKSR = cleanObject({
        name: ksrItem.name,
        number: ksrItem.number || '',
        type: ksrItem.type,
        location: ksrItem.location,
        createdAt: Date.now()
      })
      await firebaseSet(newRef, cleanKSR)
      await addLogToDB(get().currentUser, 'Добавлена КСР', { name: cleanKSR.name })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  updateKSRCable: async (id, cableId, cableName) => {
    try {
      const ksrItem = get().ksr.find(k => k.id === id)
      const updateData: any = {}
      if (cableId === null) {
        updateData.cableId = null
        updateData.cableName = null
      } else {
        updateData.cableId = cableId
        updateData.cableName = cableName
      }
      await update(ref(db, `ksr/${id}`), updateData)
      await addLogToDB(get().currentUser, 
        cableId ? 'Кабель подключён к КСР' : 'Кабель отключён от КСР',
        { name: ksrItem?.name, cableName }
      )
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  deleteKSR: async (id) => {
    try {
      const ksrItem = get().ksr.find(k => k.id === id)
      await remove(ref(db, `ksr/${id}`))
      await addLogToDB(get().currentUser, 'Удалена КСР', { name: ksrItem?.name })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  addLightingMast: async (mast) => {
    try {
      const newRef = push(ref(db, 'lightingMasts'))
      const cleanMast = cleanObject(mast)
      await firebaseSet(newRef, cleanMast)
      await addLogToDB(get().currentUser, 'Добавлена мачта освещения', { name: cleanMast.name, type: cleanMast.type })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  updateLightingMast: async (id, data) => {
    try {
      const mast = get().lightingMasts.find(m => m.id === id)
      const cleanData = cleanObject(data)
      await update(ref(db, `lightingMasts/${id}`), cleanData)
      await addLogToDB(get().currentUser, 'Обновлена мачта освещения', { name: mast?.name, type: mast?.type })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  deleteLightingMast: async (id) => {
    try {
      const mast = get().lightingMasts.find(m => m.id === id)
      await remove(ref(db, `lightingMasts/${id}`))
      await addLogToDB(get().currentUser, 'Удалена мачта освещения', { name: mast?.name, type: mast?.type })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  addLog: async (action, details) => {
    await addLogToDB(get().currentUser, action, details)
  },

  addBKRU: async (karierId, bkruName) => {
    try {
      const newRef = push(ref(db, 'bkru'))
      const newBKRU = cleanObject({
        name: bkruName,
        karierId: karierId,
        sectionBreaker: true,
        yacheykas: getInitialYacheykas(bkruName, karierId)
      })
      await firebaseSet(newRef, newBKRU)
      await addLogToDB(get().currentUser, 'Добавлено БКРУ', { bkruName, karierId })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  updateYacheyka: async (bkruId, yacheykaId, data) => {
    try {
      const cleanData = cleanObject(data)
      await update(ref(db, `bkru/${bkruId}/yacheykas/${yacheykaId}`), cleanData)
      await addLogToDB(get().currentUser, 'Обновлена ячейка', { bkruId, yacheykaId })
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  toggleYacheykaStatus: async (bkruId, yacheykaId, currentStatus) => {
    const newStatus = currentStatus === 'вкл' ? 'выкл' : 'вкл'
    try {
      await update(ref(db, `bkru/${bkruId}/yacheykas/${yacheykaId}`), { status: newStatus })
      await addLogToDB(get().currentUser, 
        newStatus === 'вкл' ? 'Ячейка включена' : 'Ячейка выключена',
        { bkruId, yacheykaId }
      )
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  },

  toggleGrounding: async (bkruId, yacheykaId, currentGrounding) => {
    try {
      await update(ref(db, `bkru/${bkruId}/yacheykas/${yacheykaId}`), { grounding: !currentGrounding })
      await addLogToDB(get().currentUser, 
        !currentGrounding ? 'Заземление установлено' : 'Заземление снято',
        { bkruId, yacheykaId }
      )
    } catch (error) {
      console.error("❌ Ошибка:", error)
    }
  }
}))