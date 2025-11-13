import React from 'react';
import { Bot } from 'lucide-react';

interface AIAssistantFabProps {
  onOpen: () => void;
}

const AIAssistantFab: React.FC<AIAssistantFabProps> = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-6 right-6 bg-brand-blue hover:bg-brand-blue-light text-white rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center shadow-lg z-50 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-brand-blue"
      aria-label="Open DeliverAI Assistant"
    >
      <Bot className="h-7 w-7" />
    </button>
  );
};

export default AIAssistantFab;
