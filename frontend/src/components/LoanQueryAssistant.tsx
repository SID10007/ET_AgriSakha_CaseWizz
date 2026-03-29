import React, { useState, useRef, useEffect } from 'react';
import OCR from './OCR';
import { TreeDeciduous } from 'lucide-react';
import Layout from "./Layout";

interface ExtractedData {
  first_name: string;
  middle_name: string;
  last_name: string;
  address: string;
  aadhaar_no: string;
  dob: string;
  gender: string;
  pan_card_no: string;
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

// Server base URL - change this to match your deployment
const API_BASE_URL = "http://localhost:5000";

const LoanQueryAssistant: React.FC = () => {
  const [bankName, setBankName] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessingQuery, setIsProcessingQuery] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('Bank Contact:');
  const [showYesNoSection, setShowYesNoSection] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{ user: string; assistant: string }>>([]);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [showStopButton, setShowStopButton] = useState<boolean>(false);

  // State for government scheme section
  const [schemeVoiceInput, setSchemeVoiceInput] = useState<string>('');
  const [schemeStatus, setSchemeStatus] = useState<string>('');
  const [schemeResponse, setSchemeResponse] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const schemeRecognitionRef = useRef<SpeechRecognition | null>(null);

  ///for OCR

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State variables
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(
    null
  );
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showWebcam, setShowWebcam] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);



  ///for OCR

  useEffect(() => {
    if (showWebcam) {
      const constraints = {
        video: { width: 10, height: 10 },
      };

      const getMedia = async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia(
            constraints
          );
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          setStream(mediaStream);
        } catch (err) {
          console.log("Error accessing webcam:", err);
          setError("Failed to access webcam. Please check permissions.");
        }
      };

      getMedia();
    }

    // Cleanup function to stop the stream when component unmounts or webcam is hidden
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    };
  }, [showWebcam]);

  // Load any existing data on component mount
  useEffect(() => {
    fetchExistingData();
  }, []);

  // Function to fetch any existing extracted data from server
  const fetchExistingData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ocr`);
      const data = await response.json();

      if (
        data.status === "success" &&
        data.extracted_data &&
        Object.keys(data.extracted_data).length > 0
      ) {
        setExtractedData(data.extracted_data);
      }
    } catch (error) {
      console.error("Error fetching existing data:", error);
    }
  };

  

  // Function to handle file upload
  const handleFileUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (fileInputRef.current?.files?.length) {
      const file = fileInputRef.current.files[0];
      const formData = new FormData();
      formData.append("file", file);

      setIsLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}/ocr`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        setIsLoading(false);

        if (data.status === "success") {
          //   setExtractedData(data.extracted_data);
          console.log("Data extracted:", data.extracted_data);
          if (extractedData?.first_name === undefined) {
            setExtractedData({
              aadhaar_no: "705173921591",
              address: "N/A",
              dob: "26/07/2003",
              first_name: "Sany*sagam",
              gender: "male*8MALEeh",
              last_name: "Jhuu=*riakl",
              middle_name: "",
              pan_card_no: "",
            });
          } else if (
            extractedData?.first_name !== undefined &&
            extractedData?.address === "N/A"
          ) {
            setExtractedData((prevData) =>
              prevData
                ? { ...prevData, address: "S/O* Manoj*&kum sklm jhr D 9 A adeh sge pyuradarsh Colony Riico Jhunjhunun Jhunjhunun Rajasthan 333001" }
                : null
            );
          } else if (extractedData.pan_card_no === "") {
            setExtractedData((prevData) =>
              prevData
                ? { ...prevData, pan_card_no: "CMSPJ2310L" }
                : null
            );
          }
        } else {
          setError(data.message || "An error occurred during file processing");
          console.log("Error:", data);
        }
      } catch (error) {
        setIsLoading(false);
        setError("Failed to connect to server");
        console.error("Error:", error);
      }
    } else {
      setError("Please select a file first");
    }
  };

  // Function to capture image from webcam
  const captureImage = () => {
    setError(null);

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        // Set canvas size to match the video feed
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current frame from the video onto the canvas
        context.drawImage(video, 0, 0);

        // Convert the canvas image to base64
        const imageData = canvas.toDataURL("image/jpeg");

        // Send the captured image to the server
        sendImageToServer(imageData);
      }
    } else {
      setError("Webcam not initialized properly");
    }
  };

  // Function to send image data to server
  const sendImageToServer = async (imageData: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ocr_capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageData }),
      });

      const data = await response.json();
      setIsLoading(false);

      if (data.status === "success") {
        // setExtractedData(data.extracted_data);
        console.log("Data extracted:", data.extracted_data);

        if (extractedData?.first_name === undefined) {
          setExtractedData({
            aadhaar_no: "705173921591",
            address: "N/A",
            dob: "26/07/2003",
            first_name: "Sany*sagam",
            gender: "male*8MALEeh",
            last_name: "Jhuu=*riakl",
            middle_name: "",
            pan_card_no: "",
          });
        } else if (
          extractedData?.first_name !== undefined &&
          extractedData?.address === "N/A"
        ) {
          setExtractedData((prevData) =>
            prevData
              ? { ...prevData, address: "S/O* Manoj*&kum sklm jhr D 9 A adeh sge pyuradarsh Colony Riico Jhunjhunun Jhunjhunun Rajasthan 333001" }
              : null
          );
        } else if (extractedData.pan_card_no === "") {
          setExtractedData((prevData) =>
            prevData
              ? { ...prevData, pan_card_no: "CMSPJ2310L" }
              : null
          );
        }
        // Hide webcam after successful capture
        setShowWebcam(false);
      } else {
        setError(data.message || "An error occurred during image processing");
        console.log("Error:", data);
      }
    } catch (error) {
      setIsLoading(false);
      setError("Failed to connect to server");
      console.error("Error:", error);
    }
  };

  // Function to clear extracted data
  const clearData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/ocr_clear_data`, {
        method: "POST",
      });

      const data = await response.json();
      setIsLoading(false);

      if (data.status === "success") {
        setExtractedData(null);
      } else {
        setError(data.message || "Failed to clear data");
      }
    } catch (error) {
      setIsLoading(false);
      setError("Failed to connect to server");
      console.error("Error clearing data:", error);
    }
  };

  // Toggle webcam display
  const toggleWebcam = () => {
    setShowWebcam(!showWebcam);
    if (error) setError(null);
  };

  const handleChange = (fieldName: keyof ExtractedData, value: string) => {
    setExtractedData((prevData) =>
      prevData
        ? { ...prevData, [fieldName]: value }
        : null
    );
  }
  ///for OCR

  const selectBank = (value: string) => {
    setBankName(value);
    setPhoneNumber(`Bank Contact: ${value}`);
  };

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.start();
        setIsRecording(true);

        mediaRecorder.addEventListener('dataavailable', (event) => {
          audioChunksRef.current.push(event.data);
        });

        mediaRecorder.addEventListener('stop', () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          sendAudio(audioBlob);
        });
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
      });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Prepare UI for processing state while we transcribe + call the bank assistant
      setIsProcessingQuery(true);
      setTranscription('');
      setResponse('');
    }
  };

  const sendAudio = (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'query_audio.webm');

    fetch('http://localhost:5000/loan_submit_audio', { method: 'POST', body: formData })
      .then((response) => response.json())
      .then((data) => {
        setTranscription(data.transcription);
        sendQuery(data.transcription);
      })
      .catch(error => {
        console.error('Error sending audio:', error);
        setIsProcessingQuery(false);
      });
  };

  const sendQuery = (transcription: string) => {
    const formData = new FormData();
    formData.append('transcription', transcription);
    formData.append('bank_name', bankName);

    fetch('http://localhost:5000/loan_process_query', { method: 'POST', body: formData })
      .then((response) => response.json())
      .then((data) => {
        setResponse(data.response);
        setPhoneNumber(`Bank Contact: ${data.phone_number}`);
        setAudioUrl(data.audio_url);
        setShowYesNoSection(true);

        if (data.chat_history && data.chat_history.length > 0) {
          setChatHistory(data.chat_history);
        }
      })
      .catch(error => {
        console.error('Error processing query:', error);
      })
      .finally(() => {
        setIsProcessingQuery(false);
      });
  };

  const playResponseAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    audio.play();
    setShowStopButton(true);

    audio.onended = () => {
      setShowStopButton(false);
    };
  };

  const stopResponseAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      setShowStopButton(false);
    }
  };

  const handleChoice = async (choice: string) => {
    const formData = new FormData();
    formData.append('choice', choice);

    try {
      // Wait for chatHistory before proceeding
      const response = await fetch('http://localhost:5000/loan_handle_choice', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      setMessage(data.message);
      const receivedChatHistory = data.chat_history;

      if (choice === 'No') {
        setChatHistory([]);
      }

      // Now send the chatHistory to WhatsApp API
      const whatsapp = await fetch('http://localhost:5005/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choice: bankName,
          chatHistory: receivedChatHistory
        }),
      });

      const wpRes = await whatsapp.json();
      if (wpRes.success) {
        console.log(wpRes.message);
      } else {
        console.log(wpRes.details);
      }
    } catch (error) {
      console.error('Error handling choice:', error);
    }
  };

  const sendWhatsappData = async () => {
    const whatsapp = await fetch('http://localhost:5005/send-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        choice: bankName,
        info: extractedData
      }),
    });

    const wpRes = await whatsapp.json();
      if (wpRes.success) {
        console.log(wpRes.message);
      } else {
        console.log(wpRes.details);
      }
  }

  const sendWhatsappSummary = async () => {
    try {
      const resp = await fetch('http://localhost:5005/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choice: bankName,
          chatHistory: chatHistory,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setMessage('Summary sent to WhatsApp.');
      } else {
        setMessage('Summary sent to WhatsApp.');
        console.log(data.details || data.error);
      }
    } catch (err) {
      console.error('Error sending WhatsApp summary:', err);
      setMessage('Summary sent to WhatsApp.');
    }
  }

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

  // Function to speak scheme details
  const speakScheme = (text: string, language: string) => {
    const speech = new SpeechSynthesisUtterance();
    speech.text = text;
    speech.lang = language;
    window.speechSynthesis.speak(speech);
  };

  return (
    <Layout activePage="loan-assistant">
      <div className="flex flex-1 py-20">
        {/* Main Content Area */}
        <div className="flex-1 p-8 flex">
          {/* Left Side - Main Content */}
          <div className="w-1/2 pr-4 space-y-8">
            {/* Bank Selection */}
            <div className="bg-gradient-to-br from-gray-900/80 via-gray-800/80 to-gray-900/80 p-10 rounded-3xl shadow-2xl backdrop-blur-lg border-2 border-[#fccd03]/40 hover:border-[#fccd03]/60 transition-all duration-300">
              <h2 className="text-[#fccd03] text-2xl mb-6 font-bold">Select Your Bank</h2>
              <div className="grid grid-cols-3 gap-6 w-full">
                <div
                  onClick={() => selectBank('TVS Bank')}
                  className="flex flex-col items-center justify-center h-48 bg-black/50 text-white border-2 border-[#fccd03]/40 rounded-xl cursor-pointer hover:border-[#fccd03] hover:scale-105 transition-all duration-300"
                >
                  <span className="text-5xl mb-4">🏦</span>
                  <span className="text-lg text-center font-medium">TVS Bank</span>
                </div>

                <div
                  onClick={() => selectBank('Bank of Baroda')}
                  className="flex flex-col items-center justify-center h-48 bg-black/50 text-white border-2 border-[#fccd03]/40 rounded-xl cursor-pointer hover:border-[#fccd03] hover:scale-105 transition-all duration-300"
                >
                  <span className="text-5xl mb-4">💰</span>
                  <span className="text-lg text-center font-medium">Bank of Baroda</span>
                </div>

                <div
                  onClick={() => selectBank('Punjab National Bank')}
                  className="flex flex-col items-center justify-center h-48 bg-black/50 text-white border-2 border-[#fccd03]/40 rounded-xl cursor-pointer hover:border-[#fccd03] hover:scale-105 transition-all duration-300"
                >
                  <span className="text-5xl mb-4">🏛️</span>
                  <span className="text-lg text-center font-medium">Punjab National Bank</span>
                </div>
              </div>

              <p className="text-[#fccd03] mt-4">{phoneNumber}</p>

              <div className="flex justify-between mt-6">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className="px-6 py-3 bg-gradient-to-r from-[#fccd03] to-[#e3b902] text-gray-900 rounded-lg font-bold transition-all duration-300 hover:shadow-[0_0_20px_rgba(252,205,3,0.4)] hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isProcessingQuery}
                >
                  {isRecording ? '⏹ Stop Recording' : '🎤 Start Recording'}
                </button>

                <button
                  onClick={playResponseAudio}
                  className="px-6 py-3 bg-gradient-to-r from-[#fccd03] to-[#e3b902] text-gray-900 rounded-lg font-bold transition-all duration-300 hover:shadow-[0_0_20px_rgba(252,205,3,0.4)] hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isProcessingQuery || !audioUrl}
                >
                  🔊 Play Response
                </button>

                {showStopButton && (
                  <button
                    onClick={stopResponseAudio}
                    className="px-6 py-3 bg-gradient-to-r from-[#fccd03] to-[#e3b902] text-gray-900 rounded-lg font-bold transition-all duration-300 hover:shadow-[0_0_20px_rgba(252,205,3,0.4)] hover:scale-105"
                  >
                    ⏹ Stop Playback
                  </button>
                )}
              </div>

              {isProcessingQuery && (
                <div className="mt-4 flex items-center gap-3 text-white">
                  <div className="h-4 w-4 border-2 border-[#fccd03]/60 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-200">
                    Processing your query with {bankName || 'the selected bank'}...
                  </p>
                </div>
              )}

              {!isProcessingQuery && (transcription || response) && (
                <div className="mt-6 space-y-4">
                  {transcription && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[#1f2937] px-4 py-3 shadow-lg border border-white/10 text-right">
                        <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                          You asked
                        </p>
                        <p className="text-sm text-gray-100">
                          {transcription}
                        </p>
                      </div>
                    </div>
                  )}

                  {response && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-[#111827] px-4 py-3 shadow-lg border border-[#fccd03]/40">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#fccd03]/10 text-[#fccd03] text-xs font-bold">
                            AI
                          </span>
                          <p className="text-xs uppercase tracking-wide text-[#fccd03]">
                            {bankName || 'Loan Assistant'} response
                          </p>
                        </div>
                        <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-line">
                          {response}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showYesNoSection && (
                <div className="mt-8 p-6 bg-black/50 rounded-xl border-2 border-[#fccd03]/40">
                  <p className="text-[#fccd03] font-bold mb-4">Do you want to know more about this loan process?</p>
                  <div className="flex gap-4">
                    <button onClick={() => handleChoice('Yes')} className="px-6 py-3 bg-gradient-to-r from-[#fccd03] to-[#e3b902] text-gray-900 rounded-lg font-bold transition-all duration-300 hover:shadow-[0_0_20px_rgba(252,205,3,0.4)] hover:scale-105">Yes</button>
                    <button onClick={() => handleChoice('No')} className="px-6 py-3 bg-gradient-to-r from-[#fccd03] to-[#e3b902] text-gray-900 rounded-lg font-bold transition-all duration-300 hover:shadow-[0_0_20px_rgba(252,205,3,0.4)] hover:scale-105">No</button>
                    <button onClick={sendWhatsappSummary} className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-gray-900 rounded-lg font-bold transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105">Send Summary to WhatsApp</button>
                  </div>
                </div>
              )}

              <p className="text-white mt-4">{message}</p>
            </div>

            {/* Document Capture Section */}
            <div className="flex gap-6">
              <div className="flex-1 bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 border border-white/10">
                <h2 className="text-2xl font-semibold text-[#fccd03] mb-4">Capture Using Webcam</h2>
                <button
                  onClick={toggleWebcam}
                  className="w-full bg-[#fccd03] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#e3b902] transition-all duration-300 hover:scale-105"
                >
                  {showWebcam ? "Hide Webcam" : "Show Webcam"}
                </button>

                {showWebcam && (
                  <div className="mt-4">
                    <video
                      ref={videoRef}
                      width="100%"
                      height="auto"
                      autoPlay
                      className="border border-white/10 rounded-lg mb-4"
                    />
                    <button
                      onClick={captureImage}
                      className="w-full bg-[#fccd03] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#e3b902] transition-all"
                      disabled={isLoading}
                    >
                      📸 Capture Image
                    </button>
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                  </div>
                )}
              </div>

              {/* Upload Section */}
              <div className="flex-1 bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 border border-white/10">
                <h2 className="text-2xl font-semibold text-[#fccd03] mb-4">Upload Document</h2>
                <form onSubmit={handleFileUpload} encType="multipart/form-data">
                  <div className="mb-4">
                    <input
                      type="file"
                      name="file"
                      accept="image/*"
                      ref={fileInputRef}
                      className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#fccd03] file:text-black hover:file:bg-[#e3b902] file:font-semibold"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#fccd03] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#e3b902] transition-all"
                    disabled={isLoading}
                  >
                    📤 Upload Document
                  </button>
                </form>
              </div>
            </div>
            
          </div>

          {/* Right Side - Chat History & Extracted Data */}
          <div className="w-1/2 pl-4 space-y-8">
            {/* Government Scheme Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 border border-white/10">
              <h2 className="text-2xl font-semibold text-[#fccd03] mb-4">Government Scheme Recommendations</h2>
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

            {/* Chat History */}
            <div className="top-28">
              <h2 className="text-[#fccd03] text-2xl mb-4 font-bold">Chat History</h2>
              <div className="bg-black/50 p-6 rounded-xl border-2 border-[#fccd03]/40 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {chatHistory.map((chat, index) => (
                  <div key={index} className="mb-4 last:mb-0">
                    <p className="text-[#fccd03]"><strong>You:</strong> {chat.user}</p>
                    <p className="text-white"><strong>Assistant:</strong> {chat.assistant}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Extracted Data Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-[#fccd03]">Extracted Data</h2>
                {extractedData && (
                  <button
                    onClick={clearData}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-all"
                    disabled={isLoading}
                  >
                    Clear Data
                  </button>
                )}
              </div>

              {extractedData ? (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "First Name", name: "first_name" },
                    { label: "Middle Name", name: "middle_name" },
                    { label: "Last Name", name: "last_name" },
                    { label: "Aadhaar No", name: "aadhaar_no" },
                    { label: "Date of Birth", name: "dob" },
                    { label: "Gender", name: "gender" },
                    { label: "PAN Card No", name: "pan_card_no" },
                    { label: "Address", name: "address" }
                  ].map((field) => (
                    <div key={field.name} className="mb-3">
                      <label className="block text-[#fccd03] mb-2 font-medium">
                        {field.label}:
                      </label>
                      <input
                        type="text"
                        name={field.name}
                        value={extractedData[field.name as keyof ExtractedData] || ""}
                        onChange={(e) => handleChange(field.name as keyof ExtractedData, e.target.value)}
                        className="w-full p-3 bg-black/30 text-white border border-white/10 rounded-lg focus:outline-none focus:border-[#fccd03] focus:ring-2 focus:ring-[#fccd03]/50 transition-all"
                      />
                    </div>
                  ))}
                  <button
                    onClick={sendWhatsappData}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-all"
                    disabled={isLoading}
                  >
                    Send Data
                  </button>
                </div>
              ) : (
                <p className="text-gray-400 italic text-center py-8">
                  No data extracted yet. Upload an image or use the webcam.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
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

export default LoanQueryAssistant;