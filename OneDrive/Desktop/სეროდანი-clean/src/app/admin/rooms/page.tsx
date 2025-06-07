"use client"

import { useState, useEffect } from "react"
import { RoomForm } from "@/components/room-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Room } from "@/types"
import { Trash2, AlertCircle, Images } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { toast } from "@/components/ui/use-toast"
import { storage } from "@/lib/firebase"
import { ref, deleteObject } from "firebase/storage"
import { UploadForm } from "@/components/upload-form"
import { updateRoomsHeroImage } from "@/lib/upload-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

export default function AdminRoomsPage() {
  const [activeTab, setActiveTab] = useState("manage")
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [imagesDialogOpen, setImagesDialogOpen] = useState(false)
  const [heroSuccess, setHeroSuccess] = useState(false)

  useEffect(() => {
    fetchRooms()
  }, [])

  useEffect(() => {
    // Reset success messages when changing tabs
    setHeroSuccess(false)
  }, [activeTab])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const roomsCollection = collection(db, "rooms")
      const roomsSnapshot = await getDocs(roomsCollection)

      const roomsList: Room[] = []
      roomsSnapshot.forEach((doc) => {
        const data = doc.data() as any
        roomsList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        })
      })

      setRooms(roomsList)
    } catch (error) {
      console.error("Error fetching rooms:", error)
      toast({
        title: "შეცდომა",
        description: "ოთახების ჩატვირთვა ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = (room: Room) => {
    setRoomToDelete(room)
    setDeleteDialogOpen(true)
  }

  const showRoomImages = (room: Room) => {
    setSelectedRoom(room)
    setImagesDialogOpen(true)
  }

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return

    setDeleteLoading(true)
    try {
      // Delete document from firestore
      await deleteDoc(doc(db, "rooms", roomToDelete.id))

      // Delete all images from storage
      if (roomToDelete.images && roomToDelete.images.length > 0) {
        for (const image of roomToDelete.images) {
          try {
            // Extract the file path from the URL
            const imageUrl = image.url
            if (imageUrl.includes('firebasestorage.googleapis.com')) {
              // Extract the path after /o/ and before ?
              const pathRegex = /\/o\/(.+?)\?/
              const match = imageUrl.match(pathRegex)
              if (match && match[1]) {
                const filePath = decodeURIComponent(match[1])
                const storageRef = ref(storage, filePath)
                await deleteObject(storageRef)
              }
            }
          } catch (error) {
            console.error("Error deleting image from storage:", error)
          }
        }
      } 
      // თავსებადობისთვის, თუ ძველი ვერსიის ოთახი არის და მხოლოდ imageUrl მოცემული
      else if (roomToDelete.imageUrl) {
        try {
          const imageUrl = roomToDelete.imageUrl
          if (imageUrl.includes('firebasestorage.googleapis.com')) {
            const pathRegex = /\/o\/(.+?)\?/
            const match = imageUrl.match(pathRegex)
            if (match && match[1]) {
              const filePath = decodeURIComponent(match[1])
              const storageRef = ref(storage, filePath)
              await deleteObject(storageRef)
            }
          }
        } catch (error) {
          console.error("Error deleting image from storage:", error)
        }
      }

      // Update local state
      setRooms(rooms.filter(room => room.id !== roomToDelete.id))
      toast({
        title: "წარმატება",
        description: `ოთახი "${roomToDelete.name}" წარმატებით წაიშალა.`,
      })
    } catch (error) {
      console.error("Error deleting room:", error)
      toast({
        title: "შეცდომა",
        description: "ოთახის წაშლა ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
      setRoomToDelete(null)
    }
  }

  const handleHeroUpload = async (url: string) => {
    try {
      await updateRoomsHeroImage(url)
      setHeroSuccess(true)
      toast({
        title: "წარმატება",
        description: "ოთახების გვერდის მთავარი სურათი წარმატებით განახლდა.",
      })
    } catch (error) {
      console.error("Error updating hero image:", error)
      toast({
        title: "შეცდომა",
        description: "მთავარი სურათის განახლება ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.",
        variant: "destructive",
      })
    }
  }

  const handleRoomAdded = () => {
    fetchRooms()
    setActiveTab("manage")
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">ოთახების მართვა</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="manage">არსებული ოთახები</TabsTrigger>
          <TabsTrigger value="add">ახალი ოთახის დამატება</TabsTrigger>
          <TabsTrigger value="hero">მთავარი სურათი</TabsTrigger>
        </TabsList>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>არსებული ოთახები</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500">ოთახები იტვირთება...</p>
              ) : rooms.length === 0 ? (
                <p className="text-gray-500">ოთახები არ მოიძებნა. დაამატეთ პირველი ოთახი!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rooms.map((room) => (
                    <Card key={room.id} className="overflow-hidden">
                      <div className="relative h-48">
                        <img
                          src={room.imageUrl || "/placeholder.svg?height=192&width=384&text=Room"}
                          alt={room.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 flex space-x-2">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => showRoomImages(room)}
                            className="bg-black/50 hover:bg-black/70 text-white"
                          >
                            <Images className="h-4 w-4 mr-1" />
                            {room.images?.length || 1} ფოტო
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold">{room.name}</h3>
                          <p className="text-green-600 font-medium">{room.price} ლარი</p>
                        </div>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{room.description}</p>
                        <div className="flex justify-end">
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => confirmDelete(room)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            წაშლა
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <RoomForm onRoomAdded={handleRoomAdded} />
        </TabsContent>

        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>ოთახების გვერდის მთავარი სურათი</CardTitle>
              <p className="text-sm text-gray-500">ეს სურათი გამოჩნდება ოთახების გვერდზე მთავარ განყოფილებაში.</p>
            </CardHeader>
            <CardContent>
              {heroSuccess && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">მთავარი სურათი განახლდა!</AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-2">მიმდინარე სურათი</h3>
                  <div className="relative h-64 bg-gray-100 rounded-md overflow-hidden">
                    <img src="/room/hero.jpg" alt="Current Hero" className="w-full h-full object-cover" />
                  </div>
                </div>

                <UploadForm
                  title="ატვირთეთ ახალი სურათი"
                  description="რეკომენდებულია მაღალი რეზოლუციის (მინიმუმ 1920x1080) სურათი."
                  path="roomsHero"
                  onUploadComplete={handleHeroUpload}
                  previewHeight={250}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              ოთახის წაშლა
            </DialogTitle>
            <DialogDescription>
              დარწმუნებული ხართ, რომ გსურთ წაშალოთ "{roomToDelete?.name}"? ეს ქმედება ვერ იქნება გაუქმებული.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              გაუქმება
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteRoom}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-t-transparent"></div>
                  იშლება...
                </>
              ) : (
                'წაშლა'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Images Dialog */}
      <Dialog open={imagesDialogOpen} onOpenChange={setImagesDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedRoom?.name} - ფოტოები</DialogTitle>
            <DialogDescription>
              ოთახის ყველა ფოტო
            </DialogDescription>
          </DialogHeader>
          
          {selectedRoom && (
            <div className="mt-4">
              <Carousel className="w-full">
                <CarouselContent>
                  {selectedRoom.images && selectedRoom.images.length > 0 ? (
                    selectedRoom.images
                      .sort((a, b) => a.position - b.position)
                      .map((image, index) => (
                        <CarouselItem key={index}>
                          <div className="p-1">
                            <div className="relative rounded-lg overflow-hidden aspect-square">
                              <img 
                                src={image.url} 
                                alt={`${selectedRoom.name} - ფოტო ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                                ფოტო {index + 1} / {selectedRoom.images.length}
                              </div>
                            </div>
                          </div>
                        </CarouselItem>
                      ))
                  ) : (
                    <CarouselItem>
                      <div className="p-1">
                        <div className="relative rounded-lg overflow-hidden aspect-square">
                          <img 
                            src={selectedRoom.imageUrl} 
                            alt={selectedRoom.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </CarouselItem>
                  )}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setImagesDialogOpen(false)}>
              დახურვა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
