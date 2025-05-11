
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createListing, ListingFormData } from '@/services/listingService';
import { Upload, X, Check, Image, FileImage } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ListingForm: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ListingFormData>({
    link: '',
    displayLink: '',
    price: '',
    allowComments: true,
    description: '',
    income: '',
    expense: '',
    incomeDetails: '',
    expenseDetails: '',
    promotionDetails: '',
    supportDetails: '',
    agreeToRemoveContacts: false,
    platform: 'TikTok',
    category: 'Entertainment',
    subscribers: 0,
  });

  const platforms = [
    "YouTube", "TikTok", "Twitter", "Instagram", "Facebook", "Telegram"
  ];

  const categories = [
    "Entertainment", "Business & Finance", "Education", "Gaming", 
    "Health & Fitness", "Luxury & Motivation", "Movies & Music", "Other"
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData({
      ...formData,
      [name]: checked
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.link) {
      toast.error("Please enter a link to your account/channel");
      return;
    }

    if (!formData.price) {
      toast.error("Please enter a price");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create the listing
      await createListing(formData, selectedFiles);
      toast.success("Listing created successfully!");
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to create listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-dark-lighter p-6 rounded-lg border border-gray-800/40 shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-white">Basic Information</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platform" className="text-white">Platform</Label>
              <Select 
                value={formData.platform} 
                onValueChange={(value) => handleSelectChange('platform', value)}
              >
                <SelectTrigger className="bg-white text-black mt-1">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map(platform => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category" className="text-white">Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleSelectChange('category', value)}
              >
                <SelectTrigger className="bg-white text-black mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="link" className="text-white">Account/Channel Link</Label>
            <Input
              id="link"
              name="link"
              type="text"
              required
              value={formData.link}
              onChange={handleChange}
              className="bg-white text-black mt-1"
              placeholder="https://"
            />
          </div>
          
          <div>
            <Label htmlFor="displayLink" className="text-white">Display Name</Label>
            <Input
              id="displayLink"
              name="displayLink"
              type="text"
              value={formData.displayLink}
              onChange={handleChange}
              className="bg-white text-black mt-1"
              placeholder="Channel or Account Name"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price" className="text-white">Price ($)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                required
                value={formData.price}
                onChange={handleChange}
                className="bg-white text-black mt-1"
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="subscribers" className="text-white">Subscribers Count</Label>
              <Input
                id="subscribers"
                name="subscribers"
                type="number"
                value={formData.subscribers}
                onChange={handleChange}
                className="bg-white text-black mt-1"
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="allowComments"
              checked={formData.allowComments}
              onCheckedChange={(checked) => 
                handleCheckboxChange('allowComments', checked as boolean)
              }
            />
            <Label htmlFor="allowComments" className="text-white">Allow comments on this listing</Label>
          </div>
        </div>
      </div>
      
      <div className="bg-dark-lighter p-6 rounded-lg border border-gray-800/40 shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-white">Detailed Information</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="description" className="text-white">Listing Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="bg-white text-black mt-1 h-24"
              placeholder="Provide a detailed description (contacts not allowed)"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="income" className="text-white">Monthly Income ($)</Label>
              <Input
                id="income"
                name="income"
                type="number"
                value={formData.income}
                onChange={handleChange}
                className="bg-white text-black mt-1"
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="expense" className="text-white">Monthly Expenses ($)</Label>
              <Input
                id="expense"
                name="expense"
                type="number"
                value={formData.expense}
                onChange={handleChange}
                className="bg-white text-black mt-1"
                min="0"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="incomeDetails" className="text-white">Income Source Details</Label>
            <Textarea
              id="incomeDetails"
              name="incomeDetails"
              value={formData.incomeDetails}
              onChange={handleChange}
              className="bg-white text-black mt-1 h-20"
              placeholder="Explain your income sources (ads, sponsorships, etc.)"
            />
          </div>
          
          <div>
            <Label htmlFor="expenseDetails" className="text-white">Expense Details</Label>
            <Textarea
              id="expenseDetails"
              name="expenseDetails"
              value={formData.expenseDetails}
              onChange={handleChange}
              className="bg-white text-black mt-1 h-20"
              placeholder="Explain your expenses (content creation, tools, etc.)"
            />
          </div>
          
          <div>
            <Label htmlFor="promotionDetails" className="text-white">Promotion Strategy</Label>
            <Textarea
              id="promotionDetails"
              name="promotionDetails"
              value={formData.promotionDetails}
              onChange={handleChange}
              className="bg-white text-black mt-1 h-20"
              placeholder="How did you promote your account?"
            />
          </div>
          
          <div>
            <Label htmlFor="supportDetails" className="text-white">Support Requirements</Label>
            <Textarea
              id="supportDetails"
              name="supportDetails"
              value={formData.supportDetails}
              onChange={handleChange}
              className="bg-white text-black mt-1 h-20"
              placeholder="What is needed to maintain this account?"
            />
          </div>
        </div>
      </div>
      
      <div className="bg-dark-lighter p-6 rounded-lg border border-gray-800/40 shadow-md">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
          <FileImage className="h-5 w-5" /> Screenshots & Proof
        </h2>
        
        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
        
        <div 
          className="border-2 border-dashed border-gray-700 rounded-md p-6 mt-2 text-center hover:border-purple cursor-pointer bg-dark-card"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center">
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-gray-300 mb-1">Drop files here or click to upload</p>
            <p className="text-xs text-gray-500">Upload income proofs, screenshots, etc.</p>
          </div>
        </div>
        
        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <p className="text-white mb-2">Selected Files ({selectedFiles.length})</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative bg-dark-card p-2 rounded-md border border-gray-700">
                  <div className="flex items-center">
                    <Image className="h-4 w-4 mr-1 text-gray-400" />
                    <p className="text-xs text-gray-300 truncate">{file.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-blue-900/30 text-blue-100 p-4 rounded-md border border-blue-800/40">
        <p className="text-sm">
          Please confirm that you're the account owner by placing this code in the description 
          of your account/channel:
        </p>
        <div className="mt-2 bg-blue-900/50 p-2 rounded border border-blue-700 font-mono">
          <code className="text-blue-300">e03a2f051e06a654fa4a</code>
        </div>
        <p className="text-xs mt-2 text-blue-200/80">
          You can remove this code after your listing has been approved.
        </p>
      </div>
      
      <div className="bg-dark-lighter p-4 rounded-md border border-gray-800/40">
        <p className="text-sm text-gray-300">
          Placing contacts in the description is prohibited. The administration will monitor compliance with this rule.
        </p>
        <div className="flex items-center space-x-2 mt-3">
          <Checkbox 
            id="agreeToRemoveContacts"
            checked={formData.agreeToRemoveContacts}
            onCheckedChange={(checked) => 
              handleCheckboxChange('agreeToRemoveContacts', checked as boolean)
            }
          />
          <Label htmlFor="agreeToRemoveContacts" className="text-white text-sm">
            I agree to remove contacts / close DMs to receive 50% more rating
          </Label>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Button 
          type="submit"
          className="bg-purple hover:bg-purple-light text-white font-medium py-3 px-10 rounded-full transition-all duration-300 w-full md:w-auto flex items-center justify-center gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>Processing...</>
          ) : (
            <>
              <Check className="h-5 w-5" />
              Start selling
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default ListingForm;
