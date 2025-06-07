export interface Room {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string // მთავარი სურათი (თავდაპირველი ვერსიისთვის თავსებადობის შესანარჩუნებლად)
  images: {
    url: string
    position: number // სურათის პოზიცია სლაიდერში
  }[]
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
