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
    // ვამოწმებთ Firebase Storage-ის URL-ს
    if (url.startsWith('gs://') || url.includes('firebasestorage.googleapis.com')) {
      try {
        // თუ URL იწყება gs:// ფორმატით ან შეიცავს firebasestorage, გადავაკონვერტიროთ https:// ფორმატში
        console.log("Converting Firebase Storage URL:", url);
        
        // თუ URL უკვე არის https:// ფორმატში, მაგრამ შეიცავს firebasestorage.googleapis.com
        if (url.startsWith('http')) {
          return url; // პირდაპირ დავაბრუნოთ ეს URL
        }
        
        // თუ URL არის gs:// ფორმატში, გადავაკონვერტიროთ https:// ფორმატში
        const storageRef = ref(storage, url);
        const httpsUrl = await getDownloadURL(storageRef);
        console.log("Converted URL:", httpsUrl);
        return httpsUrl;
      } catch (error) {
        console.error("Error converting Firebase Storage URL:", error);
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
        
        // დავალაგოთ დოკუმენტები createdAt-ის მიხედვით, ახლიდან ძველისკენ
        const sortedDocs = wineSnapshot.docs
          .map(doc => ({ id: doc.id, data: doc.data() }))
          .filter(doc => doc.data.url) // მხოლოდ ის დოკუმენტები, რომლებსაც აქვთ url
          .sort((a, b) => {
            // დავალაგოთ createdAt ველის მიხედვით, თუ ეს ველი არსებობს
            if (a.data.createdAt && b.data.createdAt) {
              const dateA = a.data.createdAt.toDate ? a.data.createdAt.toDate() : new Date(a.data.createdAt);
              const dateB = b.data.createdAt.toDate ? b.data.createdAt.toDate() : new Date(b.data.createdAt);
              return dateB.getTime() - dateA.getTime(); // ახლიდან ძველისკენ დალაგება
            }
            return 0;
          });
        
        console.log(`Found ${sortedDocs.length} wine documents`);
        
        // ყველა url-ის დამუშავება
        const imagePromises: Promise<string | null>[] = [];
        sortedDocs.forEach(({ id, data }) => {
          console.log(`Processing wine document ${id}: URL=${data.url}`);
          imagePromises.push(
            getProperImageUrl(data.url)
              .then(processedUrl => {
                if (processedUrl) {
                  console.log(`Document ${id}: URL processed successfully:`, processedUrl);
                } else {
                  console.log(`Document ${id}: Invalid URL:`, data.url);
                }
                return processedUrl;
              })
          );
        });
        
        // პარალელურად დავამუშავოთ ყველა URL
        if (imagePromises.length > 0) {
          const processedImages = await Promise.all(imagePromises);
          // გავფილტროთ მხოლოდ მოქმედი URL-ები (null ღირებულებები გამოვრიცხოთ)
          const validImages = processedImages.filter(url => url !== null) as string[];
          console.log(`Processed ${processedImages.length} URLs, ${validImages.length} valid images`);
          setWineImages(validImages);
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
        <div className="text-center mb-12">
          <h2 className="text-5xl font-light italic" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Great wines tell a story</h2>
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
                <>
                  {/* ზედა ღვინის სექცია */}
                  <div className="flex flex-col md:flex-row gap-8 mb-16">
                    {/* ღვინის სურათები */}
                    <div className="md:w-3/4">
                      <div className="grid grid-cols-3 gap-4">
                        {wineImages.slice(0, 3).map((src, i) => (
                          <div key={i} className="relative h-[320px]">
                            <Image
                              src={src}
                              alt={`Wine image ${i + 1}`}
                              fill
                              className="object-cover"
                              loading={i === 0 ? "eager" : "lazy"}
                              sizes="(max-width: 768px) 100vw, 33vw"
                              onError={(e) => {
                                const container = (e.target as HTMLImageElement).parentElement;
                                if (container) container.style.display = "none";
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* "Matisi" ინფორმაცია */}
                    <div className="md:w-1/4 flex items-center">
                      <div>
                        <p className="text-gray-700">
                          "Matisi" offers variety of naturally made unique wines produced in the village located only 30 minutes away from the hotel (close to Alaverdi monastery).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* მწვანე ნაწილი */}
                  <div className="bg-[#A9B4A3] py-12 px-8 mb-16">
                    <div className="container mx-auto text-center">
                      <p className="text-xl mb-6">
                        Almost everywhere you go, you'll be invited to drink a glass of traditional Qvevri wine in Georgia.
                      </p>
                      <p className="text-xl mb-6">
                        However, when you visit us, you won't have to go far for this experience since we make a variety of wines under name "Matisi" and offer it to our guests.
                      </p>
                    </div>
                  </div>

                  {/* ქვედა Chacha სექცია */}
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* ჭაჭის ინფორმაცია */}
                    <div className="md:w-1/3 flex flex-col justify-center">
                      <div className="space-y-8">
                        <p className="text-gray-700">
                          Our bar offers a wide selection of Chacha with natural ingredients and made by old Kakhetian traditional method.
                        </p>
                        <p className="text-gray-700">
                          Try the variety: Mint, Cinnamon, Tarragon and Traditional...
                        </p>
                        <p className="text-gray-700">
                          Name the favorite one!
                        </p>
                      </div>
                    </div>

                    {/* ჭაჭის სურათები */}
                    <div className="md:w-2/3">
                      <div className="grid grid-cols-3 gap-4">
                        {wineImages.slice(3, 6).map((src, i) => (
                          <div key={i} className="relative h-[320px]">
                            <Image
                              src={src}
                              alt={`Chacha image ${i + 1}`}
                              fill
                              className="object-cover"
                              loading="lazy"
                              sizes="(max-width: 768px) 100vw, 33vw"
                              onError={(e) => {
                                const container = (e.target as HTMLImageElement).parentElement;
                                if (container) container.style.display = "none";
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&display=swap');
      `}</style>

      {/* Footer */}
      <Footer />
    </div>
  )
}
