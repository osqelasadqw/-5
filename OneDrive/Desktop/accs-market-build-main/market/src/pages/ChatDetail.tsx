import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Chat from '@/components/Chat';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { getUserContacts } from '@/services/chatService';
import { useAuth } from '@/contexts/AuthContext';

const ChatDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<any | null>(null);
  const { currentUser } = useAuth();
  
  useEffect(() => {
    const fetchContact = async () => {
      if (!currentUser || !id) return;
      
      if (id === 'escrow_agent') {
        setContact({
          id: 'escrow_agent',
          name: 'Escrow Agent',
          avatar: '/shild.png',
        });
        return;
      }
      
      try {
        const contacts = await getUserContacts();
        const foundContact = contacts.find(c => c.id === id);
        
        if (foundContact) {
          setContact(foundContact);
        } else {
          // If contact not found but we have an ID, set default info
          setContact({
            id: id,
            name: id === '1' ? 'Munna42' : 
                  id === '2' ? 'snoowy' : 
                  id === '3' ? 'MrBuyer' : 'GamersChoice',
            avatar: '/lovable-uploads/0bdfd730-454c-4cdf-9cd4-d183c53ddd39.png',
          });
        }
      } catch (error) {
        console.error('Error fetching contact:', error);
      }
    };
    
    fetchContact();
  }, [id, currentUser]);
  
  const handleBack = () => {
    navigate('/messages');
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark">
      <Header />
      
      <div className="container mx-auto py-8 px-4 flex-1">
        <div className="mb-4">
          <Button 
            variant="outline" 
            className="flex items-center gap-2 border-gray-700 text-white hover:bg-dark-lighter"
            onClick={handleBack}
          >
            <ArrowLeft size={16} />
            Back to Messages
          </Button>
        </div>
        
        <div className="bg-dark-card rounded-lg shadow-lg overflow-hidden h-[calc(100vh-240px)]">
          {contact ? (
            <Chat 
              recipientName={contact.name}
              recipientImage={contact.avatar}
              recipientId={contact.id}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Loading chat...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatDetail;
