import { useState, useEffect } from 'react'
import { ref, onValue, push, set, remove, update } from 'firebase/database'
import { db } from '../firebase'
import { useStore } from '../store'
import toast from 'react-hot-toast'

interface CableInWork {
  id: string
  name: string
  length: number
  fromId?: string
  fromType?: string
  fromName?: string
  toId?: string
  toType?: string
  toName?: string
  status: string
}

interface CableInReserve {
  id: string
  name: string
  length?: number
  type: string
}

export default function CablesManager() {
  const { currentUser, addLog } = useStore()
  const [cablesInWork, setCablesInWork] = useState<CableInWork[]>([])
  const [cablesInReserve, setCablesInReserve] = useState<CableInReserve[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newCable, setNewCable] = useState({
    name: '',
    length: 0,
    fromId: '',
    fromType: 'equipment'
  })

  // Загрузка кабелей в работе
  useEffect(() => {
    const cablesRef = ref(db, 'cablesInWork')
    const unsubscribe = onValue(cablesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
        setCablesInWork(list)
      } else {
        setCablesInWork([])
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
          .filter(item => item.type === 'кабель')
        setCablesInReserve(list)
      } else {
        setCablesInReserve([])
      }
    })
    return () => unsubscribe()
  }, [])

  // Загрузка оборудования для выбора источника
  useEffect(() => {
    const equipmentRef = ref(db, 'equipment')
    const unsubscribe = onValue(equipmentRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
        setEquipment(list)
      }
    })
    return () => unsubscribe()
  }, [])

  const handleAddCable = async () => {
    if (!newCable.name) {
      toast.error('Введите название кабеля')
      return
    }

    try {
      const cablesRef = ref(db, 'cablesInWork')
      const newRef = push(cablesRef)
      
      const cableData: any = {
        name: newCable.name,
        length: newCable.length,
        status: 'inWork',
        createdAt: Date.now()
      }
      
      if (newCable.fromId) {
        const fromEq = equipment.find(e => e.id === newCable.fromId)
        cableData.fromId = newCable.fromId
        cableData.fromType = 'equipment'
        cableData.fromName = `${fromEq?.type} — ${fromEq?.name}`
      }
      
      await set(newRef, cableData)
      await addLog('Добавлен кабель в работу', cableData)
      toast.success('Кабель добавлен в работу')
      
      setShowForm(false)
      setNewCable({ name: '', length: 0, fromId: '', fromType: 'equipment' })
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error('Ошибка при добавлении')
    }
  }

  const handleMoveToReserve = async (cable: CableInWork) => {
    if (confirm(`Переместить кабель "${cable.name}" в резерв?`)) {
      try {
        // Проверяем, не подключён ли кабель к оборудованию
        if (cable.toId) {
          toast.error('Нельзя переместить кабель, который используется')
          return
        }
        
        // Добавляем в резерв
        const reserveRef = ref(db, 'reserve')
        const newReserveRef = push(reserveRef)
        await set(newReserveRef, {
          type: 'кабель',
          name: cable.name,
          length: cable.length,
          movedToReserveAt: Date.now()
        })
        
        // Удаляем из работы
        await remove(ref(db, `cablesInWork/${cable.id}`))
        
        await addLog('Кабель перемещён в резерв', { name: cable.name })
        toast.success(`Кабель "${cable.name}" перемещён в резерв`)
      } catch (error) {
        console.error('Ошибка:', error)
        toast.error('Ошибка при перемещении')
      }
    }
  }

  const handleMoveToWork = async (cable: CableInReserve) => {
    if (confirm(`Вернуть кабель "${cable.name}" в работу?`)) {
      try {
        // Добавляем в работу
        const cablesRef = ref(db, 'cablesInWork')
        const newRef = push(cablesRef)
        await set(newRef, {
          name: cable.name,
          length: cable.length,
          status: 'inWork',
          returnedToWorkAt: Date.now()
        })
        
        // Удаляем из резерва
        await remove(ref(db, `reserve/${cable.id}`))
        
        await addLog('Кабель возвращён в работу', { name: cable.name })
        toast.success(`Кабель "${cable.name}" возвращён в работу`)
      } catch (error) {
        console.error('Ошибка:', error)
        toast.error('Ошибка при возврате')
      }
    }
  }

  const handleDeleteCable = async (id: string, name: string, from: string) => {
    if (confirm(`Удалить кабель "${name}"?`)) {
      try {
        if (from === 'work') {
          await remove(ref(db, `cablesInWork/${id}`))
        } else {
          await remove(ref(db, `reserve/${id}`))
        }
        await addLog('Удалён кабель', { id, name })
        toast.success('Кабель удалён')
      } catch (error) {
        console.error('Ошибка:', error)
        toast.error('Ошибка при удалении')
      }
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Управление кабелями</h1>
        <button onClick={() => setShowForm(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          + Добавить кабель в работу
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Кабели в работе */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-xl font-bold mb-4 text-green-700">🔌 Кабели в работе ({cablesInWork.length})</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {cablesInWork.map(cable => (
              <div key={cable.id} className="border p-3 rounded-lg bg-green-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{cable.name}</div>
                    <div className="text-sm text-gray-600">{cable.length} м</div>
                    {cable.fromName && (
                      <div className="text-xs text-gray-500 mt-1">От: {cable.fromName}</div>
                    )}
                    {cable.toName && (
                      <div className="text-xs text-blue-500">К: {cable.toName}</div>
                    )}
                    {!cable.toName && (
                      <div className="text-xs text-green-500">Свободен</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMoveToReserve(cable)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                      disabled={!!cable.toId}
                      title={cable.toId ? 'Кабель используется' : ''}
                    >
                      В резерв
                    </button>
                    <button
                      onClick={() => handleDeleteCable(cable.id, cable.name, 'work')}
                      className="text-red-500 text-sm hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {cablesInWork.length === 0 && (
              <div className="text-gray-500 text-center py-8">Нет кабелей в работе</div>
            )}
          </div>
        </div>

        {/* Кабели в резерве */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-xl font-bold mb-4 text-blue-700">📦 Кабели в резерве ({cablesInReserve.length})</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {cablesInReserve.map(cable => (
              <div key={cable.id} className="border p-3 rounded-lg bg-blue-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{cable.name}</div>
                    {cable.length && <div className="text-sm text-gray-600">{cable.length} м</div>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMoveToWork(cable)}
                      className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                    >
                      В работу
                    </button>
                    <button
                      onClick={() => handleDeleteCable(cable.id, cable.name, 'reserve')}
                      className="text-red-500 text-sm hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {cablesInReserve.length === 0 && (
              <div className="text-gray-500 text-center py-8">Нет кабелей в резерве</div>
            )}
          </div>
        </div>
      </div>

      {/* Форма добавления кабеля */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Добавить кабель в работу</h2>
            
            <label className="block text-sm font-medium mb-1">Название кабеля</label>
            <input
              type="text"
              placeholder="КГЭ 3×95"
              className="w-full border p-2 rounded mb-3"
              value={newCable.name}
              onChange={e => setNewCable({ ...newCable, name: e.target.value })}
            />
            
            <label className="block text-sm font-medium mb-1">Длина (м)</label>
            <input
              type="number"
              placeholder="250"
              className="w-full border p-2 rounded mb-3"
              value={newCable.length}
              onChange={e => setNewCable({ ...newCable, length: parseInt(e.target.value) || 0 })}
            />
            
            <label className="block text-sm font-medium mb-1">От какого оборудования (опционально)</label>
            <select
              className="w-full border p-2 rounded mb-4"
              value={newCable.fromId}
              onChange={e => setNewCable({ ...newCable, fromId: e.target.value })}
            >
              <option value="">-- Не выбрано --</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.type} — {eq.name}</option>
              ))}
            </select>
            
            <div className="flex gap-3">
              <button onClick={handleAddCable} className="bg-blue-600 text-white px-4 py-2 rounded flex-1">
                Добавить
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