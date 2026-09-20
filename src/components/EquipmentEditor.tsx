import { useState } from 'react'
import { useStore } from '../store'
import toast from 'react-hot-toast'

interface Props {
  equipment: any
  onClose: () => void
}

export default function EquipmentEditor({ equipment, onClose }: Props) {
  const { updateEquipment, deleteEquipment } = useStore()
  const [form, setForm] = useState(equipment)

  const handleSave = async () => {
    await updateEquipment(equipment.id, form)
    toast.success('Оборудование обновлено')
    onClose()
  }

  const handleDelete = async () => {
    if (confirm('Удалить оборудование?')) {
      await deleteEquipment(equipment.id)
      toast.success('Оборудование удалено')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Редактировать {equipment.name}</h2>
        
        <label className="block text-sm font-medium mb-1">Название</label>
        <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} 
               className="w-full border p-2 rounded mb-3"/>
        
        <label className="block text-sm font-medium mb-1">Опора</label>
        <input type="text" value={form.opora || ''} onChange={e => setForm({...form, opora: e.target.value})} 
               className="w-full border p-2 rounded mb-3"/>
        
        <label className="block text-sm font-medium mb-1">РЛНД</label>
        <input type="text" value={form.rlnd || ''} onChange={e => setForm({...form, rlnd: e.target.value})} 
               className="w-full border p-2 rounded mb-3"/>
        
        <label className="block text-sm font-medium mb-1">Местоположение</label>
        <input type="text" value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} 
               className="w-full border p-2 rounded mb-3"/>
        
        <label className="block text-sm font-medium mb-1">Статус</label>
        <select value={form.status || 'выкл'} onChange={e => setForm({...form, status: e.target.value})}
                className="w-full border p-2 rounded mb-4">
          <option value="вкл">🟢 Включено</option>
          <option value="выкл">🔴 Выключено</option>
        </select>
        
        <div className="flex gap-3">
          <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700">
            Сохранить
          </button>
          <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Удалить
          </button>
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}