import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isEscrowAgent } from '@/services/roleService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header: React.FC = () => {
  const { currentUser, userData, logout } = useAuth();
  const [isAgent, setIsAgent] = useState(false);
  
  useEffect(() => {
    const checkAgentRole = async () => {
      if (currentUser?.email) {
        const agent = await isEscrowAgent(currentUser.email);
        setIsAgent(agent);
      }
    };
    
    checkAgentRole();
  }, [currentUser]);
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="flex justify-between items-center py-4 px-8 w-full">
      <div className="flex flex-col items-center text-center">
        <Link to="/" className="flex items-center">
          <h1 className="text-2xl font-bold text-white">Accs-market.com</h1>
          <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-1">3</span>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <Link to="/create-listing">
          <Button className="sell-button">Start selling</Button>
        </Link>
        
        {isAgent && (
          <Link to="/escrow-dashboard">
            <Button 
              variant="outline" 
              className="bg-purple-700 text-white border-purple-600 hover:bg-purple-600"
            >
              <Shield className="mr-2 h-4 w-4" />
              Escrow Dashboard
            </Button>
          </Link>
        )}
        
        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 text-white cursor-pointer">
                <Avatar>
                  <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'User'} />
                  <AvatarFallback className="bg-purple-dark text-white">
                    {currentUser.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium hidden md:block">{currentUser.displayName || 'User'}</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-dark-card border-gray-700 text-white">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-700/50" />
              <DropdownMenuItem className="hover:bg-dark-lighter cursor-pointer">
                <Link to="/messages" className="flex w-full">Messages</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-dark-lighter cursor-pointer">
                <Link to="/profile" className="flex w-full">Profile</Link>
              </DropdownMenuItem>
              {isAgent && (
                <DropdownMenuItem className="hover:bg-dark-lighter cursor-pointer">
                  <Link to="/escrow-dashboard" className="flex w-full">
                    <Shield className="h-4 w-4 mr-2" /> Escrow Dashboard
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-gray-700/50" />
              <DropdownMenuItem 
                className="text-red-400 hover:bg-dark-lighter hover:text-red-300 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="outline" className="border-gray-700 text-white hover:bg-dark-lighter">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-purple hover:bg-purple-light text-white">
                Register
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
