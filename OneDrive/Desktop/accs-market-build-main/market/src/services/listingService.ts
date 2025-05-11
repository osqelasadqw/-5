import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase";
import { isAdmin } from "@/services/roleService";

export interface ListingFormData {
  link: string;
  displayLink: string;
  price: string | number;
  allowComments: boolean;
  description: string;
  income: string | number;
  expense: string | number;
  incomeDetails: string;
  expenseDetails: string;
  promotionDetails: string;
  supportDetails: string;
  agreeToRemoveContacts: boolean;
  platform: string;
  category: string;
  subscribers: number;
  imageUrls?: string[];
  sellerEmail?: string;
}

export const createListing = async (formData: ListingFormData, imageFiles: File[]) => {
  try {
    if (!auth.currentUser) {
      throw new Error("User must be logged in to create a listing");
    }

    // Upload images first
    const imageUrls = await Promise.all(
      imageFiles.map(async (file) => {
        const storageRef = ref(storage, `listings/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
      })
    );

    // Create the listing with image URLs and seller email
    const listingData = {
      ...formData,
      imageUrls,
      createdAt: new Date(),
      price: Number(formData.price),
      income: formData.income ? Number(formData.income) : 0,
      expense: formData.expense ? Number(formData.expense) : 0,
      subscribers: Number(formData.subscribers) || 0,
      sellerEmail: auth.currentUser.email,
      sellerId: auth.currentUser.uid,
    };

    const docRef = await addDoc(collection(db, "listings"), listingData);
    return { id: docRef.id, ...listingData };
  } catch (error) {
    console.error("Error creating listing:", error);
    throw error;
  }
};

export const getLatestListings = async (limitCount = 8) => {
  try {
    const q = query(
      collection(db, "listings"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const listings: Array<ListingFormData & { id: string }> = [];
    
    querySnapshot.forEach((doc) => {
      listings.push({ id: doc.id, ...doc.data() as ListingFormData });
    });
    
    return listings;
  } catch (error) {
    console.error("Error fetching listings:", error);
    throw error;
  }
};

export const deleteListing = async (listingId: string): Promise<boolean> => {
  try {
    if (!auth.currentUser) {
      throw new Error("მომხმარებელი უნდა იყოს ავტორიზებული");
    }

    // მოვიძიოთ პროდუქტი ID-ის მიხედვით
    const listingRef = doc(db, "listings", listingId);
    const listingSnap = await getDoc(listingRef);
    
    if (!listingSnap.exists()) {
      throw new Error("პროდუქტი ვერ მოიძებნა");
    }
    
    const listingData = listingSnap.data();
    const isOwner = listingData.sellerId === auth.currentUser.uid;
    
    // შევამოწმოთ არის თუ არა მომხმარებელი ადმინი ან პროდუქტის მფლობელი
    const isAdminUser = auth.currentUser.email ? await isAdmin(auth.currentUser.email) : false;
    
    if (!isOwner && !isAdminUser) {
      throw new Error("არ გაქვთ ამ პროდუქტის წაშლის უფლება");
    }
    
    // წავშალოთ პროდუქტის სურათები storage-დან
    if (listingData.imageUrls && listingData.imageUrls.length > 0) {
      const deletePromises = listingData.imageUrls.map(async (imageUrl: string) => {
        try {
          // გავწმინდოთ URL, რომ მივიღოთ storage path
          const storageRef = ref(storage, imageUrl);
          await deleteObject(storageRef);
        } catch (err) {
          console.error(`Error deleting image: ${imageUrl}`, err);
          // გავაგრძელოთ პროცესი თუ სურათის წაშლა ვერ მოხერხდა
        }
      });
      
      await Promise.all(deletePromises);
    }
    
    // წავშალოთ პროდუქტი Firestore-დან
    await deleteDoc(listingRef);
    
    return true;
  } catch (error) {
    console.error("Error deleting listing:", error);
    throw error;
  }
};
