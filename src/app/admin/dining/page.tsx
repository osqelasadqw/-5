"use client"

import { useState, useEffect } from "react"
import { UploadForm } from "@/components/upload-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { saveImageMetadata } from "@/lib/upload-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Image from "next/image"

export default function AdminDiningPage() {
  const [diningSuccess, setDiningSuccess] = useState(false)
  const [heroSuccess, setHeroSuccess] = useState(false)
  const [menuSuccess, setMenuSuccess] = useState(false)
  const [currentHeroImage, setCurrentHeroImage] = useState("")
  const [currentMenuImage, setCurrentMenuImage] = useState("")

  useEffect(() => {
    // Fetch current hero and menu images if they exist
    const fetchImages = async () => {
      try {
        const heroDoc = await getDoc(doc(db, "sections", "diningHero"))
        if (heroDoc.exists() && heroDoc.data().imageUrl) {
          setCurrentHeroImage(heroDoc.data().imageUrl)
        }

        const menuDoc = await getDoc(doc(db, "sections", "diningMenu"))
        if (menuDoc.exists() && menuDoc.data().imageUrl) {
          setCurrentMenuImage(menuDoc.data().imageUrl)
        }
      } catch (error) {
        console.error("Error fetching images:", error)
      }
    }
    
    fetchImages()
  }, [])

  const handleDiningUpload = async (url: string) => {
    try {
      await saveImageMetadata("dining", url, {
        section: "dining",
        caption: "",
      })
      setDiningSuccess(true)

      // Reset success message after 3 seconds
      setTimeout(() => {
        setDiningSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Error saving dining image:", error)
    }
  }

  const handleHeroUpload = async (url: string) => {
    try {
      // Save to diningHero section in Firestore
      await setDoc(doc(db, "sections", "diningHero"), {
        imageUrl: url,
        updatedAt: new Date().toISOString(),
      })
      
      setCurrentHeroImage(url)
      setHeroSuccess(true)

      // Reset success message after 3 seconds
      setTimeout(() => {
        setHeroSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Error saving hero image:", error)
    }
  }

  const handleMenuUpload = async (url: string) => {
    try {
      // Save to diningMenu section in Firestore
      await setDoc(doc(db, "sections", "diningMenu"), {
        imageUrl: url,
        updatedAt: new Date().toISOString(),
      })
      
      setCurrentMenuImage(url)
      setMenuSuccess(true)

      // Reset success message after 3 seconds
      setTimeout(() => {
        setMenuSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Error saving menu image:", error)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Manage Fine Dining</h1>

      {/* Hero Image Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Fine Dining Hero Image</CardTitle>
        </CardHeader>
        <CardContent>
          {heroSuccess && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Fine Dining hero image updated successfully!
              </AlertDescription>
            </Alert>
          )}
          
          {currentHeroImage && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Current Hero Image:</h3>
              <div className="relative h-48 w-full rounded-md overflow-hidden">
                <Image 
                  src={currentHeroImage}
                  alt="Current hero image"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}

          <UploadForm
            title="Upload Hero Image"
            description="This image will appear as the header of the Fine Dining page."
            path="dining-hero"
            onUploadComplete={handleHeroUpload}
            acceptMultiple={false}
          />
        </CardContent>
      </Card>

      {/* Menu Image Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Menu Image</CardTitle>
        </CardHeader>
        <CardContent>
          {menuSuccess && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Menu image updated successfully!
              </AlertDescription>
            </Alert>
          )}
          
          {currentMenuImage && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Current Menu Image:</h3>
              <div className="relative h-64 w-full rounded-md overflow-hidden">
                <Image 
                  src={currentMenuImage}
                  alt="Current menu image"
                  fill
                  className="object-contain bg-gray-50"
                />
              </div>
            </div>
          )}

          <UploadForm
            title="Upload Menu Image"
            description="This image will appear in the menu section at the bottom of the Fine Dining page."
            path="dining-menu"
            onUploadComplete={handleMenuUpload}
            acceptMultiple={false}
          />
        </CardContent>
      </Card>

      {/* Dining Images Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Dining Images</CardTitle>
        </CardHeader>
        <CardContent>
          {diningSuccess && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Image uploaded to dining gallery successfully!
              </AlertDescription>
            </Alert>
          )}

          <UploadForm
            title="Upload Dining Images"
            description="These images will appear in the Fine Dining section gallery. You can upload multiple images at once."
            path="dining"
            onUploadComplete={handleDiningUpload}
            acceptMultiple={true}
          />

          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Dining Images Preview</h3>
            <div className="flex overflow-x-auto space-x-4 pb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 relative w-64 h-48 bg-gray-100 rounded-md overflow-hidden">
                  <img
                    src={`/placeholder.svg?height=192&width=256&text=Food+${i + 1}`}
                    alt={`Food ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
