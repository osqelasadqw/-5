"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"
import { useAuth } from "@/lib/auth"
import Link from "next/link"
import { collection, getDoc, doc, getDocs } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { Footer } from "@/components/Footer"
import { getDownloadURL, ref } from "firebase/storage"

export default function WinesPage() {
  const { user, signOut } = useAuth()
  const [wineImages, setWineImages] = useState<string[]>([])
  const [heroImage, setHeroImage] = useState<string | null>(null) // null-ით დავიწყოთ
  const [loading, setLoading] = useState(true)

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
        return null; // შეცდომის შემთხვევაში დავაბრუნოთ null
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
              console.log("Deleted wine cache:", cacheName);
            });
          });
        }

        // ასევე შეგვიძლია ლოკალ სტორეჯში დავინახოთ რომ ქეში გავსუფთავეთ
        localStorage.setItem("wineCacheCleared", new Date().toISOString());
        console.log("Wine browser cache clear attempted");
      };

      clearImageCache();
    }
    
    const fetchContent = async () => {
      try {
        // ჰერო სურათის წამოღება Firebase-დან
        const heroDoc = await getDoc(doc(db, "sections", "wineHero"))
        if (heroDoc.exists() && heroDoc.data().imageUrl) {
          const heroUrl = await getProperImageUrl(heroDoc.data().imageUrl);
          if (heroUrl) {
            setHeroImage(heroUrl);
            console.log("Wine hero loaded from Firebase:", heroUrl);
          } else {
            console.log("Wine hero URL not valid, not displaying any hero");
          }
        } else {
          console.log("Wine hero not found in Firebase");
        }
        
        // ღვინის სურათების წამოღება Firebase-დან
        console.log("Fetching wine images from Firebase collection 'wines'...");
        const wineSnapshot = await getDocs(collection(db, "wines"))
        
        // ყველა url-ის დამუშავება
        const imagePromises: Promise<string | null>[] = [];
        wineSnapshot.forEach((doc) => {
          if (doc.data().url) {
            imagePromises.push(
              getProperImageUrl(doc.data().url)
                .then(processedUrl => {
                  if (processedUrl) {
                    console.log("Found and processed Firebase wine image:", processedUrl);
                  } else {
                    console.log("Skipping invalid Firebase wine image URL:", doc.data().url);
                  }
                  return processedUrl;
                })
            );
          }
        });
        
        // პარალელურად დავამუშავოთ ყველა URL
        if (imagePromises.length > 0) {
          const processedImages = await Promise.all(imagePromises);
          // გავფილტროთ მხოლოდ მოქმედი URL-ები (null ღირებულებები გამოვრიცხოთ)
          const validImages = processedImages.filter(url => url !== null) as string[];
          setWineImages(validImages);
          console.log(`Successfully set Firebase wine images: ${validImages.length} valid out of ${processedImages.length} total`);
        } else {
          console.log("No Firebase wine images found");
          setWineImages([]); // ცარიელი მასივი თუ სურათები არ არის
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching wine content:", error);
        setWineImages([]); // ცარიელი მასივი შეცდომის შემთხვევაში
        setLoading(false);
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
              <a href="/gallery" className="text-sm hover:text-orange-400 transition-colors">
                GALLERY
              </a>
              <a href="/fine-dining" className="text-sm hover:text-orange-400 transition-colors">
                FINE DINING
              </a>
              <a href="/wines" className="text-sm text-orange-400">
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

      {/* Hero Section with Brick Background */}
      <section className="relative h-[650px] w-full">
        {heroImage ? (
          <div className="absolute inset-0">
            <Image 
              src={heroImage}
              alt="Wine Cellar Hero"
              fill
              className="object-cover object-center"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        ) : (
          <div className="bg-gray-200 h-full w-full flex items-center justify-center text-gray-500">
            <p>Hero image not available</p>
          </div>
        )}
      </section>

      {/* Great Wines Section */}
      <section className="py-16 bg-white relative">
        <div className="text-center mb-6">
          <h2 className="text-4xl font-light italic text-blue-600 bg-gray-100 inline-block px-8 py-2">Great wines tell a story</h2>
        </div>
        
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center items-center h-[300px]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-400"></div>
            </div>
          ) : (
            <>
              {wineImages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-600">No wine images available at this time.</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Wine Images */}
                  <div className="md:w-8/12">
                    <div className="flex gap-4">
                      {wineImages.slice(0, 3).map((src, i) => (
                        <div key={i} className="relative h-[350px] flex-1">
                          <Image
                            src={src}
                            alt={`Wine image ${i + 1}`}
                            fill
                            className="object-cover"
                            loading={i === 0 ? "eager" : "lazy"}
                            sizes="(max-width: 768px) 100vw, 33vw"
                            onError={(e) => {
                              // აღარ გამოვიტანთ შეცდომას კონსოლში
                              // console.error("Failed to load wine image:", src);
                              // შეცდომის შემთხვევაში მოვაშოროთ სურათის კონტეინერი
                              const container = (e.target as HTMLImageElement).parentElement;
                              if (container) container.style.display = "none";
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Wine Info */}
                  <div className="md:w-4/12 p-8 bg-white shadow-lg border border-gray-100">
                    <h3 className="text-2xl font-semibold mb-4">Wine Cellar & Bar</h3>
                    <p className="text-gray-700 mb-6">
                      Discover the richness of Georgian wine tradition in our cellar featuring a curated selection of local 
                      and international vintages. Our sommeliers will guide you through a tasting journey from 
                      traditional qvevri wines to modern interpretations of classic Georgian varieties.
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                        <span>Exclusive Georgian Wine Varieties</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                        <span>Private Cellar Tastings</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                        <span>Expert Sommelier Guidance</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
