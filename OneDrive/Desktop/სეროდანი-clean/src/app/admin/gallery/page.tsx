"use client"

import { useState, useEffect } from "react"
import { UploadForm } from "@/components/upload-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { saveImageMetadata } from "@/lib/upload-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, Trash2 } from "lucide-react"
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { getDownloadURL, ref } from "firebase/storage"

export default function AdminGalleryPage() {
  const [success, setSuccess] = useState(false)
  const [heroSuccess, setHeroSuccess] = useState(false)
  const [currentHeroImage, setCurrentHeroImage] = useState("")
  const [galleryImages, setGalleryImages] = useState<{id: string, url: string, createdAt: Date}[]>([])
  const [loading, setLoading] = useState(true)
  
  // ფუნქცია Firebase Storage URL-ის გასაწმენდად და დასაკონვერტირებლად
  const getProperImageUrl = async (url: string): Promise<string | null> => {
    if (url.startsWith('gs://')) {
      try {
        // თუ URL იწყება gs:// ფორმატით, გადავაკონვერტიროთ https:// ფორმატში
        const storageRef = ref(storage, url);
        const httpsUrl = await getDownloadURL(storageRef);
        return httpsUrl;
      } catch (error) {
        console.error("Error converting gs:// URL:", error);
        return null; // შეცდომის შემთხვევაში ვაბრუნებთ null
      }
    }
    
    // არ ვამოწმებთ URL-ის ვალიდურობას
    return url;
  };
  
  useEffect(() => {
    // ვიღებთ ყველა მონაცემს Firebase-დან ერთ ფუნქციაში
    const fetchContent = async () => {
      try {
        setLoading(true);
        
        // ჰერო სურათის წამოღება
        const heroDoc = await getDoc(doc(db, "sections", "galleryHero"))
        if (heroDoc.exists() && heroDoc.data().imageUrl) {
          const heroUrl = await getProperImageUrl(heroDoc.data().imageUrl);
          if (heroUrl) {
            setCurrentHeroImage(heroUrl);
          }
        }
        
        // გალერიის სურათების წამოღება Firebase-დან
        const gallerySnapshot = await getDocs(collection(db, "gallery"))
        
        // შევქმნათ სურათების მასივი მეტამონაცემებით
        const imagesWithMeta: {id: string, url: string, createdAt: Date}[] = [];
        
        // დავამუშაოთ ყველა დოკუმენტი
        for (const doc of gallerySnapshot.docs) {
          if (doc.data().url) {
            const processedUrl = await getProperImageUrl(doc.data().url);
            if (processedUrl) {
              imagesWithMeta.push({
                id: doc.id,
                url: processedUrl,
                createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toDate()) : new Date()
              });
            }
          }
        }
        
        // დავალაგოთ სურათები თარიღის მიხედვით - ახლიდან ძველისკენ
        imagesWithMeta.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setGalleryImages(imagesWithMeta);
        
      } catch (error) {
        console.error("Error fetching gallery content:", error)
      } finally {
        setLoading(false)
      }
    };
    
    fetchContent();
  }, [success]); // success სტეიტის ცვლილებაზე თავიდან ჩაიტვირთოს სურათები

  const handleGalleryUpload = async (url: string) => {
    try {
      await saveImageMetadata("gallery", url, {
        section: "gallery",
        caption: "",
      })
      setSuccess(true)

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Error saving gallery image:", error)
    }
  }
  
  const handleHeroUpload = async (url: string) => {
    try {
      // Save to galleryHero section in Firestore
      await setDoc(doc(db, "sections", "galleryHero"), {
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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Manage Gallery</h1>
      
      {/* Gallery Hero Image Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Gallery Hero Image</CardTitle>
        </CardHeader>
        <CardContent>
          {heroSuccess && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">Gallery hero image updated successfully!</AlertDescription>
            </Alert>
          )}
          
          {currentHeroImage && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Current Hero Image:</h3>
              <div className="relative h-48 w-full rounded-md overflow-hidden">
                <Image 
                  src={currentHeroImage}
                  alt="Current gallery hero image"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}

          <UploadForm
            title="Upload Gallery Hero Image"
            description="This image will appear as the header of the gallery page."
            path="gallery-hero"
            onUploadComplete={handleHeroUpload}
            acceptMultiple={false}
          />
        </CardContent>
      </Card>

      {/* Gallery Images Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Gallery Images</CardTitle>
        </CardHeader>
        <CardContent>
          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">Image uploaded to gallery successfully!</AlertDescription>
            </Alert>
          )}

          <UploadForm
            title="Upload Gallery Images"
            description="These images will appear in the gallery section. You can upload multiple images at once."
            path="gallery"
            onUploadComplete={handleGalleryUpload}
            acceptMultiple={true}
          />

          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Gallery Preview</h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-400"></div>
              </div>
            ) : galleryImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {galleryImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <div className="aspect-[4/3] rounded-md overflow-hidden">
                      <img
                        src={image.url}
                        alt="Gallery image"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const container = (e.target as HTMLImageElement).closest('.relative');
                          if (container) {
                            (container as HTMLElement).style.display = "none";
                          }
                        }}
                      />
                      
                      {/* ინფორმაცია ფოტოზე */}
                      <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="text-white text-center p-2">
                          <p className="text-sm">
                            {new Date(image.createdAt).toLocaleDateString()}
                          </p>
                          {/* აქ შეგვიძლია დავამატოთ წაშლის ღილაკი */}
                          <Button size="sm" variant="destructive" className="mt-2">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No gallery images uploaded yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
