
import React from 'react';
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange
}) => {
  const renderPageButtons = () => {
    const pages = [];
    
    // Add current page and pages around it
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          onClick={() => onPageChange(i)}
          className={`w-10 h-10 rounded-full ${
            i === currentPage ? 'bg-purple text-white' : 'bg-white text-black'
          }`}
        >
          {i}
        </Button>
      );
    }
    
    return pages;
  };

  return (
    <div className="flex justify-center gap-2 mt-8 mb-12">
      {renderPageButtons()}
      {currentPage < totalPages && (
        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-full bg-white text-black"
        >
          Next
        </Button>
      )}
    </div>
  );
};

export default Pagination;
