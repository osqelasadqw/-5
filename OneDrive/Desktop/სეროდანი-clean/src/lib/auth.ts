"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { app, googleProvider, db } from "./firebase"
import { initializeCollections } from "./init-collections"

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  error: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  error: null,
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const auth = getAuth(app)

  // Check if user is admin
  const checkAdminStatus = async (userEmail: string) => {
    try {
      const adminDoc = await getDoc(doc(db, "admins", userEmail))
      return adminDoc.exists() && adminDoc.data()?.isAdmin === true
    } catch (error) {
      console.error("Error checking admin status:", error)
      return false
    }
  }

  // Create user profile in Firestore
  const createUserProfile = async (user: User) => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))

      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date(),
          lastLogin: new Date(),
        })
      } else {
        // Update last login
        await setDoc(
          doc(db, "users", user.uid),
          {
            lastLogin: new Date(),
          },
          { merge: true },
        )
      }
    } catch (error) {
      console.error("Error creating user profile:", error)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        // Create user profile
        await createUserProfile(user)

        // Check admin status
        if (user.email) {
          const adminStatus = await checkAdminStatus(user.email)
          setIsAdmin(adminStatus)

          // Initialize collections if user is admin
          if (adminStatus) {
            await initializeCollections()
          }
        }
      } else {
        setIsAdmin(false)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [auth])

  const signIn = async (email: string, password: string) => {
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      setError("Invalid email or password")
      throw error
    }
  }

  const signInWithGoogle = async () => {
    setError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      if (user.email) {
        // Create user profile
        await createUserProfile(user)

        // Check admin status
        const adminStatus = await checkAdminStatus(user.email)
        setIsAdmin(adminStatus)

        // Initialize collections if user is admin
        if (adminStatus) {
          await initializeCollections()
        }
      }
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-in was cancelled")
      } else {
        setError("Error signing in with Google")
      }
      throw error
    }
  }

  const signOut = async () => {
    setError(null)
    try {
      await firebaseSignOut(auth)
      setIsAdmin(false)
    } catch (error) {
      setError("Error signing out")
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: user,
        loading: loading,
        isAdmin: isAdmin,
        signIn: signIn,
        signInWithGoogle: signInWithGoogle,
        signOut: signOut,
        error: error,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
