
import React from 'react';
import Header from '@/components/Header';
import ListingForm from '@/components/ListingForm';
import { FileImage } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CreateListing: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-dark to-dark-lighter">
      <Header />
      
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Create New Listing</h1>
              <p className="text-gray-400">Fill out the details to sell your social media account</p>
            </div>
            <Link to="/">
              <Button variant="outline" className="text-white border-gray-700">
                Back to Listings
              </Button>
            </Link>
          </div>
          
          <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-purple/20 to-purple-light/20 p-6 flex items-center gap-4">
              <div className="bg-purple/30 rounded-full p-3">
                <FileImage className="h-8 w-8 text-purple-light" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Sell Your Social Media Account</h2>
                <p className="text-gray-300">Complete the form below to list your account on the marketplace</p>
              </div>
            </div>
          </div>
          
          <ListingForm />
        </div>
      </div>
    </div>
  );
};

export default CreateListing;
