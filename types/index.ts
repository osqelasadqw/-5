export interface Room {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string
  createdAt: Date
}

export interface GalleryImage {
  id: string
  url: string
  section: string
  caption?: string
  createdAt: Date
}

export interface SectionContent {
  id: string
  imageUrl?: string
  imageUrls?: string[]
  text?: string
  updatedAt: Date
}
