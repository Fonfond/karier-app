import { useState } from 'react'
import { storage } from '../firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import toast from 'react-hot-toast'

interface Props {
  equipmentId: string
  currentPhotoUrl?: string
  onUpload: (url: string) => void
}

export default function PhotoUpload({ equipmentId, currentPhotoUrl, onUpload }: Props) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    try {
      if (!storage) {
        throw new Error('Storage не инициализирован')
      }
      const storageRef = ref(storage, `equipment/${equipmentId}/${Date.now()}_${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      onUpload(url)
      toast.success('Фото загружено')
    } catch (error) {
      console.error('Ошибка загрузки фото:', error)
      toast.error('Ошибка загрузки фото')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      {currentPhotoUrl && (
        <img 
          src={currentPhotoUrl} 
          alt="Оборудование" 
          className="w-12 h-12 object-cover rounded mb-1"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      )}
      <label className="cursor-pointer bg-gray-200 px-2 py-1 rounded text-xs hover:bg-gray-300">
        {uploading ? '...' : '📷'}
        <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
      </label>
    </div>
  )
}