import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore"
import { db } from "./firebase"

// Initialize required collections and documents
export async function initializeCollections() {
  try {
    // Initialize sections collection with default values
    const sectionsToInit = [
      {
        id: "hero",
        data: {
          imageUrl: "/images/hero-room.jpg",
          updatedAt: new Date(),
        },
      },
      {
        id: "slider",
        data: {
          imageUrls: [],
          updatedAt: new Date(),
        },
      },
      {
        id: "story",
        data: {
          imageUrls: [],
          updatedAt: new Date(),
        },
      },
      {
        id: "largePhoto",
        data: {
          imageUrl: "",
          updatedAt: new Date(),
        },
      },
      {
        id: "guestReview",
        data: {
          imageUrl: "",
          updatedAt: new Date(),
        },
      },
      {
        id: "seeDo",
        data: {
          imageUrl: "",
          updatedAt: new Date(),
        },
      },
    ]

    // Create sections documents if they don't exist
    for (const section of sectionsToInit) {
      const sectionDoc = await getDoc(doc(db, "sections", section.id))
      if (!sectionDoc.exists()) {
        await setDoc(doc(db, "sections", section.id), section.data)
        console.log(`Initialized ${section.id} section`)
      }
    }

    // Initialize other collections by checking if they exist
    const collectionsToInit = ["rooms", "gallery", "dining", "wines", "users", "admins"]

    for (const collectionName of collectionsToInit) {
      try {
        const snapshot = await getDocs(collection(db, collectionName))
        if (snapshot.empty) {
          // Collection exists but is empty - this is fine
          console.log(`Collection ${collectionName} is ready`)
        }
      } catch (error) {
        // Collection might not exist, but that's okay - it will be created when first document is added
        console.log(`Collection ${collectionName} will be created when needed`)
      }
    }

    console.log("All collections initialized successfully")
  } catch (error) {
    console.error("Error initializing collections:", error)
  }
}

// Function to add admin user
export async function addAdminUser(email: string) {
  try {
    await setDoc(doc(db, "admins", email), {
      email,
      isAdmin: true,
      createdAt: new Date(),
    })
    console.log(`Added admin user: ${email}`)
  } catch (error) {
    console.error("Error adding admin user:", error)
    throw error
  }
}

// Function to remove admin user
export async function removeAdminUser(email: string) {
  try {
    await setDoc(doc(db, "admins", email), {
      email,
      isAdmin: false,
      updatedAt: new Date(),
    })
    console.log(`Removed admin user: ${email}`)
  } catch (error) {
    console.error("Error removing admin user:", error)
    throw error
  }
}

// Function to check if user is admin
export async function checkIfUserIsAdmin(email: string): Promise<boolean> {
  try {
    const adminDoc = await getDoc(doc(db, "admins", email))
    return adminDoc.exists() && adminDoc.data()?.isAdmin === true
  } catch (error) {
    console.error("Error checking admin status:", error)
    return false
  }
}
