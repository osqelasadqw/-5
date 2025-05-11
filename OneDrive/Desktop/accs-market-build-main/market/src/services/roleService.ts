import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type UserRole = 'user' | 'seller' | 'escrow_agent' | 'admin';

export interface UserRoleData {
  email: string;
  role: UserRole;
  assignedBy?: string;
  assignedAt?: number;
}

// ამოწმებს, არის თუ არა მომხმარებელი escrow agent
export const isEscrowAgent = async (email: string): Promise<boolean> => {
  try {
    const roleRef = doc(db, 'roles', email);
    const roleSnap = await getDoc(roleRef);
    
    if (roleSnap.exists()) {
      const roleData = roleSnap.data() as UserRoleData;
      return roleData.role === 'escrow_agent' || roleData.role === 'admin';
    }
    
    return false;
  } catch (error) {
    console.error('Error checking escrow agent role:', error);
    return false;
  }
};

// ამოწმებს, არის თუ არა მომხმარებელი ადმინისტრატორი
export const isAdmin = async (email: string): Promise<boolean> => {
  try {
    // პირველად შევამოწმოთ users კოლექციაში admin ფილდი, რადგან ეს უფრო სწრაფია
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      if (userData.admin === true) {
        return true;
      }
    }
    
    // შემდეგ შევამოწმოთ roles კოლექციაში
    const roleRef = doc(db, 'roles', email);
    const roleSnap = await getDoc(roleRef);
    
    if (roleSnap.exists()) {
      const roleData = roleSnap.data() as UserRoleData;
      return roleData.role === 'admin';
    }
    
    return false;
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
};

// იღებს ყველა escrow agent-ს
export const getAllEscrowAgents = async (): Promise<UserRoleData[]> => {
  try {
    const rolesRef = collection(db, 'roles');
    const q = query(rolesRef, where('role', 'in', ['escrow_agent', 'admin']));
    const querySnapshot = await getDocs(q);
    
    const agents: UserRoleData[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserRoleData;
      agents.push({
        email: doc.id,
        ...data
      });
    });
    
    return agents;
  } catch (error) {
    console.error('Error fetching escrow agents:', error);
    return [];
  }
};

// ანიჭებს როლს მომხმარებელს (მხოლოდ ადმინისტრატორებისთვის)
export const assignRole = async (
  userEmail: string, 
  role: UserRole, 
  adminEmail: string
): Promise<boolean> => {
  try {
    // შემოწმება, არის თუ არა მოქმედი მომხმარებელი ადმინისტრატორი
    const isUserAdmin = await isAdmin(adminEmail);
    
    if (!isUserAdmin) {
      throw new Error('Only admins can assign roles');
    }
    
    const roleRef = doc(db, 'roles', userEmail);
    await setDoc(roleRef, {
      email: userEmail,
      role,
      assignedBy: adminEmail,
      assignedAt: Date.now()
    });
    
    return true;
  } catch (error) {
    console.error('Error assigning role:', error);
    return false;
  }
};

// იღებს მომხმარებლის როლს
export const getUserRole = async (email: string): Promise<UserRoleData | null> => {
  try {
    const roleRef = doc(db, 'roles', email);
    const roleSnap = await getDoc(roleRef);
    
    if (roleSnap.exists()) {
      return roleSnap.data() as UserRoleData;
    }
    
    // თუ roles კოლექციაში არ არის, შევამოწმოთ users კოლექციაში admin ფილდი
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      if (userData.admin === true) {
        // დავაბრუნოთ როლის მონაცემები admin პრივილეგიებით
        return {
          email: email,
          role: 'admin',
          assignedAt: Date.now()
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}; 