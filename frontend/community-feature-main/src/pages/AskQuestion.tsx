import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import AskQuestionForm from "@/components/AskQuestionForm";
import { toast } from "sonner";
import { ArrowLeft, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import TranslationButton from "@/components/TranslationButton";

const AskQuestion = () => {
  const navigate = useNavigate();

  const handleSubmitQuestion = (questionData: any) => {
    // Create a new question object with the necessary format
    const newQuestion = {
      id: `q${Date.now()}`, // Generate a unique ID using timestamp
      title: questionData.title,
      description: questionData.description,
      author: {
        name: questionData.author || "Anonymous",
        avatar: "",
      },
      tags: questionData.tags,
      answerCount: 0,
      createdAt: "Just now",
    };

    // Get existing questions from localStorage or initialize an empty array
    const existingQuestions = JSON.parse(
      localStorage.getItem("userQuestions") || "[]"
    );

    // Add the new question to the array
    const updatedQuestions = [newQuestion, ...existingQuestions];

    // Save back to localStorage
    localStorage.setItem("userQuestions", JSON.stringify(updatedQuestions));

    // Show success toast
    toast.success("Your question has been posted successfully!");

    // Redirect to home page after submission
    setTimeout(() => {
      navigate("/");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col page-transition bg-black flex flex-col">
      <nav className="fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-8">
              <span className="text-3xl font-extrabold text-[#fccd03] font-sans">AgriSakha.</span>
              <div className="hidden md:flex space-x-8">
                <a href="#" className="text-white hover:text-[#fccd03] transition-colors font-medium">Home</a>
                <a href="#" className="text-white hover:text-[#fccd03] transition-colors font-medium">Product</a>
                <a href="#" className="text-white hover:text-[#fccd03] transition-colors font-medium">Features</a>
                <a href="#" className="text-white hover:text-[#fccd03] transition-colors font-medium">About</a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-white hover:text-[#fccd03] transition-colors px-6 py-2 font-medium">Sign In</button>
              <button className="bg-[#fccd03] text-black px-6 py-2 rounded-lg font-semibold hover:bg-[#e3b902] transition-colors">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>
      <div className="flex flex-1 justify-center items-center">
        {/* Sidebar */}
        <div className="fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-black to-gray-900 border-r border-white/10">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-[#fccd03] mb-6">Menu</h2>
          <nav className="space-y-4">
            <a href="http://localhost:5173/" className="flex items-center text-gray-400 hover:text-white transition-colors duration-300">
              <span className="mr-3">🏠</span>
              Home
            </a>
            <a href="http://localhost:5173/rural-financial-news" className="flex items-center text-gray-400 hover:text-white transition-colors duration-300">
              <span className="mr-3">📰</span>
              Financial News
            </a>
            <a href="http://localhost:5173/rural-assistant" className="flex items-center text-[#fccd03] font-bold  hover:text-white transition-colors duration-300">
              <span className="mr-3">💬</span>
              Rural Assistant
            </a>
            <a href="http://localhost:5173/budget-assistant" className="flex items-center text-gray-400 hover:text-white transition-colors duration-300">
              <span className="mr-3">💰</span>
              Budget Assistant
            </a>
            <a href="http://localhost:5173/loan-assistant" className="flex items-center text-gray-400 hover:text-white transition-colors duration-300">
              <span className="mr-3">💳</span>
              Loan Assistant
            </a>
            <a href="http://localhost:5173/investment-assistant" className="flex items-center text-gray-400 hover:text-white transition-colors duration-300">
              <span className="mr-3">📈</span>
              Investment Assistant
            </a>
          </nav>
        </div>
      </div>
      <main className="flex-grow container mx-auto px-4 py-8">
    
        <AskQuestionForm onSubmit={handleSubmitQuestion} />
      </main>
  
    </div>
    <footer className="bg-black/80 backdrop-blur-md border-t border-white/10 text-white py-4 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-[#fccd03] font-bold">AgriSakha</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-400 text-sm">Voice Assisted Rural Understanding Navigator</span>
            </div>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-[#fccd03] transition-colors text-sm">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-[#fccd03] transition-colors text-sm">Terms</a>
              <a href="#" className="text-gray-400 hover:text-[#fccd03] transition-colors text-sm">Contact</a>
              <span className="text-gray-400 text-sm">&copy; 2024 AgriSakha</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AskQuestion;
