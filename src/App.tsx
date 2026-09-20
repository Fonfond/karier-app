import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import SimpleKarierPage from './pages/SimpleKarierPage'
import BKRUPage from './pages/BKRUPpage'
import ReservePage from './pages/ReservePage'
import EquipmentTable from './pages/EquipmentTable'
import LoginPage from './pages/LoginPage'
import LogsPage from './pages/LogsPage'
import KSRPage from './pages/KSRPage'
import { Toaster } from 'react-hot-toast'
import CablesManager from './pages/CablesManager'
import { useStore } from './store'
import LightingMastsPage from './pages/LightingMastsPage'

function App() {
  const [userName, setUserName] = useState<string | null>(null)
  const { setCurrentUser, loadData } = useStore()

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('userName')
      if (savedName && savedName.trim()) {
        setUserName(savedName)
        setCurrentUser(savedName)
        loadData()
      }
    } catch (error) {
      console.error('Ошибка чтения localStorage:', error)
    }
  }, [])

  const handleLogin = (name: string) => {
    try {
      localStorage.setItem('userName', name)
      setUserName(name)
      setCurrentUser(name)
      loadData()
    } catch (error) {
      console.error('Ошибка записи localStorage:', error)
      setUserName(name)
      setCurrentUser(name)
      loadData()
    }
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem('userName')
    } catch (error) {
      console.error('Ошибка удаления из localStorage:', error)
    }
    setUserName(null)
    setCurrentUser(null)
  }

  if (!userName) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <Toaster position="top-right" />
        <nav className="bg-blue-800 text-white p-4 shadow-lg">
          <div className="container mx-auto flex gap-4 flex-wrap items-center">
            <Link to="/" className="font-bold text-xl hover:text-blue-200 transition">🏭 Карьеры</Link>
            <Link to="/reserve" className="hover:text-blue-200 transition">📦 Резерв</Link>
            <Link to="/equipment" className="hover:text-blue-200 transition">🔧 Оборудование</Link>
            <Link to="/cables-manager" className="hover:text-blue-200 transition">🔌 Кабели</Link>
            <Link to="/ksr" className="hover:text-blue-200 transition">📡 КСР</Link>
            <Link to="/lighting-masts" className="hover:text-blue-200 transition">💡 Мачты</Link>
            <Link to="/logs" className="hover:text-blue-200 transition">📋 Журнал</Link>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm">👤 {userName}</span>
              <button 
                onClick={handleLogout} 
                className="bg-red-600 px-3 py-1 rounded text-sm hover:bg-red-700 transition"
              >
                Выйти
              </button>
            </div>
          </div>
        </nav>
        <div className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<SimpleKarierPage />} />
            <Route path="/bkru/:bkruId" element={<BKRUPage />} />
            <Route path="/reserve" element={<ReservePage />} />
            <Route path="/cables-manager" element={<CablesManager />} />
            <Route path="/equipment" element={<EquipmentTable />} />
            <Route path="/ksr" element={<KSRPage />} />
            <Route path="/lighting-masts" element={<LightingMastsPage />} />
            <Route path="/logs" element={<LogsPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App