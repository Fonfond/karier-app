import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyBCZPFjNb0nhfYLzSmSIT-sx2wDPd7ZE9w",
  authDomain: "karier-schema.firebaseapp.com",
  databaseURL: "https://karier-schema-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "karier-schema",
  storageBucket: "karier-schema.firebasestorage.app",
  messagingSenderId: "339600572382",
  appId: "1:339600572382:web:00f67318403f6c3429a74f",
  measurementId: "G-HLH9ELRQZC"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)