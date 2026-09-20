import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, push } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyBCZPFjNb0nhfYLzSmSIT-sx2wDPd7ZE9w",
  authDomain: "karier-schema.firebaseapp.com",
  databaseURL: "https://karier-schema-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "karier-schema",
  storageBucket: "karier-schema.firebasestorage.app",
  messagingSenderId: "339600572382",
  appId: "1:339600572382:web:00f67318403f6c3429a74f"
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

async function addCablesInWork() {
  try {
    // Добавляем узел cablesInWork (если его нет)
    const cablesRef = ref(db, 'cablesInWork')
    
    // Добавляем тестовый кабель
    const newCableRef = push(cablesRef)
    await set(newCableRef, {
      name: "КГЭ 3×95",
      length: 250,
      status: "inWork",
      createdAt: Date.now()
    })
    
    console.log("✅ Кабель добавлен в cablesInWork")
  } catch (error) {
    console.error("❌ Ошибка:", error)
  }
}

addCablesInWork()