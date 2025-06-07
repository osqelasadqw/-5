"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { User, X } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/Footer"
import { collection, getDoc, doc, getDocs } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { getDownloadURL, ref } from "firebase/storage"

export default function FineDiningPage() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const sliderTrackRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  
  // დეფოლტი სურათების პათები სანამ Firebase-დან ჩაიტვირთება
  const [heroImage, setHeroImage] = useState<string | null>(null)
  const [diningImages, setDiningImages] = useState<string[]>([])
  
  // მენიუს სურათი
  const [menuImage, setMenuImage] = useState<string | null>(null)

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
        // თუ შეცდომა მოხდა, არ გამოვიტანოთ საჯაროდ
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
            console.log("Dining hero loaded from Firebase");
          } else {
            console.log("Dining hero URL not valid, not displaying any hero");
          }
        } else {
          console.log("Dining hero not found in Firebase");
        }
        
        // სადილის სურათების წამოღება Firebase-დან
        console.log("Fetching dining images from Firebase collection 'dining'...");
        const diningSnapshot = await getDocs(collection(db, "dining"))
        
        // დავალაგოთ დოკუმენტები createdAt-ის მიხედვით, ახლიდან ძველისკენ
        const sortedDocs = diningSnapshot.docs
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
        
        console.log(`Found ${sortedDocs.length} dining documents`);
        
        // ყველა url-ის დამუშავება
        const imagePromises: Promise<string | null>[] = [];
        sortedDocs.forEach(({ id, data }) => {
          imagePromises.push(getProperImageUrl(data.url));
        });
        
        // პარალელურად დავამუშავოთ ყველა URL
        if (imagePromises.length > 0) {
          const processedImages = await Promise.all(imagePromises);
          // გავფილტროთ მხოლოდ მოქმედი URL-ები (null ღირებულებები გამოვრიცხოთ)
          const validImages = processedImages.filter(url => url !== null) as string[];
          console.log(`Processed ${processedImages.length} URLs, ${validImages.length} valid images`);
          
          if (validImages.length > 0) {
            // საკმარისი სურათები გვაქვს სლაიდერისთვის
            setDiningImages(validImages);
          } else {
            console.log("No valid dining images from Firebase");
            setDiningImages([]);
          }
        } else {
          console.log("No Firebase dining images found");
          setDiningImages([]);
        }
        
        // მენიუს სურათი
        const menuDoc = await getDoc(doc(db, "sections", "diningMenu"))
        if (menuDoc.exists() && menuDoc.data().imageUrl) {
          const menuUrl = await getProperImageUrl(menuDoc.data().imageUrl);
          if (menuUrl) {
            setMenuImage(menuUrl);
            console.log("Menu image loaded from Firebase");
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
    
    return () => {
      // წავშალოთ ანიმაცია, თუ კომპონენტი ანმაუნთდება
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])
  
  // ცალკე useEffect სლაიდერის ანიმაციისთვის, რომელიც გაეშვება ფოტოების ჩატვირთვის შემდეგ
  useEffect(() => {
    // ანიმაციის დაწყება მხოლოდ მაშინ, როცა ფოტოები ჩატვირთულია და loading არ არის true
    if (loading || diningImages.length === 0) {
      return
    }
    
    console.log("Starting dining slider animation with", diningImages.length, "images");
    
    // გაეშვას ცოტა დაყოვნებით, რომ DOM-ი დარენდერდეს
    const timeoutId = setTimeout(() => {
      const slider = sliderTrackRef.current;
      if (!slider || slider.children.length <= 1) {
        console.log("Slider not ready:", slider?.children.length, "children");
        return;
      }
      
      let position = 0;
      const speed = 0.5; // სიჩქარე პიქსელებში
      
      // მარტივი ანიმაციის ფუნქცია
      const animate = () => {
        position += speed;
        
        // როცა პირველი სურათი სრულად გავა ეკრანიდან, გადაიტანე ბოლოში უხილავად
        const firstChild = slider.children[0] as HTMLElement;
        const itemWidth = firstChild.offsetWidth + 5; // +5 მარჯინისთვის (გაზრდილი მარჯინის გათვალისწინება)
        
        if (position >= itemWidth) {
          // დავმალოთ გადატანის ანიმაცია - გადავიყვანოთ პოზიცია 0-ზე, გადავიტანოთ ელემენტი და შემდეგ ისევ დავაბრუნოთ CSS ტრანზიშენი
          slider.style.transition = 'none';
          slider.appendChild(firstChild);
          position = 0;
          slider.style.transform = `translateX(-${position}px)`;
          
          // ვაძალოთ რეფლოუ, რომ ცვლილებები გამოჩნდეს ტრანზიშენის დაბრუნებამდე
          slider.offsetHeight; 
          
          // დავაბრუნოთ ტრანზიშენი
          slider.style.transition = 'transform 0.1s linear';
        } else {
          slider.style.transform = `translateX(-${position}px)`;
        }
        
        animationRef.current = requestAnimationFrame(animate);
      };
      
      // დაიწყე ანიმაცია
      animationRef.current = requestAnimationFrame(animate);
    }, 500);
    
    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [loading, diningImages]);

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
      <section className="relative h-[800px] w-full">
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
      
      {/* უსასრულო სლაიდერი - მთავარი გვერდის მსგავსი */}
      {diningImages.length > 0 && (
        <section className="py-8">
          <div className="w-full px-0 overflow-hidden">
            <div className="slider-container overflow-hidden w-full">
              <div ref={sliderTrackRef} className="slider-track flex">
                {loading ? (
                  <div className="hidden">
                    {/* ჩატვირთვის ანიმაცია გადატანილია ზევით */}
                  </div>
                ) : (
                  <>
                    {/* ბევრი სურათი გავამრავლოთ რომ ცარიელი ადგილები არ დარჩეს */}
                    {Array.from({ length: 3 }).flatMap((_, arrayIndex) =>
                      diningImages.map((src, i) => (
                        <div
                          key={`${arrayIndex}-${i}`}
                          className="relative flex-shrink-0 h-[280px] cursor-pointer"
                          style={{ width: "350px", marginRight: "5px" }}
                          onClick={() => openModal(src)}
                        >
                          <Image
                            src={src}
                            alt={`Fine dining ${i + 1}`}
                            fill
                            sizes="350px"
                            className="object-cover"
                            loading={arrayIndex === 0 && i < 3 ? "eager" : "lazy"}
                            onError={(e) => {
                              // მთლიანი დივის დამალვა შეცდომის შემთხვევაში
                              const parent = (e.target as HTMLElement).parentElement;
                              if (parent) parent.style.display = 'none';
                            }}
                          />
                        </div>
                      ))
                    )}
                  </>
                )}
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
                transition: transform 0.1s linear;
                font-size: 0; /* ხსნის დივებს შორის ცარიელ ადგილებს */
                line-height: 0; /* ხსნის დივებს შორის ცარიელ ადგილებს */
              }
            `}</style>
          </div>
        </section>
      )}

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
                  onError={(e) => {
                    // შეცდომების დამალვა კონსოლიდან
                    e.currentTarget.style.display = 'none';
                  }}
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
              onError={(e) => {
                // შეცდომების დამალვა კონსოლიდან
                e.currentTarget.style.display = 'none';
                closeModal();
              }}
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
      
      {/* Footer */}
      <Footer />
    </div>
  )
}
