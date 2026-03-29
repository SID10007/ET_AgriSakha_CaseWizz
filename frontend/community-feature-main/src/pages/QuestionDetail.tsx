
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TranslationButton from '@/components/TranslationButton';
import { Card, CardContent } from '@/components/ui/card';
import { getMockQuestions, getMockAnswers, translateContent } from '@/services/geminiService';
import { toast } from "sonner";

const QuestionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [question, setQuestion] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [newAnswer, setNewAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState('English');

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      // Get mock questions
      const mockQuestions = getMockQuestions();

      // Get user-submitted questions from localStorage
      const userQuestions = JSON.parse(localStorage.getItem('userQuestions') || '[]');

      // Combine both sources of questions
      const allQuestions = [...userQuestions, ...mockQuestions];

      // Find the specific question by ID
      const questionData = allQuestions.find(q => q.id === id);

      if (questionData) {
        setQuestion(questionData);

        // Only fetch mock answers for mock questions, not for user-submitted questions
        const isUserQuestion = userQuestions.some(q => q.id === id);

        if (!isUserQuestion) {
          // This is a mock question, so get its answers
          const answersData = getMockAnswers(id || '');
          setAnswers(answersData);
        } else {
          // This is a user-submitted question, it has no answers yet
          setAnswers([]);
        }
      }

      setIsLoading(false);
    }, 800);
  }, [id]);

  const handleSubmitAnswer = () => {
    if (!newAnswer.trim()) return;

    setIsSubmitting(true);

    // Simulate submission delay
    setTimeout(() => {
      const newAnswerObj = {
        id: `new-${Date.now()}`,
        content: newAnswer,
        author: {
          name: "You",
          avatar: "",
        },
        createdAt: "Just now",
        isAccepted: false,
      };

      setAnswers([...answers, newAnswerObj]);
      setNewAnswer('');
      setIsSubmitting(false);
      toast.success("Your answer has been posted!");
    }, 1000);
  };

  const handleTranslate = async (language: string) => {
    setCurrentLanguage(language);

    if (!question) return;

    if (language === 'English') {
      // Reload original data
      const allQuestions = [...JSON.parse(localStorage.getItem('userQuestions') || '[]'), ...getMockQuestions()];
      const questionData = allQuestions.find(q => q.id === id);
      if (questionData) setQuestion(questionData);

      // Only reload answers for mock questions
      const isUserQuestion = JSON.parse(localStorage.getItem('userQuestions') || '[]').some(q => q.id === id);
      if (!isUserQuestion) {
        const answersData = getMockAnswers(id || '');
        setAnswers(answersData);
      }
      return;
    }

    setIsLoading(true);

    // Translate question
    const translatedTitle = await translateContent(question.title, language);
    const translatedDesc = await translateContent(question.description, language);

    setQuestion({
      ...question,
      title: translatedTitle,
      description: translatedDesc,
    });

    // Translate answers if there are any
    if (answers.length > 0) {
      const translatedAnswers = await Promise.all(
        answers.map(async (answer) => {
          const translatedContent = await translateContent(answer.content, language);
          return {
            ...answer,
            content: translatedContent,
          };
        })
      );

      setAnswers(translatedAnswers);
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="h-8 bg-muted rounded w-40 animate-pulse mb-4"></div>
            <div className="h-10 bg-muted rounded w-full animate-pulse mb-4"></div>
            <div className="h-40 bg-muted rounded w-full animate-pulse mb-8"></div>
            <div className="h-40 bg-muted rounded w-full animate-pulse"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Question not found</h1>
            <Link to="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Questions
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col page-transition bg-gradient-to-b from-black to-gray-900 border-r border-white/10">
      {/* <Header /> */}
      <nav className="fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-8">
              <span className="text-3xl font-extrabold text-[#fccd03] font-sans">
                AgriSakha
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
      <div className='flex flex-1 justify-center items-center'>
        <div className="fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-black to-gray-900 border-r border-white/10">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-[#fccd03] mb-6">Menu</h2>
            <nav className="space-y-4">
              <a
                href="http://localhost:5173/"
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
                href="http://localhost:5173/rural-assistant"
                className="flex items-center ttext-gray-400  hover:text-white transition-colors duration-300"
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
                href="http://localhost:5173/investment-assistant"
                className="flex items-center text-gray-400 hover:text-white transition-colors duration-300"
              >
                <span className="mr-3">📈</span>
                Investment Assistant
              </a>
              <a
                href="http://localhost:8080/"
                className="flex items-center text-[#fccd03] font-bold hover:text-white transition-colors duration-300"
              >
                <span className="mr-3">💬</span>
                Community
              </a>
            </nav>
          </div>
        </div>
        <main className="flex-grow container mx-auto px-4 py-8 mt-14">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <Link to="/">
                <Button variant="ghost" className="btn-transition text-[#fccd03] font-extrabold text-lg">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Questions
                </Button>
              </Link>

              <TranslationButton onTranslate={handleTranslate} />
            </div>

            <div className="mb-8 animate-fade-in">
              <div className="flex flex-wrap gap-2 mb-3">
                {question.tags.map((tag: string) => (
                  <Badge className='bg-green-900 text-white' key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <h1 className="text-3xl font-bold mb-4 text-[#fccd03]">{question.title}</h1>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={question.author.avatar} alt={question.author.name} />
                  <AvatarFallback>{question.author.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className='text-white text-semibold'>{question.author.name}</span>
                <span>•</span>
                <span className='text-[#fccd03]'>{question.createdAt}</span>
              </div>

              <Card className="mb-8">
                <CardContent className="p-6">
                  <p className="whitespace-pre-line">{question.description}</p>
                </CardContent>
              </Card>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center text-[#fccd03]">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Answers ({answers.length})
                  </h2>
                </div>

                {answers.length > 0 ? (
                  <div className="space-y-6">
                    {answers.map((answer) => (
                      <Card key={answer.id} className={`animate-fade-in ${answer.isAccepted ? 'border-primary/30' : ''}`}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-3 mb-4">
                            <Avatar>
                              <AvatarImage src={answer.author.avatar} alt={answer.author.name} />
                              <AvatarFallback>{answer.author.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium">{answer.author.name}</h3>
                              <p className="text-sm text-muted-foreground">{answer.createdAt}</p>
                            </div>
                            {answer.isAccepted && (
                              <Badge variant="outline" className="ml-auto border-primary/50 text-primary">
                                Accepted Answer
                              </Badge>
                            )}
                          </div>
                          <p className="whitespace-pre-line">{answer.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="animate-fade-in">
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">No answers yet. Be the first to answer!</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="animate-fade-in">
                <h2 className="text-xl font-semibold mb-4">Your Answer</h2>

                <Textarea
                  placeholder="Write your answer here..."
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  rows={6}
                  className="mb-4"
                />

                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!newAnswer.trim() || isSubmitting}
                  className="btn-ripple"
                >
                  {isSubmitting ? "Posting..." : "Post Your Answer"}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default QuestionDetail;
