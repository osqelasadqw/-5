
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface SearchFiltersProps {
  onSearch: () => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ onSearch }) => {
  return (
    <div className="space-y-4">
      <Input 
        type="text" 
        placeholder="Search by name" 
        className="filter-input"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select>
          <SelectTrigger className="filter-select">
            <SelectValue placeholder="Select topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entertainment">Entertainment</SelectItem>
            <SelectItem value="education">Education</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="lifestyle">Lifestyle</SelectItem>
            <SelectItem value="gaming">Gaming</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="checkbox-container">
          <input
            type="checkbox"
            id="monetization"
            className="filter-checkbox"
          />
          <label htmlFor="monetization" className="filter-label">
            Monetization enabled
          </label>
        </div>
      </div>
      
      <div className="filter-range-container">
        <span className="filter-range-label">Subscribers:</span>
        <div className="filter-range-inputs">
          <Input 
            type="text" 
            placeholder="from" 
            className="filter-input"
          />
          <span className="filter-divider">—</span>
          <Input 
            type="text" 
            placeholder="to" 
            className="filter-input"
          />
        </div>
      </div>
      
      <div className="filter-range-container">
        <span className="filter-range-label">Price:</span>
        <div className="filter-range-inputs">
          <Input 
            type="text" 
            placeholder="from" 
            className="filter-input"
          />
          <span className="filter-divider">—</span>
          <Input 
            type="text" 
            placeholder="to" 
            className="filter-input"
          />
        </div>
      </div>
      
      <div className="filter-range-container">
        <span className="filter-range-label">Income:</span>
        <div className="filter-range-inputs">
          <Input 
            type="text" 
            placeholder="from" 
            className="filter-input"
          />
          <span className="filter-divider">—</span>
          <Input 
            type="text" 
            placeholder="to" 
            className="filter-input"
          />
        </div>
      </div>
      
      <div className="mt-6">
        <button 
          className="filter-search-button" 
          onClick={onSearch}
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchFilters;
