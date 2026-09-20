import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { ref, onValue, query, limitToLast, orderByKey } from 'firebase/database'

interface Log {
  id: string
  action: string
  user: string
  timestamp: number
  details: any
}

// Функция для форматирования деталей в читаемый вид
const formatDetails = (details: any): string => {
  if (!details) return '—'
  
  // Если details уже строка
  if (typeof details === 'string') return details
  
  // Если details объект
  if (typeof details === 'object') {
    // Оборудование (имя, тип)
    if (details.name && details.type) {
      return `${details.type} "${details.name}"`
    }
    // Только имя
    if (details.name) {
      return details.name
    }
    // Статус оборудования
    if (details.newStatus) {
      return `Статус изменён на ${details.newStatus === 'вкл' ? 'Включено' : 'Выключено'}`
    }
    // Заземление
    if (details.grounding !== undefined) {
      return `Заземление ${details.grounding ? 'установлено' : 'снято'}`
    }
    // Ячейка
    if (details.yacheykaId && details.newStatus) {
      return `Ячейка ${details.newStatus === 'вкл' ? 'включена' : 'выключена'}`
    }
    // Кабель
    if (details.cableName) {
      return `Кабель "${details.cableName}"`
    }
    // Подключение оборудования
    if (details.equipment && details.targetName) {
      return `${details.equipment} → ${details.targetName}`
    }
    if (details.equipment && details.target) {
      return `${details.equipment} → ${details.targetName || details.target}`
    }
    // Обновления
    if (details.updates) {
      const changed = Object.keys(details.updates).filter(k => details.updates[k]).join(', ')
      return `Изменены поля: ${changed}`
    }
    // Возврат в резерв
    if (details.id && details.name) {
      return details.name
    }
    // Попытка извлечь первое значение
    const firstValue = Object.values(details)[0]
    if (typeof firstValue === 'string') {
      return firstValue
    }
  }
  
  // Если ничего не подошло
  return JSON.stringify(details)
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])

  useEffect(() => {
    const logsRef = query(ref(db, 'logs'), orderByKey(), limitToLast(100))
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val()
      const list = data ? Object.entries(data).map(([id, val]: [string, any]) => ({ 
        id, 
        action: val.action,
        user: val.user,
        timestamp: val.timestamp,
        details: val.details
      })) : []
      setLogs(list.reverse())
    })
    return () => unsubscribe()
  }, [])

  // Группировка логов по датам
  const groupedLogs = logs.reduce((acc, log) => {
    const date = new Date(log.timestamp).toLocaleDateString('ru-RU')
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {} as Record<string, Log[]>)

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Журнал изменений</h1>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="p-3 text-left w-40">Дата/Время</th>
              <th className="p-3 text-left w-32">Пользователь</th>
              <th className="p-3 text-left w-48">Действие</th>
              <th className="p-3 text-left">Детали</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-t hover:bg-gray-50">
                <td className="p-3 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString('ru-RU')}
                </td>
                <td className="p-3">
                  <span className="font-medium">{log.user}</span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    log.action.includes('включено') ? 'bg-green-100 text-green-800' :
                    log.action.includes('выключено') ? 'bg-red-100 text-red-800' :
                    log.action.includes('добавлено') ? 'bg-blue-100 text-blue-800' :
                    log.action.includes('удалено') ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-3 text-sm">
                  {formatDetails(log.details)}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  📋 Нет записей в журнале
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}