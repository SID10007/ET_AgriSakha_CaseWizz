import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import Header from "@/components/Header";
import QuestionCard from "@/components/QuestionCard";
import SearchBar from "@/components/SearchBar";
import TranslationButton from "@/components/TranslationButton";
import { Button } from "@/components/ui/button";
import { getMockQuestions, translateContent } from "@/services/geminiService";

const Index = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<any[]>([]);
  const [isTranslated, setIsTranslated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState("English");

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      const mockData = getMockQuestions();

      // Get user-submitted questions from localStorage
      const userQuestions = JSON.parse(
        localStorage.getItem("userQuestions") || "[]"
      );

      // Combine user questions with mock questions
      const allQuestions = [...userQuestions, ...mockData];

      setQuestions(allQuestions);
      setFilteredQuestions(allQuestions);
      setIsLoading(false);
    }, 800);
  }, []);

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredQuestions(questions);
      return;
    }

    const filtered = questions.filter(
      (q) =>
        q.title.toLowerCase().includes(query.toLowerCase()) ||
        q.description.toLowerCase().includes(query.toLowerCase()) ||
        q.tags.some((tag: string) =>
          tag.toLowerCase().includes(query.toLowerCase())
        )
    );

    setFilteredQuestions(filtered);
  };

  const handleTranslate = async (language: string) => {
    setCurrentLanguage(language);

    if (language === "English") {
      // If switching back to English, just use the original data
      setFilteredQuestions(questions);
      setIsTranslated(false);
      return;
    }

    setIsLoading(true);

    // Translate each question with Gemini
    const translatedQuestions = await Promise.all(
      questions.map(async (q) => {
        const translatedTitle = await translateContent(q.title, language);
        const translatedDesc = await translateContent(q.description, language);

        return {
          ...q,
          title: translatedTitle,
          description: translatedDesc,
          originalLang: "English",
        };
      })
    );

    setFilteredQuestions(translatedQuestions);
    setIsTranslated(true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col page-transition bg-gradient-to-b from-black to-gray-900 border-r border-white/10">
      <nav className="fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-8">
            <span className="text-3xl font-extrabold text-[#fccd03] font-sans">
                  <img src="/logoCom.png" alt="AgriSakha Logo" className="h-42 w-48 inline-block align-middle" />
                </span>
              <div className="hidden md:flex space-x-8">
                <a
                  href="#"
                  className="text-white hover:text-[#fccd03] transition-colors font-medium"
                >
                  Home
                </a>
                <a
                  href="#"
                  className="text-white hover:text-[#fccd03] transition-colors font-medium"
                >
                  Product
                </a>
                <a
                  href="#"
                  className="text-white hover:text-[#fccd03] transition-colors font-medium"
                >
                  Features
                </a>
                <a
                  href="#"
                  className="text-white hover:text-[#fccd03] transition-colors font-medium"
                >
                  About
                </a>
              </div>
            </div>
            {/* <div className="flex items-center space-x-4">
              <button className="text-white hover:text-[#fccd03] transition-colors px-6 py-2 font-medium">
                Sign In
              </button>
              <button className="bg-[#fccd03] text-black px-6 py-2 rounded-lg font-semibold hover:bg-[#e3b902] transition-colors">
                Sign Up
              </button>
            </div> */}
          </div>
        </div>
      </nav>
      {/* <Header /> */}
      <div className="flex flex-1 justify-center items-center">
        {/* Sidebar */}
        <div className="fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-black to-gray-900 border-r border-white/10">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-[#fccd03] mb-6">Menu</h2>
          <nav className="space-y-4">
            <a
              href="/"
              className="flex items-center text-gray-400 hover:text-white transition-colors duration-300"
            >
              <span className="mr-3">🏠</span>
              Home
            </a>
            <a
              href="http://localhost:5173/rural-financial-news"
              className="flex items-center text-gray-400 hover:text-white transition-colors duration-300"
            >
              <span className="mr-3">📰</span>
              Financial News
            </a>
            {/* <a
              href="/rural-assistant"
              className="flex items-center text-gray-400 hover:text-white transition-colors duration-300"
            >
              <span className="mr-3">💬</span>
              Rural Assistant
            </a> */}
            <a
              href="http://localhost:5173/budget-assistant"
              className="flex items-center text-gray-400 hover:text-white transition-colors duration-300"
            >
              <span className="mr-3">💰</span>
              Budget Assistant
            </a>
            <a
              href="http://localhost:5173/loan-assistant"
              className="flex items-center text-gray-400 hover:text-white transition-colors duration-300"
            >
              <span className="mr-3">💳</span>
              Loan Assistant
            </a>
            <a
              href="http://localhost:5173/agri-assistant"
              className="flex items-center text-gray-400 hover:text-white transition-colors duration-300"
            >
              <span className="mr-3">📈</span>
              Agricultural Advisor
            </a>
            <a
                href="http://localhost:8080/"
                className="flex items-center text-[#fccd03] font-bold"
              >
                <span className="mr-3">💬</span>
                Community
              </a>
          </nav>
        </div>
      </div>

        <main className="mt-14 flex-grow container mx-auto px-4 py-8 ">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 ">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-black bg-clip-text text-transparent">
                  Agricultural Questions
                </h1>
                <p className="text-muted-foreground mt-1 text-white">
                  Find answers to your Agricultural queries or ask your own
                </p>

                {/* <Header/> */}
              </div>

              <div className="flex items-center gap-3">
                <TranslationButton onTranslate={handleTranslate} />

                <Link to="/ask">
                  <Button className="btn-ripple btn-transition rounded-full">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Ask Question
                  </Button>
                </Link>
              </div>
            </div>

            <SearchBar onSearch={handleSearch} className="mb-8" />

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-40 bg-muted rounded-lg animate-pulse"
                  ></div>
                ))}
              </div>
            ) : filteredQuestions.length > 0 ? (
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
                <p className="text-muted-foreground mb-1">
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
        </main>
      </div>
      <footer className="bg-black/80 backdrop-blur-md border-t border-white/10 text-white py-4 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-[#fccd03] font-bold">AgriSakha</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-400 text-sm">
                AgriSakha
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <a
                href="#"
                className="text-gray-400 hover:text-[#fccd03] transition-colors text-sm"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-[#fccd03] transition-colors text-sm"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-[#fccd03] transition-colors text-sm"
              >
                Contact
              </a>
              <span className="text-gray-400 text-sm">
                &copy; 2025 AgriSakha
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
