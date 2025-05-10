import { 
  ref, 
  set, 
  push, 
  onValue, 
  get, 
  query as rtdbQuery, 
  orderByChild, 
  equalTo,
  update,
  serverTimestamp,
  DatabaseReference,
  DataSnapshot
} from 'firebase/database';
import { rtdb, auth } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  where, 
  query as firestoreQuery,
  DocumentData,
  QuerySnapshot,
  CollectionReference
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// საიტის ჩატვირთვისას შევამოწმოთ ავთენტიფიკაციის სტატუსი
console.log('💬 DEBUG: realtimeChatService ჩატვირთულია', {
  auth: auth ? 'ავთენტიფიკაციის ობიექტი არსებობს' : 'ავთენტიფიკაციის ობიექტი არ არსებობს',
  currentUser: auth.currentUser ? `დალოგინებული: ${auth.currentUser.uid}` : 'მომხმარებელი არ არის დალოგინებული'
});

export interface ChatMessage {
  id?: string;
  text: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  timestamp: number;
  read: boolean;
  messageType?: 'text' | 'purchase-request';
  status?: 'pending' | 'agreed' | 'completed';
  showForwardingNotification?: boolean;
  productId?: string;
  paymentMethod?: 'stripe' | 'bitcoin';
  withAgent?: boolean;
  walletAddress?: string;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTimestamp: number;
  lastSenderId: string;
  unreadCount?: number;
  productId?: string;
}

// Helper to create a unique chat room ID from two user IDs
const getChatRoomId = (userId1: string, userId2: string, productId?: string): string => {
  console.log('💬 DEBUG: getChatRoomId გამოძახებულია', {userId1, userId2, productId});
  
  if (!userId1 || !userId2) {
    console.error('❌ ERROR: getChatRoomId - ერთ-ერთი მომხმარებლის ID არ არის მოწოდებული', {userId1, userId2});
    throw new Error('Both user IDs are required to create a chat room ID');
  }
  
  // პროდუქტის ID აუცილებელია ოთახის უნიკალური ID-ს შესაქმნელად
  if (!productId) {
    console.warn('⚠️ WARNING: getChatRoomId - productId არ არის მოწოდებული, ვიყენებთ default-ს.');
    console.trace('⚠️ WARNING: getChatRoomId - stack trace - ვინ იძახებს productId-ის გარეშე'); // დავამატოთ stack trace
    productId = 'general_' + Date.now();
  }
  
  // ჯერ დავსორტოთ მომხმარებლის ID-ები დეტერმინიზმისთვის
  const usersPart = [userId1, userId2].sort().join('_');
  
  // შევქმნათ საბოლოო ID ფორმატით: user1_user2_productId
  const roomId = `${usersPart}_${productId}`;
  
  console.log('💬 DEBUG: getChatRoomId შედეგი', {
    usersPart,
    productId, 
    roomId,
    callStack: new Error().stack // დავამატოთ stack trace ყველა გამოძახებისთვის
  });
  
  return roomId;
};

// Create or get a chat room
export const createChatRoom = async (recipientId: string, productId?: string): Promise<string> => {
  if (!auth.currentUser) throw new Error('You must be logged in');
  
  console.log('💬 DEBUG: createChatRoom გამოძახებულია', {
    recipientId,
    productId,
    currentUser: auth.currentUser?.uid || 'არ არის დალოგინებული',
    callStack: new Error().stack // დავამატოთ stack trace
  });
  
  // თუ პროდუქტის ID არ არის მოწოდებული, შევქმნათ დროებითი ID ზოგადი ჩატისთვის
  // ეს სექცია საჭიროა სისტემური და ზოგადი შეტყობინებებისთვის
  const finalProductId = productId || 'general_' + Date.now();
  
  try {
    const roomId = getChatRoomId(auth.currentUser.uid, recipientId, finalProductId);
    console.log('💬 DEBUG: გენერირებული roomId', { roomId });
    
    const roomRef = ref(rtdb, `chatRooms/${roomId}`);
    
    // ყოველთვის შევქმნათ ახალი ოთახი
    await set(roomRef, {
      participants: Array.from(new Set([auth.currentUser.uid, recipientId])).sort(),
      createdAt: serverTimestamp(),
      lastMessageTimestamp: serverTimestamp(),
      productId: finalProductId // შევინახოთ პროდუქტის ID
    });
    
    console.log('💬 DEBUG: ჩატის ოთახი წარმატებით შეიქმნა', { roomId });
    return roomId;
  } catch (error) {
    console.error('❌ ERROR: createChatRoom შეცდომა:', error);
    throw error;
  }
};

// Send a message to a chat room
export const sendMessage = async (text: string, recipientId: string, productId?: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('You must be logged in');
  
  console.log('💬 DEBUG: sendMessage გამოძახებულია', {
    text: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
    recipientId,
    productId,
    currentUser: auth.currentUser.uid,
    callStack: new Error().stack // დავამატოთ stack trace
  });
  
  // თუ პროდუქტის ID არ არის მოწოდებული, შექმენით დროებითი ზოგადი ID
  const finalProductId = productId || ('general_' + Date.now());
  const currentUserId = auth.currentUser.uid;
  
  try {
    // მივიღოთ ოთახის ID დეტერმინისტული მეთოდით
    const roomId = getChatRoomId(currentUserId, recipientId, finalProductId);
    const roomRef = ref(rtdb, `chatRooms/${roomId}`);
    const roomSnapshot = await get(roomRef);
    
    // შევამოწმოთ ოთახის არსებობა და შევქმნათ თუ საჭიროა
    if (!roomSnapshot.exists()) {
      console.log('💬 DEBUG: sendMessage - Room does not exist, creating:', roomId);
      await set(roomRef, {
        participants: Array.from(new Set([currentUserId, recipientId])).sort(),
        createdAt: serverTimestamp(),
        lastMessageTimestamp: serverTimestamp(),
        productId: finalProductId,
        lastMessage: "",
        lastSenderId: ""
      });
      
      // დავაინიციალიზიროთ userChats ორივე მომხმარებლისთვის
      const user1ChatRef = ref(rtdb, `userChats/${currentUserId}/${roomId}`);
      await set(user1ChatRef, {
        lastMessage: '',
        lastMessageTimestamp: serverTimestamp(),
        unreadCount: 0,
        productId: finalProductId,
        otherUserId: recipientId
      });
      
      const user2ChatRef = ref(rtdb, `userChats/${recipientId}/${roomId}`);
      await set(user2ChatRef, {
        lastMessage: '',
        lastMessageTimestamp: serverTimestamp(),
        unreadCount: 0, 
        productId: finalProductId,
        otherUserId: currentUserId
      });
      
      console.log('💬 DEBUG: sendMessage - New room created and userChats initialized:', roomId);
    } else {
      console.log('💬 DEBUG: sendMessage - Using existing room:', roomId, {
        roomData: roomSnapshot.val() // დავამატოთ ოთახის მონაცემები
      });
      
      // განვაახლოთ ოთახის productId თუ საჭიროა
      const roomData = roomSnapshot.val();
      if (roomData.productId !== finalProductId) {
        console.log('💬 DEBUG: sendMessage - productId განსხვავებულია, ვაახლებთ', {
          oldProductId: roomData.productId,
          newProductId: finalProductId
        });
        await update(roomRef, { productId: finalProductId });
        console.log('💬 DEBUG: sendMessage - Updated productId in existing room:', roomId);
      }
      
      // შევამოწმოთ userChats ჩანაწერები ორივე მომხმარებლისთვის და შევქმნათ თუ არ არსებობს
      const user1ChatRef = ref(rtdb, `userChats/${currentUserId}/${roomId}`);
      const user1ChatSnapshot = await get(user1ChatRef);
      
      if (!user1ChatSnapshot.exists()) {
        console.log('💬 DEBUG: sendMessage - მიმდინარე მომხმარებლის userChat არ არსებობს, ვქმნით', {currentUserId, roomId});
        await set(user1ChatRef, {
          lastMessage: roomData.lastMessage || '',
          lastMessageTimestamp: roomData.lastMessageTimestamp || serverTimestamp(),
          unreadCount: 0,
          productId: finalProductId,
          otherUserId: recipientId
        });
        console.log('💬 DEBUG: sendMessage - Created missing userChat entry for current user:', roomId);
      } else {
        console.log('💬 DEBUG: sendMessage - მიმდინარე მომხმარებლის userChat არსებობს', {
          userData: user1ChatSnapshot.val()
        });
      }
      
      const user2ChatRef = ref(rtdb, `userChats/${recipientId}/${roomId}`);
      const user2ChatSnapshot = await get(user2ChatRef);
      
      if (!user2ChatSnapshot.exists()) {
        console.log('💬 DEBUG: sendMessage - მიმღების userChat არ არსებობს, ვქმნით', {recipientId, roomId});
        await set(user2ChatRef, {
          lastMessage: roomData.lastMessage || '',
          lastMessageTimestamp: roomData.lastMessageTimestamp || serverTimestamp(),
          unreadCount: 0,
          productId: finalProductId,
          otherUserId: currentUserId
        });
        console.log('💬 DEBUG: sendMessage - Created missing userChat entry for recipient:', roomId);
      } else {
        console.log('💬 DEBUG: sendMessage - მიმღების userChat არსებობს', {
          userData: user2ChatSnapshot.val()
        });
      }
    }
    
    // დავამატოთ ახალი შეტყობინება
  const messagesRef = ref(rtdb, `messages/${roomId}`);
  const newMessageRef = push(messagesRef);
  
  const message = {
    text,
      senderId: currentUserId,
    senderName: auth.currentUser.displayName || 'User',
    recipientId,
    timestamp: Date.now(),
    read: false,
      messageType: 'text' as const,
      productId: finalProductId
  };
  
  await set(newMessageRef, message);
    console.log('💬 DEBUG: შეტყობინება დაემატა:', {
      messageId: newMessageRef.key,
      roomId,
      message
    });
  
    // განვაახლოთ ოთახის ბოლო შეტყობინების მონაცემები
  await update(roomRef, {
    lastMessage: text,
    lastMessageTimestamp: message.timestamp,
      lastSenderId: currentUserId,
      productId: finalProductId 
    });
    
    // განვაახლოთ მიმღების userChats
    const recipientUserChatRef = ref(rtdb, `userChats/${recipientId}/${roomId}`);
    const recipientChatSnapshot = await get(recipientUserChatRef);
  
    if (recipientChatSnapshot.exists()) {
      const recipientData = recipientChatSnapshot.val();
      await update(recipientUserChatRef, {
        unreadCount: (recipientData.unreadCount || 0) + 1,
      lastMessage: text,
      lastMessageTimestamp: message.timestamp,
        productId: finalProductId
    });
  } else {
      await set(recipientUserChatRef, {
      unreadCount: 1,
      lastMessage: text,
      lastMessageTimestamp: message.timestamp,
        productId: finalProductId,
        otherUserId: currentUserId
    });
  }
  
    // განვაახლოთ გამგზავნის userChats
    const senderChatsRef = ref(rtdb, `userChats/${currentUserId}/${roomId}`);
    await update(senderChatsRef, {
      unreadCount: 0, 
    lastMessage: text,
    lastMessageTimestamp: message.timestamp,
      productId: finalProductId
    });
    
    console.log('💬 DEBUG: მესიჯი წარმატებით გაიგზავნა', { roomId });
  } catch (error) {
    console.error('❌ ERROR: sendMessage შეცდომა:', error);
    throw error;
  }
};

// Get messages for a chat room
export const getMessages = (roomId: string, callback: (messages: ChatMessage[]) => void) => {
  console.log('💬 DEBUG: getMessages გამოძახებულია', {roomId, callStack: new Error().stack});
  const messagesRef = ref(rtdb, `messages/${roomId}`);
  
  // Listen for changes
  return onValue(messagesRef, (snapshot) => {
    const messages: ChatMessage[] = [];
    
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val() as ChatMessage;
      messages.push({
        id: childSnapshot.key || undefined,
        ...message
      });
    });
    
    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);
    console.log(`💬 DEBUG: getMessages - მიღებულია ${messages.length} შეტყობინება ოთახიდან`, {roomId});
    callback(messages);
  });
};

// Mark messages as read
export const markMessagesAsRead = async (roomId: string, senderId: string): Promise<void> => {
  if (!auth.currentUser) return;
  
  console.log('💬 DEBUG: markMessagesAsRead გამოძახებულია', {
    roomId,
    senderId,
    currentUser: auth.currentUser.uid,
    callStack: new Error().stack
  });
  
  // Only mark as read if the user is the recipient
  if (senderId === auth.currentUser.uid) {
    console.log('💬 DEBUG: markMessagesAsRead - მომხმარებელი თვითონ არის გამგზავნი, არ ვანიშნავთ წაკითხულად');
    return;
  }
  
  const messagesRef = ref(rtdb, `messages/${roomId}`);
  const snapshot = await get(messagesRef);
  
  const updates: Record<string, any> = {};
  let unreadCount = 0;
  
  snapshot.forEach((childSnapshot) => {
    const message = childSnapshot.val();
    if (message.senderId === senderId && message.recipientId === auth.currentUser?.uid && !message.read) {
      updates[`${childSnapshot.key}/read`] = true;
      unreadCount++;
    }
  });
  
  console.log(`💬 DEBUG: markMessagesAsRead - ნაპოვნია ${unreadCount} წაუკითხავი შეტყობინება`, {roomId});
  
  if (Object.keys(updates).length > 0) {
    await update(messagesRef, updates);
    console.log(`💬 DEBUG: markMessagesAsRead - ${unreadCount} შეტყობინება აღნიშნულია წაკითხულად`, {roomId});
    
    // Reset unread count for this chat room
    const userChatsRef = ref(rtdb, `userChats/${auth.currentUser.uid}/${roomId}`);
    await update(userChatsRef, {
      unreadCount: 0
    });
    console.log('💬 DEBUG: markMessagesAsRead - userChats unreadCount განულებულია', {roomId});
  }
};

// Get user's chat rooms
export const getUserChatRooms = (callback: (rooms: ChatRoom[]) => void) => {
  if (!auth.currentUser) {
    callback([]);
    return () => {};
  }
  
  console.log('💬 DEBUG: getUserChatRooms გამოძახებულია', {
    currentUser: auth.currentUser.uid,
    callStack: new Error().stack
  });
  
  const userChatsRef = ref(rtdb, `userChats/${auth.currentUser.uid}`);
  
  return onValue(userChatsRef, async (snapshot) => {
    console.log(`💬 DEBUG: getUserChatRooms - მიღებულია ${snapshot.size} ჩატის ოთახი`);
    const roomPromises: Promise<ChatRoom | null>[] = [];
    
    snapshot.forEach((childSnapshot) => {
      const roomId = childSnapshot.key as string;
      const userData = childSnapshot.val();
      console.log(`💬 DEBUG: getUserChatRooms - დამუშავებას იწყება ოთახი`, {
        roomId,
        userData
      });
      
      roomPromises.push(getRoomData(roomId, userData));
    });
    
    const resolvedRooms = await Promise.all(roomPromises);
    const validRooms = resolvedRooms.filter((room): room is ChatRoom => room !== null);
    
    console.log(`💬 DEBUG: getUserChatRooms - დამუშავებულია ${validRooms.length} ვალიდური ოთახი`);
    
    validRooms.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
    callback(validRooms);
  });
};

// დამხმარე ფუნქცია ოთახის მონაცემების მისაღებად
const getRoomData = async (
  roomId: string, 
  userData: any
): Promise<ChatRoom | null> => {
  if (!auth.currentUser) return null;
  
  try {
    console.log('💬 DEBUG: getRoomData გამოძახებულია', {roomId, userData});
    
    const roomRef = ref(rtdb, `chatRooms/${roomId}`);
    const roomSnapshot = await get(roomRef);
    
    if (roomSnapshot.exists()) {
      const roomData = roomSnapshot.val();
      console.log('💬 DEBUG: getRoomData - ოთახი ნაპოვნია', {roomId, roomData});
      
      // Find the other participant ID
      const otherUserId = roomData.participants.find(
        (id: string) => id !== auth.currentUser?.uid
      );
      
      return {
        id: roomId,
        participants: roomData.participants,
        lastMessage: userData.lastMessage || '',
        lastMessageTimestamp: userData.lastMessageTimestamp || 0,
        lastSenderId: roomData.lastSenderId || '',
        unreadCount: userData.unreadCount || 0,
        productId: userData.productId || undefined
      };
    }
    
    console.log('💬 DEBUG: getRoomData - ოთახი არ არსებობს', {roomId});
    return null;
  } catch (error) {
    console.error("Error getting room data:", error);
    return null;
  }
};

// Initialize user's chat data (call when user logs in)
export const initUserChats = async () => {
  if (!auth.currentUser) return;
  
  const userChatsRef = ref(rtdb, `userChats/${auth.currentUser.uid}`);
  const snapshot = await get(userChatsRef);
  
  if (!snapshot.exists()) {
    await set(userChatsRef, {});
  }
};

// ფუნქცია, რომელიც ასუფთავებს Firestore-ში შენახულ ჩატის მონაცემებს
export const cleanupChatFirestoreData = async (userId: string, sellerId: string, productId: string): Promise<void> => {
  try {
    console.log('💬 DEBUG: cleanupChatFirestoreData გამოძახებულია', {userId, sellerId, productId});
    
    // შევამოწმოთ, ხომ არ არსებობს ეს ჩატი Firestore-ში
    const chatCollectionRef = collection(db, 'chats');
    
    // შევამოწმოთ არსებობა ორივე მიმართულებით (მყიდველი-გამყიდველი და გამყიდველი-მყიდველი)
    const chatQuery1 = firestoreQuery(
      chatCollectionRef, 
      where('participants', 'array-contains', userId),
      where('sellerId', '==', sellerId)
    );
    
    const chatQuery2 = firestoreQuery(
      chatCollectionRef, 
      where('participants', 'array-contains', sellerId),
      where('sellerId', '==', userId)
    );
    
    // ცალკე შევამოწმოთ productId-ით
    const chatQuery3 = firestoreQuery(
      chatCollectionRef, 
      where('productId', '==', productId)
    );
    
    const [snapshot1, snapshot2, snapshot3] = await Promise.all([
      getDocs(chatQuery1),
      getDocs(chatQuery2),
      getDocs(chatQuery3)
    ]);
    
    console.log('💬 DEBUG: cleanupChatFirestoreData - ძიების შედეგები', {
      snapshot1Size: snapshot1.size,
      snapshot2Size: snapshot2.size,
      snapshot3Size: snapshot3.size
    });
    
    const allDocs = [...snapshot1.docs, ...snapshot2.docs, ...snapshot3.docs];
    const uniqueDocIds = new Set(allDocs.map(doc => doc.id));
    
    // თუ ვიპოვეთ ჩატის მონაცემები Firestore-ში, წავშალოთ ისინი
    if (uniqueDocIds.size > 0) {
      console.warn(`⚠️ WARNING: ნაპოვნია ${uniqueDocIds.size} ჩატის ჩანაწერი Firestore-ში. ჩატის მონაცემები უნდა შეინახოს მხოლოდ Realtime Database-ში!`, {
        firestoreChatIDs: Array.from(uniqueDocIds),
        userId,
        sellerId,
        productId
      });
      
      // მცდელობა, რომ წავშალოთ ნაპოვნი ჩანაწერები
      try {
        // დამატებით ფაილების import, რაც შეიძლება საჭირო იყოს
        const { deleteDoc, doc } = require('firebase/firestore');
        
        console.log(`🧹 კლინაპ: ვასუფთავებთ Firestore-ში არსებულ ჩატის ჩანაწერებს...`);
        
        for (const docId of uniqueDocIds) {
          try {
            // წაშალე ძირითადი ჩატის დოკუმენტი
            const chatDocRef = doc(db, 'chats', docId);
            await deleteDoc(chatDocRef);
            
            // წაშალე ჩატის შეტყობინებები (თუ ისინი ცალკე კოლექციაში ინახება)
            const messagesCollectionRef = collection(db, 'chats', docId, 'messages');
            const messagesSnapshot = await getDocs(messagesCollectionRef);
            
            const deletePromises = messagesSnapshot.docs.map(msgDoc => 
              deleteDoc(doc(db, 'chats', docId, 'messages', msgDoc.id))
            );
            
            await Promise.all(deletePromises);
            
            console.log(`🧹 კლინაპ: წაიშალა Firestore-ის ჩატი და შეტყობინებები ID: ${docId}`);
          } catch (deleteErr) {
            console.error(`❌ ERROR: ვერ მოხერხდა ჩატის დოკუმენტის წაშლა ID: ${docId}`, deleteErr);
          }
        }
        
        console.log(`🧹 კლინაპ: Firestore-ის გაწმენდა დასრულებულია. წაიშალა ${uniqueDocIds.size} ჩანაწერი.`);
      } catch (deleteError) {
        console.error('❌ ERROR: ვერ მოხერხდა Firestore-ის გაწმენდა:', deleteError);
      }
    }
  } catch (error) {
    console.error('❌ ERROR: cleanupChatFirestoreData შეცდომა:', error);
    // აქ არ გადავისვრით შეცდომას, რადგან ეს არ არის კრიტიკული ფუნქცია
    // და არ გვინდა ძირითადი ფუნქციონალის დაბლოკვა
  }
};

// Get chat room by seller ID
export const getChatRoomWithSeller = async (sellerId: string, productId?: string): Promise<string | null> => {
  console.log('💬 DEBUG: getChatRoomWithSeller გამოძახებულია', {
    sellerId, 
    productId,
    currentUser: auth.currentUser?.uid || 'არ არის დალოგინებული',
    callStack: new Error().stack // დავამატოთ stack trace
  });
  
  if (!auth.currentUser) {
    console.error('❌ ERROR: getChatRoomWithSeller - მომხმარებელი არ არის დალოგინებული');
    return null;
  }
  
  // შემომავალი productId შევინახოთ როგორც requestedProductId
  const requestedProductId = productId;

  if (!requestedProductId) {
    console.error('❌ ERROR: getChatRoomWithSeller - არ არის მოწოდებული პროდუქტის ID');
    throw new Error('Product ID is required for seller chat creation');
  }
  
  try {
    const currentUserId = auth.currentUser.uid;
    
    // გაასუფთავე შესაძლო დუბლიკატები Firestore-ში
    // await cleanupChatFirestoreData(currentUserId, sellerId, productId); // დროებით გავთიშოთ კლინაპი, რომ ლოგები არ აირიოს

    let finalRoomIdToUse: string | null = null;
    let finalProductIdToUse: string = requestedProductId;

    // თუ მოთხოვნილი productId არის 'messages', ვცადოთ ვიპოვოთ არსებული სპეციფიკური ჩატი
    if (requestedProductId === 'messages') {
      console.log('💬 DEBUG: getChatRoomWithSeller - requestedProductId is "messages", searching for existing specific chat.');
      const userChatsRef = ref(rtdb, `userChats/${currentUserId}`);
      const userChatsSnapshot = await get(userChatsRef);
      let mostRecentSpecificRoomId: string | null = null;
      let mostRecentSpecificProductId: string | null = null;
      let maxTimestamp = 0;

      if (userChatsSnapshot.exists()) {
        userChatsSnapshot.forEach(childSnapshot => {
          const chatEntry = childSnapshot.val();
          if (chatEntry.otherUserId === sellerId) {
            const chatEntryProductId = chatEntry.productId;
            // ვამოწმებთ არის თუ არა productId "სპეციფიკური"
            if (chatEntryProductId && chatEntryProductId !== 'messages' && !chatEntryProductId.startsWith('general_')) {
              if (chatEntry.lastMessageTimestamp >= maxTimestamp) { // >= ნიშნავს, რომ თუ დრო ერთნაირია, ბოლოს ნაპოვნს ავიღებთ
                maxTimestamp = chatEntry.lastMessageTimestamp;
                mostRecentSpecificRoomId = childSnapshot.key; // ეს არის roomId
                mostRecentSpecificProductId = chatEntryProductId;
              }
            }
          }
        });
      }

      if (mostRecentSpecificRoomId && mostRecentSpecificProductId) {
        console.log('💬 DEBUG: getChatRoomWithSeller - Found existing specific chat. Overriding "messages".', {
          foundRoomId: mostRecentSpecificRoomId,
          foundProductId: mostRecentSpecificProductId
        });
        finalRoomIdToUse = mostRecentSpecificRoomId;
        finalProductIdToUse = mostRecentSpecificProductId;
      } else {
        console.log('💬 DEBUG: getChatRoomWithSeller - No specific chat found, proceeding with "messages".');
        // finalProductIdToUse რჩება 'messages'
      }
    }

    // თუ finalRoomIdToUse უკვე ნაპოვნია (სპეციფიკური ჩატის ძებნისას), ვიყენებთ მას
    // წინააღმდეგ შემთხვევაში, ვქმნით ID-ს finalProductIdToUse-ის მიხედვით (რომელიც შეიძლება იყოს 'messages' ან თავდაპირველი productId)
    const roomId = finalRoomIdToUse || getChatRoomId(currentUserId, sellerId, finalProductIdToUse);
    const roomRef = ref(rtdb, `chatRooms/${roomId}`);
    const roomSnapshot = await get(roomRef);

    if (roomSnapshot.exists()) {
      console.log('💬 DEBUG: getChatRoomWithSeller - Existing room found by ID:', roomId, {
        roomData: roomSnapshot.val(),
        productIdUsed: finalProductIdToUse
      });
      
      const roomData = roomSnapshot.val();
      
      // თუ ოთახის productId არ ემთხვევა finalProductIdToUse, განვაახლოთ
      if (!roomData.productId || roomData.productId !== finalProductIdToUse) {
        console.log('💬 DEBUG: getChatRoomWithSeller - productId განსხვავებულია ოთახში, ვაახლებთ', {
          oldRoomProductId: roomData.productId,
          newProductId: finalProductIdToUse,
          roomId: roomId
        });
        await update(roomRef, { productId: finalProductIdToUse });
      }
      
      const expectedParticipants = Array.from(new Set([currentUserId, sellerId])).sort();
      const currentParticipants = (roomData.participants || []).sort();

      if (JSON.stringify(currentParticipants) !== JSON.stringify(expectedParticipants)) {
        console.log('💬 DEBUG: getChatRoomWithSeller - მონაწილეები არ ემთხვევა, ვაახლებთ', {
          currentParticipants,
          expectedParticipants,
          roomId: roomId
        });
        await update(roomRef, { participants: expectedParticipants });
      }
      
      // განვაახლოთ userChats ჩანაწერები finalProductIdToUse-ით
      const user1ChatRef = ref(rtdb, `userChats/${currentUserId}/${roomId}`);
      const user1ChatSnapshot = await get(user1ChatRef);
      
      if (!user1ChatSnapshot.exists()) {
        console.log('💬 DEBUG: getChatRoomWithSeller - მიმდინარე მომხმარებლის userChat არ არსებობს, ვქმნით', {currentUserId, roomId, productId: finalProductIdToUse});
        await set(user1ChatRef, {
          lastMessage: roomData.lastMessage || '',
          lastMessageTimestamp: roomData.lastMessageTimestamp || serverTimestamp(),
          unreadCount: 0,
          productId: finalProductIdToUse,
          otherUserId: sellerId
        });
      } else if (user1ChatSnapshot.val().productId !== finalProductIdToUse) {
        console.log('💬 DEBUG: getChatRoomWithSeller - მომხმარებლის userChat-ის productId განსხვავებულია, ვაახლებთ', {
          oldUserChatProductId: user1ChatSnapshot.val().productId,
          newUserChatProductId: finalProductIdToUse,
          roomId: roomId
        });
        await update(user1ChatRef, { productId: finalProductIdToUse });
      } else {
        // console.log('💬 DEBUG: getChatRoomWithSeller - მიმდინარე მომხმარებლის userChat არსებობს და productId ემთხვევა', {
        //   userData: user1ChatSnapshot.val()
        // });
      }
      
      const user2ChatRef = ref(rtdb, `userChats/${sellerId}/${roomId}`);
      const user2ChatSnapshot = await get(user2ChatRef);
      
      if (!user2ChatSnapshot.exists()) {
        console.log('💬 DEBUG: getChatRoomWithSeller - გამყიდველის userChat არ არსებობს, ვქმნით', {sellerId, roomId, productId: finalProductIdToUse});
        await set(user2ChatRef, {
          lastMessage: roomData.lastMessage || '',
          lastMessageTimestamp: roomData.lastMessageTimestamp || serverTimestamp(),
          unreadCount: 0,
          productId: finalProductIdToUse,
          otherUserId: currentUserId
        });
      } else if (user2ChatSnapshot.val().productId !== finalProductIdToUse) {
        console.log('💬 DEBUG: getChatRoomWithSeller - გამყიდველის userChat-ის productId განსხვავებულია, ვაახლებთ', {
          oldUserChatProductId: user2ChatSnapshot.val().productId,
          newUserChatProductId: finalProductIdToUse,
          roomId: roomId
        });
        await update(user2ChatRef, { productId: finalProductIdToUse });
      } else {
        // console.log('💬 DEBUG: getChatRoomWithSeller - გამყიდველის userChat არსებობს და productId ემთხვევა', {
        //   userData: user2ChatSnapshot.val()
        // });
      }
      
      return roomId;
    } else {
      // ეს ნიშნავს, რომ ან თავიდანვე არ იყო specific room (requestedProductId !== 'messages'), 
      // ან იყო 'messages' და specific ვერ ვიპოვეთ, ან specific ვიპოვეთ (finalRoomIdToUse დაყენდა), მაგრამ ის roomID რატომღაც არ არსებობს DB-ში.
      // ეს ბოლო შემთხვევა ნაკლებად სავარაუდოა, თუ userChats-ში იყო.
      // ამიტომ, აქ ვქმნით ახალ ოთახს roomId-თ (რომელიც ან specific-ის IDა ან new messages-ის ID) და finalProductIdToUse-ით.

      console.log('💬 DEBUG: getChatRoomWithSeller - No existing room found by ID, creating new one:', {
        roomIdToCreate: roomId, 
        productIdForNewRoom: finalProductIdToUse
      });
      
      await set(roomRef, {
        participants: Array.from(new Set([currentUserId, sellerId])).sort(),
        createdAt: serverTimestamp(),
        lastMessageTimestamp: serverTimestamp(), 
        productId: finalProductIdToUse, // აქ ვიყენებთ finalProductIdToUse
        lastMessage: "", 
        lastSenderId: ""
      });

      const user1ChatRef = ref(rtdb, `userChats/${currentUserId}/${roomId}`);
      await set(user1ChatRef, {
        lastMessage: '',
        lastMessageTimestamp: serverTimestamp(),
        unreadCount: 0,
        productId: finalProductIdToUse, // აქ ვიყენებთ finalProductIdToUse
        otherUserId: sellerId 
      });

      const user2ChatRef = ref(rtdb, `userChats/${sellerId}/${roomId}`);
      await set(user2ChatRef, {
        lastMessage: '',
        lastMessageTimestamp: serverTimestamp(),
        unreadCount: 0, 
        productId: finalProductIdToUse, // აქ ვიყენებთ finalProductIdToUse
        otherUserId: currentUserId
      });

      console.log('💬 DEBUG: getChatRoomWithSeller - New room created and userChats initialized:', {
        createdRoomId: roomId, 
        usedProductId: finalProductIdToUse
      });
      return roomId;
    }
  } catch (error) {
    console.error('❌ ERROR: getChatRoomWithSeller შეცდომა:', error);
    throw error; 
  }
};

// ახალი ფუნქცია: გაგზავნოს შესყიდვის მოთხოვნის ფორმატირებული შეტყობინება
export const sendPurchaseRequest = async (
  recipientId: string, 
  channelName: string, 
  price: number,
  productId: string,
  paymentMethod: 'stripe' | 'bitcoin' = 'stripe',
  withAgent: boolean = true,
  walletAddress: string = ''
): Promise<void> => {
  if (!auth.currentUser) throw new Error('You must be logged in');
  const currentUserId = auth.currentUser.uid;
  
  console.log('💬 DEBUG: sendPurchaseRequest გამოძახებულია', {
    recipientId,
    channelName,
    price,
    productId,
    paymentMethod,
    withAgent,
    walletAddress,
    currentUser: currentUserId,
    callStack: new Error().stack // დავამატოთ stack trace
  });
  
  const transactionId = Math.floor(1000000 + Math.random() * 9000000);
  let purchaseRequestText = `🔐 Request to Purchase ${channelName}
Transaction ID: ${transactionId}
Transaction Amount: $${price}
Payment Method: ${paymentMethod === 'stripe' ? 'Stripe' : 'Bitcoin'}
`;

  if (paymentMethod === 'bitcoin' && walletAddress) {
    purchaseRequestText += `Bitcoin Wallet: ${walletAddress}\n`;
  }

  if (withAgent) {
    purchaseRequestText += `\nTransaction steps when using the escrow service:

The buyer pays the cost of the channel + 8% (±$3 minimum) service fee.

The seller confirms and agrees to use the escrow service.

The escrow agent verifies everything and assigns manager rights to the buyer.

After 7 days (or sooner if agreed), the escrow agent removes other managers and transfers full ownership to the buyer.

The funds are then released to the seller. Payments are sent instantly via all major payment methods.`;
  } else {
    purchaseRequestText += `\nDirect transaction without escrow agent.
Please communicate with the seller directly to complete the transaction.`;
  }

  try {
    console.log('💬 DEBUG: sendPurchaseRequest - ვამოწმებთ/ვქმნით ჩატის ოთახს პროდუქტისთვის', {productId});
    
    // მივიღოთ ოთახის ID დეტერმინისტული მეთოდით
    const roomId = getChatRoomId(currentUserId, recipientId, productId);
    const roomRef = ref(rtdb, `chatRooms/${roomId}`);
    const roomSnapshot = await get(roomRef);

    // შევამოწმოთ ოთახის არსებობა და შევქმნათ თუ საჭიროა
    if (!roomSnapshot.exists()) {
      console.log('💬 DEBUG: sendPurchaseRequest - Room does not exist, creating:', roomId);
      await set(roomRef, {
        participants: Array.from(new Set([currentUserId, recipientId])).sort(),
        createdAt: serverTimestamp(),
        lastMessageTimestamp: serverTimestamp(),
        productId: productId,
        lastMessage: "",
        lastSenderId: ""
      });
  
      // დავაინიციალიზიროთ userChats ორივე მომხმარებლისთვის
      const user1ChatRef = ref(rtdb, `userChats/${currentUserId}/${roomId}`);
      await set(user1ChatRef, {
        lastMessage: '',
        lastMessageTimestamp: serverTimestamp(),
        unreadCount: 0,
        productId: productId,
        otherUserId: recipientId
      });
      
      const user2ChatRef = ref(rtdb, `userChats/${recipientId}/${roomId}`);
      await set(user2ChatRef, {
        lastMessage: '',
        lastMessageTimestamp: serverTimestamp(),
        unreadCount: 0,
        productId: productId,
        otherUserId: currentUserId
      });
      
      console.log('💬 DEBUG: sendPurchaseRequest - New room created and userChats initialized:', roomId);
    } else {
      console.log('💬 DEBUG: sendPurchaseRequest - Using existing room:', roomId, {
        roomData: roomSnapshot.val() // დავამატოთ ოთახის მონაცემები
      });
      
      // განვაახლოთ ოთახის productId თუ საჭიროა
      const roomData = roomSnapshot.val();
      if (roomData.productId !== productId) {
        console.log('💬 DEBUG: sendPurchaseRequest - productId განსხვავებულია, ვაახლებთ', {
          oldProductId: roomData.productId,
          newProductId: productId
        });
        await update(roomRef, { productId: productId });
        console.log('💬 DEBUG: sendPurchaseRequest - Updated productId in existing room:', roomId);
      }
      
      // შევამოწმოთ userChats ჩანაწერები ორივე მომხმარებლისთვის და შევქმნათ თუ არ არსებობს
      const user1ChatRef = ref(rtdb, `userChats/${currentUserId}/${roomId}`);
      const user1ChatSnapshot = await get(user1ChatRef);
      
      if (!user1ChatSnapshot.exists()) {
        console.log('💬 DEBUG: sendPurchaseRequest - მიმდინარე მომხმარებლის userChat არ არსებობს, ვქმნით', {currentUserId, roomId});
        await set(user1ChatRef, {
          lastMessage: roomData.lastMessage || '',
          lastMessageTimestamp: roomData.lastMessageTimestamp || serverTimestamp(),
          unreadCount: 0,
          productId: productId,
          otherUserId: recipientId
        });
        console.log('💬 DEBUG: sendPurchaseRequest - Created missing userChat entry for current user:', roomId);
      } else if (user1ChatSnapshot.val().productId !== productId) {
        console.log('💬 DEBUG: sendPurchaseRequest - მომხმარებლის userChat-ის productId განსხვავებულია, ვაახლებთ', {
          oldProductId: user1ChatSnapshot.val().productId,
          newProductId: productId
        });
        await update(user1ChatRef, { productId: productId });
      } else {
        console.log('💬 DEBUG: sendPurchaseRequest - მიმდინარე მომხმარებლის userChat არსებობს', {
          userData: user1ChatSnapshot.val()
        });
      }
      
      const user2ChatRef = ref(rtdb, `userChats/${recipientId}/${roomId}`);
      const user2ChatSnapshot = await get(user2ChatRef);
      
      if (!user2ChatSnapshot.exists()) {
        console.log('💬 DEBUG: sendPurchaseRequest - მიმღების userChat არ არსებობს, ვქმნით', {recipientId, roomId});
        await set(user2ChatRef, {
          lastMessage: roomData.lastMessage || '',
          lastMessageTimestamp: roomData.lastMessageTimestamp || serverTimestamp(),
          unreadCount: 0,
          productId: productId,
          otherUserId: currentUserId
        });
        console.log('💬 DEBUG: sendPurchaseRequest - Created missing userChat entry for recipient:', roomId);
      } else if (user2ChatSnapshot.val().productId !== productId) {
        console.log('💬 DEBUG: sendPurchaseRequest - მიმღების userChat-ის productId განსხვავებულია, ვაახლებთ', {
          oldProductId: user2ChatSnapshot.val().productId,
          newProductId: productId
        });
        await update(user2ChatRef, { productId: productId });
      } else {
        console.log('💬 DEBUG: sendPurchaseRequest - მიმღების userChat არსებობს', {
          userData: user2ChatSnapshot.val()
        });
      }
    }
    
    console.log('💬 DEBUG: ჩატის ოთახის ID:', {roomId});
    
    // დავამატოთ ახალი შეტყობინება
    const messagesRef = ref(rtdb, `messages/${roomId}`);
    const newMessageRef = push(messagesRef);
    
    const message: any = {
      text: purchaseRequestText,
      senderId: currentUserId,
      senderName: auth.currentUser.displayName || 'User',
      recipientId,
      timestamp: Date.now(),
      read: false,
      messageType: 'purchase-request' as const,
      status: 'pending' as const,
      productId,
      paymentMethod,
      withAgent
    };
    
    if (paymentMethod === 'bitcoin' && walletAddress) {
      message.walletAddress = walletAddress;
    }
    
    console.log('💬 DEBUG: sendPurchaseRequest - ვცდილობთ მესიჯის დამატებას', {
      messageId: newMessageRef.key,
      roomId
    });
    
    await set(newMessageRef, message);
    console.log('💬 DEBUG: sendPurchaseRequest - შეტყობინება დაემატა:', {
      messageId: newMessageRef.key,
      roomId,
      message
    });
    
    // განვაახლოთ ოთახის ბოლო შეტყობინების მონაცემები
    await update(roomRef, {
      lastMessage: 'Purchase Request: ' + channelName,
      lastMessageTimestamp: message.timestamp,
      lastSenderId: currentUserId,
      productId: productId
    });
    
    // განვაახლოთ მიმღების userChats
    const recipientUserChatRef = ref(rtdb, `userChats/${recipientId}/${roomId}`);
    const recipientSnapshot = await get(recipientUserChatRef);
    
    if (recipientSnapshot.exists()) {
      const recipientData = recipientSnapshot.val();
      await update(recipientUserChatRef, {
        unreadCount: (recipientData.unreadCount || 0) + 1,
        lastMessage: 'Purchase Request: ' + channelName,
        lastMessageTimestamp: message.timestamp,
        productId: productId
      });
    } else {
      await set(recipientUserChatRef, {
        unreadCount: 1,
        lastMessage: 'Purchase Request: ' + channelName,
        lastMessageTimestamp: message.timestamp,
        productId: productId,
        otherUserId: currentUserId
      });
    }
    
    // განვაახლოთ გამგზავნის userChats
    const senderChatsRef = ref(rtdb, `userChats/${currentUserId}/${roomId}`);
    await update(senderChatsRef, {
      unreadCount: 0,
      lastMessage: 'Purchase Request: ' + channelName,
      lastMessageTimestamp: message.timestamp,
      productId: productId
    });
    
    console.log('💬 DEBUG: შესყიდვის მოთხოვნა წარმატებით გაიგზავნა', { roomId });
  } catch (error) {
    console.error('❌ ERROR: sendPurchaseRequest შეცდომა:', error);
    throw error;
  }
};

// ჩატის წაშლის ფუნქცია
export const deleteChatRoom = async (roomId: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('You must be logged in');
  
  try {
    // შევამოწმოთ თუ ოთახი არსებობს
    const roomRef = ref(rtdb, `chatRooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      throw new Error('Chat room does not exist');
    }
    
    const roomData = snapshot.val();
    
    // შევამოწმოთ არის თუ არა მომხმარებელი ოთახის მონაწილე
    if (!roomData.participants.includes(auth.currentUser.uid)) {
      throw new Error('You do not have permission to delete this chat');
    }
    
    // მოვძებნოთ მეორე მონაწილე
    const otherParticipantId = roomData.participants.find(
      (id: string) => id !== auth.currentUser?.uid
    );
    
    // წავშალოთ შეტყობინებები
    const messagesRef = ref(rtdb, `messages/${roomId}`);
    await set(messagesRef, null);
    
    // წავშალოთ ჩატის ოთახის ინფორმაცია მომხმარებლებისთვის
    const currentUserChatRef = ref(rtdb, `userChats/${auth.currentUser.uid}/${roomId}`);
    await set(currentUserChatRef, null);
    
    const otherUserChatRef = ref(rtdb, `userChats/${otherParticipantId}/${roomId}`);
    await set(otherUserChatRef, null);
    
    // წავშალოთ ჩატის ოთახი
    await set(roomRef, null);
    
    return;
  } catch (error) {
    console.error("Error deleting chat room:", error);
    throw error;
  }
};

// ფუნქცია შესყიდვის მოთხოვნის სტატუსის განახლებისთვის
export const updatePurchaseRequestStatus = async (
  messageId: string,
  roomId: string,
  status: 'agreed' | 'completed'
): Promise<void> => {
  if (!auth.currentUser) throw new Error('You must be logged in');
  
  try {
    console.log('💬 DEBUG: updatePurchaseRequestStatus გამოძახებულია', {
      messageId,
      roomId,
      status,
      currentUser: auth.currentUser.uid,
      callStack: new Error().stack
    });
    
    // შევამოწმოთ მესიჯის არსებობა
    const messageRef = ref(rtdb, `messages/${roomId}/${messageId}`);
    const snapshot = await get(messageRef);
    
    if (!snapshot.exists()) {
      console.error('❌ ERROR: updatePurchaseRequestStatus - შეტყობინება არ არსებობს', {messageId, roomId});
      throw new Error('Message does not exist');
    }
    
    const message = snapshot.val() as ChatMessage;
    console.log('💬 DEBUG: updatePurchaseRequestStatus - შეტყობინების მონაცემები:', {
      message,
      messageId,
      roomId
    });
    
    // შევამოწმოთ არის თუ არა მიმღები მიმდინარე მომხმარებელი
    if (message.recipientId !== auth.currentUser.uid) {
      console.error('❌ ERROR: updatePurchaseRequestStatus - მომხმარებელს არ აქვს უფლება განაახლოს ეს შეტყობინება', {
        messageRecipient: message.recipientId,
        currentUser: auth.currentUser.uid
      });
      throw new Error('You do not have permission to update this message');
    }
    
    // განვაახლოთ სტატუსი
    await update(messageRef, { status });
    console.log('💬 DEBUG: updatePurchaseRequestStatus - სტატუსი განახლდა', {
      status,
      messageId,
      roomId
    });
    
    // დავამატოთ შეტყობინება ჩატში სტატუსის შეცვლის შესახებ
    if (status === 'agreed') {
      await sendMessage(
        `✅ მიმღები დაეთანხმა შესყიდვის მოთხოვნას. ესქროუ აგენტი მალე დაგიკავშირდებათ.`,
        message.senderId,
        message.productId
      );
    }
    
    return;
  } catch (error) {
    console.error("Error updating purchase request status:", error);
    throw error;
  }
};

// ფუნქცია რეალური Escrow agent-ის ID-ის მისაღებად
export const getEscrowAgentId = async (): Promise<string | null> => {
  try {
    // გამოვიყენებთ როლების სერვისიდან getAllEscrowAgents ფუნქციას
    const rolesRef = collection(db, 'roles');
    const q = firestoreQuery(rolesRef, where('role', 'in', ['escrow_agent', 'admin']));
    const querySnapshot = await getDocs(q);
    
    // ავირჩიოთ პირველი Escrow Agent-ი
    if (!querySnapshot.empty) {
      const agentDoc = querySnapshot.docs[0];
      // მოვიძიოთ ამ მეილით მომხმარებელი
      const userQuery = firestoreQuery(collection(db, 'users'), where('email', '==', agentDoc.id));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        return userSnapshot.docs[0].id; // დავაბრუნოთ მომხმარებლის ID
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting escrow agent:', error);
    return null;
  }
};

// Escrow Agent-თან შეტყობინების გაგზავნის ფუნქცია
export const sendMessageToEscrowAgent = async (text: string, chatRoomId: string, productId?: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('You must be logged in');

  try {
    console.log('💬 DEBUG: sendMessageToEscrowAgent გამოძახებულია', {
      text: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
      chatRoomId,
      productId,
      currentUser: auth.currentUser.uid,
      callStack: new Error().stack
    });
    
    const escrowAgentUserId = await getEscrowAgentId() || 'escrow_agent'; 
    const currentUser = auth.currentUser; 
    const finalProductId = productId || 'general_escrow';

    // შევამოწმოთ არსებული ჩატის ოთახი
    const roomRef = ref(rtdb, `chatRooms/${chatRoomId}`);
    const roomSnapshot = await get(roomRef);
    
    if (!roomSnapshot.exists()) {
      throw new Error('Chat room does not exist');
    }

    // დავამატოთ ესკროუ აგენტი მონაწილეებში, თუ უკვე არ არის
    const roomData = roomSnapshot.val();
    let participants = Array.isArray(roomData.participants) ? roomData.participants : [];
    
    if (!participants.includes(escrowAgentUserId)) {
      console.log('💬 DEBUG: Adding escrow agent to participants', { 
        currentParticipants: participants,
        escrowAgentUserId 
      });
      
      // ახალ მასივში ვამატებთ ესკროუ აგენტს თუ ის უკვე არ არის მასივში
      participants = [...participants, escrowAgentUserId];
      
      await update(roomRef, {
        participants: participants,
        hasEscrowAgent: true
      });
      
      console.log('💬 DEBUG: Updated participants array', { newParticipants: participants });
    }

    // დავამატოთ შეტყობინება ამ ჩატში
    const messagesRef = ref(rtdb, `messages/${chatRoomId}`);
    const newMessageRef = push(messagesRef);
    
    // სისტემური შეტყობინება ესკროუ აგენტის შემოსვლის შესახებ
    const systemMessage: ChatMessage = {
      text: '🛡️ Escrow Agent შემოვიდა ჩატში და უსმენს თქვენს საუბარს. აგენტი დაგეხმარებათ ტრანზაქციის უსაფრთხოდ განხორციელებაში.',
      senderId: 'system',
      senderName: 'System',
      recipientId: 'all',
      timestamp: Date.now(),
      read: false,
      messageType: 'text'
    };
    
    await set(newMessageRef, systemMessage);
    
    // განვაახლოთ ჩატის ოთახის ინფორმაცია
    await update(roomRef, {
      lastMessage: systemMessage.text,
      lastMessageTimestamp: Date.now(),
      lastSenderId: 'system',
      escrowAgentActive: true
    });
    
    // ვუზრუნველყოთ რომ ესკროუ აგენტს ჰქონდეს წვდომა ამ ჩატზე თავის userChats სიაში
    const agentChatRef = ref(rtdb, `userChats/${escrowAgentUserId}/${chatRoomId}`);
    await set(agentChatRef, {
      lastMessage: systemMessage.text,
      lastMessageTimestamp: Date.now(),
      unreadCount: 1,
      productId: finalProductId,
      otherUserId: currentUser.uid
    });
    
    // ასევე შევინახოთ ამ escrow request-ის შესახებ ინფორმაცია, რომ აგენტებს ჰქონდეთ წვდომა
    const escrowRequestsRef = ref(rtdb, `escrowRequests/${chatRoomId}`);
    await set(escrowRequestsRef, {
      chatRoomId: chatRoomId,
      requesterId: currentUser.uid,
      requesterName: currentUser.displayName || 'User',
      requestTimestamp: Date.now(),
      participants: participants,
      status: 'active',
      productId: finalProductId
    });

    console.log('💬 DEBUG: Escrow agent successfully joined the chat', { chatRoomId });
    
  } catch (error) {
    console.error('❌ ERROR: sendMessageToEscrowAgent შეცდომა:', error);
    throw error;
  }
};

// ახალი ფუნქცია - Escrow Agent-ის მიერ შეტყობინების გაგზავნა ჩატში
export const sendMessageAsEscrowAgent = async (text: string, chatRoomId: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('You must be logged in');

  try {
    console.log('💬 DEBUG: sendMessageAsEscrowAgent გამოძახებულია', {
      text: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
      chatRoomId,
      currentUser: auth.currentUser.uid,
      callStack: new Error().stack
    });

    // შევამოწმოთ არის თუ არა მომხმარებელი ესკროუ აგენტი
    const isAgent = await isUserEscrowAgent(auth.currentUser.uid);
    console.log('💬 DEBUG: sendMessageAsEscrowAgent - არის თუ არა აგენტი:', isAgent);
    
    if (!isAgent) {
      console.error('❌ ERROR: მხოლოდ ესკროუ აგენტებს შეუძლიათ გააგზავნონ შეტყობინებები როგორც აგენტებმა');
      throw new Error('Only escrow agents can send messages as escrow agent');
    }

    // შევამოწმოთ არსებული ჩატის ოთახი
    const roomRef = ref(rtdb, `chatRooms/${chatRoomId}`);
    const roomSnapshot = await get(roomRef);
    
    if (!roomSnapshot.exists()) {
      console.error('❌ ERROR: ჩატის ოთახი არ არსებობს');
      throw new Error('Chat room does not exist');
    }

    console.log('💬 DEBUG: sendMessageAsEscrowAgent - ოთახი ნაპოვნია', {
      chatRoomId,
      roomData: roomSnapshot.val()
    });

    // დავამატოთ შეტყობინება ამ ჩატში
    const messagesRef = ref(rtdb, `messages/${chatRoomId}`);
    const newMessageRef = push(messagesRef);
    
    // ესკროუ აგენტის შეტყობინება
    const agentMessage: ChatMessage = {
      text: text,
      senderId: 'escrow_agent',
      senderName: 'Escrow Agent',
      recipientId: 'all',
      timestamp: Date.now(),
      read: false,
      messageType: 'text'
    };
    
    await set(newMessageRef, agentMessage);
    console.log('💬 DEBUG: sendMessageAsEscrowAgent - შეტყობინება დაემატა', {
      messageId: newMessageRef.key,
      chatRoomId
    });
    
    // განვაახლოთ ჩატის ოთახის ინფორმაცია
    await update(roomRef, {
      lastMessage: text,
      lastMessageTimestamp: Date.now(),
      lastSenderId: 'escrow_agent',
      hasEscrowAgent: true // დავამატოთ მარკერი, რომ ეს ოთახი აქტიურია ესკროუ აგენტისთვის
    });
    console.log('💬 DEBUG: sendMessageAsEscrowAgent - ჩატის ოთახი განახლდა');
    
    // განვაახლოთ წაკითხვის სტატუსი ყველა მონაწილისთვის გარდა აგენტისა
    const participants = roomSnapshot.val().participants || [];
    console.log('💬 DEBUG: sendMessageAsEscrowAgent - ვაახლებთ unreadCount ყველა მონაწილისთვის', {
      participants
    });
    
    for (const participantId of participants) {
      if (participantId !== 'escrow_agent' && participantId !== auth.currentUser.uid) {
        const participantChatRef = ref(rtdb, `userChats/${participantId}/${chatRoomId}`);
        const participantChatSnapshot = await get(participantChatRef);
        
        if (participantChatSnapshot.exists()) {
          const participantData = participantChatSnapshot.val();
          await update(participantChatRef, {
            lastMessage: text,
            lastMessageTimestamp: Date.now(),
            unreadCount: (participantData.unreadCount || 0) + 1
          });
          console.log('💬 DEBUG: sendMessageAsEscrowAgent - მონაწილის userChat განახლდა', {
            participantId,
            unreadCount: participantData.unreadCount + 1
          });
        } else {
          console.log('💬 DEBUG: sendMessageAsEscrowAgent - მონაწილის userChat არ არსებობს', {
            participantId
          });
        }
      }
    }
    
    console.log('💬 DEBUG: sendMessageAsEscrowAgent - შეტყობინება წარმატებით გაიგზავნა');
  } catch (error) {
    console.error('❌ ERROR: sendMessageAsEscrowAgent შეცდომა:', error);
    throw error;
  }
};

// დამხმარე ფუნქცია, რომელიც ამოწმებს არის თუ არა მომხმარებელი Escrow Agent
export const isUserEscrowAgent = async (userId: string): Promise<boolean> => {
  try {
    console.log('💬 DEBUG: isUserEscrowAgent ამოწმებს მომხმარებელს:', userId);
    
    // 1. RTDB-ში შემოწმება
    const userSnapshot = await get(ref(rtdb, `users/${userId}`));
    
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      console.log('💬 DEBUG: isUserEscrowAgent - ნაპოვნია RTDB-ში:', userData);
      if (userData.role === 'escrow_agent' || userData.role === 'admin') {
        console.log('💬 DEBUG: isUserEscrowAgent - დადასტურებულია RTDB როლიდან');
        return true;
      }
    }
    
    // 2. Firestore-ში users კოლექციაში შემოწმება
    const { getDoc, doc, collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('💬 DEBUG: isUserEscrowAgent - ნაპოვნია Firestore users-ში:', userData);
      
      if (userData.role === 'escrow_agent' || userData.role === 'admin' || userData.admin === true) {
        console.log('💬 DEBUG: isUserEscrowAgent - დადასტურებულია Firestore users-იდან');
        return true;
      }
      
      // 3. თუ არის email, შევამოწმოთ roles კოლექციაში
      if (userData.email) {
        console.log('💬 DEBUG: isUserEscrowAgent - მოწმდება email:', userData.email);
        
        const roleDocRef = doc(db, 'roles', userData.email);
        const roleDoc = await getDoc(roleDocRef);
        
        if (roleDoc.exists()) {
          const roleData = roleDoc.data();
          console.log('💬 DEBUG: isUserEscrowAgent - ნაპოვნია როლი:', roleData);
          
          if (roleData.role === 'escrow_agent' || roleData.role === 'admin') {
            console.log('💬 DEBUG: isUserEscrowAgent - დადასტურებულია Firestore roles-იდან');
            return true;
          }
        }
        
        // 4. ასევე შევამოწმოთ roles კოლექციაში query-თი
        const rolesRef = collection(db, 'roles');
        const q = query(rolesRef, where('email', '==', userData.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const roleDoc = querySnapshot.docs[0];
          const roleData = roleDoc.data();
          console.log('💬 DEBUG: isUserEscrowAgent - ნაპოვნია როლი query-დან:', roleData);
          
          if (roleData.role === 'escrow_agent' || roleData.role === 'admin') {
            console.log('💬 DEBUG: isUserEscrowAgent - დადასტურებულია Firestore roles query-დან');
            return true;
          }
        }
        
        // 5. შევამოწმოთ UID-ით
        const rolesUidQuery = query(rolesRef, where('uid', '==', userId));
        const rolesUidSnapshot = await getDocs(rolesUidQuery);
        
        if (!rolesUidSnapshot.empty) {
          const roleDoc = rolesUidSnapshot.docs[0];
          const roleData = roleDoc.data();
          console.log('💬 DEBUG: isUserEscrowAgent - ნაპოვნია როლი UID-ით:', roleData);
          
          if (roleData.role === 'escrow_agent' || roleData.role === 'admin') {
            console.log('💬 DEBUG: isUserEscrowAgent - დადასტურებულია Firestore roles-იდან UID-ით');
            return true;
          }
        }
      }
    }
    
    console.log('💬 DEBUG: isUserEscrowAgent - მომხმარებელი არ არის escrow აგენტი');
    return false;
  } catch (error) {
    console.error('Error checking if user is escrow agent:', error);
    return false;
  }
};

// ყველა ჩატის წაშლა მოცემული მომხმარებლისთვის
export const deleteAllUserChats = async (userId: string): Promise<void> => {
  if (!userId) throw new Error('User ID is required');

  try {
    console.log('💬 DEBUG: დაწყებულია ყველა ჩატის წაშლა მომხმარებლისთვის:', userId);
    
    // 1. ჯერ მოვიძიოთ მომხმარებლის ყველა ჩატის ოთახი
    const userChatsRef = ref(rtdb, `userChats/${userId}`);
    const userChatsSnapshot = await get(userChatsRef);
    
    if (!userChatsSnapshot.exists()) {
      console.log('ამ მომხმარებელს არ აქვს ჩატები');
      return;
    }
    
    const deletionPromises: Promise<void>[] = [];
    const roomIds: string[] = [];
    
    // ყველა ჩატის ID-ის შეგროვება
    userChatsSnapshot.forEach((childSnapshot) => {
      const roomId = childSnapshot.key as string;
      roomIds.push(roomId);
    });
    
    console.log(`ნაპოვნია ${roomIds.length} ჩატის ოთახი წასაშლელად`);
    
    // 2. თითოეული ჩატის ოთახის წაშლა
    for (const roomId of roomIds) {
      try {
        await deleteChatRoom(roomId);
        console.log(`ჩატის ოთახი წაშლილია: ${roomId}`);
      } catch (error) {
        console.error(`ვერ მოხერხდა ჩატის ოთახის წაშლა: ${roomId}`, error);
        // გავაგრძელოთ სხვა ოთახების წაშლა ერთის წარუმატებლობის მიუხედავად
      }
    }
    
    console.log('💬 DEBUG: ყველა ჩატის წაშლა დასრულებულია', { 
      userId, 
      totalDeleted: roomIds.length 
    });
    
    return;
  } catch (error) {
    console.error('❌ ERROR: ყველა ჩატის წაშლა ვერ მოხერხდა:', error);
    throw error;
  }
}; 