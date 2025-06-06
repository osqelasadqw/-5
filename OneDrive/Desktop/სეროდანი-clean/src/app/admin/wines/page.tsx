"use client"

import { useState, useEffect } from "react"
import { UploadForm } from "@/components/upload-form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { saveImageMetadata, updateSectionContent } from "@/lib/upload-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Image from "next/image"

export default function AdminWinesPage() {
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [wineImages, setWineImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWineImages = async () => {
      try {
        setLoading(true)
        const wineSnapshot = await getDocs(collection(db, "wines"))
        const images: string[] = []
        wineSnapshot.forEach((doc) => {
          if (doc.data().url) {
            images.push(doc.data().url)
          }
        })
        setWineImages(images)
      } catch (error) {
        console.error("Error fetching wine images:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchWineImages()
  }, [])

  const handleSuccess = (message: string) => {
    setSuccessMessage(message)
    setSuccess(true)
    
    // Reset success message after 3 seconds
    setTimeout(() => {
      setSuccess(false)
    }, 3000)
  }

  const handleWineHeroUpload = async (url: string) => {
    try {
      await updateSectionContent("wineHero", { imageUrl: url })
      handleSuccess("Hero image updated successfully!")
    } catch (error) {
      console.error("Error saving wine hero image:", error)
    }
  }

  const handleWineUpload = async (url: string) => {
    try {
      await saveImageMetadata("wines", url, {
        section: "wines",
        caption: "",
      })
      handleSuccess("Wine image uploaded successfully!")
      
      // Refresh wine images
      const wineSnapshot = await getDocs(collection(db, "wines"))
      const images: string[] = []
      wineSnapshot.forEach((doc) => {
        if (doc.data().url) {
          images.push(doc.data().url)
        }
      })
      setWineImages(images)
    } catch (error) {
      console.error("Error saving wine image:", error)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Manage Wine Cellar & Bar</h1>

      <Tabs defaultValue="heroImage" className="w-full mb-8">
        <TabsList>
          <TabsTrigger value="heroImage">Hero Image</TabsTrigger>
          <TabsTrigger value="wineImages">Wine Images</TabsTrigger>
        </TabsList>
        
        <TabsContent value="heroImage">
          <Card>
            <CardHeader>
              <CardTitle>Hero Image</CardTitle>
              <CardDescription>
                Update the large hero image at the top of the Wine Cellar & Bar page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success && successMessage.includes("Hero") && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}

              <UploadForm
                title="Upload Hero Image"
                description="This image will appear at the top of the Wine Cellar & Bar page. Recommended size: 1920x550px."
                path="wines/hero"
                onUploadComplete={handleWineHeroUpload}
                acceptMultiple={false}
                previewHeight={300}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="wineImages">
          <Card>
            <CardHeader>
              <CardTitle>Wine & Chacha Images</CardTitle>
              <CardDescription>
                Manage the images displayed in the Wine Cellar & Bar page. First 3 images will be shown in the top row, next 3 in the bottom row.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success && successMessage.includes("Wine") && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}

              <UploadForm
                title="Upload Wine & Chacha Images"
                description="These images will appear in the Wine and Chacha sections. Recommended size: 400x300px."
                path="wines"
                onUploadComplete={handleWineUpload}
                acceptMultiple={true}
                previewHeight={200}
              />

              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Current Wine Images</h3>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-400"></div>
                  </div>
                ) : wineImages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No wine images uploaded yet.</p>
                ) : (
                  <div>
                    <h4 className="text-md font-medium mb-2">Top Row (Wine Images)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      {wineImages.slice(0, 3).map((url, i) => (
                        <div key={`top-${i}`} className="relative h-40 bg-gray-100 rounded-md overflow-hidden">
                          <Image
                            src={url}
                            alt={`Wine image ${i + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                      {Array.from({ length: Math.max(0, 3 - Math.min(wineImages.length, 3)) }).map((_, i) => (
                        <div key={`placeholder-top-${i}`} className="h-40 bg-gray-100 rounded-md flex items-center justify-center">
                          <p className="text-gray-400">Image slot {wineImages.length + i + 1}</p>
                        </div>
                      ))}
                    </div>
                    
                    <h4 className="text-md font-medium mb-2">Bottom Row (Chacha Images)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {wineImages.slice(3, 6).map((url, i) => (
                        <div key={`bottom-${i}`} className="relative h-40 bg-gray-100 rounded-md overflow-hidden">
                          <Image
                            src={url}
                            alt={`Chacha image ${i + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                      {Array.from({ length: Math.max(0, 3 - Math.max(0, wineImages.length - 3)) }).map((_, i) => (
                        <div key={`placeholder-bottom-${i}`} className="h-40 bg-gray-100 rounded-md flex items-center justify-center">
                          <p className="text-gray-400">Image slot {Math.max(3, wineImages.length) + i + 1}</p>
                        </div>
                      ))}
                    </div>
                    
                    {wineImages.length > 6 && (
                      <>
                        <h4 className="text-md font-medium mb-2 mt-8">Additional Images</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {wineImages.slice(6).map((url, i) => (
                            <div key={`add-${i}`} className="relative h-40 bg-gray-100 rounded-md overflow-hidden">
                              <Image
                                src={url}
                                alt={`Additional image ${i + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
