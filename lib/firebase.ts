import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"
// import { getStorage } from "firebase/storage"
// import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyCzg4asluhOF9lzXpDTXIXco7LhjcuoOUo",
  authDomain: "location-a87af.firebaseapp.com",
  databaseURL: "https://location-a87af-default-rtdb.firebaseio.com",
  projectId: "location-a87af",
  storageBucket: "location-a87af.firebasestorage.app",
  messagingSenderId: "317543146745",
  appId: "1:317543146745:web:1e4790b9cf6734c9beee28",
  measurementId: "G-V3MZ9KDRLE",
}

let database: any = null
let app: any = null

try {
  app = initializeApp(firebaseConfig)
  database = getDatabase(app)
} catch (error) {
  console.error("Firebase initialization error:", error)
  // Fallback for when Firebase is not available
  database = null
}

export { database }
export default app
