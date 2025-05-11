import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { X, CreditCard, Bitcoin } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { sendPurchaseRequest } from '@/services/realtimeChatService';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface PaymentMethodSelectorProps {
  sellerId: string;
  productId: string;
  channelName: string;
  price: number;
  onClose: () => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  sellerId,
  productId,
  channelName,
  price,
  onClose
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'bitcoin' | null>(null);
  const [withAgent, setWithAgent] = useState(true);
  const [walletAddress, setWalletAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error("Please log in to make a purchase request");
      navigate("/login");
      return;
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (paymentMethod === 'bitcoin' && !walletAddress.trim()) {
      toast.error("Please enter your Bitcoin wallet address");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Send purchase request with all options
      await sendPurchaseRequest(
        sellerId,
        channelName,
        price,
        productId,
        paymentMethod,
        withAgent,
        walletAddress
      );
      
      toast.success("Purchase request sent to seller!");
      
      // Navigate to messages with this seller
      navigate('/messages');
      
    } catch (error) {
      console.error("Error sending purchase request:", error);
      toast.error("Failed to send purchase request");
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">Payment Method</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-3">How would you like to purchase?</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className={`p-4 rounded-lg border border-gray-700 flex flex-col items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'stripe' 
                      ? 'bg-purple/20 border-purple' 
                      : 'hover:border-gray-500'
                  }`}
                  onClick={() => setPaymentMethod('stripe')}
                >
                  <CreditCard size={32} className={paymentMethod === 'stripe' ? 'text-purple' : 'text-gray-400'} />
                  <span className={paymentMethod === 'stripe' ? 'text-white' : 'text-gray-400'}>Stripe</span>
                </button>
                
                <button
                  type="button"
                  className={`p-4 rounded-lg border border-gray-700 flex flex-col items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'bitcoin' 
                      ? 'bg-purple/20 border-purple' 
                      : 'hover:border-gray-500'
                  }`}
                  onClick={() => setPaymentMethod('bitcoin')}
                >
                  <Bitcoin size={32} className={paymentMethod === 'bitcoin' ? 'text-purple' : 'text-gray-400'} />
                  <span className={paymentMethod === 'bitcoin' ? 'text-white' : 'text-gray-400'}>Bitcoin</span>
                </button>
              </div>
            </div>
            
            {paymentMethod === 'bitcoin' && (
              <div className="mt-4">
                <Label htmlFor="wallet" className="text-gray-300">Bitcoin Wallet Address</Label>
                <Input
                  id="wallet"
                  type="text"
                  placeholder="Enter your Bitcoin wallet address"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            
            {paymentMethod === 'stripe' && (
              <div className="mt-4">
                <p className="text-gray-400 text-sm mb-2">
                  You'll be redirected to complete the payment after seller's confirmation.
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="agent-toggle" className="text-white">Use Escrow Agent</Label>
                <p className="text-gray-400 text-xs">Secure your transaction with our escrow service</p>
              </div>
              <Switch 
                id="agent-toggle" 
                checked={withAgent}
                onCheckedChange={setWithAgent}
              />
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-2">Transaction Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Item:</span>
                  <span className="text-white">{channelName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price:</span>
                  <span className="text-white">${price}</span>
                </div>
                {withAgent && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Service Fee (8%):</span>
                    <span className="text-white">${Math.max(3, price * 0.08).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between font-medium">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-white">
                    ${withAgent ? (price + Math.max(3, price * 0.08)).toFixed(2) : price}
                  </span>
                </div>
              </div>
            </div>
            
            <Button 
              type="submit"
              className="w-full bg-purple hover:bg-purple-light"
              disabled={isSubmitting || !paymentMethod}
            >
              {isSubmitting ? "Processing..." : "Continue"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentMethodSelector; 