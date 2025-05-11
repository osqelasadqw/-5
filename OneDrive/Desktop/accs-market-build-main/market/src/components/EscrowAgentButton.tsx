import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  Shield,
  ShieldCheck, 
  ShieldQuestion
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  createEscrowRequest, 
  getActiveEscrowRequest,
  EscrowRequest
} from '@/services/escrowService';
import { useNavigate } from 'react-router-dom';

interface EscrowAgentButtonProps {
  chatRoomId: string;
}

const EscrowAgentButton: React.FC<EscrowAgentButtonProps> = ({ 
  chatRoomId 
}) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeRequest, setActiveRequest] = useState<EscrowRequest | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!chatRoomId) return;

    // ამოწმებს არსებულ Escrow მოთხოვნას ჩატის ოთახისთვის
    const checkActiveRequest = async () => {
      try {
        const request = await getActiveEscrowRequest(chatRoomId);
        setActiveRequest(request);
      } catch (error) {
        console.error('Error checking active escrow request:', error);
      }
    };
    
    checkActiveRequest();
  }, [chatRoomId]);
  
  const handleCallEscrow = async () => {
    if (!currentUser) {
      toast.error('გთხოვთ გაიაროთ ავტორიზაცია');
      return;
    }
    
    try {
      setLoading(true);
      
      const requestId = await createEscrowRequest(
        chatRoomId,
        currentUser.uid,
        currentUser.email || '',
        currentUser.displayName || 'User'
      );
      
      if (requestId) {
        toast.success('Escrow Agent მოთხოვნა გაიგზავნა');
        // დავარეფრეშოთ აქტიური მოთხოვნის მდგომარეობა
        const request = await getActiveEscrowRequest(chatRoomId);
        setActiveRequest(request);
        
        // ავტომატურად დავამატოთ აგენტი ჩატების სიაში, ლოკალსტორიჯში შევინახოთ ესკრო აგენტის ID
        localStorage.setItem('selectedChatRoomId', 'escrow_agent');
        // გადავიდეთ messages გვერდზე
        navigate('/messages');
      } else {
        toast.error('Escrow Agent-ის გამოძახება ვერ მოხერხდა');
      }
    } catch (error) {
      console.error('Error calling escrow agent:', error);
      toast.error('დაფიქსირდა შეცდომა');
    } finally {
      setLoading(false);
    }
  };
  
  // ფუნქცია აგენტთან პირდაპირი ჩატის გასახსნელად
  const openAgentChat = () => {
    // შევინახოთ ესკრო აგენტის ID და გადავიდეთ ჩატის გვერდზე
    localStorage.setItem('selectedChatRoomId', 'escrow_agent');
    navigate('/messages');
  };
  
  // ყოველთვის ვაჩვენოთ ღილაკი, მაგრამ სტატუსის მიხედვით შევცვალოთ მისი გარეგნობა
  return (
    <div className="flex items-center gap-2">
      {activeRequest ? (
        // თუ უკვე არსებობს აქტიური მოთხოვნა
        activeRequest.status === 'pending' ? (
          <Button
            variant="outline"
            size="sm"
            className="bg-amber-700 text-white border-amber-600 hover:bg-amber-600"
            onClick={openAgentChat}
          >
            <ShieldQuestion className="mr-2 h-4 w-4" />
            Escrow Agent-თან ჩატი
          </Button>
        ) : activeRequest.status === 'accepted' ? (
          <Button
            variant="outline"
            size="sm"
            className="bg-green-700 text-white border-green-600 hover:bg-green-600"
            onClick={openAgentChat}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Escrow Agent-თან ჩატი
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="bg-purple-700 text-white border-purple-600 hover:bg-purple-600"
            onClick={handleCallEscrow}
            disabled={loading}
          >
            <Shield className="mr-2 h-4 w-4" />
            {loading ? 'იგზავნება...' : 'გამოიძახეთ Escrow Agent'}
          </Button>
        )
      ) : (
        // თუ არ არსებობს აქტიური მოთხოვნა
        <Button
          variant="outline"
          size="sm"
          className="bg-purple-700 text-white border-purple-600 hover:bg-purple-600"
          onClick={handleCallEscrow}
          disabled={loading}
        >
          <Shield className="mr-2 h-4 w-4" />
          {loading ? 'იგზავნება...' : 'გამოიძახეთ Escrow Agent'}
        </Button>
      )}
    </div>
  );
};

export default EscrowAgentButton; 