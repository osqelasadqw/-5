"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminManagement } from "@/components/admin-management"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home, ImageIcon, Bed, UtensilsCrossed, Wine, ArrowRight, Users } from "lucide-react"

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="admins">Manage Admins</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Home className="mr-2 h-5 w-5 text-blue-500" />
                  Home Page
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Manage hero image, slider, story section, and other home page content.
                </p>
                <Link href="/admin/home-page">
                  <Button variant="outline" className="w-full">
                    Manage
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Bed className="mr-2 h-5 w-5 text-indigo-500" />
                  Rooms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Add, edit, or remove rooms with images, descriptions, and pricing.</p>
                <Link href="/admin/rooms">
                  <Button variant="outline" className="w-full">
                    Manage
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <ImageIcon className="mr-2 h-5 w-5 text-green-500" />
                  Gallery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Upload and organize photos for the gallery section.</p>
                <Link href="/admin/gallery">
                  <Button variant="outline" className="w-full">
                    Manage
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <UtensilsCrossed className="mr-2 h-5 w-5 text-amber-500" />
                  Fine Dining
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Update restaurant images, menu, and dining information.</p>
                <Link href="/admin/dining">
                  <Button variant="outline" className="w-full">
                    Manage
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Wine className="mr-2 h-5 w-5 text-red-500" />
                  Wine Cellar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Manage wine cellar images and information.</p>
                <Link href="/admin/wines">
                  <Button variant="outline" className="w-full">
                    Manage
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5 text-purple-500" />
                  Admin Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Manage admin users and permissions.</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const tabsTrigger = document.querySelector('[data-state="inactive"][value="admins"]') as HTMLElement
                    if (tabsTrigger) tabsTrigger.click()
                  }}
                >
                  Manage
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="admins">
          <AdminManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
