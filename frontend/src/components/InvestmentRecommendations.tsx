import { TreeDeciduous } from 'lucide-react';
import React, { useState, useRef } from 'react';

interface InvestmentSuggestion {
  "Investment Type": string;
  "Expected Returns": string;
  "Min Investment": string;
  "Max Investment": string;
  "Liquidity": string;
  "Details": string;
}

interface UserInput {
  risk_level: string;
  income: string;
  investment_period: string;
}

// Add this interface before the component
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  error: any;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionEvent) => void;
}

const InvestmentRecommendations: React.FC = () => {
  // State for investment section
  const [transcription, setTranscription] = useState<string>('');
  const [suggestions, setSuggestions] = useState<InvestmentSuggestion[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [userQuery, setUserQuery] = useState<string>('');
  
  // State for government scheme section
  const [schemeVoiceInput, setSchemeVoiceInput] = useState<string>('');
  const [schemeStatus, setSchemeStatus] = useState<string>('');
  const [schemeResponse, setSchemeResponse] = useState<string>('');
  
  // Form state
  const [riskLevel, setRiskLevel] = useState<string>('level');
  const [income, setIncome] = useState<string>('');
  const [investmentPeriod, setInvestmentPeriod] = useState<string>('');
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const schemeRecognitionRef = useRef<SpeechRecognition | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Function to start recording
  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.start();
        setIsRecording(true);

        mediaRecorder.addEventListener("dataavailable", event => {
          audioChunksRef.current.push(event.data);
        });

        mediaRecorder.addEventListener("stop", () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          sendAudio(audioBlob);
          setIsRecording(false);
        });
      })
      .catch(error => console.error("Error accessing microphone:", error));
  };

  // Function to stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Function to send audio to server
  const sendAudio = (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "query_audio.webm");

    fetch("http://localhost:5000/micro_submit_audio", { method: "POST", body: formData })
      .then(response => response.json())
      .then(data => {
        setTranscription(data.transcription);
        getInvestmentSuggestions(data.transcription);
      })
      .catch(error => console.error("Error:", error));
  };

  // Function to submit user input
  const submitUserInput = () => {
    const userInput: UserInput = {
      risk_level: riskLevel,
      income: income,
      investment_period: investmentPeriod
    };

    fetch("http://localhost:5000/micro_get_user_input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userInput)
    })
    .then(response => response.json())
    .then(data => console.log("User preferences saved:", data))
    .catch(error => console.error("Error:", error));
  };

  // Function to get investment suggestions
  const getInvestmentSuggestions = (transcriptionText: string) => {
    const requestData = {
      risk_level: riskLevel,
      income: income,
      investment_period: investmentPeriod,
      transcription: transcriptionText
    };

    fetch("http://localhost:5000/get_investment_recommendation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
      setDetectedLanguage(data.language);
      setUserQuery(data.user_query);
      setSuggestions(data.investment_suggestions);
    })
    .catch(error => console.error("Error fetching investment suggestions:", error));
  };

  // Function to start speech recognition for schemes
  const startSchemeRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser does not support speech recognition. Try using Google Chrome.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    schemeRecognitionRef.current = recognition;
    recognition.lang = "en";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      setSchemeVoiceInput(transcript);
    };

    recognition.onerror = function(event) {
      console.error("Speech Recognition Error:", event.error);
      alert("Error: " + event.error);
    };

    recognition.start();
    setSchemeStatus("🎤 Listening...");
  };

  // Function to stop speech recognition
  const stopSchemeRecording = () => {
    if (schemeRecognitionRef.current) {
      schemeRecognitionRef.current.stop();
      setSchemeStatus("🛑 Stopped.");
    }
  };

  // Function to get government scheme recommendations
  const getGovernmentScheme = () => {
    fetch("http://localhost:5000/micro_government_schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voice_input: schemeVoiceInput })
    })
    .then(response => response.json())
    .then(data => {
      setSchemeResponse(data.response);
      speakScheme(data.response, data.language);
    })
    .catch(error => console.error("Error fetching government schemes:", error));
  };

  // Function to speak investment details
  const speak = (text: string, language: string) => {
    const speech = new SpeechSynthesisUtterance();
    speech.text = text;
    speech.lang = language;
    window.speechSynthesis.speak(speech);
  };

  // Function to speak scheme details
  const speakScheme = (text: string, language: string) => {
    const speech = new SpeechSynthesisUtterance();
    speech.text = text;
    speech.lang = language;
    window.speechSynthesis.speak(speech);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-black via-gray-900 to-[#fccd03]/30">

      <header className="fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-8">
              <span className="text-3xl font-extrabold text-[#fccd03] font-sans">AgriSakha</span>
              <div className="hidden md:flex space-x-8">
                <a href="#" className="text-white hover:text-[#fccd03] transition-colors font-medium">Home</a>
                <a href="#" className="text-white hover:text-[#fccd03] transition-colors font-medium">Product</a>
                <a href="#" className="text-white hover:text-[#fccd03] transition-colors font-medium">Features</a>
                <a href="#" className="text-white hover:text-[#fccd03] transition-colors font-medium">About</a>
              </div>
            </div>
            {/* <div className="flex items-center space-x-4">
              <button className="text-white hover:text-[#fccd03] transition-colors px-6 py-2 font-medium">Sign In</button>
            </div> */}
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-20">
        {/* Sidebar */}
        <div className="fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-black to-gray-900 border-r border-white/10">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-[#fccd03] mb-6">Menu</h2>
            <nav className="space-y-4">
              <a href="/" className="flex items-center text-gray-400 hover:text-white transition-colors duration-300">
                <span className="mr-3">🏠</span>
                Home
              </a>
              <a href="/rural-financial-news" className="flex items-center text-gray-400 hover:text-white transition-colors duration-300">
                <span className="mr-3">📰</span>
                Financial News
              </a>
              <a href="/budget-assistant" className="flex items-center text-gray-400 hover:text-white transition-colors duration-300">
                <span className="mr-3">💰</span>
                Budget Assistant
              </a>
              <a href="/agri-assistant" className="flex items-center text-gray-400 hover:text-white transition-colors duration-300">
                <span className="mr-3"><TreeDeciduous className="w-5 h-5" /></span>
                Agricultural Advice
              </a>
              <a href="/loan-assistant" className="flex items-center text-gray-400 hover:text-white transition-colors duration-300">
                <span className="mr-3">💳</span>
                Loan Assistant
              </a>
              <a href="/investment-assistant" className="flex items-center text-gray-400 hover:text-white transition-colors duration-300">
                <span className="mr-3">📈</span>
                Investment Assistant
              </a>
              <a
                href="http://localhost:8080/"
                className="flex items-center text-gray-400 hover:text-white transition-colors duration-300"
              >
                <span className="mr-3">💬</span>
                Community
              </a>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-8 ml-64"> {/* Added ml-64 to offset the sidebar width */}
          <h2 className="text-2xl font-bold text-[#fccd03] mb-8">Micro Investment & Government Scheme Recommendations</h2>

          <div className="grid grid-cols-2 gap-8">
            {/* Micro Investment Section */}
            <section className="mb-12">
              <h3 className="text-xl font-semibold text-white mb-6">Micro Investment Suggestions</h3>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  submitUserInput();
                }}
                className="bg-black/50 backdrop-blur-md p-6 rounded-lg border border-white/10"
              >
                <div className="space-y-4">
                  <div>
                    <label htmlFor="risk" className="block text-sm text-gray-300 mb-2">Risk Level:</label>
                    <div className="grid grid-cols-3 gap-4 w-full">
                      <div 
                        onClick={() => setRiskLevel('low')}
                        className={`flex flex-col items-center justify-center h-40 p-6 rounded-lg cursor-pointer border ${riskLevel === 'low' ? 'bg-[#fccd03] text-black border-[#fccd03]' : 'bg-black/30 text-white border-white/10'} hover:bg-[#fccd03] hover:text-black hover:border-[#fccd03] transition-all`}
                      >
                        <span className="text-3xl mb-3">🛡️</span>
                        <span className="font-medium">Low Risk</span>
                        <span className="text-sm mt-2 opacity-75">Safe & Steady</span>
                      </div>
                      <div
                        onClick={() => setRiskLevel('medium')} 
                        className={`flex flex-col items-center justify-center h-40 p-6 rounded-lg cursor-pointer border ${riskLevel === 'medium' ? 'bg-[#fccd03] text-black border-[#fccd03]' : 'bg-black/30 text-white border-white/10'} hover:bg-[#fccd03] hover:text-black hover:border-[#fccd03] transition-all`}
                      >
                        <span className="text-3xl mb-3">⚖️</span>
                        <span className="font-medium">Medium Risk</span>
                        <span className="text-sm mt-2 opacity-75">Balanced Growth</span>
                      </div>
                      <div
                        onClick={() => setRiskLevel('high')}
                        className={`flex flex-col items-center justify-center h-40 p-6 rounded-lg cursor-pointer border ${riskLevel === 'high' ? 'bg-[#fccd03] text-black border-[#fccd03]' : 'bg-black/30 text-white border-white/10'} hover:bg-[#fccd03] hover:text-black hover:border-[#fccd03] transition-all`}
                      >
                        <span className="text-3xl mb-3">🚀</span>
                        <span className="font-medium">High Risk</span>
                        <span className="text-sm mt-2 opacity-75">Maximum Returns</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col flex-1">
                      <label 
                        htmlFor="income" 
                        className="text-lg font-semibold text-[#fccd03] mb-2 tracking-wide"
                      >
                        Investment Income (INR)
                      </label>
                      <input 
                        type="number" 
                        id="income" 
                        required 
                        value={income}
                        onChange={(e) => setIncome(e.target.value)}
                        className="w-full bg-black/30 text-white border border-white/10 rounded-lg p-3 focus:outline-none focus:border-[#fccd03] focus:ring-2 focus:ring-[#fccd03]/50 transition-all"
                        placeholder="Enter your monthly income"
                      />
                    </div>

                    <div className="flex flex-col flex-1">
                      <label 
                        htmlFor="investment_period" 
                        className="text-lg font-semibold text-[#fccd03] mb-2 tracking-wide"
                      >
                        Investment Period (years)
                      </label>
                      <input 
                        type="number" 
                        id="investment_period" 
                        required 
                        value={investmentPeriod}
                        onChange={(e) => setInvestmentPeriod(e.target.value)}
                        className="w-full bg-black/30 text-white border border-white/10 rounded-lg p-3 focus:outline-none focus:border-[#fccd03] focus:ring-2 focus:ring-[#fccd03]/50 transition-all"
                        placeholder="Enter investment duration"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {!isRecording ? (
                      <button 
                        type="button"
                        onClick={startRecording}
                        className="flex-1 bg-gradient-to-r from-[#fccd03] to-amber-500 text-black font-medium py-3 px-6 rounded-lg hover:from-amber-500 hover:to-[#fccd03] transition-all transform hover:scale-105 hover:shadow-[0_0_15px_rgba(252,205,3,0.5)] duration-300"
                      >
                        🎤 Start Recording
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={stopRecording}
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium py-3 px-6 rounded-lg hover:from-red-600 hover:to-red-500 transition-all transform hover:scale-105 shadow-lg"
                      >
                        🛑 Stop Recording
                      </button>
                    )}

                    <button 
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-[#fccd03] to-amber-500 text-black font-medium py-3 px-6 rounded-lg hover:from-amber-500 hover:to-[#fccd03] transition-all transform hover:scale-105 hover:shadow-[0_0_15px_rgba(252,205,3,0.5)] duration-300"
                    >
                      Save Preferences
                    </button>
                  </div>

                  <p className="text-white mt-4">{transcription}</p>
                </div>
              </form>

              <button 
                onClick={() => getInvestmentSuggestions(transcription)}
                className="mt-6 w-full bg-gradient-to-r from-[#fccd03] to-amber-500 text-black font-medium py-3 px-6 rounded-lg hover:from-amber-500 hover:to-[#fccd03] transition-all transform hover:scale-105 shadow-lg"
              >
                Get Investment Recommendations
              </button>
              
              <div className="mt-8">
                {detectedLanguage && <p className="text-gray-300"><strong>Detected Language:</strong> {detectedLanguage}</p>}
                {userQuery && <p className="text-gray-300"><strong>Your Query:</strong> {userQuery}</p>}
                <ul className="space-y-4 mt-4">
                  {suggestions.map((item, index) => (
                    <li key={index} className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-lg">
                      <strong className="text-[#fccd03]">{item["Investment Type"]}</strong> 
                      <div className="text-gray-300 mt-2">
                        <p>Expected Returns: {item["Expected Returns"]}</p>
                        <p>Min Investment: {item["Min Investment"]}</p>
                        <p>Max Investment: {item["Max Investment"]}</p>
                        <p>Liquidity: {item["Liquidity"]}</p>
                        <p>Details: {item["Details"]}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => speak(`${item["Investment Type"]}: ${item["Details"]}`, detectedLanguage)}
                          className="mt-2 bg-gradient-to-r from-[#fccd03] to-amber-500 text-black px-4 py-2 rounded-lg hover:from-amber-500 hover:to-[#fccd03] transition-all transform hover:scale-105 shadow-lg"
                        >
                          🔊 Play
                        </button>
                        <button
                          onClick={() => window.speechSynthesis.cancel()}
                          className="mt-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-500 transition-all transform hover:scale-105 shadow-lg"
                        >
                          🛑 Stop
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Government Scheme Section */}
            <section className="mb-12">
              <h3 className="text-xl font-semibold text-white mb-6">Government Scheme Recommendations</h3>
              <div className="bg-black/50 backdrop-blur-md p-6 rounded-lg border border-white/10">
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <button 
                      onClick={startSchemeRecording}
                      className="flex-1 bg-gradient-to-r from-[#fccd03] to-amber-500 text-black font-medium py-3 px-6 rounded-lg hover:from-amber-500 hover:to-[#fccd03] transition-all transform hover:scale-105 shadow-lg"
                    >
                      🎤 Start Recording
                    </button>
                    
                    <button 
                      onClick={stopSchemeRecording}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium py-3 px-6 rounded-lg hover:from-red-600 hover:to-red-500 transition-all transform hover:scale-105 shadow-lg"
                    >
                      🛑 Stop Recording
                    </button>
                  </div>
                  
                  <p className="text-white mt-4">{schemeStatus}</p>
                  {schemeVoiceInput && <p className="text-gray-300">You said: {schemeVoiceInput}</p>}
                  
                  <button 
                    onClick={getGovernmentScheme}
                    className="w-full bg-gradient-to-r from-[#fccd03] to-amber-500 text-black font-medium py-3 px-6 rounded-lg hover:from-amber-500 hover:to-[#fccd03] transition-all transform hover:scale-105 shadow-lg"
                  >
                    Get Scheme Recommendation
                  </button>
                  
                  {schemeResponse && (
                    <div className="mt-6 bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-lg">
                      <p className="text-white"><strong>Response:</strong> {schemeResponse}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <footer className="bg-black/80 backdrop-blur-md border-t border-white/10 py-4 text-center text-gray-400">
        <p>&copy; 2025 AgriSakha Investment Guide | All Rights Reserved</p>
      </footer>
    </div>
  );
};

// Update the global declaration
declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognition;
    };
  }
}

export default InvestmentRecommendations;