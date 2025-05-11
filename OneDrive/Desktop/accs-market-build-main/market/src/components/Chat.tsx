
import React, { useState, useEffect, useRef } from 'react';
import { Send, Link as LinkIcon } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { sendMessage, getMessages, Message as MessageType } from '@/services/chatService';
import { format } from 'date-fns';

interface ChatProps {
  recipientName: string;
  recipientImage: string;
  recipientId: string; // Added this to handle real messaging
  onClose?: () => void;
}

const Chat: React.FC<ChatProps> = ({ recipientName, recipientImage, recipientId, onClose }) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load messages and subscribe to updates
  useEffect(() => {
    let unsubscribe = () => {};
    
    if (currentUser && recipientId) {
      unsubscribe = getMessages(recipientId, (newMessages) => {
        setMessages(newMessages);
      });
    }
    
    return () => unsubscribe();
  }, [currentUser, recipientId]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUser || !recipientId) return;
    
    try {
      setIsLoading(true);
      await sendMessage(newMessage, recipientId);
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  // Format timestamp for display
  const formatMessageTime = (timestamp: Date) => {
    return format(timestamp, 'h:mm a');
  };
  
  // Group messages by dates
  const groupedMessages = messages.reduce((groups: Record<string, MessageType[]>, message) => {
    const date = format(message.timestamp, 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});
  
  // Get display date for each group
  const getDisplayDate = (dateStr: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return format(new Date(dateStr), 'MMMM d, yyyy');
  };

  return (
    <div className="bg-dark-lighter rounded-lg overflow-hidden flex flex-col h-full">
      {/* Chat header */}
      <div className="bg-dark p-4 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={recipientImage || '/placeholder.svg'} alt={recipientName} />
            <AvatarFallback>{recipientName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white">{recipientName}</h3>
              <Badge variant="secondary" className="bg-green-500 h-5 text-[11px]">PASS</Badge>
            </div>
            <p className="text-xs text-gray-400">Last online 2 minutes ago</p>
          </div>
        </div>
        
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        )}
      </div>
      
      {/* Chat messages */}
      <ScrollArea className="flex-1 p-4 overflow-y-auto" ref={scrollAreaRef}>
        <div className="flex flex-col gap-4">
          {/* New message notifications */}
          <div className="relative py-3">
            <div className="bg-green-500/20 text-green-400 text-sm text-center py-1.5 px-4 rounded-lg">
              You've got a new message.
            </div>
          </div>
          
          {/* Transaction info */}
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="text-white font-medium flex items-center gap-2">
                  Request to purchase <span className="text-blue-400">"ai prabhas"</span> <LinkIcon size={14} className="text-gray-400" />
                </div>
              </div>
            </div>
            <div className="p-3 text-sm text-gray-300">
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">Transaction ID:</span>
                <span>546926</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">Transaction amount:</span>
                <span>$590</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Transfer to:</span>
                <span>osqelan1@gmail.com</span>
              </div>
            </div>
            
            <div className="p-3 border-t border-gray-700 bg-dark">
              <div className="flex justify-between items-center">
                <span className="text-orange-400 font-medium">Transaction status:</span>
                <span className="text-gray-300">Waiting for approval</span>
              </div>
            </div>
          </div>
          
          {/* Messages by date */}
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              <div className="text-center my-4">
                <span className="text-xs px-2 py-1 rounded bg-gray-700/50 text-gray-400">
                  {getDisplayDate(date)}
                </span>
              </div>
              
              {dateMessages.map(message => (
                <div 
                  key={message.id}
                  className={`flex ${message.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <div className={`max-w-[80%] ${
                    message.senderId === currentUser?.uid 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-dark text-white'
                  } rounded-xl p-3`}>
                    <p>{message.text}</p>
                    <div className="text-xs text-gray-300 mt-1 text-right">
                      {formatMessageTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          
          {/* Safest transaction guide */}
          <div className="bg-dark rounded-lg p-4">
            <h4 className="text-center font-medium text-white mb-3">Transaction steps when using the escrow service:</h4>
            <div className="space-y-2">
              <div className="flex gap-2 text-sm">
                <span className="text-gray-400">1.</span>
                <span className="text-gray-300">The buyer pays a 4-8% ($3 minimum) service fee.</span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-gray-400">2.</span>
                <span className="text-gray-300">The seller designates the escrow agent as manager.</span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-gray-400">3.</span>
                <span className="text-gray-300">After 7 days, the seller assigns primary ownership rights to the escrow agent (7 days is the minimum amount of time required in order to assign a new primary owner in the control panel.)</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      
      {/* Chat input */}
      <form 
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-700 flex gap-2"
      >
        <Input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 bg-dark border border-gray-700 rounded-full"
          disabled={isLoading}
        />
        <Button 
          type="submit"
          size="icon"
          className="bg-purple hover:bg-purple-light text-white rounded-full"
          disabled={isLoading || !newMessage.trim()}
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};

export default Chat;
