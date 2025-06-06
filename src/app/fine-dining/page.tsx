"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { User, ChevronLeft, ChevronRight, X } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/Footer"
import { collection, getDoc, doc, getDocs } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { getDownloadURL, ref } from "firebase/storage"

export default function FineDiningPage() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const sliderTrackRef = useRef<HTMLDivElement>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
  // დეფოლტი სურათების პათები სანამ Firebase-დან ჩაიტვირთება
  const [heroImage, setHeroImage] = useState<string | null>(null)
  const [diningImages, setDiningImages] = useState<string[]>([
    '/finedings/2.jpg',
    '/finedings/3.jpg',
    '/finedings/4.jpg',
    '/finedings/5.jpg',
    '/finedings/6.jpg',
    '/finedings/7.jpg',
    '/finedings/8.jpg',
    '/finedings/9.jpg',
  ])
  
  // მენიუს სურათი
  const [menuImage, setMenuImage] = useState<string | null>(null)

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
              console.log("Deleted dining cache:", cacheName);
            });
          });
        }

        // ასევე შეგვიძლია ლოკალ სტორეჯში დავინახოთ რომ ქეში გავსუფთავეთ
        localStorage.setItem("diningCacheCleared", new Date().toISOString());
        console.log("Dining browser cache clear attempted");
      };

      clearImageCache();
    }
    
    const fetchContent = async () => {
      try {
        // ჰერო სურათის წამოღება Firebase-დან
        const heroDoc = await getDoc(doc(db, "sections", "diningHero"))
        if (heroDoc.exists() && heroDoc.data().imageUrl) {
          const heroUrl = await getProperImageUrl(heroDoc.data().imageUrl);
          if (heroUrl) {
            setHeroImage(heroUrl);
            console.log("Dining hero loaded from Firebase:", heroUrl);
          } else {
            console.log("Dining hero URL not valid, not displaying any hero");
          }
        } else {
          console.log("Dining hero not found in Firebase");
        }
        
        // სადილის სურათების წამოღება Firebase-დან
        console.log("Fetching dining images from Firebase collection 'dining'...");
        const diningSnapshot = await getDocs(collection(db, "dining"))
        
        // ყველა url-ის დამუშავება
        const imagePromises: Promise<string | null>[] = [];
        diningSnapshot.forEach((doc) => {
          if (doc.data().url) {
            imagePromises.push(
              getProperImageUrl(doc.data().url)
                .then(processedUrl => {
                  if (processedUrl) {
                    console.log("Found and processed Firebase dining image:", processedUrl);
                  } else {
                    console.log("Skipping invalid Firebase dining image URL:", doc.data().url);
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
          setDiningImages(validImages);
          console.log(`Successfully set Firebase dining images: ${validImages.length} valid out of ${processedImages.length} total`);
        } else {
          console.log("No Firebase dining images found");
          setDiningImages([]); // ცარიელი მასივი თუ სურათები არ არის
        }
        
        // მენიუს სურათი
        const menuDoc = await getDoc(doc(db, "sections", "diningMenu"))
        if (menuDoc.exists() && menuDoc.data().imageUrl) {
          const menuUrl = await getProperImageUrl(menuDoc.data().imageUrl);
          if (menuUrl) {
            setMenuImage(menuUrl);
            console.log("Menu image loaded from Firebase:", menuUrl);
          } else {
            console.log("Menu image URL not valid, not displaying any menu image");
          }
        }
        
        setLoading(false)
      } catch (error) {
        console.error("Error fetching dining content:", error)
        setDiningImages([]); // ცარიელი მასივი შეცდომის შემთხვევაში
        setLoading(false)
      }
    }
    
    fetchContent()
    
    const slider = sliderTrackRef.current
    if (!slider || slider.children.length <= 1) {
      return
    }

    let animationFrameId: number
    let scrollPosition = 0
    const speed = 0.3 // შენელებული სიჩქარე

    const animate = () => {
      scrollPosition += speed
      const firstChild = slider.children[0] as HTMLElement
      const itemWidth = firstChild.offsetWidth + parseInt(getComputedStyle(firstChild).marginRight)

      if (scrollPosition >= itemWidth) {
        slider.appendChild(firstChild)
        scrollPosition -= itemWidth
      }

      slider.style.transform = `translateX(-${scrollPosition}px)`
      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  // გადიდების ფუნქციონალისთვის
  const openModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    document.body.style.overflow = 'hidden'; // დავბლოკოთ სქროლი როცა მოდალი ღიაა
  }

  const closeModal = () => {
    setSelectedImage(null);
    document.body.style.overflow = 'auto'; // დავაბრუნოთ სქროლი როცა მოდალს დავხურავთ
  }

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
              <a href="/fine-dining" className="text-sm text-orange-400">
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

      {/* Hero Section with Brick Background */}
      <section className="relative h-[550px] w-full">
        <div className="absolute inset-0">
          {heroImage ? (
            <Image 
              src={heroImage} 
              alt="Fine Dining Hero"
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          ) : (
            <div className="bg-gray-200 h-full w-full flex items-center justify-center text-gray-500">
              <p>Hero image not available</p>
            </div>
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>
      </section>
      
      {/* Slider Section - მთავარი გვერდის მსგავსი */}
      <section className="py-8">
        <div className="w-full px-0 overflow-hidden">
          <div className="slider-container overflow-hidden w-full">
            <div ref={sliderTrackRef} className="slider-track flex">
              {diningImages.map((src, i) => (
                <div
                  key={i}
                  className="relative flex-shrink-0 h-[280px]"
                  style={{ width: "350px", marginRight: "10px" }}
                >
                  <Image
                    src={src}
                    alt={`Fine dining slider ${i + 1}`}
                    fill
                    sizes="350px"
                    className="object-cover"
                    loading={i < 3 ? "eager" : "lazy"}
                  />
                </div>
              ))}
            </div>
          </div>

          <style jsx global>{`
            .slider-container {
              width: 100vw;
              position: relative;
              left: 50%;
              right: 50%;
              margin-left: -50vw;
              margin-right: -50vw;
              overflow: hidden;
            }

            .slider-track {
              padding: 10px 0;
              width: fit-content;
              display: flex;
              flex-wrap: nowrap;
            }
          `}</style>
        </div>
      </section>

      {/* Menu Section */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">Check our Menu</h2>
          <div className="max-w-4xl mx-auto">
            {menuImage && (
              <div 
                className="relative rounded-lg overflow-hidden cursor-pointer"
                onClick={() => openModal(menuImage)}
              >
                <Image
                  src={menuImage}
                  alt="Restaurant Menu"
                  width={800}
                  height={600}
                  className="object-contain mx-auto hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* Modal for full-screen image */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div 
            className="relative w-[90vw] h-[90vh] max-w-7xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedImage}
              alt="Full view image"
              fill
              className="object-contain"
              sizes="90vw"
            />
            <button
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
              onClick={closeModal}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
