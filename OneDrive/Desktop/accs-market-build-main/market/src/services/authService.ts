import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  User,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Type for user registration data
export interface RegisterData {
  email: string;
  password: string;
  username: string;
}

// Type for login data
export interface LoginData {
  email: string;
  password: string;
}

// Register a new user
export const registerUser = async (data: RegisterData) => {
  try {
    // Create the user with email and password
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      data.email, 
      data.password
    );
    
    // Update the user profile with the display name
    await updateProfile(userCredential.user, {
      displayName: data.username,
    });
    
    // Create a user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      username: data.username,
      email: data.email,
      createdAt: new Date(),
      photoURL: userCredential.user.photoURL || '',
    });
    
    return userCredential.user;
  } catch (error: any) {
    throw error;
  }
};

// Login user
export const loginUser = async (data: LoginData) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      data.email, 
      data.password
    );
    return userCredential.user;
  } catch (error: any) {
    throw error;
  }
};

// Login with Google
export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    
    // შევამოწმოთ, არსებობს თუ არა მომხმარებლის დოკუმენტი
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      // თუ პირველადაა შემოსული, შევქმნათ მომხმარებლის დოკუმენტი
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username: userCredential.user.displayName || 'User',
        email: userCredential.user.email,
        createdAt: new Date(),
        photoURL: userCredential.user.photoURL || '',
        providerId: 'google.com'
      });
    }
    
    return userCredential.user;
  } catch (error: any) {
    throw error;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error: any) {
    throw error;
  }
};

// Get current user data
export const getCurrentUserData = async (user: User) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error: any) {
    throw error;
  }
};

// Subscribe to auth state changes
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
