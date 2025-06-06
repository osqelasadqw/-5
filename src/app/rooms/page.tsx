"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import { User } from "lucide-react"
import Link from "next/link"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Room } from "@/types"
import { Footer } from "@/components/Footer"

export default function RoomsPage() {
  const { user, signOut } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const roomsCollection = collection(db, "rooms")
        const roomsSnapshot = await getDocs(roomsCollection)

        const roomsList: Room[] = []
        roomsSnapshot.forEach((doc) => {
          const data = doc.data() as any
          roomsList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          })
        })

        setRooms(roomsList)
      } catch (error) {
        console.error("Error fetching rooms:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-8">
              <a href="/" className="text-sm hover:text-orange-400 transition-colors">
                HOME
              </a>
              <a href="/rooms" className="text-sm text-orange-400">
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

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0">
          <Image
            src="/room/hero.jpg"
            alt="Luxury hotel room with brick wall"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 text-center">
          <div className="bg-black/60 backdrop-blur-sm p-8 rounded-lg max-w-md">
            <h1 className="text-2xl font-bold mb-4">ROOMS</h1>
            <p className="text-gray-200 mb-6">
              8 boutique 14 contemporary and uniquely decorated rooms for business and leisure travelers and can
              accommodate up to 28 guests at the same time.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">Book Now</Button>
          </div>
        </div>
      </section>

      {/* Rooms Section */}
      {loading ? (
        <div className="py-20 bg-white text-gray-900 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rooms...</p>
        </div>
      ) : rooms.length > 0 ? (
        <>
          {rooms.map((room, index) => (
            <section 
              key={room.id} 
              className={`py-20 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-100'} text-gray-900`}
            >
              <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  {index % 2 === 0 ? (
                    <>
                      <div className="relative h-96">
                        <Image
                          src={room.imageUrl || "/placeholder.svg?height=400&width=600"}
                          alt={room.name}
                          fill
                          className="object-cover rounded-lg"
                          loading="lazy"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                      </div>
                      <div className="space-y-6">
                        <h2 className="text-3xl font-bold">{room.name}</h2>
                        <p className="text-gray-600 leading-relaxed">{room.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold text-blue-600">{room.price} GEL</span>
                          <Button className="bg-blue-600 hover:bg-blue-700 text-white">Book Now</Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-6 order-2 lg:order-1">
                        <h2 className="text-3xl font-bold">{room.name}</h2>
                        <p className="text-gray-600 leading-relaxed">{room.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold text-blue-600">{room.price} GEL</span>
                          <Button className="bg-blue-600 hover:bg-blue-700 text-white">Book Now</Button>
                        </div>
                      </div>
                      <div className="relative h-96 order-1 lg:order-2">
                        <Image
                          src={room.imageUrl || "/placeholder.svg?height=400&width=600"}
                          alt={room.name}
                          fill
                          className="object-cover rounded-lg"
                          loading="lazy"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                        {index < rooms.length - 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                          >
                            <ChevronRight className="w-6 h-6" />
                          </Button>
                        )}
                        {index > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                          >
                            <ChevronLeft className="w-6 h-6" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          ))}
        </>
      ) : (
        <div className="py-20 bg-white text-gray-900 text-center">
          <p className="text-gray-600">No rooms available at the moment. Please check back later.</p>
        </div>
      )}

      <Footer />
    </div>
  )
}
