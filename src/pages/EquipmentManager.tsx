import { useState, useEffect } from 'react'
import { ref, onValue, push, set, update, remove } from 'firebase/database'
import { db } from '../firebase'
import { useStore } from '../store'
import toast from 'react-hot-toast'

interface Equipment {
  id: string
  type: string
  name: string
  location?: string
  opora?: string
  rlnd?: string
  status?: string
  isInstalled: boolean
  installedAtName?: string
  installedAtType?: string
  installedAtId?: string
  cableId?: string
  cableName?: string
}

interface Yacheyka {
  id: string
  number: number
  name: string
  bkruId: string
  bkruName: string
}

interface YAKNO {
  id: string
  name: string
  location?: string
  isInWork?: boolean
}

interface KSR {
  id: string
  name: string
  number?: string
  type?: string
  location?: string
  isInWork?: boolean
}

interface CableInWork {
  id: string
  name: string
  length?: number
  fromId?: string
  fromType?: string
  fromName?: string
  toId?: string
  toType?: string
  toName?: string
  status: string
}

export default function EquipmentManager() {
  const { currentUser, addLog } = useStore()
  const [reserveEquipment, setReserveEquipment] = useState<Equipment[]>([])
  const [installedEquipment, setInstalledEquipment] = useState<Equipment[]>([])
  const [yacheykas, setYacheykas] = useState<Yacheyka[]>([])
  const [yaknoList, setYaknoList] = useState<YAKNO[]>([])
  const [ksrList, setKsrList] = useState<KSR[]>([])
  const [cablesInWork, setCablesInWork] = useState<CableInWork[]>([])
  const [showInstallForm, setShowInstallForm] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [installTarget, setInstallTarget] = useState({
    type: 'yacheyka',
    id: '',
    opora: '',
    rlnd: '',
    location: '',
    cableId: ''
  })

  // Загрузка оборудования из резерва
  useEffect(() => {
    const reserveRef = ref(db, 'reserve')
    const unsubscribe = onValue(reserveRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
          isInstalled: false
        }))
        setReserveEquipment(list)
      } else {
        setReserveEquipment([])
      }
    })
    return () => unsubscribe()
  }, [])

  // Загрузка установленного оборудования
  useEffect(() => {
    const equipmentRef = ref(db, 'equipment')
    const unsubscribe = onValue(equipmentRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
          isInstalled: true
        }))
        setInstalledEquipment(list)
      } else {
        setInstalledEquipment([])
      }
    })
    return () => unsubscribe()
  }, [])

  // Загрузка ячеек БКРУ
  useEffect(() => {
    const bkruRef = ref(db, 'bkru')
    const unsubscribe = onValue(bkruRef, (snapshot) => {
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
    return () => unsubscribe()
  }, [])

  // Загрузка ЯКНО (из резерва и установленных)
  useEffect(() => {
    const reserveRef = ref(db, 'reserve')
    const equipmentRef = ref(db, 'equipment')
    
    const unsubscribeReserve = onValue(reserveRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ id, ...val, isInWork: false }))
          .filter(item => item.type === 'ЯКНО')
        setYaknoList(prev => {
          const workItems = prev.filter(p => p.isInWork)
          return [...list, ...workItems]
        })
      }
    })
    
    const unsubscribeEquipment = onValue(equipmentRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ 
            id, 
            name: val.name,
            location: val.location,
            type: val.type,
            isInWork: true
          }))
          .filter(item => item.type === 'ЯКНО')
        setYaknoList(prev => {
          const reserveItems = prev.filter(p => !p.isInWork)
          return [...reserveItems, ...list]
        })
      }
    })
    
    return () => {
      unsubscribeReserve()
      unsubscribeEquipment()
    }
  }, [])

  // Загрузка КСР (из резерва и работы)
  useEffect(() => {
    const reserveRef = ref(db, 'reserve')
    const ksrWorkRef = ref(db, 'ksrInWork')
    
    const unsubscribeReserve = onValue(reserveRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ id, ...val, isInWork: false }))
          .filter(item => item.type === 'КСР')
        setKsrList(prev => {
          const workItems = prev.filter(p => p.isInWork)
          return [...list, ...workItems]
        })
      }
    })
    
    const unsubscribeWork = onValue(ksrWorkRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ 
            id, 
            name: val.name,
            number: val.number,
            type: val.type,
            location: val.location,
            isInWork: true
          }))
        setKsrList(prev => {
          const reserveItems = prev.filter(p => !p.isInWork)
          return [...reserveItems, ...list]
        })
      }
    })
    
    return () => {
      unsubscribeReserve()
      unsubscribeWork()
    }
  }, [])

  // Загрузка кабелей в работе (свободные, без toId)
  useEffect(() => {
    const cablesRef = ref(db, 'cablesInWork')
    const unsubscribe = onValue(cablesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
        const freeCables = list.filter(c => !c.toId)
        setCablesInWork(freeCables)
      } else {
        setCablesInWork([])
      }
    })
    return () => unsubscribe()
  }, [])

  // Вспомогательная функция для удаления связи из connections
  const deleteConnectionByToId = async (toId: string) => {
    const connectionsRef = ref(db, 'connections')
    const snapshot = await new Promise((resolve) => {
      onValue(connectionsRef, (snap) => resolve(snap.val()), { onlyOnce: true })
    })
    const connectionsData = snapshot as any
    if (connectionsData) {
      const connectionEntry = Object.entries(connectionsData).find(
        ([_, conn]: [string, any]) => conn.toId === toId
      )
      if (connectionEntry) {
        await remove(ref(db, `connections/${connectionEntry[0]}`))
        return true
      }
    }
    return false
  }

  // Вспомогательная функция для создания объекта в работе
  const createTargetInWork = async (type: string, id: string): Promise<{ newId: string, newType: string, name: string }> => {
    if (type === 'yakno') {
      const yakno = yaknoList.find(y => y.id === id && !y.isInWork)
      if (yakno) {
        const equipmentRef = ref(db, 'equipment')
        const newRef = push(equipmentRef)
        const yaknoData = {
          type: 'ЯКНО',
          name: yakno.name,
          location: yakno.location || '',
          status: 'выкл',
          createdAt: Date.now()
        }
        await set(newRef, yaknoData)
        await remove(ref(db, `reserve/${id}`))
        return { newId: newRef.key!, newType: 'equipment', name: yakno.name }
      }
      const existingWork = yaknoList.find(y => y.id === id && y.isInWork)
      if (existingWork) {
        return { newId: id, newType: 'equipment', name: existingWork.name }
      }
    }
    
    if (type === 'ksr') {
      const ksr = ksrList.find(k => k.id === id && !k.isInWork)
      if (ksr) {
        const ksrWorkRef = ref(db, 'ksrInWork')
        const newRef = push(ksrWorkRef)
        const ksrData = {
          name: ksr.name,
          number: ksr.number,
          type: ksr.type,
          location: ksr.location,
          status: 'вкл',
          createdAt: Date.now()
        }
        await set(newRef, ksrData)
        await remove(ref(db, `reserve/${id}`))
        return { newId: newRef.key!, newType: 'ksr', name: `${ksr.name} ${ksr.number ? `(${ksr.number})` : ''}` }
      }
      const existingWork = ksrList.find(k => k.id === id && k.isInWork)
      if (existingWork) {
        return { newId: id, newType: 'ksr', name: `${existingWork.name} ${existingWork.number ? `(${existingWork.number})` : ''}` }
      }
    }
    
    return { newId: id, newType: type, name: '' }
  }

  const handleInstall = async () => {
    if (!selectedEquipment) {
      toast.error('Выберите оборудование')
      return
    }

    try {
      let targetName = ''
      let bkruId = ''
      let yacheykaId = ''
      let targetId = installTarget.id
      let targetType = installTarget.type
      
      // Проверяем выбран ли основной объект
      if (installTarget.type === 'yacheyka' && !installTarget.id) {
        toast.error('Выберите ячейку')
        return
      }
      
      // Если выбран ЯКНО или КСР из резерва, создаём его в работе
      if ((installTarget.type === 'yakno' || installTarget.type === 'ksr') && installTarget.id) {
        const result = await createTargetInWork(installTarget.type, installTarget.id)
        targetId = result.newId
        targetType = result.newType
        targetName = result.name
      }
      
      if (installTarget.type === 'yacheyka') {
        const y = yacheykas.find(y => y.id === installTarget.id)
        targetName = `${y?.bkruName} — ${y?.name} (№${y?.number})`
        bkruId = y?.bkruId || ''
        yacheykaId = installTarget.id
      }

      // Если это перемещение, удаляем из equipment и старую связь
      if (isMoving) {
        await deleteConnectionByToId(selectedEquipment.id)
        await remove(ref(db, `equipment/${selectedEquipment.id}`))
      } else {
        // Удаляем из резерва
        await remove(ref(db, `reserve/${selectedEquipment.id}`))
      }
      
      // Создаём в equipment
      const equipmentRef = ref(db, 'equipment')
      const newRef = push(equipmentRef)
      
      const equipmentData: any = {
        type: selectedEquipment.type,
        name: selectedEquipment.name,
        location: installTarget.location || selectedEquipment.location || '',
        opora: installTarget.opora || selectedEquipment.opora || '',
        rlnd: installTarget.rlnd || selectedEquipment.rlnd || '',
        status: 'выкл',
        installedAtType: targetType,
        installedAtId: targetId,
        installedAtName: targetName,
        createdAt: Date.now()
      }
      
      // Если подключение к ячейке, добавляем bkruId и yacheykaId
      if (installTarget.type === 'yacheyka') {
        const y = yacheykas.find(y => y.id === installTarget.id)
        if (y) {
          equipmentData.bkruId = y.bkruId
          equipmentData.yacheykaId = installTarget.id
        }
      }
      
      // Если выбран кабель
      if (installTarget.cableId) {
        const cable = cablesInWork.find(c => c.id === installTarget.cableId)
        if (cable) {
          equipmentData.cableId = installTarget.cableId
          equipmentData.cableName = cable.name
          await update(ref(db, `cablesInWork/${installTarget.cableId}`), {
            toId: newRef.key,
            toType: 'equipment',
            toName: `${selectedEquipment.type} — ${selectedEquipment.name}`,
            connectedAt: Date.now()
          })
        }
      }
      
      await set(newRef, equipmentData)
      
      // СОЗДАЁМ ЗАПИСЬ В connections
      const connectionsRef = ref(db, 'connections')
      const newConnectionRef = push(connectionsRef)
      
      let fromName = ''
      if (installTarget.type === 'yacheyka') {
        const y = yacheykas.find(y => y.id === installTarget.id)
        fromName = `${y?.bkruName} — ${y?.name} (№${y?.number})`
      } else {
        fromName = targetName
      }
      
      const connectionData = {
        fromType: targetType,
        fromId: targetId,
        fromName: fromName,
        toType: 'equipment',
        toId: newRef.key,
        toName: `${selectedEquipment.type} — ${selectedEquipment.name}`,
        cableId: installTarget.cableId || null,
        cableName: installTarget.cableId ? cablesInWork.find(c => c.id === installTarget.cableId)?.name : null,
        createdAt: Date.now()
      }
      
      await set(newConnectionRef, connectionData)
      
      await addLog(isMoving ? 'Оборудование перемещено' : 'Оборудование установлено', { 
        equipment: selectedEquipment.name, 
        target: installTarget,
        targetName
      })
      
      toast.success(`Оборудование "${selectedEquipment.name}" ${isMoving ? 'перемещено' : 'установлено'}`)
      
      setShowInstallForm(false)
      setSelectedEquipment(null)
      setIsMoving(false)
      setInstallTarget({ type: 'yacheyka', id: '', opora: '', rlnd: '', location: '', cableId: '' })
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error('Ошибка при установке')
    }
  }

  const handleUninstall = async (equipment: Equipment) => {
    if (confirm(`Вернуть "${equipment.name}" в резерв?`)) {
      try {
        // Удаляем связь из connections
        await deleteConnectionByToId(equipment.id)
        
        // Если оборудование было подключено к кабелю, освобождаем кабель
        if (equipment.cableId) {
          await update(ref(db, `cablesInWork/${equipment.cableId}`), {
            toId: null,
            toType: null,
            toName: null,
            disconnectedAt: Date.now()
          })
        }
        
        // Удаляем из equipment
        await remove(ref(db, `equipment/${equipment.id}`))
        
        // Добавляем оборудование обратно в резерв
        const reserveRef = ref(db, 'reserve')
        const newRef = push(reserveRef)
        await set(newRef, {
          type: equipment.type,
          name: equipment.name,
          location: equipment.location || '',
          opora: equipment.opora || '',
          rlnd: equipment.rlnd || '',
          status: 'выкл',
          returnedAt: Date.now()
        })
        
        await addLog('Оборудование возвращено в резерв', { 
          equipment: equipment.name 
        })
        
        toast.success(`Оборудование "${equipment.name}" возвращено в резерв`)
      } catch (error) {
        console.error('Ошибка:', error)
        toast.error('Ошибка при возврате')
      }
    }
  }

  const handleMove = (equipment: Equipment) => {
    setSelectedEquipment(equipment)
    setIsMoving(true)
    setInstallTarget({
      type: equipment.installedAtType || 'yacheyka',
      id: equipment.installedAtId || '',
      opora: equipment.opora || '',
      rlnd: equipment.rlnd || '',
      location: equipment.location || '',
      cableId: equipment.cableId || ''
    })
    setShowInstallForm(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Управление оборудованием</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Резерв */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-xl font-bold mb-4">📦 Резерв ({reserveEquipment.length})</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {reserveEquipment.map(eq => (
              <div key={eq.id} className="border p-3 rounded-lg bg-gray-50 flex justify-between items-center">
                <div>
                  <div className="font-medium">{eq.type} — {eq.name}</div>
                  {eq.location && <div className="text-sm text-gray-500">📍 {eq.location}</div>}
                </div>
                <button
                  onClick={() => {
                    setSelectedEquipment(eq)
                    setIsMoving(false)
                    setInstallTarget({ type: 'yacheyka', id: '', opora: '', rlnd: '', location: '', cableId: '' })
                    setShowInstallForm(true)
                  }}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                >
                  Установить
                </button>
              </div>
            ))}
            {reserveEquipment.length === 0 && (
              <div className="text-gray-500 text-center py-8">Нет оборудования в резерве</div>
            )}
          </div>
        </div>

        {/* Установленное оборудование */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-xl font-bold mb-4">🔧 Установленное ({installedEquipment.length})</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {installedEquipment.map(eq => (
              <div key={eq.id} className="border p-3 rounded-lg bg-blue-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{eq.type} — {eq.name}</div>
                    {eq.location && <div className="text-sm text-gray-600">📍 {eq.location}</div>}
                    {eq.opora && <div className="text-sm text-gray-600">Опора: {eq.opora}</div>}
                    {eq.rlnd && <div className="text-sm text-gray-600">РЛНД: {eq.rlnd}</div>}
                    {eq.installedAtName && (
                      <div className="text-sm text-blue-600 mt-1">
                        🔗 Подключено к: {eq.installedAtName}
                      </div>
                    )}
                    {eq.cableName && (
                      <div className="text-sm text-green-600 mt-1">
                        🔌 Кабель: {eq.cableName}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMove(eq)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                    >
                      Переместить
                    </button>
                    <button
                      onClick={() => handleUninstall(eq)}
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                    >
                      В резерв
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {installedEquipment.length === 0 && (
              <div className="text-gray-500 text-center py-8">Нет установленного оборудования</div>
            )}
          </div>
        </div>
      </div>

      {/* Форма установки */}
      {showInstallForm && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {isMoving ? 'Перемещение' : 'Установка'}: {selectedEquipment.type} — {selectedEquipment.name}
            </h2>

            <label className="block text-sm font-medium mb-1">Куда устанавливаем?</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={installTarget.type}
              onChange={e => setInstallTarget({ ...installTarget, type: e.target.value, id: '', cableId: '' })}
            >
              <option value="yacheyka">Ячейка БКРУ</option>
              <option value="yakno">ЯКНО</option>
              <option value="ksr">КСР</option>
            </select>

            <label className="block text-sm font-medium mb-1">Выберите объект</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={installTarget.id}
              onChange={e => setInstallTarget({ ...installTarget, id: e.target.value })}
            >
              <option value="">-- Выберите --</option>
              {installTarget.type === 'yacheyka' && yacheykas.map(y => (
                <option key={y.id} value={y.id}>{y.bkruName} — {y.name} (№{y.number})</option>
              ))}
              {installTarget.type === 'yakno' && yaknoList.map(y => (
                <option key={y.id} value={y.id}>{y.name} {y.isInWork ? '(в работе)' : '(в резерве)'}</option>
              ))}
              {installTarget.type === 'ksr' && ksrList.map(k => (
                <option key={k.id} value={k.id}>{k.name} {k.number && `(${k.number})`} {k.isInWork ? '(в работе)' : '(в резерве)'}</option>
              ))}
            </select>

            {/* Выбор кабеля (опционально) */}
            <label className="block text-sm font-medium mb-1 mt-3">Кабель (опционально)</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={installTarget.cableId}
              onChange={e => setInstallTarget({ ...installTarget, cableId: e.target.value })}
            >
              <option value="">-- Без кабеля --</option>
              {cablesInWork.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.length && `(${c.length} м)`} {c.fromName && `от ${c.fromName}`}
                </option>
              ))}
            </select>

            {(selectedEquipment.type === 'ЭКГ' || selectedEquipment.type === 'КТП') && (
              <>
                <label className="block text-sm font-medium mb-1">Номер опоры (опционально)</label>
                <input
                  type="text"
                  placeholder="Например: ОП-12"
                  className="w-full border p-2 rounded mb-3"
                  value={installTarget.opora}
                  onChange={e => setInstallTarget({ ...installTarget, opora: e.target.value })}
                />

                <label className="block text-sm font-medium mb-1">РЛНД (опционально)</label>
                <input
                  type="text"
                  placeholder="Например: РЛНД-10"
                  className="w-full border p-2 rounded mb-3"
                  value={installTarget.rlnd}
                  onChange={e => setInstallTarget({ ...installTarget, rlnd: e.target.value })}
                />
              </>
            )}

            <label className="block text-sm font-medium mb-1">Местоположение</label>
            <input
              type="text"
              placeholder="Где находится оборудование"
              className="w-full border p-2 rounded mb-4"
              value={installTarget.location}
              onChange={e => setInstallTarget({ ...installTarget, location: e.target.value })}
            />

            <div className="flex gap-3">
              <button onClick={handleInstall} className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700">
                {isMoving ? 'Переместить' : 'Установить'}
              </button>
              <button onClick={() => {
                setShowInstallForm(false)
                setSelectedEquipment(null)
                setIsMoving(false)
                setInstallTarget({ type: 'yacheyka', id: '', opora: '', rlnd: '', location: '', cableId: '' })
              }} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}