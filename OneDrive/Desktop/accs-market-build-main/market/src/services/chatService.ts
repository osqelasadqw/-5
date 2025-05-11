
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDoc,
  doc,
  Timestamp,
  updateDoc,
  arrayUnion,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  timestamp: Date;
  read: boolean;
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  isActive: boolean;
  unread: number;
}

// Send a new message
export const sendMessage = async (text: string, recipientId: string): Promise<Message | null> => {
  try {
    if (!auth.currentUser) return null;
    
    // Create a new message
    const messageData = {
      text,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'User',
      recipientId,
      timestamp: Timestamp.now(),
      read: false,
    };
    
    // Get chat ID (combination of the two user IDs, sorted alphabetically)
    const chatId = [auth.currentUser.uid, recipientId].sort().join('_');
    
    // Add to messages collection
    const docRef = await addDoc(collection(db, 'messages'), messageData);
    
    // Update or create the chat document
    await setDoc(doc(db, 'chats', chatId), {
      participants: [auth.currentUser.uid, recipientId],
      lastMessage: text,
      timestamp: Timestamp.now(),
      lastSenderId: auth.currentUser.uid,
    }, { merge: true });
    
    // Add message to both users' unread messages
    await updateDoc(doc(db, 'users', recipientId), {
      unreadMessages: arrayUnion({
        messageId: docRef.id,
        senderId: auth.currentUser.uid,
      })
    });
    
    return {
      id: docRef.id,
      ...messageData,
      timestamp: messageData.timestamp.toDate(),
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
};

// Get messages between the current user and another user
export const getMessages = (recipientId: string, callback: (messages: Message[]) => void) => {
  if (!auth.currentUser) return () => {};
  
  const chatId = [auth.currentUser.uid, recipientId].sort().join('_');
  
  const q = query(
    collection(db, 'messages'),
    where('senderId', 'in', [auth.currentUser.uid, recipientId]),
    where('recipientId', 'in', [auth.currentUser.uid, recipientId]),
    orderBy('timestamp', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        text: data.text,
        senderId: data.senderId,
        senderName: data.senderName,
        recipientId: data.recipientId,
        timestamp: data.timestamp.toDate(),
        read: data.read,
      });
    });
    
    // Mark messages as read if they're sent to the current user
    messages.forEach(async (message) => {
      if (message.recipientId === auth.currentUser?.uid && !message.read) {
        await updateDoc(doc(db, 'messages', message.id), {
          read: true,
        });
      }
    });
    
    callback(messages);
  });
};

// Get user contacts with chat history
export const getUserContacts = async (): Promise<Contact[]> => {
  if (!auth.currentUser) return [];
  
  try {
    // Query all chats where the current user is a participant
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', auth.currentUser.uid)
    );
    
    const chatsSnapshot = await getDocs(chatsQuery);
    const contacts: Contact[] = [];
    
    for (const chatDoc of chatsSnapshot.docs) {
      const chatData = chatDoc.data();
      
      // Find the other participant
      const otherUserId = chatData.participants.find(
        (id: string) => id !== auth.currentUser?.uid
      );
      
      if (otherUserId) {
        // Get other user data
        const userDoc = await getDoc(doc(db, 'users', otherUserId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Format the timestamp
          const timestamp = chatData.timestamp?.toDate() || new Date();
          const now = new Date();
          const diffMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
          
          let timeText;
          if (diffMinutes < 1) {
            timeText = 'now';
          } else if (diffMinutes < 60) {
            timeText = `${diffMinutes} min`;
          } else if (diffMinutes < 1440) {
            timeText = `${Math.floor(diffMinutes / 60)} hour${Math.floor(diffMinutes / 60) > 1 ? 's' : ''}`;
          } else {
            timeText = `${Math.floor(diffMinutes / 1440)} day${Math.floor(diffMinutes / 1440) > 1 ? 's' : ''}`;
          }
          
          // Count unread messages
          const messagesQuery = query(
            collection(db, 'messages'),
            where('senderId', '==', otherUserId),
            where('recipientId', '==', auth.currentUser.uid),
            where('read', '==', false)
          );
          const messagesSnapshot = await getDocs(messagesQuery);
          const unreadCount = messagesSnapshot.size;
          
          contacts.push({
            id: otherUserId,
            name: userData.username || 'Unknown User',
            avatar: userData.photoURL || '/lovable-uploads/0bdfd730-454c-4cdf-9cd4-d183c53ddd39.png',
            lastMessage: chatData.lastMessage || 'New conversation',
            time: timeText,
            isActive: Math.random() > 0.5, // Simulating online status for now
            unread: unreadCount,
          });
        }
      }
    }
    
    return contacts;
  } catch (error) {
    console.error('Error getting user contacts:', error);
    return [];
  }
};

// Create a new chat (e.g., when initiating a new conversation)
export const createChat = async (recipientId: string): Promise<string | null> => {
  if (!auth.currentUser) return null;
  
  try {
    const chatId = [auth.currentUser.uid, recipientId].sort().join('_');
    
    // Create the chat document
    await setDoc(doc(db, 'chats', chatId), {
      participants: [auth.currentUser.uid, recipientId],
      timestamp: Timestamp.now(),
    });
    
    return chatId;
  } catch (error) {
    console.error('Error creating chat:', error);
    return null;
  }
};
