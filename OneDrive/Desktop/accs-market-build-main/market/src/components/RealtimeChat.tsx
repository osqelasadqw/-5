import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, X, LockIcon, Trash2, MoreVertical, CreditCard, Bitcoin } from 'lucide-react';
import { toast } from 'sonner';
import { 
  ChatMessage,
  sendMessage, 
  getMessages, 
  markMessagesAsRead,
  getChatRoomWithSeller,
  deleteChatRoom,
  updatePurchaseRequestStatus,
  sendMessageToEscrowAgent,
  deleteAllUserChats
} from '@/services/realtimeChatService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EscrowAgentButton from './EscrowAgentButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ref, get } from 'firebase/database';
import { rtdb } from '@/lib/firebase';

interface RealtimeChatProps {
  sellerId: string;
  productId?: string;
  onClose: () => void;
  onChatDeleted?: () => void;
}

interface SellerInfo {
  name: string;
  avatar?: string;
  email?: string;
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// New component for purchase request messages
const PurchaseRequestMessage: React.FC<{
  message: ChatMessage;
  currentUserId: string | undefined;
  roomId: string | null;
}> = ({ message, currentUserId, roomId }) => {
  const lines = message.text.split('\n');
  const title = lines[0]; // 🔐 Request to Purchase [Channel Name]
  const transactionInfo = lines.slice(1).filter(line => line.trim() && !line.includes('Transaction steps')); // Transaction ID, Amount, Payment Method, etc.
  
  // Find the starting index of the transaction steps
  const stepsStartIndex = lines.findIndex(line => line.includes('Transaction steps') || line.includes('Direct transaction'));
  const steps = stepsStartIndex !== -1 ? lines.slice(stepsStartIndex) : [];
  
  const [isAgreeLoading, setIsAgreeLoading] = useState(false);
  
  // ვამოწმებთ არის თუ არა მიმღები მიმდინარე მომხმარებელი
  const isRecipient = message.recipientId === currentUserId;
  
  const handleAgree = async () => {
    if (!message.id || !roomId) return;
    
    try {
      setIsAgreeLoading(true);
      await updatePurchaseRequestStatus(message.id, roomId, 'agreed');
      toast.success("თქვენ დაეთანხმეთ ტრანზაქციის პირობებს");
    } catch (error) {
      console.error('Error updating purchase request status:', error);
      toast.error("სტატუსის განახლება ვერ მოხერხდა");
    } finally {
      setIsAgreeLoading(false);
    }
  };

  // სტატუსის ტექსტის ფუნქცია
  const getStatusText = () => {
    switch (message.status) {
      case 'agreed':
        return '✅ დადასტურებულია';
      case 'completed':
        return '🎉 დასრულებულია';
      default:
        return '⏳ მოლოდინში';
    }
  };

  // გადახდის მეთოდის აიქონი
  const getPaymentIcon = () => {
    if (message.paymentMethod === 'stripe') {
      return <CreditCard size={16} className="text-blue-400" />;
    } else if (message.paymentMethod === 'bitcoin') {
      return <Bitcoin size={16} className="text-orange-400" />;
    }
    return null;
  };

  return (
    <div className="border border-purple-500 rounded-lg bg-gray-800 p-4 w-full max-w-[90%] mx-auto my-4 shadow-md relative">
      <div className="flex items-center gap-2 mb-3 text-purple-300 font-semibold">
        <LockIcon size={16} />
        <h3>{title}</h3>
      </div>
      
      <div className="mb-4 border-b border-gray-700 pb-3">
        {transactionInfo.map((line, index) => (
          <p key={index} className="text-gray-200 text-sm">{line}</p>
        ))}
      </div>
      
      {steps.length > 0 && (
        <div className="text-gray-300 text-sm">
          {steps[0].includes('Direct transaction') ? (
            <>
              <p className="font-medium mb-2">{steps[0]}</p>
              {steps.slice(1).map((step, index) => (
                <p key={index} className="pl-2">{step}</p>
              ))}
            </>
          ) : (
            <>
              <p className="font-medium mb-2">{steps[0]}</p>
              <ul className="space-y-2">
                {steps.slice(1).map((step, index) => (
                  <li key={index} className={step.trim() ? "pl-2" : ""}>{step}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {formatTime(message.timestamp)}
          </span>
          <span className={`text-xs font-medium ml-2 ${
            message.status === 'agreed' ? 'text-green-500' : 
            message.status === 'completed' ? 'text-blue-500' : 'text-yellow-500'
          }`}>
            {getStatusText()}
          </span>
          {message.paymentMethod && (
            <span className="flex items-center gap-1 text-xs ml-2 bg-gray-700 px-2 py-0.5 rounded-full">
              {getPaymentIcon()}
              <span>{message.paymentMethod === 'stripe' ? 'Stripe' : 'Bitcoin'}</span>
              {!message.withAgent && <span className="ml-1 text-gray-400">(Direct)</span>}
            </span>
          )}
        </div>
        
        {isRecipient && message.status === 'pending' && (
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 text-sm rounded-md"
            onClick={handleAgree}
            disabled={isAgreeLoading}
          >
            {isAgreeLoading ? "..." : "Agree"}
          </Button>
        )}
      </div>
    </div>
  );
};

const RealtimeChat: React.FC<RealtimeChatProps> = ({ sellerId, productId: propProductId, onClose, onChatDeleted }) => {
  const { currentUser } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo>({
    name: 'Seller',
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isEscrowAgent = sellerId === 'escrow_agent';
  const [chatRoomData, setChatRoomData] = useState<any>(null);
  const [effectiveProductId, setEffectiveProductId] = useState<string | undefined>(undefined);
  const [productIdResolved, setProductIdResolved] = useState<boolean>(false);

  // Try to extract productId from all possible sources, მაგრამ მხოლოდ ერთხელ
  useEffect(() => {
    const resolveProductId = async () => {
      console.log('💬 DEBUG: Resolving productId from all possible sources');
      
      // 1. First try propProductId (from props)
      if (propProductId) {
        console.log('Using productId from props:', propProductId);
        setEffectiveProductId(propProductId);
        setProductIdResolved(true);
        return;
      }
      
      // 2. Try URL path
      const pathSegments = window.location.pathname.split('/');
      const possibleProductId = pathSegments[pathSegments.length - 1];
      
      if (possibleProductId && !possibleProductId.includes('/') && possibleProductId.length > 5) {
        console.log('Extracted productId from URL:', possibleProductId);
        setEffectiveProductId(possibleProductId);
        setProductIdResolved(true);
        return;
      }
      
      // 3. Try localStorage
      const storedProductId = localStorage.getItem('currentProductId');
      if (storedProductId) {
        console.log('Using productId from localStorage:', storedProductId);
        setEffectiveProductId(storedProductId);
        setProductIdResolved(true);
        return;
      }
      
      // 4. Try to get from room data if roomId exists
      if (roomId) {
        const roomRef = ref(rtdb, `chatRooms/${roomId}`);
        const snapshot = await get(roomRef);
        if (snapshot.exists() && snapshot.val().productId) {
          console.log('Using productId from existing room:', snapshot.val().productId);
          setEffectiveProductId(snapshot.val().productId);
          setProductIdResolved(true);
          return;
        }
      }
      
      // 5. If we get here, we couldn't resolve the productId
      console.warn('⚠️ WARNING: Could not resolve productId from any source');
      setProductIdResolved(true); // მაინც ვამთავრებთ პროცესს
    };
    
    resolveProductId();
  }, [propProductId, roomId]); // მხოლოდ ეს ორი დეპენდენსი

  // ცალკე useEffect initChat-ისთვის, როცა ვიცით productId სტატუსი
  useEffect(() => {
    // მხოლოდ დავიწყოთ ჩატის ინიციალიზაცია, როცა ვიცით productId სტატუსი
    if (productIdResolved) {
      initChat();
    }
  }, [productIdResolved, effectiveProductId, currentUser, sellerId, isEscrowAgent]);

  // მოვაშოროთ initChat ფუნქცია წინა useEffect-დან და გავხადოთ დამოუკიდებელი ფუნქციად
  const initChat = async () => {
    if (!currentUser || !sellerId) {
      setInitializationError("User or seller information is not available to start the chat.");
      setLoading(false);
      return;
    }

    try {
      console.log('💬 DEBUG: RealtimeChat initChat - Starting initialization...', 
        { sellerId, effectiveProductId, isEscrowAgent }
      );
      setLoading(true);
      setInitializationError(null);
      // Reset critical states on re-initialization to avoid showing stale data
      setRoomId(null);
      setChatRoomData(null); 
      setMessages([]); // Clear previous messages
      setSellerInfo({ name: 'Seller' }); // Reset seller info

      if (isEscrowAgent) {
        setRoomId('escrow_agent');
        setSellerInfo({
          name: 'Escrow Agent',
          avatar: '/shild.png'
        });
        console.log('💬 DEBUG: RealtimeChat initChat - Initialized for Escrow Agent.');
        setLoading(false);
        return;
      }
      
      // Regular seller chat: effectiveProductId is CRUCIAL
      if (!effectiveProductId) {
        const errorMsg = `Cannot initialize chat: Required product information (ID) is missing for seller ${sellerId}.`;
        console.error('❌ ERROR: RealtimeChat initChat - ', errorMsg);
        toast.error("Chat Initialization Error: Missing product data.");
        setInitializationError(errorMsg);
        setLoading(false);
        return;
      }

      console.log(`💬 DEBUG: RealtimeChat initChat - Initializing for seller ${sellerId} and product ${effectiveProductId}`);
      
      // Directly get/create the room based on sellerId and current effectiveProductId
      const newRoomId = await getChatRoomWithSeller(sellerId, effectiveProductId);
      
      if (!newRoomId) {
        const errorMsg = `Could not get or create a chat room for seller ${sellerId} and product ${effectiveProductId}.`;
        console.error('❌ ERROR: RealtimeChat initChat - ', errorMsg);
        toast.error("Chat Initialization Error: Room creation/retrieval failed.");
        setInitializationError(errorMsg);
        setLoading(false);
        return;
      }
      console.log(`💬 DEBUG: RealtimeChat initChat - Room ID obtained: ${newRoomId}`);
      setRoomId(newRoomId);
      
      // Fetch seller information (this part seems okay)
      const sellerDoc = await getDoc(doc(db, 'users', sellerId));
      if (sellerDoc.exists()) {
        const sellerData = sellerDoc.data();
        setSellerInfo({
          name: sellerData.username || 'Seller',
          avatar: sellerData.photoURL,
          email: sellerData.email,
        });
      } else {
        console.warn(`⚠️ WARNING: RealtimeChat initChat - Seller info not found for ID: ${sellerId}.`);
        setSellerInfo({ name: 'Seller (Info Not Found)'}); 
      }
      
      console.log('💬 DEBUG: RealtimeChat initChat - Initialization complete.');
      setLoading(false);
    } catch (error: any) {
      let errorMsg = 'Failed to initialize chat due to an unexpected error.';
      if (error.message) {
        errorMsg = `Failed to initialize chat: ${error.message}`;
      }
      console.error('❌ ERROR: RealtimeChat initChat - ', errorMsg, error);
      toast.error(errorMsg);
      setInitializationError(errorMsg);
      setLoading(false);
    }
  };

  // Listen for messages
  useEffect(() => {
    if (!roomId || !currentUser) return;
    
    const unsubscribe = getMessages(roomId, (chatMessages) => {
      setMessages(chatMessages);
      
      const unreadMessages = chatMessages.filter(
        msg => !msg.read && msg.senderId === sellerId && msg.recipientId === currentUser?.uid
      );
      
      if (unreadMessages.length > 0) {
        markMessagesAsRead(roomId, sellerId);
      }
    });

    return () => unsubscribe();
  }, [roomId, currentUser, sellerId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // მოვიძიოთ ჩატის ოთახის დამატებითი ინფორმაცია
  useEffect(() => {
    const fetchChatRoomData = async () => {
      if (roomId) {
        console.log(`Fetching data for chat room: ${roomId}`);
        const roomRef = ref(rtdb, `chatRooms/${roomId}`);
        const snapshot = await get(roomRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log(`Chat room data fetched: ${JSON.stringify(data)}`);
          setChatRoomData(data);
          
          // თუ ჩვენ ჯერ არ გვაქვს effectiveProductId, დავაყენოთ ოთახიდან
          if (!effectiveProductId && data.productId) {
            console.log('Setting productId from chat room data:', data.productId);
            setEffectiveProductId(data.productId);
            setProductIdResolved(true);
          }
        }
      }
    };
    
    fetchChatRoomData();
  }, [roomId, effectiveProductId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUser || !sellerId) return;
    
    try {
      setSending(true);
      
      // თუ ესქროუ აგენტთან არის ჩატი, გამოვიყენოთ სპეციალური ფუნქცია
      if (isEscrowAgent) {
        await sendMessageToEscrowAgent(newMessage.trim(), chatRoomData?.productId);
      } else {
        // ჩვეულებრივი ჩატის შემთხვევაში, გავგზავნოთ პროდუქტის ID-თან ერთად
        // ყოველთვის გამოვიყენოთ პროდუქტის ID, რომელიც ოთახშია მიბმული
        // და არა ახალი productId, რათა არ მოხდეს ახალი ოთახის შექმნა
        const productIdToUse = chatRoomData?.productId || effectiveProductId;
        console.log(`Sending message to room with productId: ${productIdToUse}`);
        await sendMessage(newMessage.trim(), sellerId, productIdToUse);
      }
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!roomId) return;
    
    try {
      setIsDeleting(true);
      await deleteChatRoom(roomId);
      toast.success("ჩატი წარმატებით წაიშალა");
      
      if (onChatDeleted) {
        onChatDeleted();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error("ჩატის წაშლა ვერ მოხერხდა");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // ყველა ჩატის წაშლის ფუნქცია
  const handleDeleteAllChats = async () => {
    if (!currentUser) return;
    
    try {
      setIsDeletingAll(true);
      await deleteAllUserChats(currentUser.uid);
      toast.success("ყველა ჩატი წარმატებით წაიშალა");
      
      if (onChatDeleted) {
        onChatDeleted();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error deleting all chats:', error);
      toast.error("ჩატების წაშლა ვერ მოხერხდა");
    } finally {
      setIsDeletingAll(false);
      setIsDeleteAllDialogOpen(false);
    }
  };

  // დამხმარე ფუნქცია პროდუქტის ID-ის მოკლედ გამოსატანად
  const getShortProductId = (productId?: string): string => {
    if (!productId) return '';
    return productId.length > 8 ? `#${productId.substring(0, 8)}...` : `#${productId}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-dark border border-gray-700 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="animate-pulse bg-gray-700 h-10 w-10 rounded-full"></div>
            <div className="animate-pulse bg-gray-700 h-5 w-32 rounded"></div>
          </div>
          <Button variant="ghost" onClick={onClose} size="icon">
            <X className="h-5 w-5 text-gray-400" />
          </Button>
        </div>
        <div className="flex-1 p-4 flex justify-center items-center">
          <p className="text-gray-400">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (initializationError) {
    return (
      <div className="flex flex-col h-full bg-dark border border-gray-700 rounded-lg shadow-lg p-6 items-center justify-center text-center">
        <X className="h-16 w-16 text-red-500 mb-4" /> {}
        <h3 className="text-xl font-semibold text-white mb-3">Chat Initialization Failed</h3>
        <p className="text-red-400 mb-6 whitespace-pre-wrap">{initializationError}</p>
        <Button variant="outline" onClick={onClose} className="border-gray-600 hover:bg-gray-700 text-white">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-dark border border-gray-700 rounded-lg shadow-lg">
      {/* Chat header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src={isEscrowAgent ? '/shild.png' : sellerInfo.avatar} />
            <AvatarFallback className="bg-purple">
              {sellerInfo.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-white">
              {isEscrowAgent ? 'Escrow Agent' : sellerInfo.name}
              {!isEscrowAgent && effectiveProductId && (
                <span className="text-xs ml-2 text-gray-400">
                  {getShortProductId(effectiveProductId)}
                </span>
              )}
            </h3>
            {sellerInfo.email && !isEscrowAgent && (
              <p className="text-xs text-gray-400">{sellerInfo.email}</p>
            )}
            {isEscrowAgent && (
              <p className="text-xs text-gray-400">საშუამავლო მომსახურება</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEscrowAgent && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800">
                  <MoreVertical size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-dark-card border-gray-700">
                <DropdownMenuItem 
                  className="text-red-500 focus:text-red-500 cursor-pointer" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete This Chat
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-500 focus:text-red-500 cursor-pointer" 
                  onClick={() => setIsDeleteAllDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Chats
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800" onClick={onClose}>
            <X size={24} />
          </Button>
        </div>
      </div>
      
      {/* Chat messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={message.messageType === 'purchase-request' ? 'w-full' : 
                  `flex ${message.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
              >
                {message.messageType === 'purchase-request' ? (
                  <PurchaseRequestMessage 
                    message={message} 
                    currentUserId={currentUser?.uid}
                    roomId={roomId}
                  />
                ) : (
                  <div 
                    className={`max-w-[75%] rounded-lg p-3 ${
                      message.senderId === currentUser?.uid 
                        ? 'bg-purple text-white' 
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    <p>{message.text}</p>
                    <div className="text-xs mt-1 flex justify-end">
                      <span className={message.senderId === currentUser?.uid ? 'text-purple-100' : 'text-gray-400'}>
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      
      {/* Chat input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex justify-end mb-2">
          {roomId && !isEscrowAgent && <EscrowAgentButton chatRoomId={roomId} />}
        </div>
        <form 
          onSubmit={handleSendMessage}
          className="flex gap-2"
        >
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-dark border border-gray-700 rounded-full text-white"
            disabled={sending}
          />
          <Button 
            type="submit"
            size="icon"
            className="bg-purple hover:bg-purple-light text-white rounded-full"
            disabled={sending || !newMessage.trim()}
          >
            <Send size={18} />
          </Button>
        </form>
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-dark-card border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>დარწმუნებული ხართ?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              ეს სამუდამოდ წაშლის ჩატის ისტორიას. ეს მოქმედება ვერ დაბრუნდება.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-dark-lighter hover:bg-gray-700 text-white border-gray-700">
              გაუქმება
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteChat}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "იშლება..." : "წაშლა"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Chats confirmation dialog */}
      <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <AlertDialogContent className="bg-dark-card border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>წაიშალოს ყველა ჩატი?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              ეს სამუდამოდ წაშლის თქვენი ყველა ჩატის ისტორიას. ეს მოქმედება ვერ დაბრუნდება.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-dark-lighter hover:bg-gray-700 text-white border-gray-700">
              გაუქმება
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAllChats}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeletingAll}
            >
              {isDeletingAll ? "იშლება..." : "წაშალე ყველა"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RealtimeChat; 