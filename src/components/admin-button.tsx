"use client"

import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import Link from "next/link"

export function AdminButton() {
  const { user, isAdmin } = useAuth()

  if (!user || !isAdmin) {
    return null
  }

  return (
    <Link href="/admin/dashboard">
      <Button
        variant="outline"
        size="sm"
        className="fixed top-4 right-4 z-50 bg-white/90 backdrop-blur-sm border-gray-300 hover:bg-gray-100"
      >
        <Settings className="mr-2 h-4 w-4" />
        Admin Panel
      </Button>
    </Link>
  )
}
