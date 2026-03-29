import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from "sonner";

interface TranslationButtonProps {
  onTranslate: (language: string) => void;
  className?: string;
}

const TranslationButton: React.FC<TranslationButtonProps> = ({ onTranslate, className }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('English');
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = (language: string) => {
    if (language === currentLanguage) return;
    
    setIsTranslating(true);
    toast.info(`Translating to ${language}...`);
    
    // Simulate translation process
    setTimeout(() => {
      onTranslate(language);
      setCurrentLanguage(language);
      setIsTranslating(false);
      toast.success(`Translated to ${language}`);
    }, 1000);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`translate-btn rounded-full btn-transition ${isTranslating ? 'opacity-70 pointer-events-none' : ''} ${className}`}
          disabled={isTranslating}
        >
          <Globe className={`h-4 w-4 ${isTranslating ? 'animate-spin' : ''}`} />
          <span>{currentLanguage}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="animate-scale-in">
        <DropdownMenuItem onClick={() => handleTranslate('English')} className="cursor-pointer">
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleTranslate('Hindi')} className="cursor-pointer">
          Hindi
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TranslationButton;
