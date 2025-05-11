import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from "@/components/ui/button";
import { Check, Star, User, Mail, MessageCircle, Trash2, AlertTriangle, ChevronDown, ChevronRight, X } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ListingFormData, deleteListing } from '@/services/listingService';
import { getChatRoomWithSeller, sendPurchaseRequest } from '@/services/realtimeChatService';
import { isAdmin } from '@/services/roleService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import PaymentMethodSelector from '@/components/PaymentMethodSelector';

interface AccountData extends ListingFormData {
  id: string;
  sellerId?: string;
  seller?: {
    name: string;
    rating: number;
    totalSales: number;
    avatar?: string;
  };
}

const AccountDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isUserOwner, setIsUserOwner] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPaymentMethodSelector, setShowPaymentMethodSelector] = useState(false);
  
  // დეტალების მოდალის სტეიტი
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    const fetchAccount = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const docRef = doc(db, "listings", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as ListingFormData & { sellerId: string };
          
          // Create mock seller data (in a real app, you'd fetch this from users collection)
          setAccount({
            id: docSnap.id,
            ...data,
            seller: {
              name: data.platform + ' Channel',
              rating: 4.9,
              totalSales: Math.floor(Math.random() * 50) + 1,
              avatar: data.imageUrls?.[0]
            }
          });
        } else {
          toast.error("Listing not found!");
          navigate('/');
        }
      } catch (error) {
        console.error("Error fetching listing:", error);
        toast.error("Failed to load listing details");
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [id, navigate]);

  useEffect(() => {
    const checkUserPermissions = async () => {
      if (!currentUser || !account) return;

      // შევამოწმოთ არის თუ არა მიმდინარე მომხმარებელი პროდუქტის მფლობელი
      const isOwner = account.sellerId === currentUser.uid;
      setIsUserOwner(isOwner);

      // შევამოწმოთ არის თუ არა მიმდინარე მომხმარებელი ადმინისტრატორი
      if (currentUser.email) {
        const adminStatus = await isAdmin(currentUser.email);
        setIsUserAdmin(adminStatus);
      }
    };

    checkUserPermissions();
  }, [currentUser, account]);

  const handleContactSeller = async () => {
    if (!currentUser) {
      toast.error("Please log in to contact the seller");
      navigate("/login");
      return;
    }

    if (!account?.sellerId) {
      toast.error("Cannot find seller information");
      return;
    }

    try {
      // First get or create chat room with this seller, include product ID
      const roomId = await getChatRoomWithSeller(account.sellerId, account.id);
      
      // Store the selected chat room ID in localStorage for after navigation
      if (roomId) {
        localStorage.setItem('selectedChatRoomId', roomId);
      }
      
      // Navigate to messages page
      navigate("/messages");
    } catch (error) {
      console.error("Error contacting seller:", error);
      toast.error("Failed to connect with seller");
    }
  };

  const handlePurchaseRequest = () => {
    if (!currentUser) {
      toast.error("Please log in to make a purchase request");
      navigate("/login");
      return;
    }

    if (!account?.sellerId) {
      toast.error("Cannot find seller information");
      return;
    }

    // Show payment method selector modal
    setShowPaymentMethodSelector(true);
  };

  const handleDeleteListing = async () => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await deleteListing(id);
      toast.success("პროდუქტი წარმატებით წაიშალა");
      navigate('/');
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast.error(error instanceof Error ? error.message : "პროდუქტის წაშლა ვერ მოხერხდა");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };
  
  // დეტალების სრული ინფორმაციის გამოჩენა
  const handleShowAllDetails = () => {
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-dark">
        <Header />
        <div className="container mx-auto py-8 px-4 flex justify-center items-center flex-grow">
          <div className="text-white">Loading listing details...</div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen flex flex-col bg-dark">
        <Header />
        <div className="container mx-auto py-8 px-4 flex justify-center items-center flex-grow">
          <div className="text-white">Listing not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark">
      <Header />
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Link to="/" className="text-blue-400 hover:text-blue-300">
            ← Back to listings
          </Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Account details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-dark-card rounded-lg overflow-hidden shadow-lg">
              {account.imageUrls && account.imageUrls.length > 0 ? (
                <img 
                  src={account.imageUrls[0]} 
                  alt={account.platform + ' Channel'}
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-dark-lighter flex items-center justify-center">
                  <span className="text-gray-400">No image available</span>
                </div>
              )}
              
              <div className="p-6">
                <div className="flex items-center mb-2">
                  <span className="bg-green-500 rounded-full w-5 h-5 flex items-center justify-center mr-2">
                    <Check size={14} className="text-white" />
                  </span>
                  <h1 className="text-2xl font-bold text-white">{account.platform} Channel</h1>
                </div>
                
                <p className="text-gray-400 mb-4">{account.category}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-dark-lighter p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Subscribers</p>
                    <p className="text-xl font-bold text-white">{account.subscribers.toLocaleString()}</p>
                  </div>
                  
                  <div className="bg-dark-lighter p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Monthly Income</p>
                    <p className="text-xl font-bold text-white">${account.income}</p>
                  </div>
                  
                  <div className="bg-dark-lighter p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Monthly Expense</p>
                    <p className="text-xl font-bold text-white">${account.expense}</p>
                  </div>
                </div>
                
                <h2 className="text-xl font-bold text-white mb-3">Description</h2>
                <p className="text-gray-300 mb-6">{account.description}</p>
                
                <div className="md:hidden">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-white">
                      ${account.price}
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-purple hover:bg-purple-light text-white font-bold py-3 px-6 rounded mb-4"
                    onClick={handlePurchaseRequest}
                  >
                    Buy This Channel
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="bg-dark-card rounded-lg shadow-lg p-6">
              <div 
                className="flex justify-between items-center cursor-pointer" 
                onClick={() => handleShowAllDetails()}
              >
                <h2 className="text-xl font-bold text-white">Additional Information</h2>
                <div className="text-white">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column - Purchase and seller info */}
          <div className="space-y-6">
            <div className="bg-dark-card rounded-lg shadow-lg p-6">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-white">
                  ${account.price}
                </div>
              </div>
              
              <Button 
                className="w-full bg-purple hover:bg-purple-light text-white font-bold py-3 px-6 rounded mb-4"
                onClick={handlePurchaseRequest}
              >
                Buy This Channel
              </Button>
            </div>
            
            <div className="bg-dark-card rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Secure Transaction</h2>
              
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center gap-2">
                  <Check size={18} className="text-green-500" />
                  <span>Escrow protection</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={18} className="text-green-500" />
                  <span>Verified seller</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={18} className="text-green-500" />
                  <span>Safe account transfer</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={18} className="text-green-500" />
                  <span>24/7 support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Admin/Owner Actions */}
        {(isUserAdmin || isUserOwner) && (
          <div className="mt-8 bg-red-900/20 border border-red-800/30 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h3 className="text-white font-semibold">ადმინისტრატორის მოქმედებები</h3>
              </div>
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting} className="flex items-center gap-1">
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? 'მიმდინარეობს წაშლა...' : 'პროდუქტის წაშლა'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-dark border-gray-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">დარწმუნებული ხართ?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      ეს მოქმედება სამუდამოდ წაშლის პროდუქტს და მასთან დაკავშირებულ ყველა სურათს. ეს ქმედება შეუქცევადია.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-dark-card border-gray-700 text-white hover:bg-dark-lighter">გაუქმება</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteListing}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      წაშლა
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>
      
      {/* ყველა დეტალის მოდალი */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">დეტალური ინფორმაცია</h2>
              <button 
                className="text-gray-400 hover:text-white"
                onClick={() => setShowDetailsModal(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-3">Basic Information</h3>
            <div className="bg-dark-lighter p-4 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Platform</p>
                  <p className="text-lg font-medium text-white">{account.platform}</p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm">Category</p>
                  <p className="text-lg font-medium text-white">{account.category}</p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm">Display Name</p>
                  <p className="text-lg font-medium text-white">{account.platform} Channel</p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm">Price</p>
                  <p className="text-lg font-medium text-white">${account.price}</p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm">Subscribers Count</p>
                  <p className="text-lg font-medium text-white">{account.subscribers.toLocaleString()}</p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm">Monthly Income</p>
                  <p className="text-lg font-medium text-white">${account.income}</p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm">Monthly Expenses</p>
                  <p className="text-lg font-medium text-white">${account.expense}</p>
                </div>
                
                {/* @ts-ignore */}
                {account.link && (
                  <div className="col-span-2">
                    <p className="text-gray-400 text-sm">Account/Channel Link</p>
                    {/* @ts-ignore */}
                    <p className="text-lg font-medium text-white break-all">{account.link}</p>
                  </div>
                )}
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-3">Listing Description</h3>
            <div className="bg-dark-lighter p-4 rounded-lg mb-6">
              <p className="text-gray-200 whitespace-pre-wrap">{account.description}</p>
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-3">Detailed Information</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* @ts-ignore */}
              {account.incomeDetails && (
                <div className="bg-dark-lighter p-4 rounded-lg">
                  <h4 className="text-lg font-bold text-white mb-2">Income Source Details</h4>
                  {/* @ts-ignore */}
                  <p className="text-gray-200 whitespace-pre-wrap">{account.incomeDetails}</p>
                </div>
              )}
              
              {/* @ts-ignore */}
              {account.expenseDetails && (
                <div className="bg-dark-lighter p-4 rounded-lg">
                  <h4 className="text-lg font-bold text-white mb-2">Expense Details</h4>
                  {/* @ts-ignore */}
                  <p className="text-gray-200 whitespace-pre-wrap">{account.expenseDetails}</p>
                </div>
              )}
              
              {/* @ts-ignore */}
              {account.promotionDetails && (
                <div className="bg-dark-lighter p-4 rounded-lg">
                  <h4 className="text-lg font-bold text-white mb-2">Promotion Strategy</h4>
                  {/* @ts-ignore */}
                  <p className="text-gray-200 whitespace-pre-wrap">{account.promotionDetails}</p>
                </div>
              )}
              
              {/* @ts-ignore */}
              {account.supportDetails && (
                <div className="bg-dark-lighter p-4 rounded-lg">
                  <h4 className="text-lg font-bold text-white mb-2">Support Requirements</h4>
                  {/* @ts-ignore */}
                  <p className="text-gray-200 whitespace-pre-wrap">{account.supportDetails}</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex justify-end">
              <Button 
                className="bg-purple hover:bg-purple-light text-white"
                onClick={() => setShowDetailsModal(false)}
              >
                დახურვა
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Payment Method Selector Modal */}
      {showPaymentMethodSelector && account && (
        <PaymentMethodSelector
          sellerId={account.sellerId || ''}
          productId={account.id}
          channelName={`${account.platform} Channel`}
          price={Number(account.price)}
          onClose={() => setShowPaymentMethodSelector(false)}
        />
      )}
    </div>
  );
};

export default AccountDetail;
