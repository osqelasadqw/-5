import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { doc, setDoc, collection, addDoc, updateDoc, getDoc } from "firebase/firestore"
import { storage, db } from "./firebase"
import { v4 as uuidv4 } from "uuid"

// Image upload with compression
export async function uploadImage(file: File, path: string): Promise<string> {
  try {
    // Generate a unique filename to avoid collisions
    const fileExtension = file.name.split(".").pop()
    const fileName = `${uuidv4()}.${fileExtension}`
    const storageRef = ref(storage, `${path}/${fileName}`)

    // Upload the file
    const snapshot = await uploadBytes(storageRef, file)

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref)

    return downloadURL
  } catch (error) {
    console.error("Error uploading image:", error)
    throw error
  }
}

// Delete image from storage
export async function deleteImage(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url)
    await deleteObject(storageRef)
  } catch (error) {
    console.error("Error deleting image:", error)
    throw error
  }
}

// Save image metadata to Firestore
export async function saveImageMetadata(
  section: string,
  imageUrl: string,
  metadata: { [key: string]: any },
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, section), {
      url: imageUrl,
      ...metadata,
      createdAt: new Date(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error saving image metadata:", error)
    throw error
  }
}

// Update specific section content
export async function updateSectionContent(section: string, content: { [key: string]: any }): Promise<void> {
  try {
    const docRef = doc(db, "sections", section)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      await updateDoc(docRef, content)
    } else {
      await setDoc(docRef, {
        ...content,
        updatedAt: new Date(),
      })
    }
  } catch (error) {
    console.error(`Error updating ${section} content:`, error)
    throw error
  }
}

// Add a new room
export async function addRoom(roomData: {
  name: string
  description: string
  price: number
  imageUrl: string
}): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "rooms"), {
      ...roomData,
      createdAt: new Date(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding room:", error)
    throw error
  }
}

// Update hero section
export async function updateHeroSection(imageUrl: string): Promise<void> {
  await updateSectionContent("hero", { imageUrl })
}

// Update slider images
export async function updateSliderImages(imageUrls: string[]): Promise<void> {
  await updateSectionContent("slider", { imageUrls })
}

// Update story section images
export async function updateStoryImages(imageUrls: string[]): Promise<void> {
  await updateSectionContent("story", { imageUrls })
}

// Update large photo below story
export async function updateLargePhoto(imageUrl: string): Promise<void> {
  await updateSectionContent("largePhoto", { imageUrl })
}

// Update guest review image
export async function updateGuestReviewImage(imageUrl: string): Promise<void> {
  await updateSectionContent("guestReview", { imageUrl })
}
