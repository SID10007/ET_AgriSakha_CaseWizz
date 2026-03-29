// export default AgriGenie;
import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  Droplet,
  Lightbulb,
  MessageSquare,
  CheckCircle, // For 'No Irrigation' status
  AlertTriangle, // For 'Hold' status
  Target, // For 'Monitor' status
  Leaf, // For general seed icon/feature
  Clock, // For duration
  TrendingUp, // For yield
  Trophy, // For best in region
  Mic
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from "./Layout";
import ImageUpload from './ImageUploader';

// --- REMOVED ---
// The external 'agriInitDone' guard was an anti-pattern and a source of the refresh bug.
// let agriInitDone = false;

interface WeatherData {
  temperature: number;
  humidity: number;
  description: string;
  wind_speed: number;
}

interface ForecastDay {
  date: string;
  temp: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  precipitation_prob: number;
  description: string;
  wind_speed: number;
}

interface AgriGenieResult {
  region: string;
  state: string;
  crop: string;
  current_season: string;
  current_weather: WeatherData;
  irrigation_advice: {
    general_considerations: string;
    monitoring_guidelines: string[];
    key_factors: string[];
    daily_advice: {
      day: number;
      status: string;
      status_detail?: string;
      temp: number;
      precipitation_chance: number;
      description: string;
      time_window?: string;
    }[];
    action_legend: {
      status: string;
      description: string;
    }[];
  };
  seed_varieties: {
    weather_adapted_choice: {
      name: string;
      detail: string;
      icon: string;
    };
    top_5_varieties: {
      name: string;
      badge: string;
      duration: string;
      yield: string;
      features: string[];
      icon: string;
    }[];
    best_in_region: {
      name: string;
      badge: string;
      duration: string;
      yield: string;
      features: string[];
      icon: string;
    };
  };
  weather_graph: string;
  forecast: ForecastDay[];
  comprehensive_advice: {
    pest_disease_management: {
      name: string;
      risk_level: string;
      description: string;
      prevention_treatment: string;
    }[];
    fertilizer_recommendations: {
      stage: string;
      timing: string;
      nitrogen: string;
      phosphorus: string;
      potassium: string;
      note: string;
    }[];
  };
  analysis_timestamp: string;
  disease_detection?: {
    confidence: string;
    disease_name: string;
    crop: string;
    severity: string;
    location: string;
    weather: string;
    immediate_action: string;
    immediate_treatment: string[];
    long_term_management: string[];
    prevention_strategies: string[];
    critical_note: string;
  };
}

interface AudioRecordingState {
  isRecording: boolean;
  chunks: Blob[];
  recorder: MediaRecorder | null;
}

interface LiteracyLevel {
  value: 'poor' | 'good' | 'very good' | null;
  label: string;
}

const AgriGenie: React.FC = () => {
  const [region, setRegion] = useState<string>('Kolkata');
  const [crop, setCrop] = useState<string>('rice');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [results, setResults] = useState<any>(null);
  const [activeAdviceTab, setActiveAdviceTab] = useState<'irrigation' | 'seed' | 'ai' | null>(null);
  const [showDailyWeather, setShowDailyWeather] = useState<boolean>(true);
  const [showGraphs, setShowGraphs] = useState<boolean>(false);
  const navigate = useNavigate();

  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const [irrigationLoading, setIrrigationLoading] = useState<boolean>(false);
  const [seedsLoading, setSeedsLoading] = useState<boolean>(false);
  const [adviceLoading, setAdviceLoading] = useState<boolean>(false);
  const [DiseaseDetectionLoading, setDiseaseDetectionLoading] = useState<boolean>(false);

  const [nameRecording, setNameRecording] = useState<AudioRecordingState>({ isRecording: false, chunks: [], recorder: null });
  const [nameStatus, setNameStatus] = useState<string>('Status: Waiting for input...');
  const [nameProcessing, setNameProcessing] = useState<boolean>(false);

  const [queryRecording, setQueryRecording] = useState<AudioRecordingState>({ isRecording: false, chunks: [], recorder: null });
  const [queryStatus, setQueryStatus] = useState<string>('Query: None');
  const [queryProcessing, setQueryProcessing] = useState<boolean>(false);

  const [literacyLevel, setLiteracyLevel] = useState<LiteracyLevel>({ value: null, label: 'Status: Literacy level not set.' });
  const [response, setResponse] = useState<string>('Response will appear here...');
  const [isPlayingResponse, setIsPlayingResponse] = useState<boolean>(false);
  const [detectedLanguageCode, setDetectedLanguageCode] = useState<string>('en');
  const [showPlayButton, setShowPlayButton] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [bothImagesUploaded, setBothImagesUploaded] = useState<boolean>(false);

  const responseAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- REMOVED ---
  // The 'initializingRef' guard is no longer needed with the simplified useEffect logic.
  // const initializingRef = useRef<boolean>(true);
  const requestIdRef = useRef<number>(0);
  const inflightKeyRef = useRef<string | null>(null);

  const indianStates = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Bhopal", "Patna", "Raipur", "Indore", "Surat", "Kochi", "Thiruvananthapuram", "Guwahati", "Bhubaneswar"];
  const crops = ["rice", "wheat", "maize", "sugarcane", "cotton", "Thale Cress"];

  const getCityFromCoordinates = async (lat: number, lon: number): Promise<string> => {
    try {
      const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
      const response = await fetch(`http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`);
      if (!response.ok) throw new Error('Failed to fetch city data');
      const data = await response.json();
      return data[0]?.name || '';
    } catch (error) {
      console.error('Error getting city from coordinates:', error);
      return ''; // Return empty string on failure
    }
  };

  // --- MODIFIED ---
  // This function now only returns the city name, it does not set state directly.
  const detectUserCity = async (): Promise<string> => {
    try {
      const coordsStr = sessionStorage.getItem("userLocation");
      if (coordsStr) {
        const { lat, lon } = JSON.parse(coordsStr);
        if (lat && lon) {
          return await getCityFromCoordinates(lat, lon);
        }
      }
    } catch (error) {
      console.error('Error detecting user city:', error);
    }
    return ''; // Return empty string if detection fails
  };

  const fetchResults = async (
    selectedRegion: string,
    selectedCrop: string,
    reqId?: number
  ) => {
    if (!selectedRegion || !selectedCrop) {
      showError('Please select both region and crop');
      return;
    }
  
    setLoading(true);
    hideError();
    setResults(null);
    setActiveAdviceTab(null);
    setShowGraphs(false);
  
    setWeatherLoading(true);
    setIrrigationLoading(true);
    setSeedsLoading(true);
    setAdviceLoading(true);
  
    try {
      const effectiveCrop = bothImagesUploaded ? 'Thale cress' : selectedCrop;
      const key = `${selectedRegion}|${effectiveCrop}`;
      if (inflightKeyRef.current === key) return;
      inflightKeyRef.current = key;
  
      const baseBody: any = { region: selectedRegion, crop: effectiveCrop };
      const b22 = bothImagesUploaded ? { ...baseBody, stage: '3' } : baseBody
      console.log("base body is -->", b22)
      const weatherResp = await fetch('http://localhost:5000/agri_weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bothImagesUploaded ? { ...baseBody, stage: '3' } : baseBody)
      });
  
      if (!weatherResp.ok) {
        const errorData = await weatherResp.json();
        throw new Error(errorData.error || 'Weather fetch failed');
      }
      const weatherData = await weatherResp.json();
      if (reqId && reqId !== requestIdRef.current) return;
  
      setResults(weatherData);
      setWeatherLoading(false);
      setActiveAdviceTab('irrigation');
  
      try {
        const irrigationResp = await fetch('http://localhost:5000/agri_irrigation', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bothImagesUploaded ? { ...baseBody, stage: '3' } : baseBody)
        });
        const irrigationData = await irrigationResp.json();
        if (!irrigationResp.ok) throw new Error(irrigationData.error || 'Irrigation fetch failed');
        if (reqId && reqId !== requestIdRef.current) return;
        setResults((prev: any) => ({ ...prev, ...irrigationData }));
      } catch (e) { console.error("Failed to load irrigation data:", e); } 
      finally { if (reqId === requestIdRef.current) setIrrigationLoading(false); }
  
      try {
        const seedsResp = await fetch('http://localhost:5000/agri_seeds', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bothImagesUploaded ? { ...baseBody, stage: '3' } : baseBody)
        });
        const seedsData = await seedsResp.json();
        if (!seedsResp.ok) throw new Error(seedsData.error || 'Seeds fetch failed');
        if (reqId && reqId !== requestIdRef.current) return;
        setResults((prev: any) => ({ ...prev, ...seedsData }));
      } catch (e) { console.error("Failed to load seed data:", e); } 
      finally { if (reqId === requestIdRef.current) setSeedsLoading(false); }
      
      if (bothImagesUploaded) {
        try {
          const diseaseDetectionResp = await fetch('http://localhost:5000/agri_disease_detection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bothImagesUploaded ? { ...baseBody, stage: '3' } : baseBody)
          });
      
          const diseaseDetectionData = await diseaseDetectionResp.json();
          if (!diseaseDetectionResp.ok) throw new Error(diseaseDetectionData.error || 'Disease detection fetch failed');
          if (reqId && reqId !== requestIdRef.current) return;
          setResults((prev: any) => ({ ...prev, ...diseaseDetectionData }));
      
        } catch (e) {
          console.error("Failed to load disease detection data:", e);
        } finally {
          if (reqId === requestIdRef.current) setDiseaseDetectionLoading(false);
        }
      }
      
  
      try {
        const adviceResp = await fetch('http://localhost:5000/agri_advice', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bothImagesUploaded ? { ...baseBody, stage: '3' } : baseBody)
        });
        const adviceData = await adviceResp.json();
        if (!adviceResp.ok) throw new Error(adviceData.error || 'Advice fetch failed');
        if (reqId && reqId !== requestIdRef.current) return;
        setResults((prev: any) => ({ ...prev, ...adviceData }));
      } catch (e) { console.error("Failed to load comprehensive advice:", e); } 
      finally { if (reqId === requestIdRef.current) setAdviceLoading(false); }
  
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown network error occurred.';
      showError(errorMessage);
      console.error('Error in fetchResults:', error);
      setWeatherLoading(false);
      setDiseaseDetectionLoading(false);
      setIrrigationLoading(false);
      setSeedsLoading(false);
      setAdviceLoading(false);
    } finally {
      inflightKeyRef.current = null;
      setBothImagesUploaded(false);
      if (reqId === requestIdRef.current) setLoading(false);
    }
  };

  // --- REVISED: Simplified and robust initialization logic ---

  // Effect 1: Runs ONLY ONCE on component mount to detect and set the initial city.
  // It does NOT fetch data directly. Its only job is to set the 'region' state.
  useEffect(() => {
    const detectAndSetInitialCity = async () => {
      const detectedCity = await detectUserCity();
      // If a new city is found, update the state. This will trigger the next useEffect.
      // If not, the component will proceed using the default 'Kolkata'.
      if (detectedCity) {
        setRegion(detectedCity);
      }
    };

    detectAndSetInitialCity();
  }, []); // Empty dependency array ensures this runs only once.

  // Effect 2: This is now the SINGLE source of truth for fetching data.
  // It runs whenever `region` or `crop` changes.
  useEffect(() => {
    // This check ensures we don't fetch with empty values.
    if (region && crop) {
      const id = ++requestIdRef.current;
      fetchResults(region, crop, id);
    }
  }, [region, crop]); // Dependencies are the triggers for fetching data.

  // Trigger fetch when both images are uploaded
  // useEffect(() => {
  //   if (bothImagesUploaded && region && crop) {
  //     const id = ++requestIdRef.current;
  //     fetchResults(region, crop, id);
  //   }
  // }, [bothImagesUploaded]);


  const showError = (message: string) => {
    setErrorMessage(message);
  };

  const hideError = () => {
    setErrorMessage('');
  };

  const formatAIResponse = (text: string) => {
    let formatted = text
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^• (.*$)/gm, '<li>$1</li>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/^✓ (.*$)/gm, '<li class="checkmark">✓ $1</li>')
      .replace(/(📍|🌾|📅|🗓️|🌡️|💧|🌤️|🚰|📋|🏛️|🌱|⚠️|📞|🎯|📈|🐛|🌧️|📊|🏆|🛒|✅)/g, '<span class="emoji">$1</span>')
      .replace(/(<li>.*<\/li>\s*)+/gs, '<ul>$&</ul>')
      .replace(/\|(.+)\|\n\|[-\s|]+\|\n((\|.*\|\n?)*)/g, (match, header, divider, rows) => {
        let headerCells = header.split('|').map((cell: string) => `<th>${cell.trim()}</th>`).join('');
        let rowsHtml = rows.split('\n').filter((row: string) => row.trim())
          .map((row: string) => {
            let cells = row.split('|').map((cell: string) => `<td>${cell.trim()}</td>`).join('');
            return `<tr>${cells}</tr>`;
          }).join('');
        return `<table class="ai-table"><thead><tr>${headerCells}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
      })
      .replace(/\n/g, '<br/>');

    return formatted;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  useEffect(() => {
    if (results) {
      const resultsSection = document.getElementById('agri-results-section');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [results]);

  const startRecording = async (type: 'name' | 'query') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
      mediaRecorder.onstop = () => processRecording(type, chunks);
      mediaRecorder.start();

      if (type === 'name') {
        setNameRecording({ isRecording: true, chunks: [], recorder: mediaRecorder });
        setNameStatus('Recording...');
      } else {
        setQueryRecording({ isRecording: true, chunks: [], recorder: mediaRecorder });
        setQueryStatus('Recording...');
      }
    } catch (error) {
      console.error(`Error starting ${type} recording:`, error);
      const status = 'Error accessing microphone.';
      type === 'name' ? setNameStatus(status) : setQueryStatus(status);
    }
  };

  const stopRecording = (type: 'name' | 'query') => {
    const recordingState = type === 'name' ? nameRecording : queryRecording;
    if (recordingState.recorder) {
      recordingState.recorder.stop();
      recordingState.recorder.stream.getTracks().forEach(track => track.stop());
      
      if (type === 'name') {
        setNameRecording(prev => ({ ...prev, isRecording: false }));
        setNameStatus('Processing audio...');
        setNameProcessing(true);
      } else {
        setQueryRecording(prev => ({ ...prev, isRecording: false }));
        setQueryStatus('Processing query...');
        setQueryProcessing(true);
      }
    }
  };

  const processRecording = async (type: 'name' | 'query', chunks: Blob[]) => {
    const audioBlob = new Blob(chunks, { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('audio', audioBlob);

    try {
      if (type === 'name') {
        const response = await fetch('http://localhost:5000/ey_get_name', { method: 'POST', body: formData });
        const data = await response.json();
        setNameProcessing(false);
        if (data.error) throw new Error(data.error);
        setNameStatus(data.message);
      } else {
        if (results) {
          formData.append('region', results.region);
          formData.append('crop', results.crop);
          formData.append('weather_data', JSON.stringify({ current: results.current_weather, forecast: results.forecast, season: results.current_season }));
          formData.append('irrigation_advice', JSON.stringify(results.irrigation_advice));
          formData.append('seed_varieties', JSON.stringify(results.seed_varieties));
          formData.append('comprehensive_advice', JSON.stringify(results.comprehensive_advice));
        }

        const response = await fetch('http://localhost:5000/agri_voice_query', { method: 'POST', body: formData });
        const data = await response.json();
        setQueryProcessing(false);
        if (data.error) throw new Error(data.error);
        
        setQueryStatus(`Query: ${data.query || 'N/A'}`);
        setResponse(data.response || 'No response available.');
        setDetectedLanguageCode(data.language_code || 'en');
        if (data.response) setShowPlayButton(true);
      }
    } catch (error) {
      console.error(`Error processing ${type} recording:`, error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      if (type === 'name') {
        setNameProcessing(false);
        setNameStatus(`Error: ${errorMessage}`);
      } else {
        setQueryProcessing(false);
        setQueryStatus(`Error: ${errorMessage}`);
      }
    }
  };

  const handleSetLiteracyLevel = async (level: 'poor' | 'good' | 'very good') => {
    try {
      const response = await fetch('http://localhost:5000/ey_set_literacy_level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ literacy_level: level }),
      });
      const data = await response.json();
      setLiteracyLevel({ value: level, label: data.message || `Literacy level set to ${level}.` });
    } catch (error) {
      console.error('Error setting literacy level:', error);
      setLiteracyLevel({ value: null, label: 'Error setting literacy level.' });
    }
  };

  const playResponse = async () => {
    try {
      const apiResponse = await fetch('http://localhost:5000/ey_play_response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: response, language_code: detectedLanguageCode }),
      });

      if (!apiResponse.ok) throw new Error('Failed to generate audio response.');

      const audioBlob = await apiResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (responseAudioRef.current) {
        responseAudioRef.current.src = audioUrl;
        responseAudioRef.current.play();
        setIsPlayingResponse(true);
      }
    } catch (error) {
      console.error('Error playing response:', error);
    }
  };

  const stopResponse = () => {
    if (responseAudioRef.current) {
      responseAudioRef.current.pause();
      responseAudioRef.current.currentTime = 0;
      setIsPlayingResponse(false);
    }
  };

  useEffect(() => {
    const audioElement = responseAudioRef.current;
    const handleEnded = () => setIsPlayingResponse(false);
    audioElement?.addEventListener('ended', handleEnded);
    return () => audioElement?.removeEventListener('ended', handleEnded);
  }, []);

  return (
    <Layout activePage="agri-assistant">
      <div className="flex flex-1 py-2">
        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {errorMessage && (
              <div className="bg-red-500 text-white p-4 rounded-lg mb-8 text-center">
                {errorMessage}
              </div>
            )}

            {/* {loading && !results && (
              <div className="text-center text-white text-xl my-8">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-4 border-[#fccd03] border-t-transparent mx-auto mb-4"></div>
                Analyzing your crop data...
              </div>
            )} */}

            {(results || loading) && (
              <div id="agri-results-section" className="space-y-8">
                <div className="flex justify-between items-center mb-4">
                  {/* Left side buttons */}
                  <div className="flex">
                    <button
                      onClick={() => setShowDailyWeather(true)}
                      className={`px-6 py-2 rounded-l-lg font-semibold transition-colors ${
                        showDailyWeather
                          ? "bg-[#fccd03] text-black"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      Daily Weather
                    </button>
                    <button
                      onClick={() => setShowDailyWeather(false)}
                      className={`px-6 py-2 rounded-r-lg font-semibold transition-colors ${
                        !showDailyWeather
                          ? "bg-[#fccd03] text-black"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      7-Day Forecast
                    </button>
                  </div>

                  {/* Right side: ImageUpload + dropdown */}
                  <div className="flex items-center space-x-4">
                    <ImageUpload onBothUploadedChange={setBothImagesUploaded} setCrop={setCrop} />
                    <select
                      value={crop}
                      onChange={(e) => setCrop(e.target.value)}
                      className="px-3 py-1 text-sm rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-1 focus:ring-[#fccd03]"
                    >
                      {crops.map((c) => (
                        <option key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-4 text-white">
                  {weatherLoading ? (
                    <div className="p-4">
                      <div className="h-6 w-64 bg-gray-700 rounded mb-6"></div>
                      <div className="grid grid-cols-auto-fit-180 gap-5">
                        <div className="h-16 bg-gray-700 rounded" />
                        <div className="h-16 bg-gray-700 rounded" />
                        <div className="h-16 bg-gray-700 rounded" />
                        <div className="h-16 bg-gray-700 rounded" />
                      </div>
                    </div>
                  ) : results?.current_weather ? (
                    showDailyWeather ? (
                      <div className="px-4 pb-4 pt-0">
                        <h3 className="text-2xl font-bold text-[#fccd03] mt-2 mb-6">🌤️ Current Weather in {results.region}, {results.state}</h3>
                        <div className="grid grid-cols-auto-fit-180 gap-5">
                          <div>
                            <h4 className="text-lg font-medium text-gray-300 mb-2">🌡️ Temperature</h4>
                            <p className="text-4xl font-bold">{results.current_weather.temperature}°C</p>
                          </div>
                          <div>
                            <h4 className="text-lg font-medium text-gray-300 mb-2">💧 Humidity</h4>
                            <p className="text-4xl font-bold">{results.current_weather.humidity}%</p>
                          </div>
                          <div>
                            <h4 className="text-lg font-medium text-gray-300 mb-2">🌤️ Condition</h4>
                            <p className="text-xl capitalize">{results.current_weather.description}</p>
                          </div>
                          <div>
                            <h4 className="text-lg font-medium text-gray-300 mb-2">💨 Wind Speed</h4>
                            <p className="text-2xl font-bold">{Math.round(results.current_weather.wind_speed || 0)} km/h</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/30">
                          <p><strong>📍 Location:</strong> {results.region}, {results.state || 'India'}</p>
                          <p><strong>🗓️ Season:</strong> {results.current_season || 'Current Season'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 pb-4 pt-0">
                          <h3 className="text-2xl font-bold text-[#fccd03] mt-2 mb-6">📊 7-Day Weather Forecast for {results.region}, {results.state}</h3>
                          <div className="flex justify-center overflow-x-auto space-x-6 text-center">
                              {results.forecast.map((day: ForecastDay, index: number) => (
                              <div key={index} className="forecast-day flex-shrink-0 w-36 p-4 rounded-lg shadow-sm bg-gray-800">
                                  <h4 className="font-bold text-gray-200 text-lg mb-1">{formatDate(day.date)}</h4>
                                  <div className="text-3xl font-bold text-[#fccd03] mb-1">{Math.round(day.temp)}°C</div>
                                  <div className="text-sm text-gray-400 mb-1">
                                  {Math.round(day.temp_min)}° / {Math.round(day.temp_max)}°
                                  </div>
                                  <div className="text-sm text-blue-400 mb-1">
                                      💧 {Math.round(day.precipitation_prob)}%
                                  </div>
                                  <div className="text-sm text-green-400 mb-1">
                                      💨 {Math.round(day.wind_speed || 0)} km/h
                                  </div>
                                  <div className="text-sm capitalize text-gray-300">{day.description}</div>
                              </div>
                              ))}
                          </div>
                      </div>
                    )
                  ) : null}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-1">
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-8 text-white flex flex-col">
                    <h3 className="text-2xl font-bold text-[#fccd03] mb-6">Agricultural Guidance</h3>
                    
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <button
                        onClick={() => setActiveAdviceTab('irrigation')}
                        className={`p-4 rounded-lg transition-all duration-300 text-left ${
                          activeAdviceTab === 'irrigation' 
                            ? 'bg-white shadow-md text-gray-800' 
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                        }`}
                      >
                        <div className="flex items-center mb-2">
                          <Droplet className={`w-5 h-5 mr-2 ${activeAdviceTab === 'irrigation' ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="text-xs font-medium text-gray-500">GUIDANCE FOR</span>
                        </div>
                        <div className={`font-bold text-lg ${activeAdviceTab === 'irrigation' ? 'text-blue-600' : 'text-gray-200'}`}>
                          Irrigation
                        </div>
                      </button>

                      <button
                        onClick={() => setActiveAdviceTab('seed')}
                        className={`p-4 rounded-lg transition-all duration-300 text-left ${
                          activeAdviceTab === 'seed' 
                            ? 'bg-white shadow-md text-gray-800' 
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                        }`}
                      >
                        <div className="flex items-center mb-2">
                          <Cloud className={`w-5 h-5 mr-2 ${activeAdviceTab === 'seed' ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-xs font-medium text-gray-500">GUIDANCE FOR</span>
                        </div>
                        <div className={`font-bold text-lg ${activeAdviceTab === 'seed' ? 'text-green-600' : 'text-gray-200'}`}>
                          Seed Varieties
                        </div>
                      </button>

                      <button
                        onClick={() => setActiveAdviceTab('ai')}
                        className={`p-4 rounded-lg transition-all duration-300 text-left ${
                          activeAdviceTab === 'ai' 
                            ? 'bg-white shadow-md text-gray-800' 
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                        }`}
                      >
                        <div className="flex items-center mb-2">
                          <Lightbulb className={`w-5 h-5 mr-2 ${activeAdviceTab === 'ai' ? 'text-purple-600' : 'text-gray-400'}`} />
                          <span className="text-xs font-medium text-gray-500">GUIDANCE FOR</span>
                        </div>
                        <div className={`font-bold text-lg ${activeAdviceTab === 'ai' ? 'text-purple-600' : 'text-gray-200'}`}>
                          Disease and Fertilizers
                        </div>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '2800px' }}>
                      {activeAdviceTab === 'irrigation' && (
                        irrigationLoading ? (
                          <div className="space-y-6">
                            <div className="bg-gray-800 p-6 rounded-lg">
                              <div className="h-4 bg-gray-700 rounded w-1/3 mb-3"></div>
                              <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
                              <div className="h-3 bg-gray-700 rounded w-11/12"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-gray-800 rounded-lg p-5"><div className="h-5 bg-gray-700 rounded w-1/2 mb-4"></div><div className="h-4 bg-gray-700 rounded w-2/3 mb-2"></div><div className="h-3 bg-gray-700 rounded w-full"></div></div>
                              ))}
                            </div>
                          </div>
                        ) : results?.irrigation_advice && (
                          <div className="space-y-6">
                            <div className="bg-gray-800 p-6 rounded-lg shadow-inner border border-gray-700">
                              <h3 className="text-xl font-bold text-[#fccd03] mb-3">General Considerations</h3>
                              <p className="text-gray-300 mb-4">{results.irrigation_advice.general_considerations}</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <h4 className="font-semibold text-gray-200 mb-2">Monitoring Guidelines:</h4>
                                  <ul className="list-disc list-inside text-gray-400 space-y-1">{results.irrigation_advice.monitoring_guidelines.map((item: string, idx: number) => <li key={idx}>{item}</li>)}</ul>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-200 mb-2">Key Factors:</h4>
                                  <ul className="list-disc list-inside text-gray-400 space-y-1">{results.irrigation_advice.key_factors.map((item: string, idx: number) => <li key={idx}>{item}</li>)}</ul>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              {results.irrigation_advice.daily_advice.map((day: any, index: number) => (
                                <div key={index} className="bg-gray-800 rounded-lg shadow-lg p-5 border border-gray-700 flex flex-col justify-between" style={{ minHeight: '200px' }}>
                                  <h4 className="font-bold text-gray-200 mb-3 text-lg">Day {day.day}</h4>
                                  <div className={`flex items-center text-sm font-semibold mb-2 py-1 px-3 rounded-full self-start ${day.status === 'No Irrigation' ? 'bg-green-600' : day.status === 'Irrigate' ? 'bg-blue-600' : day.status === 'Hold' ? 'bg-yellow-600' : day.status === 'Monitor' ? 'bg-orange-600' : 'bg-gray-600'} text-white`}>
                                    {day.status === 'No Irrigation' && <CheckCircle className="w-4 h-4 mr-1" />}
                                    {day.status === 'Irrigate' && <Droplet className="w-4 h-4 mr-1" />}
                                    {day.status === 'Hold' && <AlertTriangle className="w-4 h-4 mr-1" />}
                                    {day.status === 'Monitor' && <Target className="w-4 h-4 mr-1" />}
                                    {day.status} {day.status_detail && `(${day.status_detail})`}
                                  </div>
                                  <div className="text-gray-400 text-sm mb-3">{Math.round(day.temp)}°C | 💧 {Math.round(day.precipitation_chance)}%{day.time_window && ` | ⏰ ${day.time_window}`}</div>
                                  <p className="text-gray-300 text-sm flex-grow">{day.description}</p>
                                </div>
                              ))}
                            </div>
                            <div className="bg-gray-800 p-6 rounded-lg shadow-inner border border-gray-700">
                              <h3 className="text-xl font-bold text-[#fccd03] mb-3">Action Legend</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {results.irrigation_advice.action_legend.map((item: any, idx: number) => (
                                  <div key={idx} className="flex items-center text-sm">
                                    <span className={`inline-block w-4 h-4 rounded-full mr-2 ${item.status === 'Irrigate' ? 'bg-blue-600' : item.status === 'Hold' ? 'bg-yellow-600' : item.status === 'No Irrigation' ? 'bg-green-600' : item.status === 'Monitor' ? 'bg-orange-600' : 'bg-gray-600'}`}></span>
                                    <span className="font-semibold text-gray-300">{item.status}:</span>
                                    <span className="text-gray-400 ml-2">{item.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                      
                      {activeAdviceTab === 'seed' && (
                        seedsLoading ? (
                          <div className="space-y-8">
                            <div className="bg-yellow-800/20 border border-yellow-700 rounded-xl p-6"><div className="h-5 bg-yellow-700/50 rounded w-1/3 mb-3"></div><div className="h-4 bg-yellow-700/50 rounded w-2/3"></div></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-gray-800 rounded-lg p-5"><div className="h-5 bg-gray-700 rounded w-1/2 mb-3"></div><div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div><div className="h-3 bg-gray-700 rounded w-full"></div></div>)}
                            </div>
                          </div>
                        ) : results?.seed_varieties && (
                          <div className="space-y-8">
                            <div className="bg-yellow-800/20 border border-yellow-700 rounded-xl p-6 flex items-start space-x-4">
                              <div className="text-yellow-400 text-3xl mt-1">{results.seed_varieties.weather_adapted_choice.icon}</div>
                              <div>
                                <h3 className="text-lg font-bold text-yellow-300 mb-2">Weather-Adapted Choice</h3>
                                <p className="text-gray-200"><strong>{results.seed_varieties.weather_adapted_choice.name}</strong> is {results.seed_varieties.weather_adapted_choice.detail}</p>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h3 className="text-2xl font-bold text-[#fccd03] mb-4">✨ Top 5 Recommended Varieties</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {results.seed_varieties.top_5_varieties.map((seed: any, index: number) => (
                                  <div key={index} className="bg-gray-800 rounded-lg shadow-lg p-5 border border-gray-700 flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-3"><h4 className="font-bold text-gray-200 text-lg">{seed.name}</h4><Leaf className="w-5 h-5 text-green-400" /></div>
                                    <div className={`text-xs font-semibold py-1 px-2 rounded-full self-start mb-2 ${seed.badge === 'Highly Recommended' ? 'bg-blue-600' : seed.badge === 'Good Choice' ? 'bg-green-600' : seed.badge === 'Premium Variety' ? 'bg-purple-600' : 'bg-gray-600'} text-white`}>{seed.badge}</div>
                                    <div className="text-gray-400 text-sm space-y-1"><p className="flex items-center"><Clock className="w-4 h-4 mr-2 text-gray-500" /> {seed.duration}</p><p className="flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-gray-500" /> {seed.yield}</p><ul className="list-none p-0 mt-2 space-y-1">{seed.features.map((feature: string, idx: number) => <li key={idx} className="flex items-center text-green-400"><CheckCircle className="w-4 h-4 mr-2" /> {feature}</li>)}</ul></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h3 className="text-2xl font-bold text-[#fccd03] mb-4">📍 Best in Region ({results.state})</h3>
                              <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
                                <div className="flex items-center mb-4"><Trophy className="w-6 h-6 text-[#fccd03] mr-3" /><h4 className="font-bold text-gray-200 text-xl">{results.seed_varieties.best_in_region.name}</h4></div>
                                <div className={`text-sm font-semibold py-1 px-3 rounded-full self-start mb-3 inline-block ${results.seed_varieties.best_in_region.badge === 'Highly Recommended' ? 'bg-blue-600' : results.seed_varieties.best_in_region.badge === 'Good Choice' ? 'bg-green-600' : results.seed_varieties.best_in_region.badge === 'Premium Variety' ? 'bg-purple-600' : 'bg-gray-600'} text-white`}>{results.seed_varieties.best_in_region.badge}</div>
                                <div className="text-gray-400 text-sm space-y-2 mb-4"><p className="flex items-center"><Clock className="w-4 h-4 mr-2 text-gray-500" /> {results.seed_varieties.best_in_region.duration}</p><p className="flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-gray-500" /> {results.seed_varieties.best_in_region.yield}</p></div>
                                <ul className="list-none p-0 space-y-1">{results.seed_varieties.best_in_region.features.map((feature: string, idx: number) => <li key={idx} className="flex items-center text-green-400"><CheckCircle className="w-4 h-4 mr-2" /> {feature}</li>)}</ul>
                              </div>
                            </div>
                          </div>
                        )
                      )}

                      {activeAdviceTab === 'ai' && (
                        adviceLoading ? (
                          <div className="space-y-8 bg-transparent p-6 rounded-lg">
                            <div className="h-6 bg-gray-700 rounded w-1/3"></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {Array.from({ length: 2 }).map((_, i) => <div key={i} className="bg-white/5 rounded-lg p-5"><div className="h-5 bg-gray-700 rounded w-2/3 mb-3"></div><div className="h-3 bg-gray-700 rounded w-full mb-2"></div><div className="h-3 bg-gray-700 rounded w-11/12"></div></div>)}
                            </div>
                          </div>
                        ) : results?.comprehensive_advice && (
                          <div className="space-y-8 bg-transparent p-6 rounded-lg">
                            {/* Disease Detection Section - Only show when both images are uploaded */}
                            {results?.disease_detection && (
                              <div className="space-y-4">
                                <h3 className="text-2xl font-bold text-gray-200 mb-4 flex items-center">
                                  <span className="text-red-500 mr-2">🔬</span>AI Disease Detection Results
                                </h3>
                                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                                  <div className="flex justify-between items-start mb-4">
                                    <div>
                                      <h4 className="text-lg font-bold text-gray-800 mb-2">Based on your uploaded images analysis</h4>
                                    </div>
                                    <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                                      {results.disease_detection.confidence} Confidence
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                    {/* Disease Overview */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                      <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                                        <span className="text-red-500 mr-2">⚠️</span>Disease Overview
                                      </h5>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex items-center">
                                          <span className="text-gray-600 w-20">Disease:</span>
                                          <span className="font-medium text-gray-800">{results.disease_detection.disease_name}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <span className="text-gray-600 w-20">Crop:</span>
                                          <span className="font-medium text-gray-800">{results.disease_detection.crop}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <span className="text-gray-600 w-20">Severity:</span>
                                          <span className="font-medium text-gray-800">{results.disease_detection.severity}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <span className="text-gray-600 w-20">Location:</span>
                                          <span className="font-medium text-gray-800">{results.disease_detection.location}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <span className="text-gray-600 w-20">Weather:</span>
                                          <span className="font-medium text-gray-800">{results.disease_detection.weather}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Immediate Action Required */}
                                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                                      <h5 className="font-semibold text-red-800 mb-3 flex items-center">
                                        <span className="text-red-500 mr-2">📅</span>Immediate Action Required
                                      </h5>
                                      <p className="text-sm text-red-700 leading-relaxed">
                                        {results.disease_detection.immediate_action}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Treatment and Management Sections */}
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    {/* Immediate Treatment */}
                                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                      <h5 className="font-semibold text-blue-800 mb-3 flex items-center">
                                        <span className="text-blue-500 mr-2">⚡</span>Immediate Treatment
                                      </h5>
                                      <ul className="text-sm text-blue-700 space-y-1">
                                        {results.disease_detection.immediate_treatment.map((treatment: string, index: number) => (
                                          <li key={index} className="flex items-start">
                                            <span className="text-blue-500 mr-2">•</span>
                                            {treatment}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    
                                    {/* Long-term Management */}
                                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                      <h5 className="font-semibold text-green-800 mb-3 flex items-center">
                                        <span className="text-green-500 mr-2">📋</span>Long-term Management
                                      </h5>
                                      <ul className="text-sm text-green-700 space-y-1">
                                        {results.disease_detection.long_term_management.map((management: string, index: number) => (
                                          <li key={index} className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            {management}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    
                                    {/* Prevention Strategies */}
                                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                      <h5 className="font-semibold text-purple-800 mb-3 flex items-center">
                                        <span className="text-purple-500 mr-2">🛡️</span>Prevention Strategies
                                      </h5>
                                      <ul className="text-sm text-purple-700 space-y-1">
                                        {results.disease_detection.prevention_strategies.map((strategy: string, index: number) => (
                                          <li key={index} className="flex items-start">
                                            <span className="text-purple-500 mr-2">•</span>
                                            {strategy}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                  
                                  {/* Critical Note */}
                                  <div className="mt-6 bg-red-100 rounded-lg p-4 border border-red-300">
                                    <h5 className="font-semibold text-red-800 mb-2 flex items-center">
                                      <span className="text-red-500 mr-2">⚠️</span>Critical Note:
                                    </h5>
                                    <p className="text-sm text-red-700 leading-relaxed">
                                      {results.disease_detection.critical_note}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="space-y-4">
                              <h3 className="text-2xl font-bold text-gray-200 mb-4 flex items-center"><span className="text-blue-500 mr-2">🛡️</span>Pest & Disease Management</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {results.comprehensive_advice.pest_disease_management.map((pest: any, index: number) => (
                                  <div key={index} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-400 border border-gray-200 p-5">
                                    <div className="flex items-start mb-3"><span className="text-blue-500 text-2xl mr-3" role="img" aria-label="Pest">🦗</span><div className="flex-1"><h4 className="font-bold text-gray-800 text-lg mb-2">{pest.name}</h4><div className={`text-xs font-semibold py-1 px-3 rounded-full inline-block ${pest.risk_level === 'High Risk' ? 'bg-red-500' : pest.risk_level === 'Medium to High Risk' ? 'bg-green-500' : pest.risk_level === 'Medium Risk' ? 'bg-yellow-500' : pest.risk_level === 'Low to Medium Risk' ? 'bg-yellow-400' : 'bg-gray-500'} text-white`}>{pest.risk_level}</div></div></div>
                                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">{pest.description}</p>
                                    <div className="bg-gray-100 rounded-lg p-3 border border-gray-200"><div className="text-gray-800 text-sm font-semibold mb-1">Prevention & Treatment:</div><div className="text-gray-700 text-sm leading-relaxed">{pest.prevention_treatment}</div></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h3 className="text-2xl font-bold text-gray-200 mb-4 flex items-center"><span className="text-blue-500 mr-2">🎯</span>Fertilizer Recommendations</h3>
                              <div className="space-y-4">
                                {results.comprehensive_advice.fertilizer_recommendations.map((stage: any, index: number) => (
                                  <div key={index} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-400 border border-gray-200 p-6">
                                    <div className="flex items-center mb-4"><div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3 shadow-sm"><span className="text-white text-sm font-bold">🎯</span></div><div><h4 className="font-bold text-gray-800 text-xl">{stage.stage}</h4><p className="text-gray-500 text-sm">{stage.timing}</p></div></div>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                      <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100"><div className="text-green-600 text-sm font-bold mb-1">Nitrogen (N)</div><div className="text-gray-700 font-medium text-sm">{stage.nitrogen}</div></div>
                                      <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100"><div className="text-blue-600 text-sm font-bold mb-1">Phosphorus (P)</div><div className="text-gray-700 font-medium text-sm">{stage.phosphorus}</div></div>
                                      <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100"><div className="text-blue-600 text-sm font-bold mb-1">Potassium (K)</div><div className="text-gray-700 font-medium text-sm">{stage.potassium}</div></div>
                                    </div>
                                    <div className="bg-gray-100 rounded-lg p-3 border border-gray-200"><div className="text-gray-700 text-sm"><span className="font-semibold">Note:</span> {stage.note}</div></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="w-full lg:col-span-2 mt-8">
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 text-white">
                      <button
                        onClick={() => setShowGraphs(!showGraphs)}
                        className="w-full flex items-center justify-between px-4 py-2 font-semibold bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <h3 className="text-xl font-bold text-[#fccd03]">📈 View Agricultural Graphs</h3>
                        <span>{showGraphs ? '▲' : '▼'}</span>
                      </button>

                      {showGraphs && (
                        <div className="mt-6 space-y-8 flex flex-col items-center">
                          {results.weather_graph ? (
                            <img src={`data:image/png;base64,${results.weather_graph}`} alt="Weather Forecast Graph" className="max-w-full h-auto rounded-lg shadow-md" />
                          ) : (
                            <p className="text-gray-400">Weather graph unavailable.</p>
                          )}
                          <div className="w-full bg-gray-800 p-6 rounded-lg text-center text-gray-400">
                            <p>Additional agricultural graphs would appear here (e.g., yield trends, soil analysis).</p>
                          </div>
                          <div className="w-full bg-gray-800 p-6 rounded-lg text-center text-gray-400">
                            <p>More visual data like market prices or water usage could be displayed.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Bot Button and Modal */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-8 right-8 bg-[#fccd03] text-black p-4 rounded-full shadow-lg hover:bg-[#e6b800] transition-all duration-300 z-50"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <div
        className={`fixed bottom-24 right-8 w-[600px] h-[700px] bg-black rounded-lg shadow-2xl border border-white/10 z-50 transition-all duration-300 ease-in-out transform ${
          isChatOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-[#fccd03] font-bold">Agricultural Voice Assistant</h3>
            <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white">&times;</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <p className="bg-[#fccd03] text-black mt-4 px-4 py-2 rounded-lg font-medium">{queryStatus}</p>
            {queryProcessing && <div className="mx-auto my-4 w-8 h-8 border-4 border-[#fccd03] border-t-[#e3b902] rounded-full animate-spin"></div>}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-2 mt-6 text-white">
              <div className="bg-black/30 rounded-lg p-8 mb-8 min-h-[300px] font-medium text-lg leading-relaxed">{response}</div>
              <div className="flex gap-4">
                {showPlayButton && !isPlayingResponse && <button onClick={playResponse} className="flex-1 bg-[#fccd03] text-black px-6 py-4 rounded-lg font-semibold hover:bg-[#e3b902]">🔊 Play Response</button>}
                {isPlayingResponse && <button onClick={stopResponse} className="flex-1 bg-red-500 text-white px-6 py-4 rounded-lg font-semibold hover:bg-red-600">⏹ Stop Response</button>}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-white/10 mt-auto">
            <div className="flex flex-wrap gap-2 justify-center items-center">
              <div className="flex gap-2 mr-4">
                <button 
                  onClick={(e) => {
                    e.currentTarget.classList.toggle("bg-green-500");
                    handleSetLiteracyLevel("poor");
                    console.log(e.currentTarget.classList);
                  }} 
                  className="bg-[#fccd03] text-black rounded-lg px-3 py-1.5 text-sm">Poor
                </button>
                <button 
                  onClick={(e) => {
                    e.currentTarget.classList.toggle("bg-green-500");
                    handleSetLiteracyLevel("good");
                    console.log(e.currentTarget.classList);
                  }}
                  className="bg-[#fccd03] text-black rounded-lg px-3 py-1.5 text-sm">Good
                </button>
                <button
                  onClick={(e) => {
                    e.currentTarget.classList.toggle("bg-green-500");
                    handleSetLiteracyLevel("very good");
                    console.log(e.currentTarget.classList);
                  }}
                  className="bg-[#fccd03] text-black rounded-lg px-3 py-1.5 text-sm">Excellent
                </button>
              </div>
              {!queryRecording.isRecording ? 
                <button onClick={() => startRecording("query")} className="bg-[#fccd03] text-black p-3 rounded-full"><Mic className="w-6 h-6" /></button> : 
                <button onClick={() => stopRecording("query")} className="bg-red-500 text-white p-3 rounded-full">⏹</button>
              }
            </div>
          </div>
        </div>
      </div>

      <audio ref={responseAudioRef} />
    </Layout>
  );
};

export default AgriGenie;
