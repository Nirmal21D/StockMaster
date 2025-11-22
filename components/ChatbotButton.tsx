'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Chatbot from './Chatbot';

export default function ChatbotButton() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Don't show chatbot on authentication pages or when not authenticated
  const shouldShowChatbot = session && 
                           !pathname.startsWith('/auth') && 
                           !pathname.startsWith('/signup') && 
                           pathname !== '/' &&
                           pathname !== '/landing';

  const toggleChatbot = () => {
    setIsChatbotOpen(!isChatbotOpen);
  };

  // Don't render anything if we shouldn't show the chatbot or still loading
  if (status === 'loading' || !shouldShowChatbot) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={toggleChatbot}
        className={`fixed bottom-4 right-4 w-14 h-14 rounded-full shadow-lg transition-all duration-200 z-50 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-300 ${
          isChatbotOpen
            ? 'bg-gray-600 hover:bg-gray-700 rotate-45'
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
        }`}
        title={isChatbotOpen ? 'Close chat' : 'Open StockMaster AI'}
      >
        {isChatbotOpen ? (
          // Close icon (X)
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          // Chat icon
          <div className="relative">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            
            {/* Notification dot - optional, you can remove if not needed */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
        )}
      </button>

      {/* Chatbot Component */}
      <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />

      {/* Backdrop for mobile - optional */}
      {isChatbotOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
          onClick={() => setIsChatbotOpen(false)}
        />
      )}
    </>
  );
}