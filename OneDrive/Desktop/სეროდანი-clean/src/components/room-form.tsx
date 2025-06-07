"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { uploadImage, addRoom } from "@/lib/upload-utils"
import { Loader2, XCircle, ArrowUp, ArrowDown } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface RoomFormProps {
  onRoomAdded?: () => void
}

interface ImageFile {
  file: File
  preview: string
  position: number
}

export function RoomForm({ onRoomAdded }: RoomFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [images, setImages] = useState<ImageFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setSuccess(false)

    if (e.target.files && e.target.files.length > 0) {
      const newImages: ImageFile[] = []
      
      Array.from(e.target.files).forEach(file => {
        // Create preview
        const objectUrl = URL.createObjectURL(file)
        // Position is determined by current length of images array
        newImages.push({
          file,
          preview: objectUrl,
          position: images.length + newImages.length
        })
      })
      
      setImages([...images, ...newImages])
    }
    
    // Clear file input for future selections
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }
  
  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index)
    // უნდა განვაახლოთ დარჩენილი სურათების პოზიციები
    const reorderedImages = updatedImages.map((img, i) => ({
      ...img,
      position: i
    }))
    setImages(reorderedImages)
  }
  
  const moveImageUp = (index: number) => {
    if (index === 0) return
    
    const updatedImages = [...images]
    // გავცვალოთ მიმდინარე ფოტოსა და მის წინა ფოტოს პოზიციები
    const temp = updatedImages[index]
    updatedImages[index] = updatedImages[index - 1]
    updatedImages[index - 1] = temp
    
    // განვაახლოთ პოზიციების ნომრები
    const reorderedImages = updatedImages.map((img, i) => ({
      ...img,
      position: i
    }))
    
    setImages(reorderedImages)
  }
  
  const moveImageDown = (index: number) => {
    if (index === images.length - 1) return
    
    const updatedImages = [...images]
    // გავცვალოთ მიმდინარე ფოტოსა და მის შემდეგ ფოტოს პოზიციები
    const temp = updatedImages[index]
    updatedImages[index] = updatedImages[index + 1]
    updatedImages[index + 1] = temp
    
    // განვაახლოთ პოზიციების ნომრები
    const reorderedImages = updatedImages.map((img, i) => ({
      ...img,
      position: i
    }))
    
    setImages(reorderedImages)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (images.length === 0) {
        setError("გთხოვთ, აირჩიოთ მინიმუმ ერთი ფოტო ოთახისთვის")
        setLoading(false)
        return
      }

      if (!name || !description || !price) {
        setError("გთხოვთ, შეავსოთ ყველა ველი")
        setLoading(false)
        return
      }

      // Upload all images
      const uploadedImages = []
      for (let i = 0; i < images.length; i++) {
        const imageUrl = await uploadImage(images[i].file, "rooms")
        uploadedImages.push({
          url: imageUrl,
          position: images[i].position
        })
      }
      
      // მთავარი სურათი იქნება პირველი (position = 0)
      const mainImageUrl = uploadedImages.find(img => img.position === 0)?.url || uploadedImages[0].url

      // Add the room to Firestore
      await addRoom({
        name,
        description,
        price: Number.parseFloat(price),
        imageUrl: mainImageUrl,
        images: uploadedImages
      })

      // Reset form
      setName("")
      setDescription("")
      setPrice("")
      
      // გავაუქმოთ ყველა preview URL
      images.forEach(img => URL.revokeObjectURL(img.preview))
      setImages([])

      setSuccess(true)
      toast({
        title: "წარმატება",
        description: `ოთახი "${name}" წარმატებით დაემატა.`,
      })
      
      // Call the callback if provided
      if (onRoomAdded) {
        onRoomAdded()
      }
    } catch (err) {
      setError("შეცდომა ოთახის დამატებისას. გთხოვთ, სცადოთ თავიდან.")
      console.error(err)
      toast({
        title: "შეცდომა",
        description: "ოთახის დამატება ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-2">ახალი ოთახის დამატება</h3>
      <p className="text-gray-600 mb-4">შექმენით ახალი ოთახი დეტალებით და სურათებით</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="room-name" className="block mb-2">
            ოთახის სახელი
          </Label>
          <Input
            id="room-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="სტანდარტული ორადგილიანი ოთახი"
            required
          />
        </div>

        <div>
          <Label htmlFor="room-description" className="block mb-2">
            აღწერა
          </Label>
          <Textarea
            id="room-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="კომფორტული ოთახი ორადგილიანი საწოლით და მთის ხედით..."
            required
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="room-price" className="block mb-2">
            ფასი (ლარი)
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
          <Label htmlFor="room-images" className="block mb-2">
            ოთახის ფოტოები (შეგიძლიათ აირჩიოთ რამდენიმე)
          </Label>
          <Input 
            id="room-images" 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className="w-full" 
            multiple 
            ref={fileInputRef}
          />
          <p className="text-xs text-gray-500 mt-1">
            პირველი ფოტო ჩაითვლება მთავარ ფოტოდ. ფოტოების რიგითობის შესაცვლელად გამოიყენეთ ისრები.
          </p>
        </div>

        {/* Preview */}
        {images.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">ფოტოები:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((img, index) => (
                <div key={index} className="relative bg-gray-100 rounded-md overflow-hidden">
                  <img src={img.preview} alt={`ოთახის წინასწარი ხედი ${index + 1}`} className="w-full h-48 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => removeImage(index)}
                    >
                      <XCircle className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8" 
                      disabled={index === 0}
                      onClick={() => moveImageUp(index)}
                    >
                      <ArrowUp className="h-5 w-5" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8" 
                      disabled={index === images.length - 1}
                      onClick={() => moveImageDown(index)}
                    >
                      <ArrowDown className="h-5 w-5" />
                    </Button>
                  </div>
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                      მთავარი ფოტო
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-500 text-sm">ოთახი წარმატებით დაემატა!</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ოთახის დამატება...
            </>
          ) : (
            "დაამატე ოთახი"
          )}
        </Button>
      </form>
    </div>
  )
}
