import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isEscrowAgent } from '@/services/roleService';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import { RefreshCw, MessageSquare } from 'lucide-react';
import { ref, get } from 'firebase/database';
import { rtdb } from '@/lib/firebase';

interface AgreedUser {
  id: string;
  chatRoomId: string;
  buyerName: string;
  sellerName: string;
  buyerId: string;
  sellerId: string;
  channelName: string;
  price: number;
  agreedAt: number;
  messageId: string;
}

const EscrowAgentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAgent, setIsAgent] = useState(false);
  const [agreedUsers, setAgreedUsers] = useState<AgreedUser[]>([]);

  useEffect(() => {
    const checkRole = async () => {
      if (!currentUser || !currentUser.email) {
        navigate('/');
        return;
      }

      try {
        const agent = await isEscrowAgent(currentUser.email);
        setIsAgent(agent);

        if (!agent) {
          toast.error('თქვენ არ გაქვთ წვდომა ამ გვერდზე');
          navigate('/');
        } else {
          fetchAgreedUsers();
        }
      } catch (error) {
        console.error('Error checking agent status:', error);
        navigate('/');
      }
    };

    checkRole();
  }, [currentUser, navigate]);

  const fetchAgreedUsers = async () => {
    try {
      setLoading(true);
      
      // ვიპოვოთ ყველა შეტყობინება, რომელსაც აქვს "purchase-request" ტიპი და "agreed" სტატუსი
      
      // 1. ჯერ ვიპოვოთ ყველა ჩატის ოთახი rtdb-დან
      const chatRoomsRef = ref(rtdb, 'chatRooms');
      const chatRoomsSnapshot = await get(chatRoomsRef);
      
      const agreedUsersData: AgreedUser[] = [];
      
      if (chatRoomsSnapshot.exists()) {
        const roomPromises = Object.keys(chatRoomsSnapshot.val()).map(async (roomId) => {
          // 2. თითოეული ოთახისთვის ვიპოვოთ შეტყობინებები
          const messagesRef = ref(rtdb, `messages/${roomId}`);
          const messagesSnapshot = await get(messagesRef);
          
          if (messagesSnapshot.exists()) {
            const messages = messagesSnapshot.val();
            
            // 3. ფილტრაცია: ვიპოვოთ "purchase-request" ტიპის შეტყობინებები "agreed" სტატუსით
            const purchaseRequests = Object.entries(messages)
              .filter(([_, messageData]: [string, any]) => 
                messageData.messageType === 'purchase-request' && 
                messageData.status === 'agreed'
              );
            
            // 4. თუ შეტყობინებები ნაპოვნია, დავამატოთ ინფორმაცია სიაში
            for (const [messageId, messageData] of purchaseRequests) {
              try {
                // გამოვყოთ ინფორმაცია შეტყობინების ტექსტიდან
                const text = messageData.text;
                const channelNameMatch = text.match(/Request to Purchase (.*?)(?:\n|$)/);
                const priceMatch = text.match(/Transaction Amount: \$(\d+(?:\.\d+)?)/);
                
                const channelName = channelNameMatch ? channelNameMatch[1] : 'Unknown Channel';
                const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
                
                agreedUsersData.push({
                  id: `${roomId}_${messageId}`,
                  chatRoomId: roomId,
                  buyerName: messageData.senderName,
                  sellerName: '', // არსებული მონაცემებიდან ვერ ვიღებთ, მაგრამ შეგვიძლია მოვძებნოთ მიმღები
                  buyerId: messageData.senderId,
                  sellerId: messageData.recipientId,
                  channelName,
                  price,
                  agreedAt: messageData.timestamp,
                  messageId
                });
              } catch (error) {
                console.error('Error parsing message data:', error);
              }
            }
          }
        });
        
        await Promise.all(roomPromises);
      }
      
      // დალაგება დროის მიხედვით (ახლიდან ძველისკენ)
      agreedUsersData.sort((a, b) => b.agreedAt - a.agreedAt);
      
      setAgreedUsers(agreedUsersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching agreed users:', error);
      setLoading(false);
      toast.error('მონაცემების ჩატვირთვა ვერ მოხერხდა');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const goToChat = (chatRoomId: string) => {
    navigate(`/chat/${chatRoomId}`);
  };

  return (
    <div className="min-h-screen bg-dark-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Escrow Agent Dashboard</h1>
          
          <Button 
            variant="outline" 
            onClick={fetchAgreedUsers}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'იტვირთება...' : 'განახლება'}
          </Button>
        </div>
        
        <div className="bg-dark-card rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">შეთანხმებული ტრანზაქციები</h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : agreedUsers.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              აქტიური შეთანხმებები არ არის
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-white">არხის სახელი</TableHead>
                    <TableHead className="text-white">ფასი</TableHead>
                    <TableHead className="text-white">მყიდველი</TableHead>
                    <TableHead className="text-white">შეთანხმების დრო</TableHead>
                    <TableHead className="text-white">მოქმედება</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-white">
                        {user.channelName}
                      </TableCell>
                      <TableCell className="text-white">${user.price.toFixed(2)}</TableCell>
                      <TableCell className="text-white">{user.buyerName}</TableCell>
                      <TableCell className="text-white">{formatDate(user.agreedAt)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => goToChat(user.chatRoomId)}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          ჩატზე გადასვლა
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EscrowAgentDashboard; 