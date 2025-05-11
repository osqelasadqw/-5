
import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

interface AccountCardProps {
  id: string;
  name: string;
  category: string;
  subscribers: number;
  price: number;
  imageUrl: string;
  isPro?: boolean;
  buttonColor?: 'purple' | 'orange';
}

const AccountCard: React.FC<AccountCardProps> = ({
  id,
  name,
  category,
  subscribers,
  price,
  imageUrl,
  isPro = false,
  buttonColor = 'purple'
}) => {
  return (
    <div className="bg-dark-card rounded-lg overflow-hidden shadow-lg">
      <div className="relative h-48">
        <img 
          src={imageUrl || '/placeholder.svg'} 
          alt={name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          {isPro ? (
            <span className="badge badge-pro">PRO</span>
          ) : (
            <span className="badge badge-pass flex items-center">
              <Check size={12} className="mr-1" /> PASS
            </span>
          )}
        </div>
      </div>
      
      <div className="p-4 text-center">
        <div className="flex justify-center items-center mb-1">
          <span className="bg-green-500 rounded-full w-4 h-4 flex items-center justify-center mr-2">
            <Check size={12} className="text-white" />
          </span>
          <h3 className="text-lg font-bold text-white">{name}</h3>
        </div>
        
        <p className="text-gray-400 text-sm mb-4">{category}</p>
        
        <div className="text-2xl font-bold mb-2 text-white">
          $ {price}
        </div>
        
        <p className="text-gray-400 text-sm mb-4">
          {subscribers.toLocaleString()} — subscribers
        </p>
        
        <Link to={`/account/${id}`}>
          <button className={buttonColor === 'purple' ? 'buy-button-purple' : 'buy-button-orange'}>
            Buy this channel
          </button>
        </Link>
      </div>
    </div>
  );
};

export default AccountCard;
