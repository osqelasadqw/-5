"use client"

import { useState, useEffect } from "react"
import { UploadForm } from "@/components/upload-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  updateHeroSection,
  updateSliderImages,
  updateStoryImages,
  updateLargePhoto,
  updateSectionContent,
  updateGuestReviewImage,
} from "@/lib/upload-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function AdminHomePage() {
  const [activeTab, setActiveTab] = useState("hero")
  const [heroSuccess, setHeroSuccess] = useState(false)
  const [sliderSuccess, setSliderSuccess] = useState(false)
  const [storySuccess, setStorySuccess] = useState(false)
  const [largePhotoSuccess, setLargePhotoSuccess] = useState(false)
  const [guestReviewSuccess, setGuestReviewSuccess] = useState(false)
  const [sliderUrls, setSliderUrls] = useState<string[]>([])
  const [storyUrls, setStoryUrls] = useState<string[]>([])

  // Reset success messages when changing tabs
  useEffect(() => {
    setHeroSuccess(false)
    setSliderSuccess(false)
    setStorySuccess(false)
    setLargePhotoSuccess(false)
    setGuestReviewSuccess(false)
  }, [activeTab])

  const handleHeroUpload = async (url: string) => {
    try {
      await updateHeroSection(url)
      setHeroSuccess(true)
    } catch (error) {
      console.error("Error updating hero section:", error)
    }
  }

  const handleSliderUpload = async (url: string) => {
    try {
      const newUrls = [...sliderUrls, url]
      setSliderUrls(newUrls)
      await updateSliderImages(newUrls)
      setSliderSuccess(true)
    } catch (error) {
      console.error("Error updating slider images:", error)
    }
  }

  const handleStoryUpload = async (url: string) => {
    try {
      const newUrls = [...storyUrls, url]
      setStoryUrls(newUrls)

      // Only update if we have 3 images
      if (newUrls.length <= 3) {
        await updateStoryImages(newUrls)
        setStorySuccess(true)
      }
    } catch (error) {
      console.error("Error updating story images:", error)
    }
  }

  const handleLargePhotoUpload = async (url: string) => {
    try {
      await updateLargePhoto(url)
      setLargePhotoSuccess(true)
    } catch (error) {
      console.error("Error updating large photo:", error)
    }
  }

  const handleGuestReviewUpload = async (url: string) => {
    try {
      await updateGuestReviewImage(url)
      setGuestReviewSuccess(true)
    } catch (error) {
      console.error("Error updating guest review image:", error)
    }
  }

  const handleSeeDoUpload = async (url: string) => {
    try {
      await updateSectionContent("seeDo", { imageUrl: url })
      // Success handling
    } catch (error) {
      console.error("Error updating See & Do section:", error)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Manage Home Page</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="hero">Hero Image</TabsTrigger>
          <TabsTrigger value="slider">Slider Images</TabsTrigger>
          <TabsTrigger value="story">Story Section</TabsTrigger>
          <TabsTrigger value="largePhoto">Large Photo</TabsTrigger>
          <TabsTrigger value="guestReview">Guest Review</TabsTrigger>
          <TabsTrigger value="seeDo">See & Do</TabsTrigger>
        </TabsList>

        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>Hero Image</CardTitle>
            </CardHeader>
            <CardContent>
              {heroSuccess && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">Hero image updated successfully!</AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-2">Current Hero Image</h3>
                  <div className="relative h-64 bg-gray-100 rounded-md overflow-hidden">
                    <img src="/images/hero-room.jpg" alt="Current Hero" className="w-full h-full object-cover" />
                  </div>
                </div>

                <UploadForm
                  title="Upload New Hero Image"
                  description="This image will appear as the main background at the top of the home page."
                  path="hero"
                  onUploadComplete={handleHeroUpload}
                  previewHeight={250}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slider">
          <Card>
            <CardHeader>
              <CardTitle>Slider Images</CardTitle>
            </CardHeader>
            <CardContent>
              {sliderSuccess && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">Slider images updated successfully!</AlertDescription>
                </Alert>
              )}

              <div className="mb-8">
                <h3 className="text-lg font-medium mb-2">Current Slider Images</h3>
                <div className="flex overflow-x-auto space-x-4 pb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex-shrink-0 relative w-64 h-40 bg-gray-100 rounded-md overflow-hidden">
                      <img
                        src={`/placeholder.svg?height=160&width=256&text=Slider+${i}`}
                        alt={`Slider ${i}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <UploadForm
                title="Upload New Slider Images"
                description="These images will appear in the horizontal slider below the hero section."
                path="slider"
                onUploadComplete={handleSliderUpload}
                acceptMultiple={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="story">
          <Card>
            <CardHeader>
              <CardTitle>Story Section Images</CardTitle>
            </CardHeader>
            <CardContent>
              {storySuccess && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    Story section images updated successfully!
                  </AlertDescription>
                </Alert>
              )}

              <div className="mb-8">
                <h3 className="text-lg font-medium mb-2">Current Story Images (3 photos)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="relative h-48 bg-gray-100 rounded-md overflow-hidden">
                      <img
                        src={`/placeholder.svg?height=192&width=256&text=Story+${i}`}
                        alt={`Story ${i}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <UploadForm
                title="Upload Story Images"
                description="These 3 images will appear in the Our Story section. Upload up to 3 images."
                path="story"
                onUploadComplete={handleStoryUpload}
                acceptMultiple={true}
              />

              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-amber-700 text-sm">
                  <AlertCircle className="h-4 w-4 inline-block mr-1" />
                  Please upload exactly 3 images for the story section.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="largePhoto">
          <Card>
            <CardHeader>
              <CardTitle>Large Photo Below Story</CardTitle>
            </CardHeader>
            <CardContent>
              {largePhotoSuccess && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">Large photo updated successfully!</AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-2">Current Large Photo</h3>
                  <div className="relative h-64 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src="/placeholder.svg?height=256&width=512&text=Large+Photo"
                      alt="Current Large Photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <UploadForm
                  title="Upload New Large Photo"
                  description="This large photo will appear below the story text and above the gallery section."
                  path="largePhoto"
                  onUploadComplete={handleLargePhotoUpload}
                  previewHeight={250}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guestReview">
          <Card>
            <CardHeader>
              <CardTitle>Guest Review Section</CardTitle>
            </CardHeader>
            <CardContent>
              {guestReviewSuccess && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">Guest Review image updated successfully!</AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-2">Current Guest Review Background</h3>
                  <div className="relative aspect-square h-64 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src="/placeholder.svg?height=300&width=300&text=Guest+Review+Background"
                      alt="Current Guest Review Background"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <UploadForm
                  title="Upload Guest Review Background"
                  description="This image will appear as the background for the guest review section."
                  path="guestReview"
                  onUploadComplete={handleGuestReviewUpload}
                  previewHeight={250}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seeDo">
          <Card>
            <CardHeader>
              <CardTitle>See & Do Section</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-2">Current See & Do Image</h3>
                  <div className="relative h-64 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src="/placeholder.svg?height=256&width=512&text=See+and+Do"
                      alt="Current See & Do Image"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <UploadForm
                  title="Upload New See & Do Image"
                  description="This image will appear in the See & Do section."
                  path="seeDo"
                  onUploadComplete={handleSeeDoUpload}
                  previewHeight={250}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
