import { useState, useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'
import { useStore } from '../store'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import EquipmentCard from '../components/EquipmentCard'

interface EquipmentItem {
  id: string
  type: string
  name: string
  location?: string
  opora?: string
  rlnd?: string
  status?: string
  photoUrl?: string
  installedAtName?: string
  cableName?: string
  model?: string
  power?: string
  length?: number
  number?: string
  source: 'reserve' | 'equipment' | 'ksr' | 'cable'
  isInstalled?: boolean
}

export default function EquipmentTable() {
  const { addLog } = useStore()
  const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('все')
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null)

  // Загрузка оборудования из резерва
  const loadReserveEquipment = () => {
    const reserveRef = ref(db, 'reserve')
    const unsubscribe = onValue(reserveRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          type: val.type,
          name: val.name,
          location: val.location || '',
          opora: val.opora || '',
          rlnd: val.rlnd || '',
          status: val.status || '',
          photoUrl: val.photoUrl || '',
          model: val.model || '',
          power: val.power || '',
          length: val.length || 0,
          number: val.number || '',
          source: 'reserve' as const,
          isInstalled: false
        }))
        setAllEquipment(prev => {
          const other = prev.filter(p => p.source !== 'reserve')
          return [...other, ...list]
        })
      }
    })
    return () => unsubscribe()
  }

  // Загрузка установленного оборудования
  const loadInstalledEquipment = () => {
    const equipmentRef = ref(db, 'equipment')
    const unsubscribe = onValue(equipmentRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          type: val.type,
          name: val.name,
          location: val.location || '',
          opora: val.opora || '',
          rlnd: val.rlnd || '',
          status: val.status || '',
          photoUrl: val.photoUrl || '',
          installedAtName: val.installedAtName || '',
          cableName: val.cableName || '',
          model: val.model || '',
          power: val.power || '',
          length: val.length || 0,
          number: val.number || '',
          source: 'equipment' as const,
          isInstalled: true
        }))
        setAllEquipment(prev => {
          const other = prev.filter(p => p.source !== 'equipment')
          return [...other, ...list]
        })
      }
    })
    return () => unsubscribe()
  }

  // Загрузка КСР в работе
  const loadKSRInWork = () => {
    const ksrWorkRef = ref(db, 'ksrInWork')
    const unsubscribe = onValue(ksrWorkRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          type: 'КСР',
          name: val.name,
          location: val.location || '',
          number: val.number || '',
          status: 'в работе',
          photoUrl: val.photoUrl || '',
          cableName: val.cableName || '',
          installedAtName: val.connectedToName || '',
          source: 'ksr' as const,
          isInstalled: true
        }))
        setAllEquipment(prev => {
          const other = prev.filter(p => p.source !== 'ksr')
          return [...other, ...list]
        })
      }
    })
    return () => unsubscribe()
  }

  // Загрузка кабелей в работе
  const loadCablesInWork = () => {
    const cablesRef = ref(db, 'cablesInWork')
    const unsubscribe = onValue(cablesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          type: 'кабель',
          name: val.name,
          length: val.length || 0,
          status: 'в работе',
          photoUrl: val.photoUrl || '',
          installedAtName: val.toName || '',
          cableName: val.name,
          source: 'cable' as const,
          isInstalled: true
        }))
        setAllEquipment(prev => {
          const other = prev.filter(p => p.source !== 'cable')
          return [...other, ...list]
        })
      }
    })
    return () => unsubscribe()
  }

  useEffect(() => {
    const unsub1 = loadReserveEquipment()
    const unsub2 = loadInstalledEquipment()
    const unsub3 = loadKSRInWork()
    const unsub4 = loadCablesInWork()
    
    // Ждём загрузки всех данных
    const timeout = setTimeout(() => setLoading(false), 1000)
    
    return () => {
      unsub1()
      unsub2()
      unsub3()
      unsub4()
      clearTimeout(timeout)
    }
  }, [])

  // Убираем дубли по id и названию
  const uniqueEquipment = allEquipment.reduce((acc, current) => {
    const exists = acc.find(item => item.id === current.id || (item.name === current.name && item.type === current.type))
    if (!exists) {
      acc.push(current)
    }
    return acc
  }, [] as EquipmentItem[])

  const filtered = uniqueEquipment.filter(eq => {
    if (filterType !== 'все' && eq.type !== filterType) return false
    if (search && !eq.name.toLowerCase().includes(search.toLowerCase()) && 
        !(eq.location || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const exportToExcel = () => {
    const data = filtered.map(eq => ({
      Тип: eq.type,
      Название: eq.name,
      Местоположение: eq.location || '',
      Опора: eq.opora || '',
      РЛНД: eq.rlnd || '',
      Модель: eq.model || '',
      Мощность: eq.power || '',
      Длина: eq.length || '',
      Статус: eq.status || '',
      Подключено_к: eq.installedAtName || '',
      Кабель: eq.cableName || '',
      Источник: eq.source === 'reserve' ? 'Резерв' : eq.source === 'equipment' ? 'Установлено' : eq.source === 'ksr' ? 'КСР' : 'Кабель'
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Оборудование')
    XLSX.writeFile(wb, `оборудование_${new Date().toISOString().slice(0,19)}.xlsx`)
    toast.success('Экспорт завершён')
  }

  const handleUpdate = () => {
    // Просто перезагружаем данные, не перезагружая страницу
    setLoading(true)
    setTimeout(() => setLoading(false), 500)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'ЭКГ': return '🚜'
      case 'КТП': return '⚡'
      case 'ЯКНО': return '📦'
      case 'КСР': return '📡'
      case 'кабель': return '🔌'
      default: return '🔧'
    }
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'reserve':
        return <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">В резерве</span>
      case 'equipment':
        return <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Установлено</span>
      case 'ksr':
        return <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">КСР</span>
      case 'cable':
        return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Кабель</span>
      default:
        return null
    }
  }

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Оборудование ({uniqueEquipment.length})</h1>
        <div className="flex gap-2 flex-wrap">
          <input 
            type="text" 
            placeholder="🔍 Поиск..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="border p-2 rounded w-48"
          />
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border p-2 rounded">
            <option value="все">Все типы</option>
            <option value="ЭКГ">ЭКГ</option>
            <option value="КТП">КТП</option>
            <option value="ЯКНО">ЯКНО</option>
            <option value="КСР">КСР</option>
            <option value="кабель">Кабель</option>
          </select>
          <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            📊 Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Тип</th>
              <th className="p-3 text-left">Название</th>
              <th className="p-3 text-left">Местоположение</th>
              <th className="p-3 text-left">Опора/РЛНД</th>
              <th className="p-3 text-left">Подключено к</th>
              <th className="p-3 text-left">Статус</th>
              <th className="p-3 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(eq => (
              <tr key={`${eq.source}_${eq.id}`} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {getIcon(eq.type)} {eq.type}
                    {getSourceBadge(eq.source)}
                  </div>
                </td>
                <td className="p-3 font-medium">{eq.name}</td>
                <td className="p-3">{eq.location || '—'}</td>
                <td className="p-3">
                  {eq.opora && <div className="text-xs">Опора: {eq.opora}</div>}
                  {eq.rlnd && <div className="text-xs">РЛНД: {eq.rlnd}</div>}
                  {!eq.opora && !eq.rlnd && '—'}
                </td>
                <td className="p-3 text-sm">{eq.installedAtName || '—'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${eq.status === 'вкл' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {eq.status === 'вкл' ? 'Включено' : 'Выключено'}
                  </span>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => setSelectedEquipment(eq)}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    ✏️ Редактировать
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  Нет оборудования
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedEquipment && (
        <EquipmentCard 
          equipment={selectedEquipment} 
          onClose={() => setSelectedEquipment(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}