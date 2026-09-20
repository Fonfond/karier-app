import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ref, onValue, update, remove, push, set } from 'firebase/database'
import { db } from '../firebase'
import { useStore } from '../store'
import toast from 'react-hot-toast'
import EquipmentCard from '../components/EquipmentCard'

interface Yacheyka {
  id: string
  number: number
  name: string
  description: string
  rlnd: string
  status: 'вкл' | 'выкл'
  grounding: boolean
  fiderName?: string
}

interface Equipment {
  id: string
  type: string
  name: string
  karierId: string
  bkruId: string
  yacheykaId?: string
  opora?: string
  rlnd?: string
  location?: string
  status?: string
  photoUrl?: string
  cableId?: string
  cableName?: string
  installedAtName?: string
  installedAtType?: string
  installedAtId?: string
  connectionType?: 'air' | 'cable'
  baseType?: 'main' | 'reserve'
}

// Рекурсивная функция для построения дерева подключений
const buildEquipmentTree = (
  equipment: Equipment[],
  startId: string,
  startType: string,
  depth: number = 0,
  visited: Set<string> = new Set()
): any[] => {
  const result: any[] = []
  
  if (visited.has(`${startType}_${startId}`)) return result
  visited.add(`${startType}_${startId}`)
  
  const connectedEquipment = equipment.filter(e => e.installedAtId === startId && e.installedAtType === startType)
  
  for (const eq of connectedEquipment) {
    result.push({
      type: 'equipment',
      data: eq,
      depth,
      children: buildEquipmentTree(equipment, eq.id, 'equipment', depth + 1, visited)
    })
  }
  
  return result
}

// Компонент для отображения узла дерева с кнопкой переключения статуса и подключения кабеля
const EquipmentTreeNode = ({ node, onConnect, onReturnToReserve, onEdit, onToggleStatus, onConnectCable, level = 0 }: { 
  node: any, 
  onConnect: (parentId: string, parentName: string, parentType: string) => void,
  onReturnToReserve: (id: string, name: string, data: any) => void,
  onEdit: (data: any) => void,
  onToggleStatus: (id: string, currentStatus: string) => void,
  onConnectCable: (data: any) => void,
  level?: number
}) => {
  const [expanded, setExpanded] = useState(true)
  
  const getIcon = () => {
    switch (node.data.type) {
      case 'ЭКГ': return '🚜'
      case 'КТП': return '⚡'
      case 'ЯКНО': return '📦'
      default: return '🔧'
    }
  }
  
  const isTerminal = node.data.type === 'ЭКГ' || node.data.type === 'КТП'
  
  return (
    <div className={`ml-${level > 0 ? 4 : 0} ${level > 0 ? 'border-l-2 border-blue-300 pl-2' : ''} my-1`}>
      <div className={`py-1 rounded px-2 flex justify-between items-center flex-wrap gap-2 ${level === 0 ? 'bg-gray-100' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setExpanded(!expanded)} className="text-gray-500 text-xs">
            {expanded ? '▼' : '▶'}
          </button>
          <span className="font-medium">
            {getIcon()} {node.data.type} — {node.data.name}
          </span>
          {node.data.opora && <span className="text-xs text-gray-500">Опора: {node.data.opora}</span>}
          {node.data.rlnd && <span className="text-xs text-gray-500">РЛНД: {node.data.rlnd}</span>}
          {node.data.location && <span className="text-xs text-gray-500">📍 {node.data.location}</span>}
          {node.data.cableName && <span className="text-xs text-green-600">🔌 {node.data.cableName}</span>}
          {node.data.connectionType === 'air' && <span className="text-xs text-blue-600 ml-2">🌊 Воздух</span>}
          {node.data.connectionType === 'cable' && <span className="text-xs text-orange-600 ml-2">🔌 Кабель</span>}
          {node.data.baseType === 'main' && <span className="text-xs text-green-600 ml-2">🚜 Основной</span>}
          {node.data.baseType === 'reserve' && <span className="text-xs text-yellow-600 ml-2">📦 Резервный</span>}
          {node.data.installedAtName && (
            <span className="text-xs text-blue-600 ml-2">
              ← {node.data.installedAtName}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {/* Кнопка переключения статуса */}
          <button
            onClick={() => onToggleStatus(node.data.id, node.data.status || 'выкл', node.data.name)}
            className={`px-2 py-0.5 rounded text-xs ${
              node.data.status === 'вкл' 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-400 text-white hover:bg-gray-500'
            }`}
          >
            {node.data.status === 'вкл' ? '🟢 Вкл' : '⚪ Выкл'}
          </button>
          
          {/* Кнопка подключения кабеля для ЭКГ */}
          {node.data.type === 'ЭКГ' && !node.data.cableId && (
            <button
              onClick={() => onConnectCable(node.data)}
              className="bg-purple-500 text-white px-2 py-0.5 rounded text-xs hover:bg-purple-600"
            >
              🔌 Кабель
            </button>
          )}
          {node.data.type === 'ЭКГ' && node.data.cableId && (
            <span className="text-xs text-green-600 px-2 py-0.5">
              🔌 {node.data.cableName}
            </span>
          )}
          
          {!isTerminal && (
            <button
              onClick={() => onConnect(node.data.id, node.data.name, 'equipment')}
              className="bg-green-500 text-white px-2 py-0.5 rounded text-xs hover:bg-green-600"
            >
              + Подключить
            </button>
          )}
          <button
            onClick={() => onReturnToReserve(node.data.id, node.data.name, node.data)}
            className="bg-red-500 text-white px-2 py-0.5 rounded text-xs hover:bg-red-600"
          >
            В резерв
          </button>
          <button
            onClick={() => onEdit(node.data)}
            className="text-gray-500 text-xs hover:text-gray-700 px-1"
            title="Редактировать"
          >
            ✏️
          </button>
        </div>
      </div>
      {expanded && node.children && node.children.length > 0 && (
        <div className="ml-4">
          {node.children.map((child: any, idx: number) => (
            <EquipmentTreeNode 
              key={idx} 
              node={child} 
              onConnect={onConnect}
              onReturnToReserve={onReturnToReserve}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
              onConnectCable={onConnectCable}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BKRUPage() {
  const { bkruId } = useParams()
  const { currentUser, addLog, returnToReserve } = useStore()
  const [yacheykas, setYacheykas] = useState<Yacheyka[]>([])
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([])
  const [reserveEquipment, setReserveEquipment] = useState<any[]>([])
  const [bkruName, setBkruName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showInstallForm, setShowInstallForm] = useState(false)
  const [showCableConnectForm, setShowCableConnectForm] = useState(false)
  const [selectedYacheyka, setSelectedYacheyka] = useState<Yacheyka | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null)
  const [selectedEquipmentForCable, setSelectedEquipmentForCable] = useState<any>(null)
  const [availableReserve, setAvailableReserve] = useState<any[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<any>(null)
  const [pendingParent, setPendingParent] = useState<{ id: string, name: string, type: string } | null>(null)
  const [karierId, setKarierId] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [connectionType, setConnectionType] = useState<'air' | 'cable'>('air')
  const [selectedCableId, setSelectedCableId] = useState('')
  const [ekgBaseType, setEkgBaseType] = useState<'main' | 'reserve'>('main')
  const [cablesInReserve, setCablesInReserve] = useState<any[]>([])

  const isOutgoingYacheyka = (yacheyka: Yacheyka) => {
    const outgoingNumbers = [2, 3, 5]
    return outgoingNumbers.includes(yacheyka.number)
  }

  // Функция переключения статуса оборудования
  const handleToggleEquipmentStatus = async (eqId: string, currentStatus: string, equipmentName: string) => {
    const newStatus = currentStatus === 'вкл' ? 'выкл' : 'вкл'
    try {
      await update(ref(db, `equipment/${eqId}`), { status: newStatus })
      await addLog(
        newStatus === 'вкл' ? 'Оборудование включено' : 'Оборудование выключено',
        { name: equipmentName }
      )
      toast.success(`Оборудование ${newStatus === 'вкл' ? 'включено' : 'выключено'}`)
      refreshData()
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error('Ошибка при изменении статуса')
    }
  }

  // Подключение кабеля к существующему оборудованию (ЭКГ)
  const handleConnectCableToEquipment = async (equipmentId: string, equipmentName: string, cableId: string) => {
    if (isConnecting) {
      toast.error('Подождите, предыдущее подключение ещё обрабатывается')
      return
    }
    
    setIsConnecting(true)
    
    try {
      const cable = cablesInReserve.find(c => c.id === cableId)
      if (!cable) {
        throw new Error('Кабель не найден в резерве')
      }
      
      // Обновляем оборудование, добавляем кабель
      await update(ref(db, `equipment/${equipmentId}`), {
        cableId: cableId,
        cableName: cable.name,
        connectionType: 'cable'
      })
      
      // Помечаем кабель как используемый
      await update(ref(db, `reserve/${cableId}`), { 
        usedBy: equipmentName,
        usedById: equipmentId,
        status: 'используется'
      })
      
      await addLog('Кабель подключён к оборудованию', { 
        equipmentName, 
        cableName: cable.name 
      })
      toast.success(`Кабель "${cable.name}" подключён к ${equipmentName}`)
      
      setShowCableConnectForm(false)
      setSelectedEquipmentForCable(null)
      setSelectedCableId('')
      refreshData()
    } catch (error) {
      console.error('Ошибка при подключении кабеля:', error)
      toast.error('Ошибка при подключении кабеля: ' + (error as Error).message)
    } finally {
      setIsConnecting(false)
    }
  }

  // Загружаем данные о БКРУ и ячейках
  useEffect(() => {
    if (!bkruId) return
    
    const bkruRef = ref(db, `bkru/${bkruId}`)
    const unsubscribe = onValue(bkruRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setBkruName(data.name || '')
        setKarierId(data.karierId || '')
        if (data.yacheykas) {
          const list = Object.entries(data.yacheykas).map(([id, val]: [string, any]) => ({ 
            id, 
            ...val 
          }))
          list.sort((a, b) => a.number - b.number)
          setYacheykas(list)
        }
      } else {
        toast.error('БКРУ не найдено')
      }
      setLoading(false)
    })
    
    return () => unsubscribe()
  }, [bkruId, refreshTrigger])

  // Загружаем всё оборудование для этого БКРУ
  useEffect(() => {
    const equipmentRef = ref(db, 'equipment')
    const unsubscribe = onValue(equipmentRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        }))
        const filtered = list.filter(e => e.bkruId === bkruId)
        setAllEquipment(filtered)
      } else {
        setAllEquipment([])
      }
    })
    
    return () => unsubscribe()
  }, [bkruId, refreshTrigger])

  // Загружаем оборудование из резерва для подключения
  useEffect(() => {
    const reserveRef = ref(db, 'reserve')
    const unsubscribe = onValue(reserveRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        }))
        setReserveEquipment(list)
        setAvailableReserve(list.filter(e => e.type === 'ЭКГ' || e.type === 'КТП' || e.type === 'ЯКНО' || e.type === 'КСР'))
      } else {
        setReserveEquipment([])
        setAvailableReserve([])
      }
    })
    return () => unsubscribe()
  }, [])

  // Загрузка кабелей из резерва
  useEffect(() => {
    const reserveRef = ref(db, 'reserve')
    const unsubscribe = onValue(reserveRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter(item => item.type === 'кабель' && !item.usedBy)
        setCablesInReserve(list)
      }
    })
    return () => unsubscribe()
  }, [])

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleConnectToParent = async (parentId: string, parentName: string, parentType: string) => {
    setPendingParent({ id: parentId, name: parentName, type: parentType })
    setShowInstallForm(true)
  }

  const handleOpenCableConnect = (equipment: any) => {
    setSelectedEquipmentForCable(equipment)
    setShowCableConnectForm(true)
  }

  const handleConnectToYacheykaWithExtra = async (yacheykaId: string, equipmentId: string, extraData: any) => {
    if (isConnecting) {
      toast.error('Подождите, предыдущее подключение ещё обрабатывается')
      return
    }
    
    setIsConnecting(true)
    
    try {
      const selectedReserveItem = availableReserve.find(r => r.id === equipmentId)
      if (!selectedReserveItem) {
        throw new Error('Оборудование не найдено в резерве')
      }
      
      const yacheyka = yacheykas.find(y => y.id === yacheykaId)
      if (!yacheyka) {
        throw new Error('Ячейка не найдена')
      }
      
      const equipmentRef = ref(db, 'equipment')
      const newRef = push(equipmentRef)
      
      const newEquipment: any = {
        type: selectedReserveItem.type,
        name: selectedReserveItem.name,
        location: selectedReserveItem.location || '',
        opora: selectedReserveItem.opora || '',
        rlnd: selectedReserveItem.rlnd || '',
        status: 'выкл',
        bkruId: bkruId,
        karierId: karierId,
        yacheykaId: yacheykaId,
        installedAtName: `${bkruName} — ${yacheyka.name} (Ячейка №${yacheyka.number})`,
        installedAtType: 'yacheyka',
        installedAtId: yacheykaId,
        connectionType: extraData.connectionType,
        createdAt: Date.now()
      }
      
      if (extraData.connectionType === 'cable' && extraData.cableId) {
        const cable = cablesInReserve.find(c => c.id === extraData.cableId)
        if (cable) {
          newEquipment.cableId = extraData.cableId
          newEquipment.cableName = cable.name
          await update(ref(db, `reserve/${extraData.cableId}`), { 
            usedBy: selectedReserveItem.name,
            usedById: newRef.key,
            status: 'используется'
          })
        }
      }
      
      if (selectedReserveItem.type === 'ЭКГ' && extraData.ekgBaseType) {
        newEquipment.baseType = extraData.ekgBaseType
      }
      
      await set(newRef, newEquipment)
      await remove(ref(db, `reserve/${selectedReserveItem.id}`))
      
      await addLog('Оборудование подключено к ячейке', { 
        name: selectedReserveItem.name, 
        target: `${bkruName} — ${yacheyka.name} (Ячейка №${yacheyka.number})` 
      })
      toast.success(`Оборудование "${selectedReserveItem.name}" подключено`)
      
      setShowInstallForm(false)
      setSelectedYacheyka(null)
      setSelectedEquipment(null)
      setConnectionType('air')
      setSelectedCableId('')
      setEkgBaseType('main')
      refreshData()
    } catch (error) {
      console.error('Ошибка при подключении:', error)
      toast.error('Ошибка при подключении: ' + (error as Error).message)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleConnectEquipment = async (equipmentId: string, targetName: string, targetId: string) => {
    if (isConnecting) {
      toast.error('Подождите, предыдущее подключение ещё обрабатывается')
      return
    }
    
    setIsConnecting(true)
    
    try {
      const selectedReserveItem = availableReserve.find(r => r.id === equipmentId)
      if (!selectedReserveItem) {
        throw new Error('Оборудование не найдено в резерве')
      }
      
      const equipmentRef = ref(db, 'equipment')
      const newRef = push(equipmentRef)
      
      const newEquipment = {
        type: selectedReserveItem.type,
        name: selectedReserveItem.name,
        location: selectedReserveItem.location || '',
        opora: selectedReserveItem.opora || '',
        rlnd: selectedReserveItem.rlnd || '',
        status: 'выкл',
        bkruId: bkruId,
        karierId: karierId,
        installedAtName: targetName,
        installedAtType: 'equipment',
        installedAtId: targetId,
        createdAt: Date.now()
      }
      
      await set(newRef, newEquipment)
      await remove(ref(db, `reserve/${selectedReserveItem.id}`))
      
      await addLog('Оборудование подключено', { 
        name: selectedReserveItem.name, 
        target: targetName 
      })
      toast.success(`Оборудование "${selectedReserveItem.name}" подключено к ${targetName}`)
      
      setShowInstallForm(false)
      setPendingParent(null)
      refreshData()
    } catch (error) {
      console.error('Ошибка при подключении:', error)
      toast.error('Ошибка при подключении: ' + (error as Error).message)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleReturnToReserve = async (id: string, name: string, equipmentData: any) => {
    await returnToReserve(id, equipmentData)
    await addLog('Оборудование возвращено в резерв', { name })
    toast.success(`Оборудование "${name}" возвращено в резерв`)
    refreshData()
  }

const handleYacheykaToggle = async (yacheykaId: string, currentStatus: string) => {
  const newStatus = currentStatus === 'вкл' ? 'выкл' : 'вкл'
  // Находим ячейку для получения понятного имени
  const yacheyka = yacheykas.find(y => y.id === yacheykaId)
  const yacheykaName = yacheyka ? `${bkruName} — ${yacheyka.name} (Ячейка №${yacheyka.number})` : yacheykaId
  
  try {
    const yacheykaRef = ref(db, `bkru/${bkruId}/yacheykas/${yacheykaId}`)
    await update(yacheykaRef, { status: newStatus })
    
    await addLog(
      newStatus === 'вкл' ? 'Ячейка включена' : 'Ячейка выключена',
      { name: yacheykaName }
    )
    toast.success(`Ячейка ${newStatus === 'вкл' ? 'включена' : 'выключена'}`)
    refreshData()
  } catch (error) {
    console.error('Ошибка:', error)
    toast.error('Ошибка при переключении ячейки')
  }
}

const handleGroundingToggle = async (yacheykaId: string, currentGrounding: boolean) => {
  // Находим ячейку для получения понятного имени
  const yacheyka = yacheykas.find(y => y.id === yacheykaId)
  const yacheykaName = yacheyka ? `${bkruName} — ${yacheyka.name} (Ячейка №${yacheyka.number})` : yacheykaId
  
  try {
    const groundingRef = ref(db, `bkru/${bkruId}/yacheykas/${yacheykaId}`)
    await update(groundingRef, { grounding: !currentGrounding })
    
    await addLog(
      !currentGrounding ? 'Заземление установлено' : 'Заземление снято',
      { name: yacheykaName }
    )
    toast.success(`Заземление ${!currentGrounding ? 'установлено' : 'снято'}`)
    refreshData()
  } catch (error) {
    console.error('Ошибка:', error)
    toast.error('Ошибка при установке заземления')
  }
}

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>
  }

  return (
    <div>
      <Link to="/" className="text-blue-600 mb-4 inline-block">← Назад к карьерам</Link>
      <h1 className="text-3xl font-bold mb-2">{karierId === 'zapadny1' ? 'Западный №1' : 'Западный №2'} — {bkruName}</h1>
      
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {yacheykas.map(y => {
          const showAddButton = isOutgoingYacheyka(y)
          const directEquipment = allEquipment.filter(e => e.yacheykaId === y.id)
          
          return (
            <div key={y.id} className={`bg-white rounded-xl shadow p-4 border-l-8 transition-colors ${y.status === 'вкл' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold">{y.name} (Ячейка №{y.number})</h3>
                  {y.description && <div className="text-sm text-gray-600">{y.description}</div>}
                  {y.rlnd && <div className="text-sm text-blue-600">РЛНД: {y.rlnd}</div>}
                  {y.fiderName && <div className="text-sm font-mono text-gray-500">{y.fiderName}</div>}
                  <div className="mt-1 text-sm">
                    Статус: <span className={y.status === 'вкл' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                      {y.status === 'вкл' ? '🟢 ВКЛЮЧЕНА' : '🔴 ВЫКЛЮЧЕНА'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleYacheykaToggle(y.id, y.status)}
                    className={`px-3 py-1 rounded text-sm ${y.status === 'вкл' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
                  >
                    {y.status === 'вкл' ? '🔴 Выключить' : '🟢 Включить'}
                  </button>
                  <button
                    onClick={() => handleGroundingToggle(y.id, y.grounding)}
                    className={`px-3 py-1 rounded text-sm ${y.grounding ? 'bg-yellow-500 text-white' : 'bg-gray-400 text-white'}`}
                  >
                    ⚡ {y.grounding ? 'Снять заземление' : 'Установить заземление'}
                  </button>
                  {showAddButton && (
                    <button
                      onClick={() => {
                        setSelectedYacheyka(y)
                        setPendingParent(null)
                        setShowInstallForm(true)
                      }}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      disabled={isConnecting}
                    >
                      + Подключить оборудование
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mt-3 space-y-3">
                <h4 className="font-medium text-gray-700">📡 Подключённое оборудование:</h4>
                {directEquipment.length > 0 ? (
                  directEquipment.map((eq, idx) => {
                    const tree = buildEquipmentTree(allEquipment, eq.id, 'equipment')
                    
                    return (
                      <div key={eq.id} className="bg-white p-2 rounded border">
                        <div className="font-medium text-blue-600 mb-1">Линия {idx + 1}:</div>
                        <div className="ml-2">
                          <div className="py-1 bg-gray-100 rounded px-2 flex justify-between items-center flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">
                                {eq.type === 'ЭКГ' ? '🚜' : eq.type === 'КТП' ? '⚡' : '📦'} {eq.type} — {eq.name}
                              </span>
                              {eq.opora && <span className="text-xs text-gray-500">Опора: {eq.opora}</span>}
                              {eq.rlnd && <span className="text-xs text-gray-500">РЛНД: {eq.rlnd}</span>}
                              {eq.location && <span className="text-xs text-gray-500">📍 {eq.location}</span>}
                              {eq.cableName && <span className="text-xs text-green-600">🔌 {eq.cableName}</span>}
                              {eq.connectionType === 'air' && <span className="text-xs text-blue-600 ml-2">🌊 Воздух</span>}
                              {eq.connectionType === 'cable' && <span className="text-xs text-orange-600 ml-2">🔌 Кабель</span>}
                              {eq.baseType === 'main' && <span className="text-xs text-green-600 ml-2">🚜 Основной</span>}
                              {eq.baseType === 'reserve' && <span className="text-xs text-yellow-600 ml-2">📦 Резервный</span>}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleToggleEquipmentStatus(eq.id, eq.status || 'выкл', eq.name)}
                                className={`px-2 py-0.5 rounded text-xs ${
                                  eq.status === 'вкл' 
                                    ? 'bg-green-500 text-white hover:bg-green-600' 
                                    : 'bg-gray-400 text-white hover:bg-gray-500'
                                }`}
                              >
                                {eq.status === 'вкл' ? '🟢 Вкл' : '⚪ Выкл'}
                              </button>
                              {eq.type === 'ЭКГ' && !eq.cableId && (
                                <button
                                  onClick={() => handleOpenCableConnect(eq)}
                                  className="bg-purple-500 text-white px-2 py-0.5 rounded text-xs hover:bg-purple-600"
                                >
                                  🔌 Кабель
                                </button>
                              )}
                              {eq.type === 'ЭКГ' && eq.cableId && (
                                <span className="text-xs text-green-600 px-2 py-0.5">
                                  🔌 {eq.cableName}
                                </span>
                              )}
                              {eq.type !== 'ЭКГ' && eq.type !== 'КТП' && (
                                <button
                                  onClick={() => handleConnectToParent(eq.id, eq.name, 'equipment')}
                                  className="bg-green-500 text-white px-2 py-0.5 rounded text-xs hover:bg-green-600"
                                >
                                  + Подключить
                                </button>
                              )}
                              <button
                                onClick={() => handleReturnToReserve(eq.id, eq.name, eq)}
                                className="bg-red-500 text-white px-2 py-0.5 rounded text-xs hover:bg-red-600"
                              >
                                В резерв
                              </button>
                            </div>
                          </div>
                          {tree.length > 0 && (
                            <div className="ml-4 mt-1">
                              {tree.map((child: any, childIdx: number) => (
                                <EquipmentTreeNode 
                                  key={childIdx} 
                                  node={child} 
                                  onConnect={handleConnectToParent}
                                  onReturnToReserve={handleReturnToReserve}
                                  onEdit={setEditingEquipment}
                                  onToggleStatus={handleToggleEquipmentStatus}
                                  onConnectCable={handleOpenCableConnect}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-gray-500 text-sm text-center py-2">Нет подключённого оборудования</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Форма подключения оборудования к ячейке */}
      {showInstallForm && selectedYacheyka && !pendingParent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Подключение оборудования к {selectedYacheyka.name}</h2>
            
            <label className="block text-sm font-medium mb-1">Выберите оборудование из резерва</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value=""
              onChange={async (e) => {
                const selectedId = e.target.value
                if (selectedId) {
                  const eq = availableReserve.find(r => r.id === selectedId)
                  if (eq) {
                    setSelectedEquipment(eq)
                  }
                }
              }}
              disabled={isConnecting}
            >
              <option value="">-- Выберите --</option>
              {availableReserve.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.type} — {eq.name} {eq.location && `(${eq.location})`}
                </option>
              ))}
            </select>

            {selectedEquipment?.type === 'ЯКНО' && (
              <>
                <label className="block text-sm font-medium mb-1 mt-3">Тип подключения</label>
                <select
                  className="w-full border p-2 rounded mb-3"
                  value={connectionType}
                  onChange={e => setConnectionType(e.target.value as 'air' | 'cable')}
                >
                  <option value="air">🌊 Воздух</option>
                  <option value="cable">🔌 Кабель</option>
                </select>

                {connectionType === 'cable' && (
                  <>
                    <label className="block text-sm font-medium mb-1">Выберите кабель из резерва</label>
                    <select
                      className="w-full border p-2 rounded mb-3"
                      value={selectedCableId}
                      onChange={e => setSelectedCableId(e.target.value)}
                    >
                      <option value="">-- Выберите кабель --</option>
                      {cablesInReserve.map(cable => (
                        <option key={cable.id} value={cable.id}>
                          {cable.name} {cable.length && `(${cable.length} м)`} {cable.location && `- ${cable.location}`}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </>
            )}

            {selectedEquipment?.type === 'КТП' && (
              <>
                <label className="block text-sm font-medium mb-1 mt-3">Тип подключения</label>
                <select
                  className="w-full border p-2 rounded mb-3"
                  value={connectionType}
                  onChange={e => setConnectionType(e.target.value as 'air' | 'cable')}
                >
                  <option value="air">🌊 Воздух</option>
                  <option value="cable">🔌 Кабель</option>
                </select>

                {connectionType === 'cable' && (
                  <>
                    <label className="block text-sm font-medium mb-1">Выберите кабель из резерва</label>
                    <select
                      className="w-full border p-2 rounded mb-3"
                      value={selectedCableId}
                      onChange={e => setSelectedCableId(e.target.value)}
                    >
                      <option value="">-- Выберите кабель --</option>
                      {cablesInReserve.map(cable => (
                        <option key={cable.id} value={cable.id}>
                          {cable.name} {cable.length && `(${cable.length} м)`} {cable.location && `- ${cable.location}`}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </>
            )}

            {selectedEquipment?.type === 'ЭКГ' && (
              <>
                <label className="block text-sm font-medium mb-1 mt-3">Тип экскаватора</label>
                <select
                  className="w-full border p-2 rounded mb-3"
                  value={ekgBaseType}
                  onChange={e => setEkgBaseType(e.target.value as 'main' | 'reserve')}
                >
                  <option value="main">🚜 Основной</option>
                  <option value="reserve">📦 Резервный</option>
                </select>

                <label className="block text-sm font-medium mb-1">Тип подключения</label>
                <select
                  className="w-full border p-2 rounded mb-3"
                  value={connectionType}
                  onChange={e => setConnectionType(e.target.value as 'air' | 'cable')}
                >
                  <option value="air">🌊 Воздух</option>
                  <option value="cable">🔌 Кабель</option>
                </select>

                {connectionType === 'cable' && (
                  <>
                    <label className="block text-sm font-medium mb-1">Выберите кабель из резерва</label>
                    <select
                      className="w-full border p-2 rounded mb-3"
                      value={selectedCableId}
                      onChange={e => setSelectedCableId(e.target.value)}
                    >
                      <option value="">-- Выберите кабель --</option>
                      {cablesInReserve.map(cable => (
                        <option key={cable.id} value={cable.id}>
                          {cable.name} {cable.length && `(${cable.length} м)`} {cable.location && `- ${cable.location}`}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </>
            )}

            {selectedEquipment?.type === 'КСР' && (
              <>
                <label className="block text-sm font-medium mb-1 mt-3">Тип подключения</label>
                <select
                  className="w-full border p-2 rounded mb-3"
                  value={connectionType}
                  onChange={e => setConnectionType(e.target.value as 'air' | 'cable')}
                >
                  <option value="air">🌊 Воздух</option>
                  <option value="cable">🔌 Кабель</option>
                </select>

                {connectionType === 'cable' && (
                  <>
                    <label className="block text-sm font-medium mb-1">Выберите кабель из резерва</label>
                    <select
                      className="w-full border p-2 rounded mb-3"
                      value={selectedCableId}
                      onChange={e => setSelectedCableId(e.target.value)}
                    >
                      <option value="">-- Выберите кабель --</option>
                      {cablesInReserve.map(cable => (
                        <option key={cable.id} value={cable.id}>
                          {cable.name} {cable.length && `(${cable.length} м)`} {cable.location && `- ${cable.location}`}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={async () => {
                  if (!selectedEquipment) {
                    toast.error('Выберите оборудование')
                    return
                  }
                  
                  if (connectionType === 'cable' && !selectedCableId) {
                    toast.error('Выберите кабель')
                    return
                  }
                  
                  const extraData = {
                    connectionType,
                    cableId: connectionType === 'cable' ? selectedCableId : undefined,
                    ekgBaseType: selectedEquipment.type === 'ЭКГ' ? ekgBaseType : undefined
                  }
                  
                  await handleConnectToYacheykaWithExtra(selectedYacheyka.id, selectedEquipment.id, extraData)
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700"
                disabled={isConnecting}
              >
                {isConnecting ? 'Подключение...' : 'Подключить'}
              </button>
              <button
                onClick={() => {
                  setShowInstallForm(false)
                  setSelectedYacheyka(null)
                  setSelectedEquipment(null)
                  setConnectionType('air')
                  setSelectedCableId('')
                  setEkgBaseType('main')
                }}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Форма подключения оборудования к существующему оборудованию */}
      {showInstallForm && pendingParent && pendingParent.type === 'equipment' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Подключение к {pendingParent.name}</h2>
            
            <label className="block text-sm font-medium mb-1">Выберите оборудование из резерва</label>
            <select
              className="w-full border p-2 rounded mb-4"
              value=""
              onChange={async (e) => {
                const selectedId = e.target.value
                if (selectedId) {
                  await handleConnectEquipment(selectedId, pendingParent.name, pendingParent.id)
                }
              }}
              disabled={isConnecting}
            >
              <option value="">-- Выберите --</option>
              {availableReserve.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.type} — {eq.name} {eq.location && `(${eq.location})`}
                </option>
              ))}
            </select>
            
            {availableReserve.length === 0 && (
              <div className="text-yellow-600 text-sm mb-3">
                Нет оборудования в резерве. Добавьте оборудование на странице "Резерв".
              </div>
            )}
            
            <div className="flex gap-3">
              <button onClick={() => {
                setShowInstallForm(false)
                setPendingParent(null)
              }} className="bg-gray-300 px-4 py-2 rounded flex-1">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Форма подключения кабеля к оборудованию */}
      {showCableConnectForm && selectedEquipmentForCable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Подключить кабель к {selectedEquipmentForCable.type} — {selectedEquipmentForCable.name}
            </h2>
            
            <label className="block text-sm font-medium mb-1">Выберите кабель из резерва</label>
            <select
              className="w-full border p-2 rounded mb-4"
              value={selectedCableId}
              onChange={e => setSelectedCableId(e.target.value)}
            >
              <option value="">-- Выберите кабель --</option>
              {cablesInReserve.map(cable => (
                <option key={cable.id} value={cable.id}>
                  {cable.name} {cable.length && `(${cable.length} м)`} {cable.cableType === 'main' ? '🔌 Базовый' : '📦 Резервный'}
                </option>
              ))}
            </select>
            
            {cablesInReserve.length === 0 && (
              <div className="text-yellow-600 text-sm mb-3">
                Нет свободных кабелей в резерве. Добавьте кабели на странице "Резерв".
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (!selectedCableId) {
                    toast.error('Выберите кабель')
                    return
                  }
                  await handleConnectCableToEquipment(
                    selectedEquipmentForCable.id, 
                    selectedEquipmentForCable.name, 
                    selectedCableId
                  )
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700"
                disabled={isConnecting}
              >
                {isConnecting ? 'Подключение...' : 'Подключить'}
              </button>
              <button
                onClick={() => {
                  setShowCableConnectForm(false)
                  setSelectedEquipmentForCable(null)
                  setSelectedCableId('')
                }}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Карточка редактирования оборудования */}
      {editingEquipment && (
        <EquipmentCard 
          equipment={editingEquipment} 
          onClose={() => setEditingEquipment(null)}
          onUpdate={() => {
            setEditingEquipment(null)
            refreshData()
          }}
        />
      )}
    </div>
  )
}