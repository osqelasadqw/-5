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
      <h1 className="text-3xl font-bold mb-8">ადმინ პანელი</h1>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">მიმოხილვა</TabsTrigger>
          <TabsTrigger value="admins">ადმინების მართვა</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Home className="mr-2 h-5 w-5 text-blue-500" />
                  მთავარი გვერდი
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  მართეთ მთავარი გვერდის სურათები, სლაიდერი და სხვა კონტენტი.
                </p>
                <Link href="/admin/home-page">
                  <Button variant="outline" className="w-full">
                    მართვა
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Bed className="mr-2 h-5 w-5 text-indigo-500" />
                  ოთახები
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  დაამატეთ, შეცვალეთ ან წაშალეთ ოთახები ფოტოებით, აღწერილობებითა და ფასებით.
                </p>
                <Link href="/admin/rooms">
                  <Button variant="outline" className="w-full">
                    მართვა
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <ImageIcon className="mr-2 h-5 w-5 text-green-500" />
                  გალერეა
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  ატვირთეთ და დაალაგეთ ფოტოები გალერეის განყოფილებაში.
                </p>
                <Link href="/admin/gallery">
                  <Button variant="outline" className="w-full">
                    მართვა
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <UtensilsCrossed className="mr-2 h-5 w-5 text-amber-500" />
                  რესტორანი
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  განაახლეთ რესტორნის სურათები, მენიუ და ინფორმაცია.
                </p>
                <Link href="/admin/dining">
                  <Button variant="outline" className="w-full">
                    მართვა
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Wine className="mr-2 h-5 w-5 text-red-500" />
                  მარანი და ღვინო
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  მართეთ მარნის სურათები და ინფორმაცია.
                </p>
                <Link href="/admin/wines">
                  <Button variant="outline" className="w-full">
                    მართვა
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5 text-purple-500" />
                  ადმინისტრატორები
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  მართეთ ადმინისტრატორები და უფლებები.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const tabsTrigger = document.querySelector('[data-state="inactive"][value="admins"]') as HTMLElement
                    if (tabsTrigger) tabsTrigger.click()
                  }}
                >
                  მართვა
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
