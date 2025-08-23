import { database } from "./firebase"
import { ref, get, set, push, remove } from "firebase/database"

export interface User {
  id: string
  username: string
  role: "manager" | "server" | "user"
  createdAt: string
  lastLogin?: string
  isActive: boolean
}

export interface Permission {
  userId: string
  role: "manager" | "server"
  grantedBy: string
  grantedAt: string
}

export const createUser = async (
  username: string,
  password: string,
  role: "manager" | "server" = "server",
): Promise<string> => {
  const usersRef = ref(database, "users")
  const newUserRef = push(usersRef)
  const userId = newUserRef.key!

  const user: User = {
    id: userId,
    username,
    role,
    createdAt: new Date().toISOString(),
    isActive: true,
  }

  await set(newUserRef, user)
  await set(ref(database, `credentials/${userId}`), { password })

  return userId
}

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const usersRef = ref(database, "users")
  const snapshot = await get(usersRef)

  if (snapshot.exists()) {
    const users = snapshot.val()
    for (const userId in users) {
      if (users[userId].username === username) {
        return { ...users[userId], id: userId }
      }
    }
  }

  return null
}

export const checkUserExists = async (username: string): Promise<boolean> => {
  const user = await getUserByUsername(username)
  return user !== null
}

export const validateCredentials = async (username: string, password: string): Promise<User | null> => {
  const user = await getUserByUsername(username)
  if (!user) return null

  const credentialsRef = ref(database, `credentials/${user.id}`)
  const snapshot = await get(credentialsRef)

  if (snapshot.exists() && snapshot.val().password === password) {
    // Update last login
    await set(ref(database, `users/${user.id}/lastLogin`), new Date().toISOString())
    return user
  }

  return null
}

export const getAllUsers = async (): Promise<User[]> => {
  const usersRef = ref(database, "users")
  const snapshot = await get(usersRef)

  if (snapshot.exists()) {
    const users = snapshot.val()
    return Object.keys(users).map((id) => ({ ...users[id], id }))
  }

  return []
}

export const updateUserRole = async (userId: string, role: "manager" | "server"): Promise<void> => {
  await set(ref(database, `users/${userId}/role`), role)
}

export const deleteUser = async (userId: string): Promise<void> => {
  await remove(ref(database, `users/${userId}`))
  await remove(ref(database, `credentials/${userId}`))
}

export const toggleUserStatus = async (userId: string, isActive: boolean): Promise<void> => {
  await set(ref(database, `users/${userId}/isActive`), isActive)
}
