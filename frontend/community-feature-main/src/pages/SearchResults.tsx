
import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import QuestionCard from '@/components/QuestionCard';
import TranslationButton from '@/components/TranslationButton';
import { Button } from '@/components/ui/button';
import { getMockQuestions, translateContent } from '@/services/geminiService';

const SearchResults = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('q') || '';
  
  const [questions, setQuestions] = useState(getMockQuestions());
  const [currentLanguage, setCurrentLanguage] = useState('English');
  const [isTranslated, setIsTranslated] = useState(false);
  
  // Filter questions based on query
  const filteredQuestions = questions.filter(
    q => 
      q.title.toLowerCase().includes(query.toLowerCase()) || 
      q.description.toLowerCase().includes(query.toLowerCase()) ||
      q.tags.some((tag: string) => tag.toLowerCase().includes(query.toLowerCase()))
  );

  const handleSearch = (newQuery: string) => {
    // Navigate to search page with new query
    window.history.pushState({}, '', `/search?q=${encodeURIComponent(newQuery)}`);
    // Force re-render
    window.dispatchEvent(new Event('popstate'));
  };

  const handleTranslate = async (language: string) => {
    setCurrentLanguage(language);
    
    if (language === 'English') {
      setQuestions(getMockQuestions());
      setIsTranslated(false);
      return;
    }
    
    // Translate questions
    const translatedQuestions = await Promise.all(
      getMockQuestions().map(async (q) => {
        const translatedTitle = await translateContent(q.title, language);
        const translatedDesc = await translateContent(q.description, language);
        
        return {
          ...q,
          title: translatedTitle,
          description: translatedDesc,
        };
      })
    );
    
    setQuestions(translatedQuestions);
    setIsTranslated(true);
  };

  return (
    <div className="min-h-screen flex flex-col page-transition">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link to="/">
              <Button variant="ghost" className="btn-transition">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Questions
              </Button>
            </Link>
            
            <TranslationButton onTranslate={handleTranslate} />
          </div>
          
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-4">
              Search Results {query ? `for "${query}"` : ''}
            </h1>
            <SearchBar onSearch={handleSearch} className="mb-6" />
            
            {filteredQuestions.length > 0 ? (
              <div className="space-y-4">
                {filteredQuestions.map((question) => (
                  <QuestionCard 
                    key={question.id} 
                    {...question} 
                    isTranslated={isTranslated}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <h3 className="text-xl font-medium mb-2">No questions found</h3>
                <p className="text-muted-foreground mb-4">
                  Try a different search term or ask a new question
                </p>
                <Link to="/ask">
                  <Button className="btn-ripple btn-transition">
                    Ask a Question
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SearchResults;
