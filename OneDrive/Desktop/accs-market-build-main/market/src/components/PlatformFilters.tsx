
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Youtube, 
  Twitter, 
  Instagram, 
  Facebook, 
  MessageSquare 
} from 'lucide-react';

interface PlatformFiltersProps {
  activePlatform: string;
  setActivePlatform: (platform: string) => void;
}

const PlatformFilters: React.FC<PlatformFiltersProps> = ({ activePlatform, setActivePlatform }) => {
  const platforms = [
    "YouTube",
    "TikTok",
    "Twitter",
    "Instagram",
    "Facebook",
    "Telegram",
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3 mb-4">
      {platforms.map((platform) => (
        <button
          key={platform}
          className={`px-6 py-2 rounded-full transition-all duration-200 ${
            activePlatform === platform 
              ? "bg-white text-black font-medium" 
              : "bg-transparent text-white border border-gray-700/60 hover:bg-white/10"
          }`}
          onClick={() => setActivePlatform(platform)}
        >
          {platform}
        </button>
      ))}
    </div>
  );
};

export default PlatformFilters;
