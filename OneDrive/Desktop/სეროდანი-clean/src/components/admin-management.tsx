"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { addAdminUser, removeAdminUser } from "@/lib/init-collections"
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Trash2, UserPlus, CheckCircle2, AlertCircle, UserCheck, UserX } from "lucide-react"

interface AdminUser {
  email: string
  isAdmin: boolean
  createdAt?: Date
}

interface UserData {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  isAdmin: boolean
  lastLogin?: Date
}

export function AdminManagement() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    fetchAdmins()
    fetchUsers()
  }, [])

  const fetchAdmins = async () => {
    try {
      const adminsSnapshot = await getDocs(collection(db, "admins"))
      const adminsList: AdminUser[] = []

      adminsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.isAdmin) {
          adminsList.push({
            email: doc.id,
            isAdmin: data.isAdmin,
            createdAt: data.createdAt?.toDate(),
          })
        }
      })

      setAdmins(adminsList)
    } catch (error) {
      console.error("Error fetching admins:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"))
      const usersList: UserData[] = []

      usersSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.uid && doc.id === data.uid) {
          usersList.push({
            uid: data.uid,
            email: data.email,
            displayName: data.displayName,
            photoURL: data.photoURL,
            isAdmin: data.isAdmin || false,
            lastLogin: data.lastLogin?.toDate(),
          })
        }
      })

      setUsers(usersList)
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (!email || !email.includes("@")) {
        setError("Please enter a valid email address")
        return
      }

      await addAdminUser(email)
      setSuccess(`Successfully added ${email} as admin`)
      setEmail("")
      await fetchAdmins()
    } catch (err) {
      setError("Error adding admin user")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAdmin = async (adminEmail: string) => {
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      await removeAdminUser(adminEmail)
      setSuccess(`Successfully removed ${adminEmail} from admin`)
      await fetchAdmins()
    } catch (err) {
      setError("Error removing admin user")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleUserAdmin = async (userId: string, email: string, makeAdmin: boolean) => {
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      await setDoc(
        doc(db, "users", userId),
        {
          isAdmin: makeAdmin,
          updatedAt: new Date(),
        },
        { merge: true }
      )

      if (email) {
        await setDoc(
          doc(db, "users", email),
          {
            isAdmin: makeAdmin,
            updatedAt: new Date(),
          },
          { merge: true }
        )
      }

      if (makeAdmin) {
        await addAdminUser(email)
      } else {
        await removeAdminUser(email)
      }

      setSuccess(`Successfully ${makeAdmin ? 'enabled' : 'disabled'} admin status for ${email}`)
      await fetchUsers()
      await fetchAdmins()
    } catch (err) {
      setError(`Error ${makeAdmin ? 'enabling' : 'disabling'} admin status`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="mr-2 h-5 w-5" />
            Add New Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div>
              <Label htmlFor="admin-email">Gmail Address</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@gmail.com"
                required
              />
              <p className="text-sm text-gray-600 mt-1">
                Enter the Gmail address of the user you want to make an admin
              </p>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Admin"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-gray-500">No registered users found</p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{user.email}</p>
                    {user.displayName && <p className="text-sm text-gray-700">{user.displayName}</p>}
                    {user.lastLogin && (
                      <p className="text-sm text-gray-500">Last login: {user.lastLogin.toLocaleDateString()}</p>
                    )}
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${user.isAdmin ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {user.isAdmin ? 'Admin' : 'User'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant={user.isAdmin ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleUserAdmin(user.uid, user.email, !user.isAdmin)}
                    disabled={loading}
                  >
                    {user.isAdmin ? (
                      <>
                        <UserX className="h-4 w-4 mr-1" />
                        Remove Admin
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-1" />
                        Make Admin
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Admins</CardTitle>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-gray-500">No admin users found</p>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div key={admin.email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{admin.email}</p>
                    {admin.createdAt && (
                      <p className="text-sm text-gray-500">Added: {admin.createdAt.toLocaleDateString()}</p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveAdmin(admin.email)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
