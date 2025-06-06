"use client"

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react"
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const auth = getAuth(app)

  const checkAdminStatus = async (userEmail: string) => {
    try {
      const adminDoc = await getDoc(doc(db, "admins", userEmail))
      if (adminDoc.exists() && adminDoc.data()?.isAdmin === true) {
        return true
      }
      
      const userQuery = await getDoc(doc(db, "users", userEmail))
      return userQuery.exists() && userQuery.data()?.isAdmin === true
    } catch (error) {
      console.error("Error checking admin status:", error)
      return false
    }
  }

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
          isAdmin: false,
        })
      } else {
        await setDoc(
          doc(db, "users", user.uid),
          {
            lastLogin: new Date(),
          },
          { merge: true },
        )
      }

      if (user.email) {
        const userEmailDoc = await getDoc(doc(db, "users", user.email))
        
        if (!userEmailDoc.exists()) {
          await setDoc(doc(db, "users", user.email), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: new Date(),
            lastLogin: new Date(),
            isAdmin: false,
          })
        } else {
          await setDoc(
            doc(db, "users", user.email),
            {
              lastLogin: new Date(),
            },
            { merge: true },
          )
        }
      }
    } catch (error) {
      console.error("Error creating user profile:", error)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        await createUserProfile(user)

        if (user.email) {
          const adminStatus = await checkAdminStatus(user.email)
          setIsAdmin(adminStatus)

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
        await createUserProfile(user)

        const adminStatus = await checkAdminStatus(user.email)
        setIsAdmin(adminStatus)

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

  const providerValue = {
    user,
    loading,
    isAdmin,
    signIn,
    signInWithGoogle,
    signOut,
    error,
  }

  return <AuthContext.Provider value={providerValue}>{children}</AuthContext.Provider>
}
