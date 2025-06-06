// Image optimization configuration for Next.js
// This module configures the Next.js Image component to optimize image loading

// Configuration for cache duration and image optimization
export const imageConfig = {
  // Default image domains that need optimization
  domains: ['firebasestorage.googleapis.com'],
  
  // Set caching behavior
  minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  
  // Define image device sizes for responsive images
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  
  // Define image sizes for srcSet
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  
  // Set default image formats
  formats: ['image/webp', 'image/avif'],
  
  // Enable dangerouslyAllowSVG for placeholder SVGs
  dangerouslyAllowSVG: true,
  
  // Set content security policy
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  
  // Whether to prefer animated images or static ones
  animatedGifs: true,
  
  // How many concurrent requests to use when fetching images
  maxConcurrentRequests: 6,
};

// Helper function to preconnect to image domains
export const setupImagePreconnect = () => {
  if (typeof document !== 'undefined') {
    const head = document.head;
    
    // Add preconnect for Firebase Storage
    const firebasePreconnect = document.createElement('link');
    firebasePreconnect.rel = 'preconnect';
    firebasePreconnect.href = 'https://firebasestorage.googleapis.com';
    firebasePreconnect.crossOrigin = 'anonymous';
    head.appendChild(firebasePreconnect);
    
    // Add DNS prefetch as fallback
    const firebaseDnsPrefetch = document.createElement('link');
    firebaseDnsPrefetch.rel = 'dns-prefetch';
    firebaseDnsPrefetch.href = 'https://firebasestorage.googleapis.com';
    head.appendChild(firebaseDnsPrefetch);
  }
};

// Export default configuration
export default imageConfig; 