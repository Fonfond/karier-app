import { useState, useEffect } from 'react'
import { ref, onValue, push, set, update, remove } from 'firebase/database'
import { db } from '../firebase'
import { useStore } from '../store'
import toast from 'react-hot-toast'

interface Connection {
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

interface Equipment {
  id: string
  type: string
  name: string
  location?: string
  opora?: string
  rlnd?: string
  status?: string
  installedAtName?: string
  installedAtType?: string
  installedAtId?: string
}

interface Yacheyka {
  id: string
  number: number
  name: string
  bkruId: string
  bkruName: string
}

interface KSRWork {
  id: string
  name: string
  number?: string
  type: string
  location: string
  cableId?: string
  cableName?: string
}

interface ReserveItem {
  id: string
  type: string
  name: string
  location?: string
  model?: string
  power?: string
}

// Функция для удаления undefined полей
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

export default function EquipmentConnections() {
  const { currentUser, addLog } = useStore()
  const [connections, setConnections] = useState<Connection[]>([])
  const [autoConnections, setAutoConnections] = useState<Connection[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [reserveEquipment, setReserveEquipment] = useState<ReserveItem[]>([])
  const [yaknoList, setYaknoList] = useState<Equipment[]>([])
  const [ksrInWork, setKsrInWork] = useState<KSRWork[]>([])
  const [cables, setCables] = useState<any[]>([])
  const [yacheykas, setYacheykas] = useState<Yacheyka[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newConnection, setNewConnection] = useState({
    fromType: 'yacheyka',
    fromId: '',
    toType: 'equipment',
    toId: '',
    cableId: ''
  })

  // Загружаем все необходимые данные
  useEffect(() => {
    const connectionsRef = ref(db, 'connections')
    const unsubscribeConnections = onValue(connectionsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
        setConnections(list)
      } else {
        setConnections([])
      }
    })

    const equipmentRef = ref(db, 'equipment')
    const unsubscribeEquipment = onValue(equipmentRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
        setEquipment(list)
        setYaknoList(list.filter(e => e.type === 'ЯКНО'))
        
        // Создаём автоматические связи из установленного оборудования
        const autoList: Connection[] = []
        list.forEach(eq => {
          if (eq.installedAtName && eq.installedAtType && eq.installedAtId) {
            autoList.push({
              id: `auto_eq_${eq.id}`,
              fromType: eq.installedAtType,
              fromId: eq.installedAtId,
              fromName: eq.installedAtName,
              toType: 'equipment',
              toId: eq.id,
              toName: `${eq.type} — ${eq.name}`,
              cableId: eq.cableId,
              cableName: eq.cableName
            })
          }
        })
        setAutoConnections(autoList)
      } else {
        setEquipment([])
        setAutoConnections([])
      }
    })

    // Загрузка оборудования из резерва (для выбора в качестве назначения)
    const reserveRef = ref(db, 'reserve')
    const unsubscribeReserve = onValue(reserveRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
        setReserveEquipment(list)
      } else {
        setReserveEquipment([])
      }
    })

    // Загрузка КСР в работе
    const ksrWorkRef = ref(db, 'ksrInWork')
    const unsubscribeKSRWork = onValue(ksrWorkRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
        setKsrInWork(list)
        
        // Создаём автоматические связи для КСР
        const ksrConnections: Connection[] = []
        list.forEach(ksr => {
          if (ksr.connectedToId && ksr.connectedToName) {
            ksrConnections.push({
              id: `auto_ksr_${ksr.id}`,
              fromType: 'ksr',
              fromId: ksr.id,
              fromName: `КСР — ${ksr.name}`,
              toType: ksr.connectedToType || 'equipment',
              toId: ksr.connectedToId,
              toName: ksr.connectedToName,
              cableId: ksr.cableId,
              cableName: ksr.cableName
            })
          }
        })
        setAutoConnections(prev => [...prev, ...ksrConnections])
      }
    })

    const cablesRef = ref(db, 'reserve')
    const unsubscribeCables = onValue(cablesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter(item => item.type === 'кабель' && !item.usedBy)
        setCables(list)
      }
    })

    const bkruRef = ref(db, 'bkru')
    const unsubscribeBKRU = onValue(bkruRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list: Yacheyka[] = []
        Object.entries(data).forEach(([bkruId, bkru]: [string, any]) => {
          if (bkru.yacheykas) {
            Object.entries(bkru.yacheykas).forEach(([yId, yacheyka]: [string, any]) => {
              list.push({
                id: yId,
                number: yacheyka.number,
                name: yacheyka.name,
                bkruId: bkruId,
                bkruName: bkru.name
              })
            })
          }
        })
        setYacheykas(list)
      }
    })

    return () => {
      unsubscribeConnections()
      unsubscribeEquipment()
      unsubscribeReserve()
      unsubscribeKSRWork()
      unsubscribeCables()
      unsubscribeBKRU()
    }
  }, [])

  // Объединяем ручные и автоматические связи
  const allConnections = [...connections, ...autoConnections]

  const handleAddConnection = async () => {
    if (!newConnection.fromId || !newConnection.toId) {
      toast.error('Выберите оба конца подключения')
      return
    }

    if (newConnection.fromId === newConnection.toId) {
      toast.error('Нельзя подключить объект сам к себе')
      return
    }

    try {
      const connectionsRef = ref(db, 'connections')
      const newRef = push(connectionsRef)

      let fromName = '', toName = ''

      // Получаем имя источника
      if (newConnection.fromType === 'yacheyka') {
        const y = yacheykas.find(y => y.id === newConnection.fromId)
        fromName = `${y?.bkruName} — ${y?.name} (№${y?.number})`
      } else if (newConnection.fromType === 'equipment') {
        const e = equipment.find(e => e.id === newConnection.fromId)
        fromName = `${e?.type} — ${e?.name}`
      } else if (newConnection.fromType === 'yakno') {
        const y = yaknoList.find(y => y.id === newConnection.fromId)
        fromName = `ЯКНО - ${y?.name}`
      } else if (newConnection.fromType === 'ksr') {
        const k = ksrInWork.find(k => k.id === newConnection.fromId)
        fromName = `КСР - ${k?.name}`
      } else if (newConnection.fromType === 'reserve') {
        const r = reserveEquipment.find(r => r.id === newConnection.fromId)
        fromName = `📦 ${r?.type} — ${r?.name} (в резерве)`
      }

      // Получаем имя назначения
      if (newConnection.toType === 'equipment') {
        const e = equipment.find(e => e.id === newConnection.toId)
        toName = `${e?.type} — ${e?.name}`
      } else if (newConnection.toType === 'yakno') {
        const y = yaknoList.find(y => y.id === newConnection.toId)
        toName = `ЯКНО - ${y?.name}`
      } else if (newConnection.toType === 'ksr') {
        const k = ksrInWork.find(k => k.id === newConnection.toId)
        toName = `КСР - ${k?.name}`
      } else if (newConnection.toType === 'cable') {
        const c = cables.find(c => c.id === newConnection.toId)
        toName = `Кабель - ${c?.name}`
      } else if (newConnection.toType === 'reserve') {
        const r = reserveEquipment.find(r => r.id === newConnection.toId)
        toName = `📦 ${r?.type} — ${r?.name} (в резерве)`
      }

      const connectionData: any = {
        fromType: newConnection.fromType,
        fromId: newConnection.fromId,
        fromName: fromName,
        toType: newConnection.toType,
        toId: newConnection.toId,
        toName: toName
      }

      if (newConnection.cableId && newConnection.cableId !== '') {
        const c = cables.find(c => c.id === newConnection.cableId)
        if (c) {
          connectionData.cableId = newConnection.cableId
          connectionData.cableName = c.name
        }
      }

      const cleanData = cleanObject(connectionData)
      await set(newRef, cleanData)
      await addLog('Создано подключение', cleanData)
      toast.success('Подключение создано')

      setShowForm(false)
      setNewConnection({ fromType: 'yacheyka', fromId: '', toType: 'equipment', toId: '', cableId: '' })
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error('Ошибка при создании подключения')
    }
  }

  const handleDeleteConnection = async (id: string) => {
    if (confirm('Удалить подключение?')) {
      try {
        await remove(ref(db, `connections/${id}`))
        await addLog('Удалено подключение', { id })
        toast.success('Подключение удалено')
      } catch (error) {
        console.error('Ошибка:', error)
        toast.error('Ошибка при удалении')
      }
    }
  }

  const getFromOptions = () => {
    switch (newConnection.fromType) {
      case 'yacheyka':
        return yacheykas.map(y => ({ id: y.id, name: `${y.bkruName} — ${y.name} (№${y.number})` }))
      case 'equipment':
        return equipment.map(e => ({ id: e.id, name: `${e.type} — ${e.name}` }))
      case 'yakno':
        return yaknoList.map(y => ({ id: y.id, name: y.name }))
      case 'ksr':
        return ksrInWork.map(k => ({ id: k.id, name: k.name }))
      case 'reserve':
        return reserveEquipment.map(r => ({ id: r.id, name: `📦 ${r.type} — ${r.name}` }))
      default:
        return []
    }
  }

  const getToOptions = () => {
    switch (newConnection.toType) {
      case 'equipment':
        return equipment
          .filter(e => e.type === 'ЭКГ' || e.type === 'КТП')
          .map(e => ({ id: e.id, name: `${e.type} — ${e.name}` }))
      case 'yakno':
        return yaknoList.map(y => ({ id: y.id, name: y.name }))
      case 'ksr':
        return ksrInWork.map(k => ({ id: k.id, name: k.name }))
      case 'cable':
        return cables.map(c => ({ id: c.id, name: c.name }))
      case 'reserve':
        return reserveEquipment
          .filter(r => r.type === 'ЭКГ' || r.type === 'КТП' || r.type === 'ЯКНО')
          .map(r => ({ id: r.id, name: `📦 ${r.type} — ${r.name}` }))
      default:
        return []
    }
  }

  // Фильтруем опции, исключая выбранный объект
  const filterOptions = (options: { id: string, name: string }[], currentId: string) => {
    return options.filter(opt => opt.id !== currentId)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Схема подключений</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Добавить подключение
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-xl font-bold mb-4">Активные подключения ({allConnections.length})</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {allConnections.map(conn => (
              <div key={conn.id} className="border p-3 rounded-lg bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">📡 От: {conn.fromName}</div>
                    <div className="text-blue-600">↓</div>
                    <div className="font-medium">🎯 К: {conn.toName}</div>
                    {conn.cableName && (
                      <div className="text-sm text-gray-500 mt-1">🔌 Кабель: {conn.cableName}</div>
                    )}
                    {conn.id.startsWith('auto_') && (
                      <div className="text-xs text-green-600 mt-1">✓ Автоматически из управления</div>
                    )}
                  </div>
                  {!conn.id.startsWith('auto_') && (
                    <button
                      onClick={() => handleDeleteConnection(conn.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
            {allConnections.length === 0 && (
              <div className="text-gray-500 text-center py-8">Нет подключений</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-xl font-bold mb-4">📊 Схема</h2>
          <div className="space-y-2 font-mono text-sm max-h-[600px] overflow-y-auto">
            {allConnections.map(conn => (
              <div key={conn.id} className="border-l-4 border-blue-500 pl-3 py-1">
                <span className="font-medium">{conn.fromName}</span>
                <span className="text-blue-600"> → </span>
                <span className="font-medium">{conn.toName}</span>
                {conn.cableName && <span className="text-gray-400 text-xs ml-2">[{conn.cableName}]</span>}
              </div>
            ))}
            {allConnections.length === 0 && (
              <div className="text-gray-500 text-center py-8">Нет связей для отображения</div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Новое подключение</h2>

            <label className="block text-sm font-medium mb-1">Тип источника</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={newConnection.fromType}
              onChange={e => setNewConnection({ ...newConnection, fromType: e.target.value, fromId: '' })}
            >
              <option value="yacheyka">Ячейка БКРУ</option>
              <option value="equipment">Оборудование (ЭКГ/КТП)</option>
              <option value="yakno">ЯКНО</option>
              <option value="ksr">КСР</option>
              <option value="reserve">Из резерва</option>
            </select>

            <label className="block text-sm font-medium mb-1">Источник</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={newConnection.fromId}
              onChange={e => setNewConnection({ ...newConnection, fromId: e.target.value })}
            >
              <option value="">-- Выберите --</option>
              {getFromOptions().map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>

            <label className="block text-sm font-medium mb-1">Тип назначения</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={newConnection.toType}
              onChange={e => setNewConnection({ ...newConnection, toType: e.target.value, toId: '' })}
            >
              <option value="equipment">Оборудование (ЭКГ/КТП)</option>
              <option value="yakno">ЯКНО</option>
              <option value="ksr">КСР</option>
              <option value="cable">Кабель</option>
              <option value="reserve">В резерв</option>
            </select>

            <label className="block text-sm font-medium mb-1">Назначение</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={newConnection.toId}
              onChange={e => setNewConnection({ ...newConnection, toId: e.target.value })}
            >
              <option value="">-- Выберите --</option>
              {filterOptions(getToOptions(), newConnection.fromId).map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>

            <label className="block text-sm font-medium mb-1">Кабель (опционально)</label>
            <select
              className="w-full border p-2 rounded mb-4"
              value={newConnection.cableId}
              onChange={e => setNewConnection({ ...newConnection, cableId: e.target.value })}
            >
              <option value="">Без кабеля</option>
              {cables.filter(c => !c.usedBy).map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.length && `(${c.length} м)`}</option>
              ))}
            </select>

            <div className="flex gap-3">
              <button onClick={handleAddConnection} className="bg-blue-600 text-white px-4 py-2 rounded flex-1">
                Создать подключение
              </button>
              <button onClick={() => setShowForm(false)} className="bg-gray-300 px-4 py-2 rounded">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}