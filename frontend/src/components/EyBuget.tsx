import { TrendingDown, TrendingUp, DollarSign, Clock, BarChart3, PieChart, Mic } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import Layout from "./Layout";
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SearchResult {
  results: string[];
}

interface BudgetAdviceData {
  query: string;
  advice: string;
}

interface TrackerData {
  message: string;
  expense_pie: string;
  expense_bar: string;
  earning_pie: string;
  earning_bar: string;
  total_expenditure: number;
  total_earnings: number;
  chat_history_expenses: string[];
  chat_history_earnings: string[];
  expense_chart_data: ChartDataPoint[];
  earning_chart_data: ChartDataPoint[];
  transaction_history_expenses: TransactionHistory[];
  transaction_history_earnings: TransactionHistory[];
}

interface ChartDataPoint {
  name: string;
  value: number;
  category: string;
  sub_category: string;
}

interface TransactionHistory {
  description: string;
  amount: number;
  category: string;
  timestamp: string;
  type: 'expense' | 'earning';
}

interface TransactionHistory {
  description: string;
  amount: number;
  category: string;
  timestamp: string;
  type: 'expense' | 'earning';
}

const ExpenseEarningsTracker: React.FC = () => {
  // State for recording status
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [activeActionType, setActiveActionType] = useState<string | null>(null);

  // State for transaction data
  const [message, setMessage] = useState<string>("");
  const [expensePie, setExpensePie] = useState<string>("");
  const [expenseBar, setExpenseBar] = useState<string>("");
  const [earningPie, setEarningPie] = useState<string>("");
  const [earningBar, setEarningBar] = useState<string>("");
  const [totalExpenditure, setTotalExpenditure] = useState<number>(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);

  // State for chat history
  const [expenseHistory, setExpenseHistory] = useState<TransactionHistory[]>([]);
  const [earningHistory, setEarningHistory] = useState<TransactionHistory[]>([]);
  const [expenseSearchResults, setExpenseSearchResults] = useState<TransactionHistory[]>([]);
  const [earningSearchResults, setEarningSearchResults] = useState<TransactionHistory[]>([]);

  // State for budget advice
  const [budgetQuery, setBudgetQuery] = useState<string>(
    "Ask something about managing your budget..."
  );
  const [budgetAdvice, setBudgetAdvice] = useState<string>(
    "AI-generated financial guidance will appear here."
  );

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [queryProcessing, setQueryProcessing] = useState<boolean>(false);
  
  // Refs for media recorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Chart data states
  const [expenseChartData, setExpenseChartData] = useState<any[]>([]);
  const [earningChartData, setEarningChartData] = useState<any[]>([]);
  const [expenseBarData, setExpenseBarData] = useState<any[]>([]);
  const [earningBarData, setEarningBarData] = useState<any[]>([]);

  // Colors for charts
  const expenseColors = ['#FF5A5F', '#FF9A52', '#FFC400', '#00A699'];
  const earningColors = ['#2E8B57', '#32CD32', '#90EE90'];

  // Load initial data when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await fetch('http://localhost:5000/budget');
        const data = await response.json();
        
        setTotalExpenditure(data.total_expenditure || 0);
        setTotalEarnings(data.total_earnings || 0);
        setExpenseHistory(data.transaction_history_expenses || []);
        setEarningHistory(data.transaction_history_earnings || []);
        setExpenseChartData(data.expense_chart_data || []);
        setEarningChartData(data.earning_chart_data || []);
        setExpenseBarData(data.expense_chart_data || []);
        setEarningBarData(data.earning_chart_data || []);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  const toggleRecording = async (action: string) => {
    if (!isRecording) {
      await startRecording(action);
    } else {
      stopRecording();
    }
  };

  const startRecording = async (action: string) => {
    try {
      setIsRecording(true);
      setActiveActionType(action);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        sendAudioToServer(audioBlob, action);
      };

      mediaRecorder.start();
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();

      // Stop all tracks from the stream
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }
      setQueryProcessing(true);
      setIsRecording(false);
      setActiveActionType(null);
    }
  };

  const sendAudioToServer = (audioBlob: Blob, action: string) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "voice_input.wav");

    let endpoint = "";

    if (action === "input") {
      endpoint = "http://localhost:5000/budget_upload_audio";
    } else if (action === "budget") {
      endpoint = "http://localhost:5000/get_budget_advice";
    } else {
      endpoint = `http://localhost:5000/budget_search_chat?type=${action}`;
    }

    fetch(endpoint, {
      method: "POST",
      body: formData,
      mode: "cors",
    })
      .then((response) => response.json())
      .then((data) => {
        if (action === "input") {
          const trackerData = data as TrackerData;
          setMessage(trackerData.message);
          setExpensePie(trackerData.expense_pie);
          setExpenseBar(trackerData.expense_bar);
          setEarningPie(trackerData.earning_pie);
          setEarningBar(trackerData.earning_bar);
          setTotalExpenditure(trackerData.total_expenditure);
          setTotalEarnings(trackerData.total_earnings);
          
          // Use actual data from backend instead of generating random data
          setExpenseHistory(trackerData.transaction_history_expenses);
          setEarningHistory(trackerData.transaction_history_earnings);
          
          // Update chart data with actual backend data
          setExpenseChartData(trackerData.expense_chart_data);
          setEarningChartData(trackerData.earning_chart_data);
          setExpenseBarData(trackerData.expense_chart_data);
          setEarningBarData(trackerData.earning_chart_data);
          
          setQueryProcessing(false);
        } else if (action === "budget") {
          setQueryProcessing(false);
          const budgetData = data as BudgetAdviceData;
          setBudgetQuery(`Your Query: ${budgetData.query}`);
          setBudgetAdvice(`AI Advice: ${budgetData.advice}`);
        } else {
          const searchData = data as SearchResult;
          setQueryProcessing(false);
          if (action === "expense") {
            // For search results, we'll use the existing expense history that matches the search
            const searchResults = expenseHistory.filter(entry => 
              searchData.results.some(result => 
                entry.description.toLowerCase().includes(result.toLowerCase())
              )
            );
            setExpenseSearchResults(searchResults);
          } else if (action === "earning") {
            // For search results, we'll use the existing earning history that matches the search
            const searchResults = earningHistory.filter(entry => 
              searchData.results.some(result => 
                entry.description.toLowerCase().includes(result.toLowerCase())
              )
            );
            setEarningSearchResults(searchResults);
          }
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        setQueryProcessing(false);
      });
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimeAgo = (timestamp: string) => {
    return timestamp;
  };

  const netProfit = totalEarnings - totalExpenditure;



  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-600">
          <p className="text-white font-semibold">{`${label}: ${formatCurrency(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Layout activePage="budget-assistant">
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-yellow-400 mb-2">Financial Dashboard</h1>
              <p className="text-gray-300">Track your agricultural expenses and earnings</p>
            </div>
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-3 rounded-xl shadow-lg border border-gray-600/50">
              <div className="flex items-center space-x-3">
                  <button
                  className={`group flex items-center justify-center w-16 h-16 ${
                      isRecording
                      ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                      : "bg-gradient-to-r from-yellow-400 to-yellow-400 hover:from-yellow-600 hover:to-orange-600"
                  } text-white rounded-full cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg`}
                    onClick={() => toggleRecording("input")}
                  >
                  <Mic className="text-black w-8 h-8" />
                  </button>
                <div className="flex-1">
                  <p className="text-gray-300 text-sm">
                    {message || "Record your query"}
                  </p>
                  {queryProcessing && (
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-yellow-400 text-xs">Processing...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3x3 Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Top Row - Summary Cards */}
            
            {/* Total Expenditure Card */}
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-xl shadow-lg border border-gray-600/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-red-400 text-sm font-medium uppercase tracking-wide">TOTAL EXPENDITURE</h3>
                <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-red-400">{formatCurrency(totalExpenditure)}</span>
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
                </div>

            {/* Total Earnings Card */}
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-xl shadow-lg border border-gray-600/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-green-400 text-sm font-medium uppercase tracking-wide">TOTAL EARNINGS</h3>
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-green-400">{formatCurrency(totalEarnings)}</span>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
                  </div>

            {/* Net Profit/Loss Card */}
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-xl shadow-lg border border-gray-600/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-medium uppercase tracking-wide ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>NET PROFIT/LOSS</h3>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${netProfit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <DollarSign className={`w-4 h-4 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(Math.abs(netProfit))}
                </span>
                <div className="text-center">
                  <div className={`text-sm font-medium ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {netProfit >= 0 ? 'Profit' : 'Loss'}
                  </div>
                  {netProfit >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-400 mx-auto" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400 mx-auto" />
                  )}
                </div>
              </div>
            </div>

            {/* Middle Row - Expenditure Details */}
            
            {/* Expenditure Breakdown */}
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-xl shadow-lg border border-gray-600/50">
              <div className="flex items-center mb-4">
                <Clock className="w-5 h-5 text-yellow-400 mr-2" />
                <h3 className="text-yellow-400 font-semibold">Expenditure Breakdown</h3>
              </div>
              {expenseChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={expenseChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expenseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={expenseColors[index % expenseColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-48 bg-gray-700/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-300 text-sm">No data available</p>
                  </div>
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {expenseChartData.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded mr-2" 
                      style={{ backgroundColor: expenseColors[index % expenseColors.length] }}
                    ></div>
                    <span className="text-gray-300">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Wise Spending */}
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-xl shadow-lg border border-gray-600/50">
              <div className="flex items-center mb-8">
                <BarChart3 className="w-5 h-5 text-yellow-400 mr-2" />
                <h3 className="text-yellow-400 font-semibold">Category Wise Spending</h3>
              </div>
              {expenseBarData.length > 0 ? (
                <ResponsiveContainer width="90%" height={300}>
                  <BarChart data={expenseBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-48 bg-gray-700/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-300 text-sm">No data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Expense History */}
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-xl shadow-lg border border-gray-600/50">
              <div className="flex items-center mb-4">
                <Clock className="w-5 h-5 text-yellow-400 mr-2" />
                <h3 className="text-yellow-400 font-semibold">Expense History</h3>
          </div>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full bg-gray-700/30 border border-gray-600/50 rounded-lg px-4 py-2 text-white placeholder-gray-400 text-sm"
                />
                <button
                  onClick={() => toggleRecording("expense")}
                  className="absolute right-3 top-2.5 text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 max-h-[16rem] overflow-y-auto">
                {[...expenseHistory, ...expenseSearchResults].map((entry, index) => (
                  <div key={index} className="bg-gray-700/30 p-3 rounded-lg border border-gray-600/30">
                    <p className="text-white text-sm mb-1">{entry.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400 font-bold text-lg">{formatCurrency(entry.amount)}</span>
                      <div className="flex items-center text-xs text-gray-300">
                        <span className="bg-yellow-500/20 px-2 py-1 rounded mr-2">{entry.category}</span>
                        <span>{formatTimeAgo(entry.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {expenseHistory.length === 0 && expenseSearchResults.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-300 text-sm">No expense history available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row - Earnings Details */}
            
            {/* Earnings Breakdown */}
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-xl shadow-lg border border-gray-600/50">
              <div className="flex items-center mb-4">
                <Clock className="w-5 h-5 text-yellow-400 mr-2" />
                <h3 className="text-yellow-400 font-semibold">Earnings Breakdown</h3>
              </div>
              {earningChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={earningChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {earningChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={earningColors[index % earningColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-48 bg-gray-700/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-300 text-sm">No data available</p>
                  </div>
                </div>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                {earningChartData.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded mr-2" 
                      style={{ backgroundColor: earningColors[index % earningColors.length] }}
                    ></div>
                    <span className="text-gray-300">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Wise Earnings */}
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-xl shadow-lg border border-gray-600/50">
              <div className="flex items-center mb-8">
                <BarChart3 className="w-5 h-5 text-yellow-400 mr-2" />
                <h3 className="text-yellow-400 font-semibold">Category Wise Earnings</h3>
              </div>
              {earningBarData.length > 0 ? (
                <ResponsiveContainer width="90%" height={300}>
                  <BarChart data={earningBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-48 bg-gray-700/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-300 text-sm">No data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Earnings History */}
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-xl shadow-lg border border-gray-600/50">
              <div className="flex items-center mb-4">
                <Clock className="w-5 h-5 text-yellow-400 mr-2" />
                <h3 className="text-yellow-400 font-semibold">Earnings History</h3>
              </div>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full bg-gray-700/30 border border-gray-600/50 rounded-lg px-4 py-2 text-white placeholder-gray-400 text-sm"
                />
                <button
                  onClick={() => toggleRecording("earning")}
                  className="absolute right-3 top-2.5 text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 max-h-[16rem] overflow-y-auto">
                {[...earningHistory, ...earningSearchResults].map((entry, index) => (
                  <div key={index} className="bg-gray-700/30 p-3 rounded-lg border border-gray-600/30">
                    <p className="text-white text-sm mb-1">{entry.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400 font-bold text-lg">{formatCurrency(entry.amount)}</span>
                      <div className="flex items-center text-xs text-gray-300">
                        <span className="bg-yellow-500/20 px-2 py-1 rounded mr-2">{entry.category}</span>
                        <span>{formatTimeAgo(entry.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {earningHistory.length === 0 && earningSearchResults.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-300 text-sm">No earnings history available</p>
                  </div>
                )}
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Chat Bot Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-8 right-8 bg-yellow-400 text-black p-4 rounded-full shadow-lg hover:bg-yellow-300 transition-all duration-300 z-50"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>

      {/* Chat Bot Modal */}
      <div
        className={`fixed bottom-24 right-8 w-[600px] h-[700px] bg-black rounded-lg shadow-2xl border border-gray-700 z-50 transition-all duration-300 ease-in-out transform ${
          isChatOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8 pointer-events-none"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-white font-bold">
              Rural Financial Assistant
            </h3>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-white hover:text-gray-300 transition-colors duration-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="bg-yellow-400 text-black mt-4 px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:translate-x-2">
              {budgetQuery}
            </p>
            {queryProcessing && (
              <div className="mx-auto my-4 w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            )}
            <div className="bg-gray-800 rounded-xl shadow-lg p-4 mt-6 text-white transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-400/20 hover:scale-[1.02] hover:-translate-y-1 active:scale-95">
              <div className="bg-gray-700 rounded-lg p-6 mb-4 min-h-[200px] font-medium text-lg leading-relaxed transition-all duration-300 hover:bg-gray-600">
                {budgetAdvice && budgetAdvice.startsWith("AI Advice:") ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-yellow-400">AI Advice:</h3>
                    <div className="whitespace-pre-line">
                      {budgetAdvice.replace("AI Advice:", "").replace(/\*\*/g, "").split("\n").map((line, budget_index) => {
                        // Handle Financial Analysis and Recommendations headers
                        if (line.trim().endsWith(":")) {
                          return <h4 key={budget_index} className="font-bold text-yellow-400 text-xl mt-4 mb-2">{line.trim()}</h4>;
                        }
                        // Handle bullet points
                        else if (line.trim().startsWith("*")) {
                          const parts = line.replace("*", "").trim().split(":");
                          if (parts.length > 1) {
                            return (
                              <div key={budget_index} className="flex ml-4 mb-2">
                                <span className="text-yellow-400 mr-2">•</span>
                                <span className="font-semibold mr-2">{parts[0]}:</span>
                                <span>{parts[1]}</span>
                              </div>
                            );
                          } else {
                            return (
                              <div key={budget_index} className="flex ml-4 mb-2">
                                <span className="text-yellow-400 mr-2">•</span>
                                <span>{parts[0]}</span>
                              </div>
                            );
                          }
                        }
                        // Handle numbered recommendations
                        else if (line.trim().match(/^\d+\./)) {
                          const parts = line.trim().split(":");
                          if (parts.length > 1) {
                            return (
                              <div key={budget_index} className="flex ml-4 mb-2">
                                <span className="text-yellow-400 mr-2">{parts[0].trim()}:</span>
                                <span>{parts[1].trim()}</span>
                              </div>
                            );
                          } else {
                            return (
                              <div key={budget_index} className="ml-4 mb-2">
                                <span>{line.trim()}</span>
                              </div>
                            );
                          }
                        }
                        // Regular text
                        else {
                          return <div key={budget_index} className="mb-2">{line.trim()}</div>;
                        }
                      })}
                    </div>
                  </div>
                ) : (
                  budgetAdvice
                )}
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-700 mt-auto">
            <div className="flex justify-center">
              <button
                className="group flex items-center justify-center w-16 h-16 bg-yellow-400 text-black rounded-full cursor-pointer text-2xl font-bold transition-all duration-300 hover:bg-yellow-300 hover:scale-110 active:scale-95 shadow-lg"
                onClick={() => toggleRecording("budget")}
              >
                <Mic className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExpenseEarningsTracker;
