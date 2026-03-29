import React, { useEffect, useState, useRef } from 'react';
import {
  Mic,
  PiggyBank,
  Users,
  Volume2,
  LineChart,
  Users2,
  ArrowRight,
  Globe,
  ChevronRight,
  CheckCircle2,
  ChevronLeft,
  X
} from 'lucide-react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import AgriGenie from './components/AgriGenie';
import { useAuth } from './contexts/AuthContext';
import SignInModal from './components/SignInModal';
import SignUpModal from './components/SignUpModal';

function NavBar() {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  
  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSignOut = () => {
    signOut();
  };

  return (
    <>
      <nav className="fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-8">
            <span className="text-3xl font-extrabold text-[#fccd03] font-sans">
                  <img src="/logo.png" alt="AgriSakha Logo" className="h-42 w-48 inline-block align-middle" />
                </span>
              <div className="hidden md:flex space-x-8">
                <a href="#" className="text-white hover:text-[#fccd03] transition-colors">Home</a>
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('products');
                }} className="text-white hover:text-[#fccd03] transition-colors">Product</a>
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('features');
                }} className="text-white hover:text-[#fccd03] transition-colors">Features</a>
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('about');
                }} className="text-white hover:text-[#fccd03] transition-colors">About</a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-[#fccd03] font-medium">Welcome, {user?.name.split(' ')[0]}</span>
                  <button 
                    onClick={handleSignOut}
                    className="bg-[#fccd03] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#e3b902] transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setShowSignIn(true)}
                    className="text-white hover:text-[#fccd03] transition-colors px-4 py-2"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => setShowSignUp(true)} 
                    className="bg-[#fccd03] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#e3b902] transition-colors"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Sign In Modal */}
      {showSignIn && (
        <SignInModal
          onClose={() => setShowSignIn(false)}
          onSwitchToSignUp={() => {
            setShowSignIn(false);
            setShowSignUp(true);
          }}
        />
      )}

      {/* Sign Up Modal */}
      {showSignUp && (
        <SignUpModal
          onClose={() => setShowSignUp(false)}
          onSwitchToSignIn={() => {
            setShowSignUp(false);
            setShowSignIn(true);
          }}
        />
      )}
    </>
  );
}

function FeatureCard({ icon: Icon, title, description, path }: { icon: React.ElementType, title: string, description: string, path: string }) {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate(path)} className="cursor-pointer relative group opacity-0 translate-y-10 animate-fade-in-up">
      <div className="absolute inset-0 bg-gradient-to-r from-[#fccd03] to-[#e3b902] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-100 group-hover:border-transparent transition-all duration-300 group-hover:-translate-y-1 group-hover:p-10">
        <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:bg-[#fccd03] group-hover:w-20 group-hover:h-20 group-hover:mx-auto transition-all duration-500 ease-in-out">
          <Icon className="w-7 h-7 text-[#fccd03] group-hover:text-black group-hover:w-10 group-hover:h-10 transition-all duration-500 ease-in-out" />
        </div>
        <h3 className="text-2xl font-bold mb-3 text-gray-900">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function StatCard({ number, label }: { number: string, label: string }) {
  return (
    <div className="text-center opacity-0 translate-y-10 animate-fade-in-up">
      <div className="text-5xl font-bold text-[#fccd03] mb-2">{number}</div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}

function QuickLink({ href, children }: { href: string, children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="text-gray-400 hover:text-[#fccd03] transition-colors inline-flex items-center group"
    >
      {children}
      <ChevronRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
    </a>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState(0);
  // const [notSignedin, setNotSignedIn] = useState(true);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };

          // Save to session storage
          sessionStorage.setItem("userLocation", JSON.stringify(coords));

          console.log("Location saved in session:", coords);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
    }
  }, []);

  const features = [
    {
      icon: Mic,
      title: "Daily News Updates",
      description: "Stay informed with the latest financial news and market trends, delivered daily in your preferred language",
      path: "/rural-financial-news"
    },
    {
      icon: PiggyBank,
      title: "Smart Budgeting",
      description: "Track your expenses, set savings goals, and get AI-driven insights to manage your budget efficiently",
      path: "/budget-assistant"
    },
    {
      icon: Users,
      title: "Community",
      description: "Engage with financial experts individuals to discuss money management and investment strategies",
      path: "http://localhost:8080/"
    },
    {
      icon: LineChart,
      title: "Loan Support",
      description: "Get tailored loan recommendations, repayment strategies, and financial advice to make informed borrowing decisions",
      path: "/loan-assistant"
    },
    {
      icon: Globe,
      title: "Schemes Recommendation",
      description: "Discover government and private financial schemes suited to your needs, helping you maximize benefits and savings",
      path: "/loan-assistant"
    },
    {
      icon: Globe,
      title: "Agricultural Advice",
      description: "Get AI-powered agricultural guidance based on weather, crop, and region-specific data",
      path: "/agri-assistant"
    }
  ];

  const totalPages = Math.ceil(features.length / 3);

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in');
          entry.target.classList.remove('opacity-0', 'translate-y-10');
        }
      });
    }, {
      threshold: 0.1
    });

    document.querySelectorAll('.animate-fade-in-up').forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>

      <NavBar />

      <Routes>
        <Route path="/" element={ 
          <>
            {/* Hero Section */}
            <div className="relative overflow-hidden pt-20">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-[#fccd03]/10" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#fccd03]/20 rounded-full blur-3xl" />
              <div className="container mx-auto px-4 pt-24 pb-40">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="relative z-10 transition-all duration-700 ease-in-out transform hover:translate-x-4 hover:translate-y-[-8px] hover:scale-105 group opacity-0 translate-y-10 animate-fade-in-up">
                    <div className="inline-block px-4 py-2 bg-[#fccd03]/10 rounded-full text-[#fccd03] font-medium mb-6 group-hover:bg-white/10 group-hover:text-white transition-all duration-700 transform group-hover:scale-110">
                      AI-Powered Financial Assistant
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight leading-tight transition-all duration-700 group-hover:text-[#fccd03] transform group-hover:scale-110 group-hover:translate-x-2">
                      Learning about Agriculture has never been{' '}
                      <span className="text-[#fccd03] relative transition-all duration-700 group-hover:text-white">
                        easier
                        <svg className="absolute -bottom-2 left-0 w-full transform group-hover:scale-110" viewBox="0 0 124 12" fill="none">
                          <path d="M1 11C21.5 5.5 63.5 -1.49999 123 4.00001" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </span>
                    </h1>
                    <p className="text-xl text-gray-400 mb-12 leading-relaxed max-w-xl group-hover:text-white transition-all duration-700 transform group-hover:scale-110 group-hover:translate-x-2">
                      Experience the power of AI in managing your finances with personalized voice guidance
                      and regional language support.
                    </p>
                    <div className="flex flex-col sm:flex-row items-start gap-4 transform group-hover:translate-x-2 transition-all duration-700">
                      <button className="bg-[#fccd03] text-black px-8 py-4 rounded-xl font-semibold group-hover:bg-white group-hover:text-[#fccd03] transition-all duration-700 shadow-lg hover:shadow-xl shadow-[#fccd03]/20 flex items-center transform group-hover:scale-110">
                        Get Started
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </button>
                      <button className="px-8 py-4 rounded-xl font-semibold text-white group-hover:text-[#fccd03] transition-all duration-700 inline-flex items-center transform group-hover:scale-110">
                        Watch Demo
                        <div className="ml-2 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[#fccd03]/20 transition-all duration-700">
                          <Mic className="w-4 h-4" />
                        </div>
                      </button>
                    </div>
                    <div className="mt-12 pt-12 border-t border-white/10 transform group-hover:translate-x-2 transition-all duration-700">
                      <div className="grid grid-cols-3 gap-8">
                        <StatCard number="99" label="Languages Supported" />
                        <StatCard number="97%" label="Audio detection and translation Rate" />
                        <StatCard number="24/7" label="Support" />
                      </div>
                    </div>
                  </div>
                  <div className="relative hidden lg:block transition-all duration-500 ease-in-out hover:scale-110 hover:rotate-2 group opacity-0 translate-y-10 animate-fade-in-up">
                    <div className="h-[800px] w-[800px] relative z-10 bg-gradient-to-br from-black to-gray-900 rounded-2xl p-8 border border-white/10 transition-transform duration-500 hover:transform hover:scale-[1.02] hover:rotate-1">
                      <img
                        src="https://images.unsplash.com/photo-1607863680198-23d4b2565df0?auto=format&fit=crop&q=80"
                        alt="Financial App Interface"
                        className="w-full h-full object-cover rounded-xl shadow-2xl transition-transform duration-500 hover:scale-[1.05]"
                      />
                      <div className="absolute -bottom-6 -right-6 bg-[#fccd03] rounded-xl p-4 shadow-xl group-hover:bg-white transition-all duration-500 hover:scale-110">
                        <CheckCircle2 className="w-8 h-8 text-black group-hover:text-[#fccd03] transition-colors duration-500" />
                      </div>
                    </div>
                    <div className="flex justify-between flex-row mt-4 gap-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-full bg-[#fccd03] group-hover:bg-white flex items-center justify-center flex-shrink-0 transition-colors duration-500">
                          <Volume2 className="w-5 h-5 text-black group-hover:text-[#fccd03] transition-colors duration-500" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium group-hover:text-[#fccd03] transition-colors duration-500">Voice Assistant</h4>
                          <p className="text-gray-400 text-sm group-hover:text-white transition-colors duration-500">Get guidance in your language</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4 mx-8">
                        <div className="w-10 h-10 rounded-full bg-[#fccd03] group-hover:bg-white flex items-center justify-center flex-shrink-0 transition-colors duration-500">
                          <LineChart className="w-5 h-5 text-black group-hover:text-[#fccd03] transition-colors duration-500" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium group-hover:text-[#fccd03] transition-colors duration-500">Smart Analytics</h4>
                          <p className="text-gray-400 text-sm group-hover:text-white transition-colors duration-500">Track your financial growth</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Section */}
            <section id="products" className="relative py-24 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-black to-gray-900" />
              <div className="container mx-auto px-4 relative">
                <div className="text-center mb-16 opacity-0 translate-y-10 animate-fade-in-up">
                  <h2 className="text-4xl font-bold text-white mb-4">Discover Our Financial Solutions</h2>
                  <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Experience the power of AI-driven financial management tools designed specifically for rural users
                  </p>
                </div>
                <div className="relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-500 ease-in-out">
                    {features.slice(currentPage * 3, (currentPage * 3) + 3).map((feature, index) => (
                      <FeatureCard
                        key={index}
                        icon={feature.icon}
                        title={feature.title}
                        description={feature.description}
                        path={feature.path}
                      />
                    ))}
                  </div>
                  <div className="flex justify-center mt-8 space-x-4">
                    <button
                      onClick={prevPage}
                      className={`p-3 rounded-full bg-[#fccd03] text-black hover:bg-white transition-all duration-300 ${currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextPage}
                      className={`p-3 rounded-full bg-[#fccd03] text-black hover:bg-white transition-all duration-300 ${currentPage === totalPages - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={currentPage === totalPages - 1}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section id="features" className="container mx-auto px-4 py-24">
              <div className="relative overflow-hidden opacity-0 translate-y-10 animate-fade-in-up">
                <div className="absolute inset-0 bg-[#fccd03] opacity-10 blur-3xl animate-pulse" />
                <div className="relative bg-gradient-to-r from-black to-gray-900 rounded-3xl p-12 border border-white/10 hover:border-[#fccd03]/30 transition-colors duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="animate-slide-in-left">
                      <h2 className="text-4xl font-bold text-white mb-6 hover:text-[#fccd03] transition-colors duration-300">
                        Ready to Start Your Financial Journey?
                      </h2>
                      <p className="text-xl text-gray-400 mb-8 hover:text-white transition-colors duration-300">
                        Join thousands of users who are already benefiting from AgriSakha's AI-powered financial guidance
                      </p>
                      <button className="bg-[#fccd03] text-black px-8 py-4 rounded-xl font-semibold hover:bg-[#e3b902] transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(252,205,3,0.3)] hover:scale-105 inline-flex items-center group">
                        <span>Get Started Now</span>
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                      </button>
                    </div>
                    <div className="relative hidden lg:block animate-slide-in-right">
                      <img
                        src="https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&q=80"
                        alt="Financial Success"
                        className="rounded-xl shadow-2xl hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute -bottom-6 -right-6 bg-[#fccd03] rounded-xl p-4 shadow-xl hover:rotate-12 transition-transform duration-300 hover:scale-110">
                        <Users2 className="w-8 h-8 text-black animate-bounce" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer id="about" className="bg-black border-t border-white/10">
              <div className="container mx-auto px-4 py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                  <div className="opacity-0 translate-y-10 animate-fade-in-up">
                    <h3 className="text-white font-semibold text-lg mb-6">Quick Links</h3>
                    <ul className="space-y-3">
                      <li><QuickLink href="#">About</QuickLink></li>
                      <li><QuickLink href="#">Contact</QuickLink></li>
                      <li><QuickLink href="#">Privacy</QuickLink></li>
                      <li><QuickLink href="#">Terms</QuickLink></li>
                    </ul>
                  </div>
                  <div className="opacity-0 translate-y-10 animate-fade-in-up">
                    <h3 className="text-white font-semibold text-lg mb-6">Features</h3>
                    <ul className="space-y-3">
                      <li><QuickLink href="#">Voice Assistant</QuickLink></li>
                      <li><QuickLink href="#">Smart Budgeting</QuickLink></li>
                      <li><QuickLink href="#">Community</QuickLink></li>
                      <li><QuickLink href="#">Investments</QuickLink></li>
                      <li><QuickLink href="#">Agricultural Assistant</QuickLink></li>
                    </ul>
                  </div>
                  <div className="opacity-0 translate-y-10 animate-fade-in-up">
                    <h3 className="text-white font-semibold text-lg mb-6">Resources</h3>
                    <ul className="space-y-3">
                      <li><QuickLink href="#">Blog</QuickLink></li>
                      <li><QuickLink href="#">Guides</QuickLink></li>
                      <li><QuickLink href="#">Support</QuickLink></li>
                      <li><QuickLink href="#">FAQ</QuickLink></li>
                    </ul>
                  </div>
                  <div className="opacity-0 translate-y-10 animate-fade-in-up">
                    <h3 className="text-white font-semibold text-lg mb-6">Language</h3>
                    <button className="inline-flex items-center space-x-3 bg-white/5 px-5 py-3 rounded-xl hover:bg-white/10 transition-colors border border-white/10 text-white">
                      <Globe className="w-5 h-5 text-[#fccd03]" />
                      <span>Select Language</span>
                    </button>
                  </div>
                </div>
                <div className="mt-12 pt-8 border-t border-white/10 text-center opacity-0 translate-y-10 animate-fade-in-up">
                  <p className="text-gray-500">&copy; 2024 AgriSakha All rights reserved.</p>
                </div>
              </div>
            </footer>
          </>
        } />
        <Route path="/agri-assistant" element={<AgriGenie />} />
      </Routes>
    </div>
  );
}

export default App;