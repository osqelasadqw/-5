
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import PlatformFilters from '@/components/PlatformFilters';
import SearchFilters from '@/components/SearchFilters';
import AccountCard from '@/components/AccountCard';
import Pagination from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { getLatestListings } from '@/services/listingService';
import { toast } from 'sonner';

const Home: React.FC = () => {
  const [activePlatform, setActivePlatform] = useState('TikTok');
  const [currentPage, setCurrentPage] = useState(1);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredAccounts, setFilteredAccounts] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        const listings = await getLatestListings(12);
        setAccounts(listings);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching listings:", error);
        toast.error("Failed to load listings");
        setLoading(false);
      }
    };
    
    fetchListings();
  }, []);
  
  useEffect(() => {
    // Filter accounts based on selected platform
    const filtered = accounts.filter(account => 
      account.platform === activePlatform || activePlatform === 'All'
    );
    setFilteredAccounts(filtered);
    setCurrentPage(1);
  }, [activePlatform, accounts]);

  const handleSearch = (filters: any) => {
    // Apply more complex filtering based on search criteria
    let filtered = [...accounts];
    
    if (filters.priceMin) {
      filtered = filtered.filter(account => Number(account.price) >= Number(filters.priceMin));
    }
    
    if (filters.priceMax) {
      filtered = filtered.filter(account => Number(account.price) <= Number(filters.priceMax));
    }
    
    if (filters.subscribersMin) {
      filtered = filtered.filter(account => Number(account.subscribers) >= Number(filters.subscribersMin));
    }
    
    if (filters.subscribersMax) {
      filtered = filtered.filter(account => Number(account.subscribers) <= Number(filters.subscribersMax));
    }
    
    // Apply platform filter on top of search filters
    if (activePlatform !== 'All') {
      filtered = filtered.filter(account => account.platform === activePlatform);
    }
    
    setFilteredAccounts(filtered);
    setCurrentPage(1);
  };

  // Pagination logic
  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);
  const currentAccounts = filteredAccounts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-dark to-dark-lighter relative">
      <div className="bg-gradient-to-b from-[#1A1F2C]/90 to-[#1A1F2C]/70 backdrop-blur-sm">
        <Header />
        
        <div className="container mx-auto py-10 px-4 relative z-10">
          {/* Unified filter container */}
          <div className="filter-container mb-10">
            <PlatformFilters 
              activePlatform={activePlatform}
              setActivePlatform={setActivePlatform}
            />
            
            <SearchFilters onSearch={handleSearch} />
          </div>
        </div>
      </div>
      
      <div className="container mx-auto py-8 px-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-dark-card rounded-lg overflow-hidden shadow-lg h-80 animate-pulse">
                <div className="h-48 bg-dark-lighter"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-dark-lighter rounded w-2/3 mx-auto"></div>
                  <div className="h-4 bg-dark-lighter rounded w-1/2 mx-auto"></div>
                  <div className="h-8 bg-dark-lighter rounded w-full mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : currentAccounts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {currentAccounts.map(account => (
              <AccountCard
                key={account.id}
                id={account.id}
                name={account.displayLink || account.link.split('/').pop() || 'Unknown'}
                category={account.category || 'Uncategorized'}
                subscribers={account.subscribers || 0}
                price={Number(account.price)}
                imageUrl={account.imageUrls && account.imageUrls.length > 0 
                  ? account.imageUrls[0] 
                  : 'https://via.placeholder.com/400x300/000000/FFFFFF?text=No+Image'}
                isPro={Number(account.price) > 100}
                buttonColor={Number(account.price) > 100 ? 'orange' : 'purple'}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-400 mb-4">No accounts found for the selected filters</p>
            <Button 
              className="bg-purple-light"
              onClick={() => {
                setActivePlatform('All');
              }}
            >
              Reset Filters
            </Button>
          </div>
        )}
        
        {totalPages > 1 && (
          <div className="mt-10">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Floating Chat Button */}
      <div className="fixed bottom-6 left-6 z-50">
        <Link to="/messages">
          <Button 
            className="rounded-full w-14 h-14 flex items-center justify-center bg-purple hover:bg-purple-light text-white shadow-lg shadow-purple/20"
            size="icon"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="sr-only">Open Messages</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Home;
