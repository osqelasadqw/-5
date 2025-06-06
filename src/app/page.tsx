"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Phone, Mail, ChevronLeft, ChevronRight, Star, User } from "lucide-react"
import { collection, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth"
import Link from "next/link"
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage"
import { Footer } from "@/components/Footer"

export default function KviriaHotel() {
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0)
  const [heroImage, setHeroImage] = useState("/home/gallery (15).jpg")
  const [sliderImages, setSliderImages] = useState<string[]>([
    '/slider/1.jpg',
    '/slider/2.jpg',
    '/slider/3.jpg',
    '/slider/4.jpg',
    '/slider/5.jpg',
    '/slider/6.jpg',
    '/slider/7.jpg',
  ])
  const [storyImages, setStoryImages] = useState<string[]>([])
  const [largePhoto, setLargePhoto] = useState("")
  const [galleryImages, setGalleryImages] = useState<string[]>([
    '/gallary/gallery.jpg',
    '/gallary/gallery (2).jpg',
    '/gallary/gallery (3).jpg',
    '/gallary/gallery (4).jpg', 
    '/gallary/gallery (5).jpg',
    '/gallary/gallery (6).jpg',
    '/gallary/gallery (7).jpg',
    '/gallary/gallery (8).jpg',
    '/gallary/gallery (9).jpg',
  ])
  const [guestReviewImage, setGuestReviewImage] = useState("")
  const [loading, setLoading] = useState(true)
  const { user, signOut, isAdmin } = useAuth()
  const sliderTrackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // გავასუფთავოთ ბრაუზერის ქეში სურათებიდან
    if (typeof window !== 'undefined') {
      // ლოკალური სურათების ქეშის წასაშლელი ფუნქცია
      const clearImageCache = () => {
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              caches.delete(cacheName);
              console.log("Deleted cache:", cacheName);
            });
          });
        }

        // ასევე შეგვიძლია ლოკალ სტორეჯში დავინახოთ რომ ქეში გავსუფთავეთ
        localStorage.setItem("cacheCleared", new Date().toISOString());
        console.log("Browser cache clear attempted");
      };

      clearImageCache();
    }

    const fetchContent = async () => {
      try {
        // მთავარი ჰერო სურათის წამოღება Firebase-დან
        const heroDoc = await getDoc(doc(db, "sections", "hero"))
        if (heroDoc.exists() && heroDoc.data().imageUrl) {
          setHeroImage(heroDoc.data().imageUrl)
          console.log("Hero image loaded from Firebase:", heroDoc.data().imageUrl)
        } else {
          console.log("Hero image document not found or no imageUrl")
        }

        // სლაიდერის სურათების წამოღება Firebase-დან
        const sliderDoc = await getDoc(doc(db, "sections", "slider"))
        if (sliderDoc.exists() && sliderDoc.data().imageUrls && sliderDoc.data().imageUrls.length > 0) {
          setSliderImages(sliderDoc.data().imageUrls)
          console.log("Slider images loaded from Firebase:", sliderDoc.data().imageUrls)
        } else {
          console.log("Slider document not found or no imageUrls array")
        }

        // სთორის სურათების წამოღება Firebase-დან
        const storyDoc = await getDoc(doc(db, "sections", "story"))
        if (storyDoc.exists() && storyDoc.data().imageUrls) {
          setStoryImages(storyDoc.data().imageUrls)
          console.log("Story images loaded from Firebase:", storyDoc.data().imageUrls)
        } else {
          console.log("Story document not found or no imageUrls")
        }

        // დიდი სურათის წამოღება Firebase-დან
        const largePhotoDoc = await getDoc(doc(db, "sections", "largePhoto"))
        if (largePhotoDoc.exists() && largePhotoDoc.data().imageUrl) {
          setLargePhoto(largePhotoDoc.data().imageUrl)
          console.log("Large photo loaded from Firebase:", largePhotoDoc.data().imageUrl)
        } else {
          console.log("Large photo document not found or no imageUrl")
        }

        // გესთის რევიუს სურათის წამოღება Firebase-დან
        const guestReviewDoc = await getDoc(doc(db, "sections", "guestReview"))
        if (guestReviewDoc.exists() && guestReviewDoc.data().imageUrl) {
          setGuestReviewImage(guestReviewDoc.data().imageUrl)
          console.log("Guest review image loaded from Firebase:", guestReviewDoc.data().imageUrl)
        } else {
          console.log("Guest review document not found or no imageUrl")
        }

        // გალერიის სურათების წამოღება Firebase-დან
        const homeGallerySnapshot = await getDocs(collection(db, "homeGallery"))
        const images: string[] = []
        homeGallerySnapshot.forEach((doc) => {
          if (doc.data().url) {
            images.push(doc.data().url)
          }
        })
        
        if (images.length > 0) {
          setGalleryImages(images)
          console.log("Home gallery images loaded from Firebase:", images.length, "images")
        } else {
          console.log("No home gallery images found in Firebase collection")
        }
        
        setLoading(false)
      } catch (error) {
        console.error("Error fetching content:", error)
        setLoading(false)
      }
    }

    fetchContent()
  }, [])

  useEffect(() => {
    const slider = sliderTrackRef.current
    if (!slider || slider.children.length <= 1) {
      return
    }

    let animationFrameId: number
    let scrollPosition = 0
    const speed = 1.2 // Corresponds to previous "faster" speed

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
  }, [sliderImages])

  const nextGalleryImage = () => {
    setCurrentGalleryIndex((prev) => {
      const maxSlides = Math.ceil((galleryImages.length > 0 ? galleryImages.length : placeholderGalleryImages.length) / 3)
      return prev < maxSlides - 1 ? prev + 1 : prev
    })
  }

  const prevGalleryImage = () => {
    setCurrentGalleryIndex((prev) => (prev > 0 ? prev - 1 : 0))
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Placeholder images for when Firebase images aren't loaded yet
  const placeholderSliderImages = [
    "/placeholder.svg?height=200&width=400&text=Slider+1",
    "/placeholder.svg?height=200&width=400&text=Slider+2",
    "/placeholder.svg?height=200&width=400&text=Slider+3",
    "/placeholder.svg?height=200&width=400&text=Slider+4",
    "/placeholder.svg?height=200&width=400&text=Slider+5",
  ]

  const placeholderStoryImages = [
    "/placeholder.svg?height=240&width=320&text=Story+1",
    "/placeholder.svg?height=240&width=320&text=Story+2",
    "/placeholder.svg?height=240&width=320&text=Story+3",
  ]

  const placeholderLargePhoto = "/placeholder.svg?height=400&width=1200&text=Large+Photo"

  const placeholderGalleryImages = [
    "/placeholder.svg?height=320&width=400&text=Gallery+1",
    "/placeholder.svg?height=320&width=400&text=Gallery+2",
    "/placeholder.svg?height=320&width=400&text=Gallery+3",
  ]

  const placeholderGuestReviewImage = "/placeholder.svg?height=500&width=500&text=Guest+Review"

  return (
    <div className="min-h-screen bg-[#242323] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#242323]/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-8">
              <a href="#" className="text-sm hover:text-orange-400 transition-colors">
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
              <a href="/wines" className="text-sm hover:text-orange-400 transition-colors">
                WINE CELLAR & BAR
              </a>
              <a href="/#services" className="text-sm hover:text-orange-400 transition-colors">
                OUR SERVICES
              </a>
              <a href="/contact" className="text-sm hover:text-orange-400 transition-colors">
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
                  {isAdmin && (
                    <Link href="/admin/dashboard">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-orange-400 hover:text-orange-300"
                      >
                        Admin Panel
                      </Button>
                    </Link>
                  )}
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

      {/* Hero Section */}
      <section className="relative h-[80vh] w-full bg-black">
        <div className="absolute inset-0">
          <Image 
            src={heroImage} 
            alt="Kviria Boutique Hotel" 
            fill 
            className="object-cover opacity-80"
            loading="eager"
            priority={true}
            sizes="100vw"
          />
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <div className="text-center">
            <div className="text-5xl font-bold mb-4">SERODANI</div>
            <div className="text-3xl tracking-widest font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Hotel with pool</div>
          </div>
        </div>
        
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&display=swap');
        `}</style>
      </section>

      {/* Tagline Section */}
      <section className="py-16 bg-[#242323] text-center">
        <h1 className="text-5xl font-bold tracking-wide">A PLACE LIKE NO OTHER</h1>
      </section>

      {/* Image Gallery Preview */}
      <section className="py-8">
        <div className="w-full px-0 overflow-hidden">
          <div className="slider-container overflow-hidden w-full">
            <div ref={sliderTrackRef} className="slider-track flex">
              {loading ? (
                <div className="flex justify-center items-center h-80 w-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-400"></div>
                </div>
              ) : (
                <>
                  {sliderImages.length > 0 ? (
                    sliderImages.map((src, i) => (
                      <div
                        key={i}
                        className="relative flex-shrink-0 h-[280px]"
                        style={{ width: "350px", marginRight: "10px" }}
                      >
                        <Image
                          src={src}
                          alt={`Boutique hotel slider ${i + 1}`}
                          fill
                          sizes="350px"
                          className="object-cover"
                          loading={i < 3 ? "eager" : "lazy"}
                        />
                      </div>
                    ))
                  ) : (
                    // ფოლბექ იმიჯები თუ სერვერიდან არ მოვიდა
                    ['/slider/1.jpg', '/slider/2.jpg', '/slider/3.jpg', '/slider/4.jpg', '/slider/5.jpg'].map((src, i) => (
                      <div
                        key={i}
                        className="relative flex-shrink-0 h-[280px]"
                        style={{ width: "350px", marginRight: "10px" }}
                      >
                        <Image
                          src={src}
                          alt={`Boutique hotel slider ${i + 1}`}
                          fill
                          sizes="350px"
                          className="object-cover"
                          loading={i < 3 ? "eager" : "lazy"}
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
            }
          `}</style>
        </div>
      </section>

      {/* Our Story - Simplified with 3 photos */}
      <section className="py-20 bg-[#242323]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">OUR STORY</h2>
          <div className="max-w-4xl mx-auto space-y-6 text-gray-300 leading-relaxed mb-12">
            <p>
              BOUTIQUE HOTEL KVIRIA OFFERS YOU THE HIGHEST LEVEL OF COMFORT AND HOSPITALITY. THE HOTEL IS LOCATED IN THE
              HEART OF SIGHNAGHI AND OFFERS BREATHTAKING VIEWS OF THE ALAZANI VALLEY.
            </p>
            <p>
              THE HOTEL HAS 8 ROOMS OF DIFFERENT CATEGORIES, EACH ROOM IS EQUIPPED WITH ALL THE NECESSARY AMENITIES FOR
              A COMFORTABLE STAY.
            </p>
            <p>
              THE HOTEL ALSO HAS A RESTAURANT WHERE YOU CAN TASTE TRADITIONAL GEORGIAN CUISINE AND ENJOY THE BEST WINES
              OF THE REGION. THE HOTEL ALSO HAS A WINE CELLAR WHERE YOU CAN TASTE AND BUY WINES.
            </p>
          </div>

          {/* Story Images */}
          <div className="flex justify-center items-center mb-20 w-full overflow-hidden">
            <div className="w-full flex flex-col md:flex-row justify-center items-center gap-8">
              {(storyImages.length > 0 ? storyImages : placeholderStoryImages).map((src, i) => (
                <div key={i} className="relative h-[640px] w-full md:w-[30%] flex-shrink-0">
                  <Image
                    src={src}
                    alt={`Our story ${i + 1}`}
                    fill
                    className="object-cover"
                    loading="lazy"
                    sizes="(max-width: 768px) 90vw, 30vw"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-6 text-gray-300 leading-relaxed">
            <p>
              The hotel offers a new concept of elegance along with comfort to meet the expectations of various types of
              guests.
            </p>
            <p>
              The old Georgian brick used on the building's exterior combined with a soft color pallet used throughout
              the hotel was thoughtfully curated. there is carefully selected music, smiling staff, and unique views
              which certainly puts everyone in a positive mood.
            </p>
          </div>
        </div>
      </section>

      {/* Large Photo Section */}
      <section className="py-12 flex justify-center">
        <div className="relative w-[960px] h-[600px] mx-auto">
          <Image
            src={largePhoto || placeholderLargePhoto}
            alt="Kviria hotel in Sighnaghi"
            fill
            className="object-cover"
            loading="lazy"
            sizes="960px"
          />
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-20 bg-[#242323]">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">GALLERY</h2>
          <div className="relative max-w-5xl mx-auto">
            <div className="overflow-hidden rounded-lg">
              <div className="flex transition-transform duration-500 ease-in-out"
                   style={{ transform: `translateX(-${currentGalleryIndex * 100}%)` }}>
                {/* First slide */}
                <div className="flex-none w-full">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {galleryImages.slice(0, 3).map((src, i) => (
                      <div key={i} className="relative h-[300px] rounded-lg overflow-hidden shadow-lg">
                        <Image
                          src={src}
                          alt={`Gallery image ${i + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 400px"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Second slide */}
                {galleryImages.length > 3 && (
                  <div className="flex-none w-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {galleryImages.slice(3, 6).map((src, i) => (
                        <div key={i} className="relative h-[300px] rounded-lg overflow-hidden shadow-lg">
                          <Image
                            src={src}
                            alt={`Gallery image ${i + 4}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 400px"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Third slide */}
                {galleryImages.length > 6 && (
                  <div className="flex-none w-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {galleryImages.slice(6, 9).map((src, i) => (
                        <div key={i} className="relative h-[300px] rounded-lg overflow-hidden shadow-lg">
                          <Image
                            src={src}
                            alt={`Gallery image ${i + 7}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 400px"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 border-orange-400 z-10"
              onClick={prevGalleryImage}
              disabled={currentGalleryIndex === 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 border-orange-400 z-10"
              onClick={nextGalleryImage}
              disabled={currentGalleryIndex >= Math.ceil(galleryImages.length / 3) - 1}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
            
            <div className="flex justify-center mt-6 gap-2">
              {Array.from({ length: Math.ceil(galleryImages.length / 3) }).map((_, i) => (
                <button
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i === currentGalleryIndex ? 'bg-orange-400' : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  onClick={() => setCurrentGalleryIndex(i)}
                  aria-label={`View gallery page ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* See & Do Section */}
      <section className="py-20 bg-[#242323]">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">SEE & DO</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Wine Degustation</h3>
              <p className="text-sm text-gray-300">Enjoy wine tastings offered at the wine bar.</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2">Festive Dinner</h3>
              <p className="text-sm text-gray-300">
                Celebrate your special day with the beloved ones at Kviria Restaurant
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2">Team Building</h3>
              <p className="text-sm text-gray-300">
                The hotel accommodates up to 36 guests and is comfortable for small work groups.
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2">Scooter Rental</h3>
              <p className="text-sm text-gray-300">
                We offer electric scooters for rental, as a the perfect transportation to the city center.
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2">Romantic Dinner</h3>
              <p className="text-sm text-gray-300">
                Plan romantic Dinner with your person at Kviria Terrace and enjoy Telavi City View
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2">Private Spa</h3>
              <p className="text-sm text-gray-300">Book and visit our steam bath, sauna and Jacuzzi.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Guest Review - Text overlay on large photo */}
      <section className="py-20 bg-[#242323]">
        <div className="container mx-auto px-4">
          <div className="relative w-full mx-auto h-[630px] max-w-[980px]">
            <Image
              src={guestReviewImage || placeholderGuestReviewImage}
              alt="Guest review"
              fill
              className="object-cover"
              loading="lazy"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 980px"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg max-w-lg text-center">
                <h3 className="text-xl font-bold mb-3 text-gray-900">GUEST REVIEW</h3>
                <div className="flex justify-center mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-3 italic text-sm">
                  "This hotel exceeded our expectations. The service was impeccable, the rooms were beautifully
                  appointed, and the views were breathtaking. The wine tasting experience was unforgettable. We can't
                  wait to return!"
                </p>
                <p className="font-semibold text-gray-900 text-sm">- Sarah & John, UK</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-[#242323]">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">CONTACT US</h2>
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-semibold mb-6">Address</h3>
              <div className="space-y-4 text-gray-300">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-orange-400" />
                  <span>Sighnaghi, Kakheti Region, Georgia</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-orange-400" />
                  <span>+995 555 123 456</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-orange-400" />
                  <span>info@kviria.ge</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-6 mt-8">Contact</h3>
              <p className="text-gray-300">
                For reservations and inquiries, please contact us directly or use our online booking system.
              </p>
            </div>
            <div className="relative h-80 rounded-lg overflow-hidden">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2973.8234567890123!2d45.4928842!3d41.9062177!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x404433f8b9e2e367%3A0x7dd2cf495cd7b4f!2z4YOh4YOU4YOg4YOd4YOT4YOQ4YOc4YOY!5e0!3m2!1sen!2sge!4v1234567890123!5m2!1sen!2sge"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
