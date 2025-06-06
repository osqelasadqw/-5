import { ref, uploadBytes, getDownloadURL, listAll } from "firebase/storage"
import { storage } from "./firebase"

export interface GalleryImage {
  id: string
  url: string
  name: string
  width?: number
  height?: number
}

export async function uploadImageToFirebase(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, `gallery/${path}/${file.name}`)
  const snapshot = await uploadBytes(storageRef, file)
  return await getDownloadURL(snapshot.ref)
}

export async function getGalleryImages(path = "gallery"): Promise<GalleryImage[]> {
  const storageRef = ref(storage, path)
  const result = await listAll(storageRef)

  const images: GalleryImage[] = await Promise.all(
    result.items.map(async (item) => {
      const url = await getDownloadURL(item)
      return {
        id: item.name,
        url,
        name: item.name,
      }
    }),
  )

  return images
}

export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }
    img.src = url
  })
}
