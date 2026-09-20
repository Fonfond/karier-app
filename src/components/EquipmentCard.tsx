import { useState } from 'react'
import { ref, update, remove } from 'firebase/database'
import { db } from '../firebase'
import { useStore } from '../store'
import toast from 'react-hot-toast'

interface EquipmentCardProps {
  equipment: {
    id: string
    type: string
    name: string
    location?: string
    opora?: string
    rlnd?: string
    model?: string
    power?: string
    length?: number
    number?: string
    photoUrl?: string
    status?: string
    installedAtName?: string
    cableName?: string
    source?: string  // 'reserve', 'equipment', 'ksr', 'cable'
  }
  onClose: () => void
  onUpdate: () => void
}

export default function EquipmentCard({ equipment, onClose, onUpdate }: EquipmentCardProps) {
  const { addLog } = useStore()
  const [form, setForm] = useState(equipment)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const getNodePath = () => {
    // Если есть source, используем его для определения пути
    if (equipment.source === 'reserve') return 'reserve'
    if (equipment.source === 'equipment') return 'equipment'
    if (equipment.source === 'ksr') return 'ksrInWork'
    if (equipment.source === 'cable') return 'cablesInWork'
    
    // Иначе определяем по типу и статусу
    switch (equipment.type) {
      case 'КСР':
        if (equipment.status === 'inWork' || equipment.installedAtName) {
          return 'ksrInWork'
        }
        return 'ksr'
      case 'кабель':
        if (equipment.status === 'inWork' || equipment.cableName) {
          return 'cablesInWork'
        }
        return 'reserve'
      default:
        return 'equipment'
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updateData: any = {
        name: form.name,
        location: form.location || '',
        opora: form.opora || '',
        rlnd: form.rlnd || ''
      }
      
      if (form.type === 'ЯКНО' && form.model) updateData.model = form.model
      if (form.type === 'КТП' && form.power) updateData.power = form.power
      if (form.type === 'кабель' && form.length) updateData.length = form.length
      if (form.type === 'КСР' && form.number) updateData.number = form.number
      
      const nodePath = getNodePath()
      await update(ref(db, `${nodePath}/${equipment.id}`), updateData)
      await addLog('Оборудование отредактировано', { id: equipment.id, updates: updateData })
      toast.success('Изменения сохранены')
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error('Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (confirm(`Удалить "${equipment.name}"? Это действие нельзя отменить.`)) {
      setDeleting(true)
      try {
        const nodePath = getNodePath()
        await remove(ref(db, `${nodePath}/${equipment.id}`))
        await addLog('Оборудование удалено', { id: equipment.id, name: equipment.name })
        toast.success('Оборудование удалено')
        onUpdate()
        onClose()
      } catch (error) {
        console.error('Ошибка:', error)
        toast.error('Ошибка при удалении')
      } finally {
        setDeleting(false)
      }
    }
  }

  const getIcon = () => {
    switch (equipment.type) {
      case 'ЭКГ': return '🚜'
      case 'КТП': return '⚡'
      case 'ЯКНО': return '📦'
      case 'КСР': return '📡'
      case 'кабель': return '🔌'
      default: return '🔧'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {getIcon()} {equipment.type} — {equipment.name}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
        </div>
        
        {/* Основные поля */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Название</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border p-2 rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Местоположение</label>
            <input
              type="text"
              value={form.location || ''}
              onChange={e => setForm({ ...form, location: e.target.value })}
              className="w-full border p-2 rounded"
              placeholder="Где находится"
            />
          </div>
          
          {(equipment.type === 'ЭКГ' || equipment.type === 'КТП' || equipment.type === 'ЯКНО') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Опора</label>
                <input
                  type="text"
                  value={form.opora || ''}
                  onChange={e => setForm({ ...form, opora: e.target.value })}
                  className="w-full border p-2 rounded"
                  placeholder="ОП-12"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">РЛНД</label>
                <input
                  type="text"
                  value={form.rlnd || ''}
                  onChange={e => setForm({ ...form, rlnd: e.target.value })}
                  className="w-full border p-2 rounded"
                  placeholder="РЛНД-10"
                />
              </div>
            </>
          )}
          
          {equipment.type === 'ЯКНО' && (
            <div>
              <label className="block text-sm font-medium mb-1">Модель</label>
              <input
                type="text"
                value={form.model || ''}
                onChange={e => setForm({ ...form, model: e.target.value })}
                className="w-full border p-2 rounded"
                placeholder="ЯКНО-6"
              />
            </div>
          )}
          
          {equipment.type === 'КТП' && (
            <div>
              <label className="block text-sm font-medium mb-1">Мощность</label>
              <input
                type="text"
                value={form.power || ''}
                onChange={e => setForm({ ...form, power: e.target.value })}
                className="w-full border p-2 rounded"
                placeholder="630 кВА"
              />
            </div>
          )}
          
          {equipment.type === 'кабель' && (
            <div>
              <label className="block text-sm font-medium mb-1">Длина (м)</label>
              <input
                type="number"
                value={form.length || ''}
                onChange={e => setForm({ ...form, length: parseInt(e.target.value) || 0 })}
                className="w-full border p-2 rounded"
                placeholder="250"
              />
            </div>
          )}
          
          {equipment.type === 'КСР' && (
            <div>
              <label className="block text-sm font-medium mb-1">Номер</label>
              <input
                type="text"
                value={form.number || ''}
                onChange={e => setForm({ ...form, number: e.target.value })}
                className="w-full border p-2 rounded"
                placeholder="КСР-01"
              />
            </div>
          )}
        </div>
        
        {/* Информация о подключении */}
        {equipment.installedAtName && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              🔗 Подключено к: {equipment.installedAtName}
            </p>
          </div>
        )}
        
        {equipment.cableName && (
          <div className="mt-2 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              🔌 Кабель: {equipment.cableName}
            </p>
          </div>
        )}
        
        {/* Кнопки */}
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded flex-1 hover:bg-red-700" disabled={deleting}>
            {deleting ? 'Удаление...' : 'Удалить'}
          </button>
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}