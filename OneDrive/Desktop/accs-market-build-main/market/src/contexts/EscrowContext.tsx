import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, onValue, query, limitToLast, orderByChild } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { isEscrowAgent } from '@/services/roleService';

interface AgreedTransaction {
  id: string;
  chatRoomId: string;
  buyerName: string;
  sellerId: string;
  buyerId: string;
  channelName: string;
  price: number;
  agreedAt: number;
  messageId: string;
}

interface EscrowContextType {
  isEscrowAgent: boolean;
  agreedTransactions: AgreedTransaction[];
  loading: boolean;
  refreshTransactions: () => Promise<void>;
}

const EscrowContext = createContext<EscrowContextType | undefined>(undefined);

export const EscrowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAgent, setIsAgent] = useState(false);
  const [agreedTransactions, setAgreedTransactions] = useState<AgreedTransaction[]>([]);

  useEffect(() => {
    const checkAgentRole = async () => {
      if (currentUser?.email) {
        const agent = await isEscrowAgent(currentUser.email);
        setIsAgent(agent);
        
        if (agent) {
          // თუ მომხმარებელი ესქროუ აგენტია, გავუშვათ ტრანზაქციების მონიტორინგი
          monitorAgreedTransactions();
        }
      } else {
        setIsAgent(false);
      }
    };
    
    checkAgentRole();
  }, [currentUser]);

  // რეალურ დროში მონიტორინგი ახალი "agree"-ის შეტყობინებებისთვის
  const monitorAgreedTransactions = () => {
    // აქ არ შეგვიძლია მარტივად ვაკეთოთ ზუსტი მონიტორინგი Firebase Realtime Database-ის სტრუქტურის გამო
    // რეალური იმპლემენტაციისას საჭიროა უფრო კომპლექსური მიდგომა
    
    // მაგალითისთვის, შეგვიძლია შევქმნათ ცალკე კოლექცია/ნოდი "agreedTransactions" და იქ ვწეროთ ახალი შეთანხმებები
    setLoading(false);
  };

  const extractTransactionData = (messageText: string): { channelName: string; price: number } => {
    const channelNameMatch = messageText.match(/Request to Purchase (.*?)(?:\n|$)/);
    const priceMatch = messageText.match(/Transaction Amount: \$(\d+(?:\.\d+)?)/);
    
    return {
      channelName: channelNameMatch ? channelNameMatch[1] : 'Unknown Channel',
      price: priceMatch ? parseFloat(priceMatch[1]) : 0
    };
  };

  const refreshTransactions = async (): Promise<void> => {
    if (!isAgent) return;
    
    try {
      setLoading(true);
      
      // ვიპოვოთ ყველა შეტყობინება, რომელსაც აქვს "purchase-request" ტიპი და "agreed" სტატუსი
      const chatRoomsRef = ref(rtdb, 'chatRooms');
      
      // ეს ფუნქცია უნდა ჩანაცვლდეს რეალური იმპლემენტაციით,
      // სადაც მოხდება შეთანხმებული ტრანზაქციების მოძიება Firebase-დან
      
      // ამ მაგალითში უბრალოდ ვათავისუფლებთ loading სტატუსს
      setLoading(false);
    } catch (error) {
      console.error('Error refreshing transactions:', error);
      setLoading(false);
    }
  };

  const value = {
    isEscrowAgent: isAgent,
    agreedTransactions,
    loading,
    refreshTransactions
  };

  return <EscrowContext.Provider value={value}>{children}</EscrowContext.Provider>;
};

export const useEscrow = () => {
  const context = useContext(EscrowContext);
  if (context === undefined) {
    throw new Error('useEscrow must be used within an EscrowProvider');
  }
  return context;
}; 