import { 
  doc, 
  addDoc, 
  collection, 
  Timestamp, 
  serverTimestamp,
  setDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAllEscrowAgents } from './roleService';

export interface EscrowRequest {
  id?: string;
  chatRoomId: string;
  requesterId: string;
  requesterEmail: string;
  requesterName: string;
  createdAt: Timestamp | null;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  assignedAgentId?: string;
  assignedAgentEmail?: string;
  notes?: string;
}

// ქმნის Escrow Agent-ის გამოძახების მოთხოვნას
export const createEscrowRequest = async (
  chatRoomId: string,
  userId: string,
  userEmail: string,
  userName: string
): Promise<string | null> => {
  try {
    // შევამოწმოთ, ხომ არ არის უკვე გააქტიურებული escrow მოთხოვნა ამ ჩატში
    const existingRequest = await getActiveEscrowRequest(chatRoomId);
    
    if (existingRequest) {
      return existingRequest.id || null;
    }
    
    const escrowRequest: EscrowRequest = {
      chatRoomId,
      requesterId: userId,
      requesterEmail: userEmail,
      requesterName: userName,
      createdAt: serverTimestamp() as Timestamp,
      status: 'pending'
    };
    
    const docRef = await addDoc(collection(db, 'escrowRequests'), escrowRequest);
    
    // დავამატოთ მინიშნება ჩატში, რომ escrow მოთხოვნა გაიგზავნა
    await updateChatWithEscrowRequest(chatRoomId, docRef.id);
    
    // ავტომატურად მივანიჭოთ მოთხოვნა ხელმისაწვდომ escrow agent-ს
    await assignEscrowRequestToAvailableAgent(docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating escrow request:', error);
    return null;
  }
};

// ამოწმებს, არის თუ არა აქტიური escrow მოთხოვნა ამ ჩატში
export const getActiveEscrowRequest = async (chatRoomId: string): Promise<EscrowRequest | null> => {
  try {
    const chatDocRef = doc(db, 'chatRooms', chatRoomId);
    const chatDoc = await getDoc(chatDocRef);
    
    if (chatDoc.exists() && chatDoc.data().escrowRequestId) {
      const escrowRequestId = chatDoc.data().escrowRequestId;
      const escrowDocRef = doc(db, 'escrowRequests', escrowRequestId);
      const escrowDoc = await getDoc(escrowDocRef);
      
      if (escrowDoc.exists()) {
        const escrowData = escrowDoc.data() as EscrowRequest;
        
        if (escrowData.status !== 'completed' && escrowData.status !== 'rejected') {
          return {
            id: escrowDoc.id,
            ...escrowData
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking active escrow request:', error);
    return null;
  }
};

// ანახლებს ჩატის დოკუმენტს escrow მოთხოვნის ID-ით
const updateChatWithEscrowRequest = async (chatRoomId: string, escrowRequestId: string): Promise<void> => {
  try {
    const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
    await updateDoc(chatRoomRef, {
      escrowRequestId,
      escrowRequestedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating chat with escrow request:', error);
  }
};

// ავტომატურად მიანიჭებს მოთხოვნას ხელმისაწვდომ escrow agent-ს
const assignEscrowRequestToAvailableAgent = async (escrowRequestId: string): Promise<boolean> => {
  try {
    // მივიღოთ ყველა escrow agent
    const agents = await getAllEscrowAgents();
    
    if (agents.length === 0) {
      console.warn('No escrow agents available');
      return false;
    }
    
    // მარტივი ალგორითმი: ავირჩიოთ პირველი agent სიიდან
    // რეალურ სისტემაში აქ შეგვიძლია გავაკეთოთ უფრო რთული ლოგიკა
    // მაგალითად, დატვირთვის გადანაწილება ან სპეციალიზებული agent-ების არჩევა
    const agent = agents[0];
    
    const escrowRef = doc(db, 'escrowRequests', escrowRequestId);
    await updateDoc(escrowRef, {
      assignedAgentId: agent.email,
      assignedAgentEmail: agent.email,
      status: 'accepted'
    });
    
    return true;
  } catch (error) {
    console.error('Error assigning escrow request to agent:', error);
    return false;
  }
};

// ცვლის escrow მოთხოვნის სტატუსს
export const updateEscrowRequestStatus = async (
  escrowRequestId: string,
  newStatus: 'accepted' | 'rejected' | 'completed'
): Promise<boolean> => {
  try {
    const escrowRef = doc(db, 'escrowRequests', escrowRequestId);
    await updateDoc(escrowRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating escrow request status:', error);
    return false;
  }
}; 