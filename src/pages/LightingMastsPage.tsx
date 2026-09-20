import { useState, useEffect } from 'react'
import { ref, onValue, push, set, remove, update } from 'firebase/database'
import { db } from '../firebase'
import { useStore } from '../store'
import toast from 'react-hot-toast'

interface LightingMast {
  id: string
  name: string
  type: 'electric' | 'diesel'
  location: string
  status: 'active' | 'inactive' | 'maintenance'
  power?: string
  fuelLevel?: number
  lastMaintenance?: string
  notes?: string
  createdAt: number
}

// Функция для удаления undefined и null полей
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

export default function LightingMastsPage() {
  const { currentUser, addLog } = useStore()
  const [masts, setMasts] = useState<LightingMast[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMast, setEditingMast] = useState<LightingMast | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'electric' | 'diesel'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'maintenance'>('all')
  const [search, setSearch] = useState('')
  const [newMast, setNewMast] = useState({
    name: '',
    type: 'electric' as 'electric' | 'diesel',
    location: '',
    status: 'active' as 'active' | 'inactive' | 'maintenance',
    power: '',
    fuelLevel: 50,
    notes: ''
  })

  // Загрузка мачт из Firebase
  useEffect(() => {
    const mastsRef = ref(db, 'lightingMasts')
    const unsubscribe = onValue(mastsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        }))
        setMasts(list)
      } else {
        setMasts([])
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleAdd = async () => {
    if (!newMast.name || !newMast.location) {
      toast.error('Заполните название и местоположение')
      return
    }

    try {
      const mastsRef = ref(db, 'lightingMasts')
      const newRef = push(mastsRef)
      
      // Создаём объект без undefined полей
      const mastData: any = {
        name: newMast.name,
        type: newMast.type,
        location: newMast.location,
        status: newMast.status,
        notes: newMast.notes || '',
        createdAt: Date.now()
      }
      
      // Добавляем поля только если они есть и соответствуют типу
      if (newMast.type === 'electric' && newMast.power) {
        mastData.power = newMast.power
      }
      
      if (newMast.type === 'diesel') {
        mastData.fuelLevel = newMast.fuelLevel
      }
      
      // Очищаем объект от undefined
      const cleanData = cleanObject(mastData)
      
      await set(newRef, cleanData)
      await addLog('Добавлена мачта освещения', { name: newMast.name, type: newMast.type, location: newMast.location })
      toast.success('Мачта освещения добавлена')
      
      setShowForm(false)
      setNewMast({
        name: '',
        type: 'electric',
        location: '',
        status: 'active',
        power: '',
        fuelLevel: 50,
        notes: ''
      })
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error('Ошибка при добавлении')
    }
  }

  const handleUpdate = async () => {
    if (!editingMast) return

    try {
      // Создаём объект без undefined полей
      const updateData: any = {
        name: editingMast.name,
        type: editingMast.type,
        location: editingMast.location,
        status: editingMast.status,
        notes: editingMast.notes || '',
        updatedAt: Date.now()
      }
      
      if (editingMast.type === 'electric' && editingMast.power) {
        updateData.power = editingMast.power
      } else if (editingMast.type === 'electric') {
        updateData.power = null
      }
      
      if (editingMast.type === 'diesel') {
        updateData.fuelLevel = editingMast.fuelLevel
      } else if (editingMast.type === 'electric') {
        updateData.fuelLevel = null
      }
      
      // Очищаем объект от undefined
      const cleanData = cleanObject(updateData)
      
      await update(ref(db, `lightingMasts/${editingMast.id}`), cleanData)
      await addLog('Обновлена мачта освещения', { name: editingMast.name })
      toast.success('Изменения сохранены')
      setEditingMast(null)
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error('Ошибка при сохранении')
    }
  }

  const handleDelete = async (mast: LightingMast) => {
    if (confirm(`Удалить мачту "${mast.name}"?`)) {
      try {
        await remove(ref(db, `lightingMasts/${mast.id}`))
        await addLog('Удалена мачта освещения', { name: mast.name })
        toast.success('Мачта удалена')
      } catch (error) {
        console.error('Ошибка:', error)
        toast.error('Ошибка при удалении')
      }
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '🟢 В работе'
      case 'inactive': return '🔴 Не работает'
      case 'maintenance': return '🟡 На обслуживании'
      default: return '⚪ Неизвестно'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredMasts = masts.filter(mast => {
    if (filterType !== 'all' && mast.type !== filterType) return false
    if (filterStatus !== 'all' && mast.status !== filterStatus) return false
    if (search && !mast.name.toLowerCase().includes(search.toLowerCase()) && 
        !mast.location.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold">🏗️ Мачты освещения</h1>
        <button 
          onClick={() => setShowForm(true)} 
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Добавить мачту
        </button>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="🔍 Поиск по названию или местоположению..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="border p-2 rounded"
          >
            <option value="all">Все типы</option>
            <option value="electric">⚡ Электрические</option>
            <option value="diesel">🛢️ Дизельные</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="border p-2 rounded"
          >
            <option value="all">Все статусы</option>
            <option value="active">🟢 В работе</option>
            <option value="inactive">🔴 Не работает</option>
            <option value="maintenance">🟡 На обслуживании</option>
          </select>
          <div className="text-sm text-gray-500">
            Всего: {filteredMasts.length} / {masts.length}
          </div>
        </div>
      </div>

      {/* Список мачт */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMasts.map(mast => (
          <div key={mast.id} className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold">{mast.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(mast.status)}`}>
                    {getStatusText(mast.status)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {mast.type === 'electric' ? '⚡ Электрическая' : '🛢️ Дизельная'}
                </div>
                <div className="text-sm text-gray-600">📍 {mast.location}</div>
                {mast.type === 'electric' && mast.power && (
                  <div className="text-sm text-gray-600">💡 Мощность: {mast.power}</div>
                )}
                {mast.type === 'diesel' && mast.fuelLevel !== undefined && (
                  <div className="text-sm text-gray-600 mt-1">
                    <div className="flex justify-between items-center mb-1">
                      <span>⛽ Уровень топлива:</span>
                      <span className="font-medium">{mast.fuelLevel}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, mast.fuelLevel))}%` }}
                      />
                    </div>
                  </div>
                )}
                {mast.notes && (
                  <div className="text-xs text-gray-500 mt-2">📝 {mast.notes}</div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingMast(mast)}
                  className="text-blue-500 hover:text-blue-700"
                  title="Редактировать"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(mast)}
                  className="text-red-500 hover:text-red-700"
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredMasts.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-8 bg-white rounded-xl">
            {masts.length === 0 ? 'Нет добавленных мачт освещения' : 'Нет результатов по фильтру'}
          </div>
        )}
      </div>

      {/* Форма добавления */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Добавить мачту освещения</h2>
            
            <label className="block text-sm font-medium mb-1">Название *</label>
            <input
              type="text"
              placeholder="Например: М-1, Мачта №1"
              className="w-full border p-2 rounded mb-3"
              value={newMast.name}
              onChange={e => setNewMast({ ...newMast, name: e.target.value })}
            />
            
            <label className="block text-sm font-medium mb-1">Тип *</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={newMast.type}
              onChange={e => setNewMast({ ...newMast, type: e.target.value as 'electric' | 'diesel' })}
            >
              <option value="electric">⚡ Электрическая</option>
              <option value="diesel">🛢️ Дизельная</option>
            </select>
            
            <label className="block text-sm font-medium mb-1">Местоположение *</label>
            <input
              type="text"
              placeholder="Где находится"
              className="w-full border p-2 rounded mb-3"
              value={newMast.location}
              onChange={e => setNewMast({ ...newMast, location: e.target.value })}
            />
            
            <label className="block text-sm font-medium mb-1">Статус</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={newMast.status}
              onChange={e => setNewMast({ ...newMast, status: e.target.value as any })}
            >
              <option value="active">🟢 В работе</option>
              <option value="inactive">🔴 Не работает</option>
              <option value="maintenance">🟡 На обслуживании</option>
            </select>
            
            {newMast.type === 'electric' && (
              <>
                <label className="block text-sm font-medium mb-1">Мощность (опционально)</label>
                <input
                  type="text"
                  placeholder="Например: 400 Вт, 1 кВт"
                  className="w-full border p-2 rounded mb-3"
                  value={newMast.power}
                  onChange={e => setNewMast({ ...newMast, power: e.target.value })}
                />
              </>
            )}
            
            {newMast.type === 'diesel' && (
              <>
                <label className="block text-sm font-medium mb-1">Уровень топлива (%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  className="w-full mb-2"
                  value={newMast.fuelLevel}
                  onChange={e => setNewMast({ ...newMast, fuelLevel: parseInt(e.target.value) })}
                />
                <div className="text-center text-sm mb-3 font-medium">{newMast.fuelLevel}%</div>
              </>
            )}
            
            <label className="block text-sm font-medium mb-1">Примечания</label>
            <textarea
              placeholder="Дополнительная информация"
              className="w-full border p-2 rounded mb-4"
              rows={3}
              value={newMast.notes}
              onChange={e => setNewMast({ ...newMast, notes: e.target.value })}
            />
            
            <div className="flex gap-3">
              <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700">
                Добавить
              </button>
              <button onClick={() => setShowForm(false)} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Форма редактирования */}
      {editingMast && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Редактировать {editingMast.name}</h2>
            
            <label className="block text-sm font-medium mb-1">Название</label>
            <input
              type="text"
              className="w-full border p-2 rounded mb-3"
              value={editingMast.name}
              onChange={e => setEditingMast({ ...editingMast, name: e.target.value })}
            />
            
            <label className="block text-sm font-medium mb-1">Тип</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={editingMast.type}
              onChange={e => setEditingMast({ ...editingMast, type: e.target.value as 'electric' | 'diesel' })}
            >
              <option value="electric">⚡ Электрическая</option>
              <option value="diesel">🛢️ Дизельная</option>
            </select>
            
            <label className="block text-sm font-medium mb-1">Местоположение</label>
            <input
              type="text"
              className="w-full border p-2 rounded mb-3"
              value={editingMast.location}
              onChange={e => setEditingMast({ ...editingMast, location: e.target.value })}
            />
            
            <label className="block text-sm font-medium mb-1">Статус</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={editingMast.status}
              onChange={e => setEditingMast({ ...editingMast, status: e.target.value as any })}
            >
              <option value="active">🟢 В работе</option>
              <option value="inactive">🔴 Не работает</option>
              <option value="maintenance">🟡 На обслуживании</option>
            </select>
            
            {editingMast.type === 'electric' && (
              <>
                <label className="block text-sm font-medium mb-1">Мощность</label>
                <input
                  type="text"
                  className="w-full border p-2 rounded mb-3"
                  value={editingMast.power || ''}
                  onChange={e => setEditingMast({ ...editingMast, power: e.target.value })}
                />
              </>
            )}
            
            {editingMast.type === 'diesel' && (
              <>
                <label className="block text-sm font-medium mb-1">Уровень топлива (%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  className="w-full mb-2"
                  value={editingMast.fuelLevel || 50}
                  onChange={e => setEditingMast({ ...editingMast, fuelLevel: parseInt(e.target.value) })}
                />
                <div className="text-center text-sm mb-3 font-medium">{editingMast.fuelLevel || 50}%</div>
              </>
            )}
            
            <label className="block text-sm font-medium mb-1">Примечания</label>
            <textarea
              className="w-full border p-2 rounded mb-4"
              rows={3}
              value={editingMast.notes || ''}
              onChange={e => setEditingMast({ ...editingMast, notes: e.target.value })}
            />
            
            <div className="flex gap-3">
              <button onClick={handleUpdate} className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700">
                Сохранить
              </button>
              <button onClick={() => setEditingMast(null)} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}