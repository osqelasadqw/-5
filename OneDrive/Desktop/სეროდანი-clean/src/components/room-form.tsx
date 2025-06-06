"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { uploadImage, addRoom } from "@/lib/upload-utils"
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface RoomFormProps {
  onRoomAdded?: () => void
}

export function RoomForm({ onRoomAdded }: RoomFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setSuccess(false)

    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)

      // Create preview
      const objectUrl = URL.createObjectURL(selectedFile)
      setPreview(objectUrl)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (!file) {
        setError("Please select an image for the room")
        setLoading(false)
        return
      }

      if (!name || !description || !price) {
        setError("Please fill in all fields")
        setLoading(false)
        return
      }

      // Upload the image
      const imageUrl = await uploadImage(file, "rooms")

      // Add the room to Firestore
      await addRoom({
        name,
        description,
        price: Number.parseFloat(price),
        imageUrl,
      })

      // Reset form
      setName("")
      setDescription("")
      setPrice("")
      setFile(null)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(null)

      setSuccess(true)
      toast({
        title: "Success",
        description: `Room "${name}" has been added successfully.`,
      })
      
      // Call the callback if provided
      if (onRoomAdded) {
        onRoomAdded()
      }
    } catch (err) {
      setError("Error adding room. Please try again.")
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to add room. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-2">Add New Room</h3>
      <p className="text-gray-600 mb-4">Create a new room with details and image</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="room-name" className="block mb-2">
            Room Name
          </Label>
          <Input
            id="room-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Standard Queen Room"
            required
          />
        </div>

        <div>
          <Label htmlFor="room-description" className="block mb-2">
            Description
          </Label>
          <Textarea
            id="room-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A comfortable room with a queen-sized bed and mountain view..."
            required
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="room-price" className="block mb-2">
            Price (GEL)
          </Label>
          <Input
            id="room-price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="250"
            required
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <Label htmlFor="room-image" className="block mb-2">
            Room Image
          </Label>
          <Input id="room-image" type="file" accept="image/*" onChange={handleFileChange} className="w-full" required />
        </div>

        {/* Preview */}
        {preview && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Preview:</p>
            <div className="relative rounded-md overflow-hidden bg-gray-100 h-48">
              <img src={preview || "/placeholder.svg"} alt="Room Preview" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-500 text-sm">Room added successfully!</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding Room...
            </>
          ) : (
            "Add Room"
          )}
        </Button>
      </form>
    </div>
  )
}
