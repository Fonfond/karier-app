import { useState } from 'react'
import { ref, push, set } from 'firebase/database'
import { db } from '../firebase'
import { useStore } from '../store'
import toast from 'react-hot-toast'

export default function EquipmentCreator() {
  const { currentUser, addLog } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [newEquipment, setNewEquipment] = useState({
    type: 'ЭКГ',
    name: '',
    model: '',
    power: '',
    length: 0,
    location: '',
    opora: '',
    rlnd: ''
  })

  const handleCreate = async () => {
    if (!newEquipment.name) {
      toast.error('Введите название')
      return
    }

    try {
      const reserveRef = ref(db, 'reserve')
      const newRef = push(reserveRef)
      
      const equipmentData: any = {
        type: newEquipment.type,
        name: newEquipment.name,
        location: newEquipment.location || '',
        opora: newEquipment.opora || '',
        rlnd: newEquipment.rlnd || '',
        status: 'выкл',
        createdAt: Date.now()
      }
      
      if (newEquipment.type === 'ЭКГ' && newEquipment.model) {
        equipmentData.model = newEquipment.model
      }
      
      if (newEquipment.type === 'КТП' && newEquipment.power) {
        equipmentData.power = newEquipment.power
      }
      
      if (newEquipment.type === 'кабель' && newEquipment.length > 0) {
        equipmentData.length = newEquipment.length
      }
      
      await set(newRef, equipmentData)
      await addLog('Создано новое оборудование', equipmentData)
      toast.success(`${newEquipment.type} "${newEquipment.name}" добавлен в резерв`)
      
      setShowForm(false)
      setNewEquipment({
        type: 'ЭКГ',
        name: '',
        model: '',
        power: '',
        length: 0,
        location: '',
        opora: '',
        rlnd: ''
      })
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error('Ошибка при создании')
    }
  }

  return (
    <div>
      <button
        onClick={() => setShowForm(true)}
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
      >
        + Создать оборудование
      </button>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Создать оборудование</h2>
            
            <label className="block text-sm font-medium mb-1">Тип</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={newEquipment.type}
              onChange={e => setNewEquipment({ ...newEquipment, type: e.target.value })}
            >
              <option value="ЭКГ">Экскаватор (ЭКГ)</option>
              <option value="КТП">КТП</option>
              <option value="ЯКНО">ЯКНО</option>
              <option value="кабель">Кабель</option>
            </select>
            
            <label className="block text-sm font-medium mb-1">Название</label>
            <input
              type="text"
              placeholder="Например: ЭКГ-5, КТП-1"
              className="w-full border p-2 rounded mb-3"
              value={newEquipment.name}
              onChange={e => setNewEquipment({ ...newEquipment, name: e.target.value })}
            />
            
            {newEquipment.type === 'ЭКГ' && (
              <>
                <label className="block text-sm font-medium mb-1">Модель</label>
                <input
                  type="text"
                  placeholder="Например: ЭКГ-5А"
                  className="w-full border p-2 rounded mb-3"
                  value={newEquipment.model}
                  onChange={e => setNewEquipment({ ...newEquipment, model: e.target.value })}
                />
              </>
            )}
            
            {newEquipment.type === 'КТП' && (
              <>
                <label className="block text-sm font-medium mb-1">Мощность</label>
                <input
                  type="text"
                  placeholder="Например: 630 кВА"
                  className="w-full border p-2 rounded mb-3"
                  value={newEquipment.power}
                  onChange={e => setNewEquipment({ ...newEquipment, power: e.target.value })}
                />
              </>
            )}
            
            {newEquipment.type === 'кабель' && (
              <>
                <label className="block text-sm font-medium mb-1">Длина (м)</label>
                <input
                  type="number"
                  placeholder="Длина в метрах"
                  className="w-full border p-2 rounded mb-3"
                  value={newEquipment.length || ''}
                  onChange={e => setNewEquipment({ ...newEquipment, length: parseInt(e.target.value) || 0 })}
                />
              </>
            )}
            
            <label className="block text-sm font-medium mb-1">Местоположение</label>
            <input
              type="text"
              placeholder="Где находится"
              className="w-full border p-2 rounded mb-3"
              value={newEquipment.location}
              onChange={e => setNewEquipment({ ...newEquipment, location: e.target.value })}
            />
            
            <label className="block text-sm font-medium mb-1">Опора</label>
            <input
              type="text"
              placeholder="Номер опоры (например, ОП-12)"
              className="w-full border p-2 rounded mb-3"
              value={newEquipment.opora}
              onChange={e => setNewEquipment({ ...newEquipment, opora: e.target.value })}
            />
            
            <label className="block text-sm font-medium mb-1">РЛНД</label>
            <input
              type="text"
              placeholder="РЛНД (например, РЛНД-10)"
              className="w-full border p-2 rounded mb-4"
              value={newEquipment.rlnd}
              onChange={e => setNewEquipment({ ...newEquipment, rlnd: e.target.value })}
            />
            
            <div className="flex gap-3">
              <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded flex-1">
                Создать
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