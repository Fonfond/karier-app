import { useState } from 'react'
import { useStore } from '../store'

export default function LoginPage({ onLogin }: { onLogin: (name: string) => void }) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { setCurrentUser } = useStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    
    setIsLoading(true)
    
    try {
      // Сохраняем в localStorage
      localStorage.setItem('userName', trimmedName)
      // Сохраняем в store
      setCurrentUser(trimmedName)
      // Вызываем callback
      onLogin(trimmedName)
    } catch (error) {
      console.error('Ошибка при входе:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96 transform transition-all duration-300 hover:shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏭</div>
          <h1 className="text-3xl font-bold text-gray-800">Управление карьером</h1>
          <p className="text-gray-500 mt-2">Войдите в систему</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ваше имя
            </label>
            <input
              type="text"
              placeholder="Введите ваше имя"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={isLoading}
            />
          </div>
          
          <button 
            type="submit" 
            className={`w-full py-3 rounded-lg font-medium transition-all transform ${
              !name.trim() || isLoading
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg'
            } text-white`}
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Вход...</span>
              </div>
            ) : (
              'Войти'
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-400">
          Введите любое имя для входа
        </div>
      </div>
    </div>
  )
}