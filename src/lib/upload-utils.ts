import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { doc, setDoc, collection, addDoc, updateDoc, getDoc } from "firebase/firestore"
import { storage, db } from "./firebase"
import { v4 as uuidv4 } from "uuid"
import imageCompression from "browser-image-compression"

// Image compression options
const compressionOptions = {
  maxSizeMB: 1,          // მაქსიმალური ზომა მეგაბაიტებში
  maxWidthOrHeight: 1920, // მაქსიმალური სიგანე ან სიმაღლე
  useWebWorker: true,     // იყენებს Web Worker-ს, თუ შესაძლებელია
  fileType: 'image/webp', // გადაიყვანოს webp ფორმატში
  initialQuality: 0.8    // საწყისი ხარისხი
}

// Check if browser supports webP
const supportsWebP = async (): Promise<boolean> => {
  if (!window || !window.createImageBitmap) return false;
  
  try {
    const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
    const blob = await fetch(webpData).then(r => r.blob());
    await createImageBitmap(blob);
    return true;
  } catch {
    return false;
  }
};

// Image upload with compression
export async function uploadImage(file: File, path: string): Promise<string> {
  try {
    // ვამოწმებთ, არის თუ არა საჭირო კომპრესია
    // 1MB-ზე დიდი ან სურათი
    const needsCompression = file.size > 1024 * 1024;
    
    let fileToUpload = file;
    let fileName = uuidv4();
    let fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    
    // თუ ბრაუზერი მხარს უჭერს webP-ს, გამოვიყენოთ ეს ფორმატი
    const supportsWebPFormat = await supportsWebP();
    
    // ჩავატაროთ კომპრესია, თუ საჭიროა
    if (needsCompression) {
      console.log(`Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // განსაზღვრავთ კომპრესიის პარამეტრებს
      const options = {
        ...compressionOptions,
        fileType: supportsWebPFormat ? 'image/webp' : 'image/jpeg'
      };
      
      // ვახდენთ კომპრესიას
      fileToUpload = await imageCompression(file, options);
      
      // განვსაზღვრავთ ფაილის გაფართოებას
      fileExtension = supportsWebPFormat ? 'webp' : 'jpg';
      
      console.log(`Compressed to: ${(fileToUpload.size / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Generate a unique filename
    const finalFileName = `${fileName}.${fileExtension}`;
    const storageRef = ref(storage, `${path}/${finalFileName}`);

    // Upload the compressed file (or original if no compression)
    const snapshot = await uploadBytes(storageRef, fileToUpload);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
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
  images?: { url: string; position: number }[]
}): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "rooms"), {
      ...roomData,
      // თუ სურათების მასივი არ არის მოცემული, მაშინ შევქმნათ ერთელემენტიანი მასივი მთავარი სურათით
      images: roomData.images || [{ url: roomData.imageUrl, position: 0 }],
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

// Update rooms page hero image
export async function updateRoomsHeroImage(imageUrl: string): Promise<void> {
  await updateSectionContent("roomsHero", { imageUrl })
}
