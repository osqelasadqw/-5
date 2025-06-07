"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { addAdminUser } from "@/lib/init-collections"
import { CheckCircle2, AlertCircle, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminSetupPage() {
  const { user, isAdmin } = useAuth()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (user && isAdmin) {
      // User is already an admin, redirect to dashboard
      router.push("/admin/dashboard")
    }
  }, [user, isAdmin, router])

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      if (!email || !email.includes("@")) {
        setError("Please enter a valid email address")
        return
      }

      await addAdminUser(email)
      setSuccess(true)
      setEmail("")
    } catch (err) {
      setError("Error setting up admin user")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (user && isAdmin) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Settings className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Setup</CardTitle>
          <p className="text-gray-600">Set up the first admin user for your hotel website</p>
        </CardHeader>
        <CardContent>
          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Admin user created successfully! You can now sign in with Google using this email address.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSetupAdmin} className="space-y-4">
            <div>
              <Label htmlFor="admin-email">Gmail Address</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@gmail.com"
                required
              />
              <p className="text-sm text-gray-600 mt-1">
                This Gmail address will be granted admin access to the hotel management system.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Setting up..." : "Create Admin User"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Enter your Gmail address above</li>
              <li>2. Click "Create Admin User"</li>
              <li>3. Go to the login page and sign in with Google</li>
              <li>4. Access the admin dashboard</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
