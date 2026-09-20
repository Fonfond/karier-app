import { Link } from 'react-router-dom'

export default function SimpleKarierPage() {
  const kariers = [
    {
      id: 'zapadny1_bkru1',
      name: 'Западный №1',
      bkruName: 'БКРУ-1'
    },
    {
      id: 'zapadny2_bkru2',
      name: 'Западный №2',
      bkruName: 'БКРУ-2'
    }
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Карьеры</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {kariers.map(k => (
          <div key={k.id} className="bg-white rounded-xl shadow p-6">
            <h2 className="text-2xl font-bold mb-4">{k.name}</h2>
            <Link
              to={`/bkru/${k.id}`}
              className="block bg-gray-100 p-3 rounded-lg hover:bg-blue-50 transition text-center"
            >
              {k.bkruName}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}