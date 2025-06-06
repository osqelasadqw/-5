"use client"

import { useState, useEffect } from "react"
import { RoomForm } from "@/components/room-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Room } from "@/types"
import { Trash2, AlertCircle } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { storage } from "@/lib/firebase"
import { ref, deleteObject } from "firebase/storage"

export default function AdminRoomsPage() {
  const [activeTab, setActiveTab] = useState("manage")
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    fetchRooms()
  }, [])

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
        title: "Error",
        description: "Failed to fetch rooms. Please try again.",
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

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return

    setDeleteLoading(true)
    try {
      // Delete document from firestore
      await deleteDoc(doc(db, "rooms", roomToDelete.id))

      // Delete image from storage if it exists
      if (roomToDelete.imageUrl) {
        // Extract the file path from the URL
        const imageUrl = roomToDelete.imageUrl
        if (imageUrl.includes('firebasestorage.googleapis.com')) {
          try {
            // Extract the path after /o/ and before ?
            const pathRegex = /\/o\/(.+?)\?/
            const match = imageUrl.match(pathRegex)
            if (match && match[1]) {
              const filePath = decodeURIComponent(match[1])
              const storageRef = ref(storage, filePath)
              await deleteObject(storageRef)
            }
          } catch (error) {
            console.error("Error deleting image from storage:", error)
          }
        }
      }

      // Update local state
      setRooms(rooms.filter(room => room.id !== roomToDelete.id))
      toast({
        title: "Success",
        description: `Room "${roomToDelete.name}" deleted successfully.`,
      })
    } catch (error) {
      console.error("Error deleting room:", error)
      toast({
        title: "Error",
        description: "Failed to delete room. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
      setRoomToDelete(null)
    }
  }

  const handleRoomAdded = () => {
    fetchRooms()
    setActiveTab("manage")
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Manage Rooms</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="manage">Existing Rooms</TabsTrigger>
          <TabsTrigger value="add">Add New Room</TabsTrigger>
        </TabsList>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Existing Rooms</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500">Loading rooms...</p>
              ) : rooms.length === 0 ? (
                <p className="text-gray-500">No rooms found. Add your first room!</p>
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
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold">{room.name}</h3>
                          <p className="text-green-600 font-medium">{room.price} GEL</p>
                        </div>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{room.description}</p>
                        <div className="flex justify-end">
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => confirmDelete(room)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
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
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              Delete Room
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{roomToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteRoom}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                'Delete Room'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
