import { useState, useEffect } from 'react'
import { ref, onValue, push, set, remove, update } from 'firebase/database'
import { db } from '../firebase'
import { useStore } from '../store'
import toast from 'react-hot-toast'
import EquipmentCard from '../components/EquipmentCard'

interface ReserveItem {
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

export default function ReservePage() {
  const { currentUser, addLog } = useStore()
  const [reserve, setReserve] = useState<ReserveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ReserveItem | null>(null)
  const [newItem, setNewItem] = useState({
    type: 'ЭКГ',
    name: '',
    model: '',
    power: '',
    length: 0,
    location: '',
    status: 'выкл' as 'вкл' | 'выкл',
    opora: '',
    rlnd: '',
    cableType: 'main' as 'main' | 'reserve'
  })

  // Прямая подписка на Firebase
  useEffect(() => {
    const reserveRef = ref(db, 'reserve')
    const unsubscribe = onValue(reserveRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        }))
        setReserve(list)
      } else {
        setReserve([])
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleAdd = async () => {
    if (!newItem.name) {
      toast.error('Введите название')
      return
    }

    try {
      const reserveRef = ref(db, 'reserve')
      const newRef = push(reserveRef)
      
      const itemToAdd: any = {
        type: newItem.type,
        name: newItem.name,
        location: newItem.location || '',
        status: newItem.status,
        opora: newItem.opora || '',
        rlnd: newItem.rlnd || '',
        createdAt: Date.now()
      }
      
      if (newItem.type === 'ЭКГ' && newItem.model) {
        itemToAdd.model = newItem.model
      }
      
      if (newItem.type === 'ЯКНО' && newItem.model) {
        itemToAdd.model = newItem.model
      }
      
      if (newItem.type === 'КТП' && newItem.power) {
        itemToAdd.power = newItem.power
      }
      
      if (newItem.type === 'кабель' && newItem.length > 0) {
        itemToAdd.length = newItem.length
        itemToAdd.cableType = newItem.cableType
      }
      
      await set(newRef, itemToAdd)
      await addLog('Добавлено в резерв', { name: newItem.name, type: newItem.type })
      toast.success('Оборудование добавлено в резерв')
      
      setShowForm(false)
      setNewItem({ 
        type: 'ЭКГ', 
        name: '', 
        model: '', 
        power: '', 
        length: 0, 
        location: '', 
        status: 'выкл', 
        opora: '', 
        rlnd: '',
        cableType: 'main'
      })
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error('Ошибка при добавлении')
    }
  }

  const handleUpdate = async () => {
    if (!editingItem || !editingItem.name) {
      toast.error('Введите название')
      return
    }

    try {
      const updateData: any = {
        name: editingItem.name,
        location: editingItem.location || '',
        status: editingItem.status,
        opora: editingItem.opora || '',
        rlnd: editingItem.rlnd || ''
      }
      
      if (editingItem.type === 'ЭКГ' && editingItem.model) {
        updateData.model = editingItem.model
      }
      
      if (editingItem.type === 'ЯКНО' && editingItem.model) {
        updateData.model = editingItem.model
      }
      
      if (editingItem.type === 'КТП' && editingItem.power) {
        updateData.power = editingItem.power
      }
      
      if (editingItem.type === 'кабель' && editingItem.length) {
        updateData.length = editingItem.length
        if (editingItem.cableType) {
          updateData.cableType = editingItem.cableType
        }
      }
      
      await update(ref(db, `reserve/${editingItem.id}`), updateData)
      await addLog('Обновлено в резерве', { name: editingItem.name, type: editingItem.type })
      toast.success('Изменения сохранены')
      setEditingItem(null)
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error('Ошибка при сохранении')
    }
  }

  const handleDelete = async (id: string, name: string, type: string) => {
    if (confirm(`Удалить "${name}" из резерва?`)) {
      try {
        await remove(ref(db, `reserve/${id}`))
        await addLog('Удалено из резерва', { name, type })
        toast.success('Оборудование удалено')
      } catch (error) {
        console.error('Ошибка:', error)
        toast.error('Ошибка при удалении')
      }
    }
  }

  const toggleStatus = async (id: string, currentStatus: string, name: string, type: string) => {
    const newStatus = currentStatus === 'вкл' ? 'выкл' : 'вкл'
    try {
      await update(ref(db, `reserve/${id}`), { status: newStatus })
      await addLog(
        newStatus === 'вкл' ? 'Резервное оборудование включено' : 'Резервное оборудование выключено',
        { name, type }
      )
      toast.success(`Статус изменён на ${newStatus === 'вкл' ? 'Включено' : 'Выключено'}`)
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error('Ошибка при изменении статуса')
    }
  }

  const getItemsByType = (type: string) => reserve.filter(i => i.type === type)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ЭКГ': return '🚜'
      case 'КТП': return '⚡'
      case 'ЯКНО': return '📦'
      case 'кабель': return '🔌'
      default: return '🔧'
    }
  }

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Резерв оборудования</h1>
        <button 
          onClick={() => setShowForm(true)} 
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Добавить в резерв
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ЭКГ */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-xl font-bold mb-3">🚜 ЭКГ ({getItemsByType('ЭКГ').length})</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {getItemsByType('ЭКГ').map(item => (
              <div key={item.id} className="border-b py-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.name}</span>
                      <button
                        onClick={() => toggleStatus(item.id, item.status || 'выкл', item.name, item.type)}
                        className={`text-xs px-2 py-0.5 rounded ${item.status === 'вкл' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}
                      >
                        {item.status === 'вкл' ? '🟢 Вкл' : '🔴 Выкл'}
                      </button>
                    </div>
                    {item.model && <div className="text-sm text-gray-600">Модель: {item.model}</div>}
                    {item.location && <div className="text-sm text-gray-600">📍 {item.location}</div>}
                    {item.opora && <div className="text-sm text-gray-600">Опора: {item.opora}</div>}
                    {item.rlnd && <div className="text-sm text-gray-600">РЛНД: {item.rlnd}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="text-blue-500 text-sm hover:text-blue-700"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id, item.name, item.type)} 
                      className="text-red-500 text-sm hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {getItemsByType('ЭКГ').length === 0 && (
              <div className="text-gray-500 text-center py-4">Нет ЭКГ</div>
            )}
          </div>
        </div>

        {/* КТП */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-xl font-bold mb-3">⚡ КТП ({getItemsByType('КТП').length})</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {getItemsByType('КТП').map(item => (
              <div key={item.id} className="border-b py-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.name}</span>
                      <button
                        onClick={() => toggleStatus(item.id, item.status || 'выкл', item.name, item.type)}
                        className={`text-xs px-2 py-0.5 rounded ${item.status === 'вкл' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}
                      >
                        {item.status === 'вкл' ? '🟢 Вкл' : '🔴 Выкл'}
                      </button>
                    </div>
                    {item.power && <div className="text-sm text-gray-600">Мощность: {item.power}</div>}
                    {item.location && <div className="text-sm text-gray-600">📍 {item.location}</div>}
                    {item.opora && <div className="text-sm text-gray-600">Опора: {item.opora}</div>}
                    {item.rlnd && <div className="text-sm text-gray-600">РЛНД: {item.rlnd}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="text-blue-500 text-sm hover:text-blue-700"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id, item.name, item.type)} 
                      className="text-red-500 text-sm hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {getItemsByType('КТП').length === 0 && (
              <div className="text-gray-500 text-center py-4">Нет КТП</div>
            )}
          </div>
        </div>

        {/* ЯКНО */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-xl font-bold mb-3">📦 ЯКНО ({getItemsByType('ЯКНО').length})</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {getItemsByType('ЯКНО').map(item => (
              <div key={item.id} className="border-b py-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.name}</span>
                      <button
                        onClick={() => toggleStatus(item.id, item.status || 'выкл', item.name, item.type)}
                        className={`text-xs px-2 py-0.5 rounded ${item.status === 'вкл' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}
                      >
                        {item.status === 'вкл' ? '🟢 Вкл' : '🔴 Выкл'}
                      </button>
                    </div>
                    {item.model && <div className="text-sm text-gray-600">Модель: {item.model}</div>}
                    {item.location && <div className="text-sm text-gray-600">📍 {item.location}</div>}
                    {item.opora && <div className="text-sm text-gray-600">Опора: {item.opora}</div>}
                    {item.rlnd && <div className="text-sm text-gray-600">РЛНД: {item.rlnd}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="text-blue-500 text-sm hover:text-blue-700"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id, item.name, item.type)} 
                      className="text-red-500 text-sm hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {getItemsByType('ЯКНО').length === 0 && (
              <div className="text-gray-500 text-center py-4">Нет ЯКНО</div>
            )}
          </div>
        </div>

        {/* Кабели */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-xl font-bold mb-3">🔌 Кабели ({getItemsByType('кабель').length})</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {getItemsByType('кабель').map(item => (
              <div key={item.id} className="border-b py-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.name}</span>
                      {item.cableType && (
                        <span className={`text-xs px-2 py-0.5 rounded ${item.cableType === 'main' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {item.cableType === 'main' ? '🔌 Базовый' : '📦 Резервный'}
                        </span>
                      )}
                    </div>
                    {item.length && <div className="text-sm text-gray-600">{item.length} м</div>}
                    {item.location && <div className="text-sm text-gray-600">📍 {item.location}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="text-blue-500 text-sm hover:text-blue-700"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id, item.name, item.type)} 
                      className="text-red-500 text-sm hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {getItemsByType('кабель').length === 0 && (
              <div className="text-gray-500 text-center py-4">Нет кабелей</div>
            )}
          </div>
        </div>
      </div>

      {/* Форма добавления */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Добавить в резерв</h2>
            
            <label className="block text-sm font-medium mb-1">Тип оборудования</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={newItem.type}
              onChange={e => setNewItem({ ...newItem, type: e.target.value })}
            >
              <option value="ЭКГ">🚜 Экскаватор (ЭКГ)</option>
              <option value="КТП">⚡ КТП</option>
              <option value="ЯКНО">📦 ЯКНО</option>
              <option value="кабель">🔌 Кабель</option>
            </select>
            
            <label className="block text-sm font-medium mb-1">Название</label>
            <input
              type="text"
              placeholder="Например: ЭКГ-5, КТП-1"
              className="w-full border p-2 rounded mb-3"
              value={newItem.name}
              onChange={e => setNewItem({ ...newItem, name: e.target.value })}
            />
            
            <label className="block text-sm font-medium mb-1">Местоположение</label>
            <input
              type="text"
              placeholder="Где находится"
              className="w-full border p-2 rounded mb-3"
              value={newItem.location}
              onChange={e => setNewItem({ ...newItem, location: e.target.value })}
            />
            
            <label className="block text-sm font-medium mb-1">Статус</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={newItem.status}
              onChange={e => setNewItem({ ...newItem, status: e.target.value as 'вкл' | 'выкл' })}
            >
              <option value="вкл">🟢 Включено</option>
              <option value="выкл">🔴 Выключено</option>
            </select>
            
            <label className="block text-sm font-medium mb-1">Опора</label>
            <input
              type="text"
              placeholder="Номер опоры (например, ОП-12)"
              className="w-full border p-2 rounded mb-3"
              value={newItem.opora}
              onChange={e => setNewItem({ ...newItem, opora: e.target.value })}
            />
            
            <label className="block text-sm font-medium mb-1">РЛНД</label>
            <input
              type="text"
              placeholder="РЛНД (например, РЛНД-10)"
              className="w-full border p-2 rounded mb-3"
              value={newItem.rlnd}
              onChange={e => setNewItem({ ...newItem, rlnd: e.target.value })}
            />
            
            {(newItem.type === 'ЭКГ' || newItem.type === 'ЯКНО') && (
              <>
                <label className="block text-sm font-medium mb-1">Модель</label>
                <input
                  type="text"
                  placeholder="Например: ЭКГ-5А, ЯКНО-6"
                  className="w-full border p-2 rounded mb-3"
                  value={newItem.model}
                  onChange={e => setNewItem({ ...newItem, model: e.target.value })}
                />
              </>
            )}
            
            {newItem.type === 'КТП' && (
              <>
                <label className="block text-sm font-medium mb-1">Мощность</label>
                <input
                  type="text"
                  placeholder="Например: 630 кВА"
                  className="w-full border p-2 rounded mb-3"
                  value={newItem.power}
                  onChange={e => setNewItem({ ...newItem, power: e.target.value })}
                />
              </>
            )}
            
            {newItem.type === 'кабель' && (
              <>
                <label className="block text-sm font-medium mb-1">Тип кабеля</label>
                <select
                  className="w-full border p-2 rounded mb-3"
                  value={newItem.cableType}
                  onChange={e => setNewItem({ ...newItem, cableType: e.target.value as 'main' | 'reserve' })}
                >
                  <option value="main">🔌 Базовый</option>
                  <option value="reserve">📦 Резервный</option>
                </select>
                
                <label className="block text-sm font-medium mb-1">Длина (м)</label>
                <input
                  type="number"
                  placeholder="Длина в метрах"
                  className="w-full border p-2 rounded mb-3"
                  value={newItem.length || ''}
                  onChange={e => setNewItem({ ...newItem, length: parseInt(e.target.value) || 0 })}
                />
              </>
            )}
            
            <div className="flex gap-3 mt-4">
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
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {getTypeIcon(editingItem.type)} Редактировать {editingItem.type} — {editingItem.name}
            </h2>
            
            <label className="block text-sm font-medium mb-1">Название</label>
            <input
              type="text"
              value={editingItem.name}
              onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
              className="w-full border p-2 rounded mb-3"
            />
            
            <label className="block text-sm font-medium mb-1">Местоположение</label>
            <input
              type="text"
              value={editingItem.location || ''}
              onChange={e => setEditingItem({ ...editingItem, location: e.target.value })}
              className="w-full border p-2 rounded mb-3"
              placeholder="Где находится"
            />
            
            <label className="block text-sm font-medium mb-1">Статус</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={editingItem.status || 'выкл'}
              onChange={e => setEditingItem({ ...editingItem, status: e.target.value as 'вкл' | 'выкл' })}
            >
              <option value="вкл">🟢 Включено</option>
              <option value="выкл">🔴 Выключено</option>
            </select>
            
            {(editingItem.type === 'ЭКГ' || editingItem.type === 'ЯКНО') && (
              <>
                <label className="block text-sm font-medium mb-1">Модель</label>
                <input
                  type="text"
                  value={editingItem.model || ''}
                  onChange={e => setEditingItem({ ...editingItem, model: e.target.value })}
                  className="w-full border p-2 rounded mb-3"
                  placeholder="Модель"
                />
              </>
            )}
            
            {editingItem.type === 'КТП' && (
              <>
                <label className="block text-sm font-medium mb-1">Мощность</label>
                <input
                  type="text"
                  value={editingItem.power || ''}
                  onChange={e => setEditingItem({ ...editingItem, power: e.target.value })}
                  className="w-full border p-2 rounded mb-3"
                  placeholder="Мощность"
                />
              </>
            )}
            
            {editingItem.type === 'кабель' && (
              <>
                <label className="block text-sm font-medium mb-1">Тип кабеля</label>
                <select
                  className="w-full border p-2 rounded mb-3"
                  value={editingItem.cableType || 'main'}
                  onChange={e => setEditingItem({ ...editingItem, cableType: e.target.value as 'main' | 'reserve' })}
                >
                  <option value="main">🔌 Базовый</option>
                  <option value="reserve">📦 Резервный</option>
                </select>
                
                <label className="block text-sm font-medium mb-1">Длина (м)</label>
                <input
                  type="number"
                  value={editingItem.length || ''}
                  onChange={e => setEditingItem({ ...editingItem, length: parseInt(e.target.value) || 0 })}
                  className="w-full border p-2 rounded mb-3"
                  placeholder="Длина"
                />
              </>
            )}
            
            <label className="block text-sm font-medium mb-1">Опора</label>
            <input
              type="text"
              value={editingItem.opora || ''}
              onChange={e => setEditingItem({ ...editingItem, opora: e.target.value })}
              className="w-full border p-2 rounded mb-3"
              placeholder="Опора"
            />
            
            <label className="block text-sm font-medium mb-1">РЛНД</label>
            <input
              type="text"
              value={editingItem.rlnd || ''}
              onChange={e => setEditingItem({ ...editingItem, rlnd: e.target.value })}
              className="w-full border p-2 rounded mb-3"
              placeholder="РЛНД"
            />
            
            <div className="flex gap-3 mt-4">
              <button onClick={handleUpdate} className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700">
                Сохранить
              </button>
              <button onClick={() => setEditingItem(null)} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}