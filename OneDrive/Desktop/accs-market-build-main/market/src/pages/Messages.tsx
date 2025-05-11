import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { getUserChatRooms, ChatRoom } from '@/services/realtimeChatService';
import RealtimeChat from '@/components/RealtimeChat';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDoc, doc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MessageCircle, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";

interface UserInfo {
  id: string;
  username: string;
  email: string;
  photoURL?: string;
}

const Messages: React.FC = () => {
  const { currentUser } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeChatRoom, setActiveChatRoom] = useState<ChatRoom | null>(null);
  const [participants, setParticipants] = useState<Record<string, UserInfo>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Load chat rooms
  useEffect(() => {
    if (!currentUser) return;

    console.log('💬 DEBUG: Messages.tsx - getUserChatRooms გამოძახებულია', {
      currentUser: currentUser?.uid
    });

    const unsubscribe = getUserChatRooms((rooms) => {
      console.log('💬 DEBUG: Messages.tsx - მიღებულია ჩატის ოთახები', {
        roomsCount: rooms.length,
        rooms: rooms.map(r => ({ id: r.id, productId: r.productId }))
      });

      setChatRooms(rooms);
      setLoading(false);
      
      // Check if there's a selected chat room ID in localStorage
      const selectedRoomId = localStorage.getItem('selectedChatRoomId');
      console.log('💬 DEBUG: Messages.tsx - localStorage-დან მიღებულია roomId', { selectedRoomId });
      
      if (selectedRoomId) {
        if (selectedRoomId === 'escrow_agent') {
          // ესკრო აგენტთან ჩატის შემთხვევაში
          console.log('💬 DEBUG: Messages.tsx - ვხსნით Escrow Agent-თან ჩატს');
          handleSelectEscrowAgent();
        } else {
          const selectedRoom = rooms.find(room => room.id === selectedRoomId);
          console.log('💬 DEBUG: Messages.tsx - ვეძებთ არჩეულ ოთახს', { 
            selectedRoomId, 
            roomFound: !!selectedRoom 
          });
          
          if (selectedRoom) {
            console.log('💬 DEBUG: Messages.tsx - ვაყენებთ არჩეულ ოთახს', { 
              selectedRoom: { id: selectedRoom.id, productId: selectedRoom.productId } 
            });
            setActiveChatRoom(selectedRoom);
          }
        }
        // Clear the localStorage after using it
        localStorage.removeItem('selectedChatRoomId');
        console.log('💬 DEBUG: Messages.tsx - წავშალეთ roomId localStorage-დან');
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch participant info for each chat room
  useEffect(() => {
    const fetchParticipants = async () => {
      if (chatRooms.length === 0) return;

      const newParticipants: Record<string, UserInfo> = { ...participants };
      const fetchPromises: Promise<void>[] = [];

      for (const room of chatRooms) {
        // Find other participant (not current user)
        const otherParticipantId = room.participants.find(id => id !== currentUser?.uid);
        if (!otherParticipantId || newParticipants[otherParticipantId]) continue;

        const promise = getDoc(doc(db, 'users', otherParticipantId))
          .then((userDoc) => {
            if (userDoc.exists()) {
              const userData = userDoc.data() as DocumentData;
              newParticipants[otherParticipantId] = {
                id: otherParticipantId,
                username: userData.username || 'Unknown User',
                email: userData.email || '',
                photoURL: userData.photoURL
              };
            } else {
              newParticipants[otherParticipantId] = {
                id: otherParticipantId,
                username: 'Unknown User',
                email: '',
                photoURL: undefined
              };
            }
          })
          .catch(error => {
            console.error('Error fetching user:', error);
          });

        fetchPromises.push(promise);
      }

      await Promise.all(fetchPromises);
      setParticipants(newParticipants);
    };

    fetchParticipants();
  }, [chatRooms, currentUser?.uid, participants]);

  // Filter chat rooms based on search query
  const filteredChatRooms = chatRooms.filter((room) => {
    // Always exclude the dedicated 'escrow_agent' chat from this dynamic list
    // as it's handled by a separate UI element.
    if (room.id === 'escrow_agent' || room.id.startsWith('escrow_agent_')) return false;

    if (!searchQuery.trim()) return true; // If no search query, include (if not escrow_agent)

    const otherParticipantId = room.participants.find(id => id !== currentUser?.uid);
    if (!otherParticipantId) return false;

    const participantInfo = participants[otherParticipantId];
    if (!participantInfo) return false;

    return participantInfo.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // დავამატოთ ფუნქცია პროდუქტის ID-დან მოკლე ID-ის მისაღებად
  const getShortProductId = (productId?: string): string => {
    if (!productId) return '';
    return productId.length > 8 ? `#${productId.substring(0, 8)}...` : `#${productId}`;
  };

  // Format message timestamp
  const formatMessageTime = (timestamp: number): string => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
    }
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle chat selection
  const handleSelectChat = (room: ChatRoom) => {
    setActiveChatRoom(room);
  };

  // Escrow აგენტთან ჩატის გახსნა
  const handleSelectEscrowAgent = () => {
    // შევქმნათ სპეციალური ჩატის ოთახი Escrow აგენტისთვის, ან გამოვიყენოთ არსებული
    const escrowAgentRoom: ChatRoom = {
      id: 'escrow_agent',
      participants: [currentUser?.uid || '', 'escrow_agent'],
      lastMessage: 'როგორ შემიძლია დაგეხმაროთ?',
      lastMessageTimestamp: Date.now(),
      lastSenderId: 'escrow_agent',
      unreadCount: 0
    };
    
    setActiveChatRoom(escrowAgentRoom);
  };

  // ჩატის წაშლის შემდეგ განახლება სიის და აქტიური ჩატის
  const handleChatDeleted = (roomId: string) => {
    setChatRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));
    setActiveChatRoom(null);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-dark">
        <Header />
        <div className="container mx-auto py-8 px-4 flex justify-center items-center flex-grow">
          <div className="text-white">გთხოვთ გაიაროთ ავტორიზაცია შეტყობინებების სანახავად</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-dark">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - ჩატების ჩამონათვალი */}
        <div className="w-80 border-r border-gray-700 bg-dark-lighter flex flex-col h-full">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">შეტყობინებები</h2>
          </div>
          
          <div className="p-4 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="მოძებნეთ საუბრები..."
                className="pl-9 bg-dark border-gray-700 text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {/* Escrow აგენტის ჩატი */}
            <div
              className={`flex items-center p-4 gap-3 cursor-pointer hover:bg-dark-card transition-colors ${
                activeChatRoom?.id === 'escrow_agent' ? 'bg-dark-card' : ''
              }`}
              onClick={handleSelectEscrowAgent}
            >
              <div className="relative">
                <Avatar>
                  <AvatarImage src="/shild.png" alt="Escrow Agent" />
                  <AvatarFallback className="bg-purple">EA</AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <h4 className="font-medium text-white truncate">
                    Escrow Agent
                  </h4>
                </div>
                <p className="text-sm text-gray-400 truncate">
                  საშუამავლო მომსახურება
                </p>
              </div>
            </div>
            
            {loading ? (
              <div className="p-4 text-center text-gray-400">
                საუბრების ჩატვირთვა...
              </div>
            ) : filteredChatRooms.length > 0 ? (
              filteredChatRooms.map((room) => {
                const otherParticipantId = room.participants.find(id => id !== currentUser?.uid);
                const participantInfo = otherParticipantId ? participants[otherParticipantId] : null;
                
                return (
                  <div
                    key={room.id}
                    className={`flex items-center p-4 gap-3 cursor-pointer hover:bg-dark-card transition-colors ${
                      activeChatRoom?.id === room.id ? 'bg-dark-card' : ''
                    }`}
                    onClick={() => handleSelectChat(room)}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={participantInfo?.photoURL || undefined} />
                        <AvatarFallback className="bg-purple">
                          {participantInfo?.username.substring(0, 2).toUpperCase() || 'UN'}
                        </AvatarFallback>
                      </Avatar>
                      {/* Show unread indicator */}
                      {room.unreadCount && room.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-purple text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <h4 className="font-medium text-white truncate">
                          {participantInfo?.username || 'Unknown User'}
                          {room.productId && (
                            <span className="text-xs ml-2 text-gray-400">
                              {getShortProductId(room.productId)}
                            </span>
                          )}
                        </h4>
                        <span className="text-xs text-gray-400">
                          {formatMessageTime(room.lastMessageTimestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {room.lastMessage || 'დაიწყეთ საუბარი'}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                <MessageCircle className="h-12 w-12 text-gray-600 mb-4" />
                <p className="text-gray-400 mb-2">თქვენ ჯერ არ გაქვთ საუბრები</p>
                <p className="text-gray-500 text-sm">
                  დაიწყეთ საუბარი გამყიდველთან პროდუქტის გვერდზე "Contact Seller" ღილაკის დაჭერით
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
        
        {/* Chat area - ჩატის სივრცე */}
        <div className="flex-1 h-full">
          {activeChatRoom ? (
            <RealtimeChat
              sellerId={activeChatRoom.participants.find(id => id !== currentUser?.uid) || ''}
              onClose={() => setActiveChatRoom(null)}
              onChatDeleted={() => handleChatDeleted(activeChatRoom.id)}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-dark">
              <div className="text-center p-8 max-w-md">
                <MessageCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">თქვენი შეტყობინებები</h3>
                <p className="text-gray-400">
                  აირჩიეთ საუბარი მენიუდან ან დაიწყეთ ახალი გამყიდველთან დაკავშირებით
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
