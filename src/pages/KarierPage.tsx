import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { useState, useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'

interface BKRU {
  id: string
  name: string
  karierId: string
}

export default function KarierPage() {
  const { addBKRU } = useStore()
  const [bkruList, setBkruList] = useState<BKRU[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newBKRUName, setNewBKRUName] = useState('')
  const [selectedKarier, setSelectedKarier] = useState('')

  const KARIERS = [
    { id: 'zapadny1', name: 'Западный №1' },
    { id: 'zapadny2', name: 'Западный №2' }
  ]

  // Загружаем БКРУ напрямую из Firebase
  useEffect(() => {
    const bkruRef = ref(db, 'bkru')
    const unsubscribe = onValue(bkruRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id: id,
          name: val.name || 'Без имени',
          karierId: val.karierId || 'zapadny1'
        }))
        setBkruList(list)
      } else {
        // Если данных нет, создаём стандартные БКРУ
        setBkruList([
          { id: 'zapadny1_bkru1', name: 'БКРУ-1', karierId: 'zapadny1' },
          { id: 'zapadny2_bkru2', name: 'БКРУ-2', karierId: 'zapadny2' }
        ])
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const getBKRUForKarier = (karierId: string) => {
    return bkruList.filter(b => b.karierId === karierId)
  }

  const handleAddBKRU = async () => {
    if (newBKRUName && selectedKarier) {
      await addBKRU(selectedKarier, newBKRUName)
      setShowAddForm(false)
      setNewBKRUName('')
      setSelectedKarier('')
      // Перезагружаем список
      const bkruRef = ref(db, 'bkru')
      const snapshot = await fetch(bkruRef)
      // Простой способ: обновить страницу
      window.location.reload()
    }
  }

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Карьеры</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Добавить БКРУ
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {KARIERS.map(k => (
          <div key={k.id} className="bg-white rounded-xl shadow p-6">
            <h2 className="text-2xl font-bold mb-4">{k.name}</h2>
            <div className="space-y-3">
              {getBKRUForKarier(k.id).map(b => (
                <Link
                  key={b.id}
                  to={`/bkru/${k.id}/${b.id}`}
                  className="block bg-gray-100 p-3 rounded-lg hover:bg-blue-50 transition"
                >
                  {b.name}
                </Link>
              ))}
              {getBKRUForKarier(k.id).length === 0 && (
                <div className="text-gray-500 text-center py-4">
                  Нет БКРУ
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Добавить БКРУ</h2>
            <select
              className="w-full border p-2 rounded mb-3"
              value={selectedKarier}
              onChange={e => setSelectedKarier(e.target.value)}
            >
              <option value="">Выберите карьер</option>
              <option value="zapadny1">Западный №1</option>
              <option value="zapadny2">Западный №2</option>
            </select>
            <input
              type="text"
              placeholder="Название БКРУ (например, БКРУ-3)"
              className="w-full border p-2 rounded mb-4"
              value={newBKRUName}
              onChange={e => setNewBKRUName(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={handleAddBKRU} className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700">
                Добавить
              </button>
              <button onClick={() => setShowAddForm(false)} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}