
import React, { useEffect, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserContacts, Contact } from '@/services/chatService';
import { toast } from 'sonner';

interface ContactProps {
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  isActive: boolean;
  unread?: number;
  onClick: () => void;
  isSelected: boolean;
}

const ContactItem: React.FC<ContactProps> = ({
  name,
  avatar,
  lastMessage,
  time,
  isActive,
  unread = 0,
  onClick,
  isSelected,
}) => {
  return (
    <div 
      className={`flex items-center p-4 gap-3 cursor-pointer hover:bg-dark-lighter transition-colors ${isSelected ? 'bg-dark-lighter' : ''}`}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar>
          <AvatarImage src={avatar || '/placeholder.svg'} alt={name} />
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        {isActive && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-dark"></span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <h4 className="font-medium text-white truncate">{name}</h4>
          <span className="text-xs text-gray-400">{time}</span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-400 truncate">{lastMessage}</p>
          {unread > 0 && (
            <span className="bg-purple text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface ChatSidebarProps {
  activeContactId: string;
  setActiveContactId: (id: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ activeContactId, setActiveContactId }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  
  // Fetch contacts
  useEffect(() => {
    const fetchContacts = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        const userContacts = await getUserContacts();
        setContacts(userContacts);
        setFilteredContacts(userContacts);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        toast.error('Failed to load contacts');
        setIsLoading(false);
      }
    };
    
    fetchContacts();
  }, [currentUser]);
  
  // Filter contacts based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts);
      return;
    }
    
    const filtered = contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);
  
  // If there are no real contacts, use dummy data for demo
  const displayContacts = filteredContacts.length > 0 ? filteredContacts : [
    {
      id: '1',
      name: 'Munna42',
      avatar: '/lovable-uploads/0bdfd730-454c-4cdf-9cd4-d183c53ddd39.png',
      lastMessage: 'Are you interested?',
      time: '18 min',
      isActive: true,
      unread: 2
    },
    {
      id: '2',
      name: 'snoowy',
      avatar: '/lovable-uploads/0bdfd730-454c-4cdf-9cd4-d183c53ddd39.png',
      lastMessage: 'Hello',
      time: '9 hr',
      isActive: false,
      unread: 0
    },
    {
      id: '3',
      name: 'MrBuyer',
      avatar: '/lovable-uploads/0bdfd730-454c-4cdf-9cd4-d183c53ddd39.png',
      lastMessage: 'Is the account still available?',
      time: '1 hour',
      isActive: false,
      unread: 1
    },
    {
      id: '4',
      name: 'GamersChoice',
      avatar: '/lovable-uploads/0bdfd730-454c-4cdf-9cd4-d183c53ddd39.png',
      lastMessage: 'Thanks for the info',
      time: '2 hours',
      isActive: false,
      unread: 0
    },
  ];

  return (
    <div className="h-full bg-dark border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">Messages</h2>
      </div>
      
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input 
            placeholder="Search contacts..." 
            className="pl-9 bg-dark border-gray-700 text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-gray-400">
            Loading contacts...
          </div>
        ) : displayContacts.length > 0 ? (
          displayContacts.map(contact => (
            <ContactItem 
              key={contact.id}
              name={contact.name}
              avatar={contact.avatar}
              lastMessage={contact.lastMessage}
              time={contact.time}
              isActive={contact.isActive}
              unread={contact.unread}
              onClick={() => setActiveContactId(contact.id)}
              isSelected={contact.id === activeContactId}
            />
          ))
        ) : (
          <div className="p-4 text-center text-gray-400">
            No contacts found
          </div>
        )}
      </ScrollArea>
      
      <div className="p-4 border-t border-gray-700">
        <button className="flex items-center justify-center rounded-full bg-green-600 text-white p-3 w-full hover:bg-green-700 transition-colors">
          <span>Escrow Agent</span>
        </button>
      </div>
    </div>
  );
};

export default ChatSidebar;
