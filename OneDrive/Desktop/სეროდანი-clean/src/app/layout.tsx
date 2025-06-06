import type React from "react"
import type { Metadata } from "next"
import { AuthProvider } from "@/lib/auth"
import { AdminButton } from "@/components/admin-button"
import "./globals.css"
import Script from "next/script"
import { Toaster } from "@/components/ui/toaster"
import { FacebookIcon, Instagram } from "lucide-react"

export const metadata: Metadata = {
  title: "Serodani Hotel",
  description: "Hotel with pool in Sighnaghi, Georgia",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link 
          rel="preconnect" 
          href="https://firebasestorage.googleapis.com" 
          crossOrigin="anonymous"
        />
        <link 
          rel="dns-prefetch" 
          href="https://firebasestorage.googleapis.com"
        />
      </head>
      <body>
        <AuthProvider>
          <AdminButton />
          {children}
          <Toaster />
          
          {/* Social Media Fixed Sidebar */}
          <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-50">
            <div className="flex flex-col space-y-6 bg-white py-4 px-3 shadow-md">
              <a 
                href="https://www.tripadvisor.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-orange-400 transition-colors"
                aria-label="TripAdvisor"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L12 8" />
                  <path d="M19.071 4.929L14.828 9.172" />
                  <path d="M22 12L16 12" />
                  <path d="M19.071 19.071L14.828 14.828" />
                  <path d="M12 22L12 16" />
                  <path d="M4.929 19.071L9.172 14.828" />
                  <path d="M2 12L8 12" />
                  <path d="M4.929 4.929L9.172 9.172" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </a>
              <a 
                href="https://www.facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-orange-400 transition-colors"
                aria-label="Facebook"
              >
                <FacebookIcon size={24} />
              </a>
              <a 
                href="https://www.instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-orange-400 transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={24} />
              </a>
            </div>
          </div>
          
          <footer className="py-6 bg-[#242323] text-center text-gray-400 text-sm">
          </footer>
        </AuthProvider>
        <Script id="image-optimization" strategy="afterInteractive">
          {`
            // Initialize image optimization
            (function() {
              // Set localStorage to prevent repeated image downloads
              if ('localStorage' in window) {
                // Create a session-based cache key
                const cacheKey = 'image_cache_' + (new Date().toDateString());
                
                // Mark the current session as having loaded images
                localStorage.setItem(cacheKey, 'true');
                
                // Add event listener to preload images on hover
                document.addEventListener('mouseover', function(e) {
                  const target = e.target;
                  if (target.tagName === 'IMG' && !target.dataset.preloaded) {
                    // Mark image as preloaded
                    target.dataset.preloaded = 'true';
                    
                    // Force browser to keep the image in cache
                    target.style.visibility = 'visible';
                  }
                }, { passive: true });
              }
            })();
          `}
        </Script>
      </body>
    </html>
  )
}
