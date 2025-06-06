"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { User, X } from "lucide-react"
import Link from "next/link"
import { collection, getDoc, doc, getDocs } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { Footer } from "@/components/Footer"
import { getDownloadURL, ref } from "firebase/storage"

export default function GalleryPage() {
  const { user, signOut } = useAuth()
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [heroImage, setHeroImage] = useState<string | null>(null) // დეფოლტად არ ვაყენებთ ლოკალურ სურათს
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // ფუნქცია Firebase Storage URL-ის გასაწმენდად და დასაკონვერტირებლად
  const getProperImageUrl = async (url: string): Promise<string | null> => {
    if (url.startsWith('gs://')) {
      try {
        // თუ URL იწყება gs:// ფორმატით, გადავაკონვერტიროთ https:// ფორმატში
        console.log("Converting gs:// URL to https://", url);
        const storageRef = ref(storage, url);
        const httpsUrl = await getDownloadURL(storageRef);
        console.log("Converted URL:", httpsUrl);
        return httpsUrl;
      } catch (error) {
        console.error("Error converting gs:// URL:", error);
        return null; // შეცდომის შემთხვევაში ვაბრუნებთ null ორიგინალი URL-ის ნაცვლად
      }
    }
    
    // CORS პრობლემების გამო აღარ ვამოწმებთ URL-ის ვალიდურობას fetch მეთოდით
    // უბრალოდ ვაბრუნებთ URL-ს და სურათის კომპონენტი თავად დაიჭერს შეცდომას
    return url;
  };

  useEffect(() => {
    // გავასუფთავოთ ბრაუზერის ქეში სურათებიდან
    if (typeof window !== 'undefined') {
      // ლოკალური სურათების ქეშის წასაშლელი ფუნქცია
      const clearImageCache = () => {
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              caches.delete(cacheName);
              console.log("Deleted gallery cache:", cacheName);
            });
          });
        }

        // ასევე შეგვიძლია ლოკალ სტორეჯში დავინახოთ რომ ქეში გავსუფთავეთ
        localStorage.setItem("galleryCacheCleared", new Date().toISOString());
        console.log("Gallery browser cache clear attempted");
      };

      clearImageCache();
    }
    
    const fetchContent = async () => {
      try {
        // ჰერო სურათის წამოღება Firebase-დან
        const heroDoc = await getDoc(doc(db, "sections", "galleryHero"))
        if (heroDoc.exists() && heroDoc.data().imageUrl) {
          const heroUrl = await getProperImageUrl(heroDoc.data().imageUrl);
          if (heroUrl) {
            setHeroImage(heroUrl);
            console.log("Gallery hero loaded from Firebase:", heroUrl)
          } else {
            console.log("Gallery hero URL not valid, not displaying any hero")
          }
        } else {
          console.log("Gallery hero not found in Firebase")
        }
        
        // სადილის სურათების წამოღება Firebase-დან
        console.log("Fetching gallery images from Firebase collection 'gallery'...")
        const gallerySnapshot = await getDocs(collection(db, "gallery"))
        
        // შევქმნათ სურათების მასივი მეტამონაცემებით, რომ შევძლოთ დათარიღებით დალაგება
        const imagesWithMeta: { url: string, createdAt: Date }[] = [];
        
        // ყველა url-ის დამუშავება
        const imagePromises: Promise<{url: string | null, createdAt: Date}>[] = [];
        gallerySnapshot.forEach((doc) => {
          if (doc.data().url) {
            imagePromises.push(
              getProperImageUrl(doc.data().url)
                .then(processedUrl => {
                  if (processedUrl) {
                    console.log("Found and processed Firebase gallery image:", processedUrl);
                    // შევინახოთ URL მეტამონაცემებთან ერთად
                    return {
                      url: processedUrl,
                      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toDate()) : new Date()
                    };
                  } else {
                    console.log("Skipping invalid Firebase gallery image URL:", doc.data().url);
                    return { url: null, createdAt: new Date() };
                  }
                })
            );
          }
        });
        
        // პარალელურად დავამუშავოთ ყველა URL
        if (imagePromises.length > 0) {
          const processedImageData = await Promise.all(imagePromises);
          
          // გავფილტროთ მხოლოდ მოქმედი URL-ები (null ღირებულებები გამოვრიცხოთ)
          // და დავალაგოთ თარიღის მიხედვით - ახლიდან ძველისკენ
          const validImagesWithMeta = processedImageData
            .filter(item => item.url !== null)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          // ამოვიღოთ მხოლოდ URL-ები დალაგებული მასივიდან
          const validImages = validImagesWithMeta.map(item => item.url) as string[];
          
          setGalleryImages(validImages);
          console.log(`Successfully set Firebase gallery images: ${validImages.length} valid images found`);
        } else {
          console.log("No Firebase gallery images found");
          setGalleryImages([]); // ცარიელი მასივი თუ სურათები არ არის
        }
      } catch (error) {
        console.error("Error fetching gallery content:", error)
        setGalleryImages([]); // ცარიელი მასივი შეცდომის შემთხვევაში
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const openModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    document.body.style.overflow = 'hidden'; // დავბლოკოთ სქროლი როცა მოდალი ღიაა
  }

  const closeModal = () => {
    setSelectedImage(null);
    document.body.style.overflow = 'auto'; // დავაბრუნოთ სქროლი როცა მოდალს დავხურავთ
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-sm text-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-8">
              <a href="/" className="text-sm hover:text-orange-400 transition-colors">
                HOME
              </a>
              <a href="/rooms" className="text-sm hover:text-orange-400 transition-colors">
                ROOMS
              </a>
              <a href="/gallery" className="text-sm text-orange-400">
                GALLERY
              </a>
              <a href="/fine-dining" className="text-sm hover:text-orange-400 transition-colors">
                FINE DINING
              </a>
              <a href="/wines" className="text-sm hover:text-orange-400 transition-colors">
                WINE CELLAR & BAR
              </a>
              <a href="/#services" className="text-sm hover:text-orange-400 transition-colors">
                OUR SERVICES
              </a>
              <a href="/#contact" className="text-sm hover:text-orange-400 transition-colors">
                CONTACT
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                className="border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-black"
              >
                Book Now
              </Button>

              {/* Login/User Menu */}
              {user ? (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="w-4 h-4" />
                    <span>{user.displayName || user.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-orange-400 hover:text-orange-300"
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Link href="/admin/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative h-[70vh] w-full">
        {/* გამოვაჩინოთ ჰერო სურათი მხოლოდ თუ ის არსებობს */}
        {heroImage ? (
          <Image
            src={heroImage}
            alt="Gallery"
            fill
            priority
            className="object-cover"
          />
        ) : (
          <div className="bg-gray-200 h-full w-full flex items-center justify-center text-gray-500">
            <p>Hero image not available</p>
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center">
            Gallery
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-400"></div>
          </div>
        ) : (
          <>
            {galleryImages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xl text-gray-600">No gallery images available at this time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-auto">
                {galleryImages.map((image, index) => (
                  <div key={index} className="relative overflow-hidden rounded-md group cursor-pointer">
                    <div 
                      className="aspect-[4/3] relative"
                      onClick={() => openModal(image)}
                    >
                      <img
                        src={image}
                        alt={`Gallery image ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          // ფოტო შეცდომის შემთხვევაში მთლიანად წავშალოთ კონტეინერიდან
                          const container = (e.target as HTMLImageElement).closest('.relative');
                          if (container) {
                            (container as HTMLElement).style.display = "none";
                          }
                        }}
                      />
                      {/* ჰოვერის ახალი ეფექტი ტექსტის გარეშე */}
                      <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal for full-screen image */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
          onClick={closeModal}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70"
            onClick={closeModal}
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-[90vw] max-h-[90vh]">
            <img src={selectedImage} alt="Selected" className="max-w-full max-h-[90vh] object-contain" />
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  )
}
