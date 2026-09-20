import { useStore } from '../store'
import { Link } from 'react-router-dom'

export default function CablesTable() {
  const { cables, equipment } = useStore()

  const getEquipmentName = (id: string) => {
    const eq = equipment.find(e => e.id === id)
    return eq ? `${eq.type} — ${eq.name}` : '—'
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Все кабели</h1>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Название</th>
              <th className="p-3 text-left">Длина (м)</th>
              <th className="p-3 text-left">От ячейки</th>
              <th className="p-3 text-left">К оборудованию</th>
              <th className="p-3 text-left">Статус</th>
            </tr>
          </thead>
          <tbody>
            {cables.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.name}</td>
                <td className="p-3">{c.length}</td>
                <td className="p-3 font-mono text-sm">{c.fromYacheykaId}</td>
                <td className="p-3">{getEquipmentName(c.toEquipmentId)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-sm ${c.status === 'в работе' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {c.status === 'в работе' ? 'В работе' : 'Резерв'}
                  </span>
                </td>
              </tr>
            ))}
            {cables.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">Нет добавленных кабелей</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-sm text-gray-500">
        * Кабели создаются автоматически при подключении оборудования через форму
      </div>
    </div>
  )
}