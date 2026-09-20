import { useState, useEffect } from 'react'
import { ref, onValue, push, set, remove, update } from 'firebase/database'
import { db } from '../firebase'
import { useStore } from '../store'
import toast from 'react-hot-toast'

interface KSR {
  id: string
  name: string
  number?: string
  type: string
  location: string
  cableId?: string
  cableName?: string
  status: 'inWork' | 'inReserve'
  connectedToId?: string
  connectedToType?: string
  connectedToName?: string
}

interface Cable {
  id: string
  name: string
  length?: number
  status?: string
}

export default function KSRPage() {
  const { currentUser, addLog } = useStore()
  const [ksrInWork, setKsrInWork] = useState<KSR[]>([])
  const [ksrInReserve, setKsrInReserve] = useState<KSR[]>([])
  const [cables, setCables] = useState<Cable[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showCableForm, setShowCableForm] = useState(false)
  const [selectedKSR, setSelectedKSR] = useState<KSR | null>(null)
  const [newKSR, setNewKSR] = useState({
    name: '',
    number: '',
    type: '',
    location: ''
  })
  const [selectedCableId, setSelectedCableId] = useState('')

  // Загрузка КСР в работе
  useEffect(() => {
    const ksrWorkRef = ref(db, 'ksrInWork')
    const unsubscribe = onValue(ksrWorkRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val, status: 'inWork' }))
        setKsrInWork(list)
      } else {
        setKsrInWork([])
      }
    })
    return () => unsubscribe()
  }, [])

  // Загрузка КСР из резерва
  useEffect(() => {
    const reserveRef = ref(db, 'reserve')
    const unsubscribe = onValue(reserveRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ id, ...val, status: 'inReserve' }))
          .filter(item => item.type === 'КСР')
        setKsrInReserve(list)
      } else {
        setKsrInReserve([])
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
        setCables(list)
      }
    })
    return () => unsubscribe()
  }, [])

  const handleAddKSR = async () => {
    if (!newKSR.name || !newKSR.type || !newKSR.location) {
      toast.error('Заполните все поля')
      return
    }

    try {
      // Добавляем в резерв
      const reserveRef = ref(db, 'reserve')
      const newRef = push(reserveRef)
      const ksrData = {
        type: 'КСР',
        name: newKSR.name,
        number: newKSR.number || newKSR.name,
        model: newKSR.type,
        location: newKSR.location,
        createdAt: Date.now()
      }
      await set(newRef, ksrData)
      await addLog('Добавлена КСР в резерв', ksrData)
      toast.success('КСР добавлена в резерв')
      setShowForm(false)
      setNewKSR({ name: '', number: '', type: '', location: '' })
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error('Ошибка при добавлении')
    }
  }

  const handleMoveToWork = async (ksr: KSR) => {
    if (confirm(`Переместить КСР "${ksr.name}" в работу?`)) {
      try {
        // Добавляем в работу
        const ksrWorkRef = ref(db, 'ksrInWork')
        const newRef = push(ksrWorkRef)
        await set(newRef, {
          name: ksr.name,
          number: ksr.number,
          type: ksr.type || ksr.model,
          location: ksr.location,
          movedToWorkAt: Date.now()
        })
        
        // Удаляем из резерва
        await remove(ref(db, `reserve/${ksr.id}`))
        
        await addLog('КСР перемещена в работу', { name: ksr.name })
        toast.success(`КСР "${ksr.name}" перемещена в работу`)
      } catch (error) {
        console.error('Ошибка:', error)
        toast.error('Ошибка при перемещении')
      }
    }
  }

  const handleMoveToReserve = async (ksr: KSR) => {
    if (confirm(`Вернуть КСР "${ksr.name}" в резерв?`)) {
      try {
        // Добавляем в резерв
        const reserveRef = ref(db, 'reserve')
        const newRef = push(reserveRef)
        await set(newRef, {
          type: 'КСР',
          name: ksr.name,
          number: ksr.number,
          model: ksr.type,
          location: ksr.location,
          movedToReserveAt: Date.now()
        })
        
        // Удаляем из работы
        await remove(ref(db, `ksrInWork/${ksr.id}`))
        
        await addLog('КСР возвращена в резерв', { name: ksr.name })
        toast.success(`КСР "${ksr.name}" возвращена в резерв`)
      } catch (error) {
        console.error('Ошибка:', error)
        toast.error('Ошибка при возврате')
      }
    }
  }

  const handleConnectCable = async () => {
    if (!selectedKSR || !selectedCableId) {
      toast.error('Выберите кабель')
      return
    }

    try {
      const cable = cables.find(c => c.id === selectedCableId)
      await update(ref(db, `ksrInWork/${selectedKSR.id}`), {
        cableId: selectedCableId,
        cableName: cable?.name,
        cableConnectedAt: Date.now()
      })
      
      // Помечаем кабель как используемый
      await update(ref(db, `reserve/${selectedCableId}`), { usedBy: selectedKSR.name, usedById: selectedKSR.id })
      
      await addLog('Кабель подключён к КСР', {
        ksrId: selectedKSR.id,
        ksrName: selectedKSR.name,
        cableId: selectedCableId,
        cableName: cable?.name
      })
      
      toast.success(`Кабель "${cable?.name}" подключён к КСР "${selectedKSR.name}"`)
      setShowCableForm(false)
      setSelectedKSR(null)
      setSelectedCableId('')
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error('Ошибка при подключении кабеля')
    }
  }

  const handleDisconnectCable = async (ksr: KSR) => {
    if (confirm(`Отключить кабель от КСР "${ksr.name}"?`)) {
      try {
        if (ksr.cableId) {
          await update(ref(db, `reserve/${ksr.cableId}`), { usedBy: null, usedById: null })
        }
        await update(ref(db, `ksrInWork/${ksr.id}`), {
          cableId: null,
          cableName: null
        })
        await addLog('Кабель отключён от КСР', { ksrId: ksr.id, ksrName: ksr.name })
        toast.success('Кабель отключён')
      } catch (error) {
        console.error('Ошибка:', error)
        toast.error('Ошибка при отключении кабеля')
      }
    }
  }

  const handleDeleteKSR = async (ksr: KSR, from: string) => {
    if (confirm(`Удалить КСР "${ksr.name}"?`)) {
      try {
        if (from === 'work') {
          await remove(ref(db, `ksrInWork/${ksr.id}`))
        } else {
          await remove(ref(db, `reserve/${ksr.id}`))
        }
        await addLog('Удалена КСР', { id: ksr.id, name: ksr.name })
        toast.success('КСР удалена')
      } catch (error) {
        console.error('Ошибка:', error)
        toast.error('Ошибка при удалении')
      }
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">КСР (сани с кабелем)</h1>
        <button onClick={() => setShowForm(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          + Добавить КСР в резерв
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* КСР в работе */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-xl font-bold mb-4 text-green-700">🔧 КСР в работе ({ksrInWork.length})</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {ksrInWork.map(ksr => (
              <div key={ksr.id} className="border p-3 rounded-lg bg-green-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">{ksr.name}</h3>
                    <div className="text-sm text-gray-600">Номер: {ksr.number || ksr.name}</div>
                    <div className="text-sm text-gray-600">Тип: {ksr.type}</div>
                    <div className="text-sm text-gray-600">📍 {ksr.location}</div>
                    {ksr.cableName && (
                      <div className="text-sm text-blue-600 mt-1">🔌 Кабель: {ksr.cableName}</div>
                    )}
                    {ksr.connectedToName && (
                      <div className="text-sm text-purple-600 mt-1">🔗 Подключено к: {ksr.connectedToName}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedKSR(ksr)
                        setShowCableForm(true)
                      }}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                      title="Подключить кабель"
                    >
                      🔌
                    </button>
                    <button
                      onClick={() => handleMoveToReserve(ksr)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                    >
                      В резерв
                    </button>
                    <button
                      onClick={() => handleDeleteKSR(ksr, 'work')}
                      className="text-red-500 text-sm hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {ksr.cableName && (
                  <div className="mt-2">
                    <button
                      onClick={() => handleDisconnectCable(ksr)}
                      className="text-red-500 text-xs hover:text-red-700"
                    >
                      Отключить кабель
                    </button>
                  </div>
                )}
              </div>
            ))}
            {ksrInWork.length === 0 && (
              <div className="text-gray-500 text-center py-8">Нет КСР в работе</div>
            )}
          </div>
        </div>

        {/* КСР в резерве */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-xl font-bold mb-4 text-blue-700">📦 КСР в резерве ({ksrInReserve.length})</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {ksrInReserve.map(ksr => (
              <div key={ksr.id} className="border p-3 rounded-lg bg-blue-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">{ksr.name}</h3>
                    <div className="text-sm text-gray-600">Номер: {ksr.number || ksr.name}</div>
                    <div className="text-sm text-gray-600">Тип: {ksr.model || ksr.type}</div>
                    <div className="text-sm text-gray-600">📍 {ksr.location}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMoveToWork(ksr)}
                      className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                    >
                      В работу
                    </button>
                    <button
                      onClick={() => handleDeleteKSR(ksr, 'reserve')}
                      className="text-red-500 text-sm hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {ksrInReserve.length === 0 && (
              <div className="text-gray-500 text-center py-8">Нет КСР в резерве</div>
            )}
          </div>
        </div>
      </div>

      {/* Форма добавления КСР */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Добавить КСР в резерв</h2>
            
            <label className="block text-sm font-medium mb-1">Название</label>
            <input
              type="text"
              placeholder="Например: КСР-1"
              className="w-full border p-2 rounded mb-3"
              value={newKSR.name}
              onChange={e => setNewKSR({ ...newKSR, name: e.target.value })}
            />
            
            <label className="block text-sm font-medium mb-1">Номер</label>
            <input
              type="text"
              placeholder="Например: КСР-01 или 01"
              className="w-full border p-2 rounded mb-3"
              value={newKSR.number}
              onChange={e => setNewKSR({ ...newKSR, number: e.target.value })}
            />
            
            <label className="block text-sm font-medium mb-1">Тип</label>
            <input
              type="text"
              placeholder="Например: КСР-6-10"
              className="w-full border p-2 rounded mb-3"
              value={newKSR.type}
              onChange={e => setNewKSR({ ...newKSR, type: e.target.value })}
            />
            
            <label className="block text-sm font-medium mb-1">Местоположение</label>
            <input
              type="text"
              placeholder="Где находится"
              className="w-full border p-2 rounded mb-4"
              value={newKSR.location}
              onChange={e => setNewKSR({ ...newKSR, location: e.target.value })}
            />
            
            <div className="flex gap-3">
              <button onClick={handleAddKSR} className="bg-blue-600 text-white px-4 py-2 rounded flex-1">
                Добавить
              </button>
              <button onClick={() => setShowForm(false)} className="bg-gray-300 px-4 py-2 rounded">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Форма подключения кабеля */}
      {showCableForm && selectedKSR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Подключить кабель к КСР "{selectedKSR.name}"</h2>
            
            <label className="block text-sm font-medium mb-1">Выберите кабель из резерва</label>
            <select
              className="w-full border p-2 rounded mb-4"
              value={selectedCableId}
              onChange={e => setSelectedCableId(e.target.value)}
            >
              <option value="">-- Выберите кабель --</option>
              {cables.filter(c => !c.usedBy).map(cable => (
                <option key={cable.id} value={cable.id}>
                  {cable.name} {cable.length && `(${cable.length} м)`} {cable.location && `- ${cable.location}`}
                </option>
              ))}
            </select>
            
            {cables.length === 0 && (
              <div className="text-yellow-600 text-sm mb-3">
                Нет кабелей в резерве. Добавьте кабель на странице "Кабели".
              </div>
            )}
            
            <div className="flex gap-3">
              <button onClick={handleConnectCable} className="bg-blue-600 text-white px-4 py-2 rounded flex-1">
                Подключить
              </button>
              <button onClick={() => {
                setShowCableForm(false)
                setSelectedKSR(null)
                setSelectedCableId('')
              }} className="bg-gray-300 px-4 py-2 rounded">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}