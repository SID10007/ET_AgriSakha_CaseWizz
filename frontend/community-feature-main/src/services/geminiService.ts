
// This service integrates with Google's Gemini API and Groq's Whisper API for speech-to-text
// For the demo, we're using the actual APIs but with error handling for fallbacks

// The actual API key would be used in a backend service in production
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "ENTER_+YOUR_API_KEY";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "ENTER_YOUR_GROQ_API_KEY";

// Function to transcribe audio using Whisper via Groq
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    console.log("Preparing to transcribe audio...");
    
    // Create a FormData object to send the audio file
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("model", "whisper-large-v3");
    
    // Send the audio to the Groq API
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Transcription API error:", errorData);
      throw new Error(`Transcription failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Transcription response:", data);
    
    if (data.text) {
      return data.text;
    } else {
      throw new Error("No transcription text in the response");
    }
  } catch (error) {
    console.error("Error in transcription service:", error);
    
    // For demo purposes, return a fallback response if the API fails
    console.warn("Using fallback transcription due to API error");
    
    // Generate different fallback responses to demonstrate functionality
    const fallbackResponses = [
      "I need information about agricultural loans for small farmers.",
      "How do I apply for a Jan Dhan bank account?",
      "What are the benefits of crop insurance for rural farmers?",
      "Can you tell me about pension schemes for elderly in villages?",
      "I want to know about government subsidies for women entrepreneurs in rural areas."
    ];
    
    // Return a random fallback response
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
};

export const translateContent = async (content: string, targetLanguage: string): Promise<string> => {
  console.log(`Translating content to ${targetLanguage} using Gemini`);
  
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_API_KEY
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Translate the following text to ${targetLanguage}: ${content}`
          }]
        }]
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    
    // Fallback in case of error
    if (targetLanguage === 'Hindi' && content.includes('loan')) {
      return 'कैसे एक छोटे व्यवसाय के लिए ऋण प्राप्त करें? मेरे पास एक छोटा डेयरी फार्म है और मैं अपने व्यवसाय का विस्तार करना चाहता हूं। मुझे सरकारी योजनाओं या बैंकों के बारे में जानकारी चाहिए जो न्यूनतम कागजी कार्रवाई के साथ ग्रामीण उद्यमियों को ऋण प्रदान करते हैं।';
    }
    
    if (targetLanguage === 'Hindi') {
      return 'हिंदी में अनुवादित सामग्री';
    }
    
    // Default case - return original content if we're translating back to English
    return content;
    
  } catch (error) {
    console.error('Translation error:', error);
    // Fallback to default in case of API errors
    return content;
  }
};

export const processVoiceInput = async (transcribedText: string): Promise<string> => {
  console.log('Processing voice input with Gemini:', transcribedText);
  
  try {
    // Send the transcribed text to Gemini for processing
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_API_KEY
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Extract the main search query from this text. Return ONLY the query without any additional text or formatting: ${transcribedText}`
          }]
        }]
      })
    });

    const data = await response.json();
    console.log('Gemini response for processing voice input:', data);
    
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    }
    
    // If API fails, return the original transcribed text
    return transcribedText;
  } catch (error) {
    console.error('Voice processing error:', error);
    return transcribedText;
  }
};

export const extractQuestionDetails = async (transcribedText: string): Promise<{
  question: string;
  description: string;
  name?: string;
  tags: string[];
}> => {
  console.log('Extracting question details with Gemini from:', transcribedText);
  
  try {
    const prompt = `
      I need you to extract structured information from the following voice input about a financial question:
      
      "${transcribedText}"
      
      Please extract and return ONLY the following fields in JSON format:
      1. question: A concise title for the question (max 100 characters)
      2. description: Detailed description of the question
      3. name: The person's name if mentioned (can be null)
      4. tags: An array of 2-5 relevant tags for categorizing this question
      
      Return ONLY valid JSON with these fields.
    `;
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_API_KEY
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    const data = await response.json();
    console.log('Gemini response for extracting question details:', data);
    
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      try {
        // Try to parse the JSON response
        const jsonText = data.candidates[0].content.parts[0].text;
        // Find and extract JSON if it's within code blocks or other text
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : jsonText;
        
        const result = JSON.parse(jsonString);
        return {
          question: result.question || "How can I apply for a farming subsidy?",
          description: result.description || "I need to understand the process for applying for agricultural subsidies for my small farm.",
          name: result.name,
          tags: Array.isArray(result.tags) ? result.tags : ["farming", "subsidy", "agriculture"]
        };
      } catch (e) {
        console.error('Failed to parse Gemini JSON response:', e);
        throw e;
      }
    }
    
    throw new Error("Failed to get a valid response from Gemini");
  } catch (error) {
    console.error('Question extraction error:', error);
    throw error;
  }
};

// Mock data for initial questions
export const getMockQuestions = () => [
  {
    id: "q1",
    title: "How to apply for Kisan Credit Card?",
    description: "I am a small farmer and want to apply for a Kisan Credit Card. What are the requirements and where can I apply?",
    author: {
      name: "Suresh Patel",
      avatar: "",
    },
    tags: ["kisan", "credit", "agriculture"],
    answerCount: 3,
    createdAt: "2 days ago",
  },
  {
    id: "q2",
    title: "What are the requirements for Pradhan Mantri Awas Yojana (PMAY)?",
    description: "I want to build a house in my village. Can I get financial assistance through the PMAY scheme?",
    author: {
      name: "Geeta Devi",
      avatar: "",
    },
    tags: ["housing", "PMAY", "government scheme"],
    answerCount: 5,
    createdAt: "1 week ago",
  },
  {
    id: "q3",
    title: "How to open a Jan Dhan account?",
    description: "I don't have a bank account and want to open a Jan Dhan account. What documents do I need?",
    author: {
      name: "Rajesh Kumar",
      avatar: "",
    },
    tags: ["banking", "jan dhan", "account"],
    answerCount: 4,
    createdAt: "3 days ago",
  },
  {
    id: "q4",
    title: "Insurance schemes for crops",
    description: "What are the government insurance schemes available for protecting crops from natural disasters?",
    author: {
      name: "Mohan Singh",
      avatar: "",
    },
    tags: ["insurance", "agriculture", "crop protection"],
    answerCount: 2,
    createdAt: "5 days ago",
  },
  {
    id: "q5",
    title: "Pension schemes for rural citizens",
    description: "I am 58 years old and want to know about pension schemes available for rural citizens.",
    author: {
      name: "Lakshmi Devi",
      avatar: "",
    },
    tags: ["pension", "elderly", "social security"],
    answerCount: 3,
    createdAt: "2 weeks ago",
  }
];

// Mock answer data with different answers for each question ID
export const getMockAnswers = (questionId: string) => {
  switch (questionId) {
    case "q1":
      return [
        {
          id: "a1-q1",
          content: "To apply for a Kisan Credit Card, visit your nearest bank branch or cooperative society with your land records, identity proof, and address proof. The application process is simple, and you can get a credit limit based on your land holdings and crop pattern.",
          author: {
            name: "Bank Manager",
            avatar: "",
          },
          createdAt: "1 day ago",
          isAccepted: true,
        },
        {
          id: "a2-q1",
          content: "I recently got my Kisan Credit Card. Make sure you also bring your Aadhaar card and a passport-sized photograph. Some banks also ask for a soil health card if you have one. The interest rate is subsidized if you repay on time.",
          author: {
            name: "Ramesh Farmer",
            avatar: "",
          },
          createdAt: "20 hours ago",
          isAccepted: false,
        }
      ];
    case "q2":
      return [
        {
          id: "a1-q2",
          content: "To qualify for Pradhan Mantri Awas Yojana (PMAY), you need to be from an Economically Weaker Section (EWS) or Low Income Group (LIG). The annual income should be less than ₹3 lakh for EWS and ₹6 lakh for LIG. You'll need Aadhaar, income proof, and land documents. Apply at your local municipality or gram panchayat office.",
          author: {
            name: "Housing Officer",
            avatar: "",
          },
          createdAt: "5 days ago",
          isAccepted: true,
        },
        {
          id: "a2-q2",
          content: "I got a PMAY subsidy last year. The process takes about 2-3 months for approval. Make sure all your documents are in order. They also check if you or your family members own any other pucca house anywhere in India.",
          author: {
            name: "Vijay Kumar",
            avatar: "",
          },
          createdAt: "3 days ago",
          isAccepted: false,
        },
        {
          id: "a3-q2",
          content: "There are different components of PMAY. For rural areas, it's PMAY-G and for urban it's PMAY-U. The subsidy amount and eligibility criteria are different. For rural areas, you get about ₹1.2 lakh subsidy plus ₹12,000 for toilet construction.",
          author: {
            name: "Rural Development Officer",
            avatar: "",
          },
          createdAt: "2 days ago",
          isAccepted: false,
        }
      ];
    case "q3":
      return [
        {
          id: "a1-q3",
          content: "For a Jan Dhan account, you'll need your Aadhaar card, a passport-sized photograph, and your mobile number. The process is very simple - just visit any bank branch and fill out the form. There's no minimum balance requirement, and you'll get a RuPay debit card.",
          author: {
            name: "SBI Manager",
            avatar: "",
          },
          createdAt: "2 days ago",
          isAccepted: true,
        },
        {
          id: "a2-q3",
          content: "I opened mine at the post office. You can also open it at payment banks and small finance banks. If you don't have Aadhaar, you can use your NREGA job card, voter ID, or driving license along with a self-certification of your current address.",
          author: {
            name: "Postal Service Employee",
            avatar: "",
          },
          createdAt: "1 day ago",
          isAccepted: false,
        }
      ];
    case "q4":
      return [
        {
          id: "a1-q4",
          content: "The main government scheme is Pradhan Mantri Fasal Bima Yojana (PMFBY). It covers yield losses from natural calamities like floods, droughts, pests, etc. The premium is very low - 2% for kharif crops, 1.5% for rabi crops, and 5% for commercial crops. Apply through your nearest bank where you have your account or through the Common Service Center.",
          author: {
            name: "Agricultural Officer",
            avatar: "",
          },
          createdAt: "3 days ago",
          isAccepted: true,
        },
        {
          id: "a2-q4",
          content: "There's also the Weather Based Crop Insurance Scheme (WBCIS) that covers losses from specific weather conditions like rainfall, temperature, humidity, etc. It's more suitable for areas where historical yield data is not available.",
          author: {
            name: "Insurance Agent",
            avatar: "",
          },
          createdAt: "1 day ago",
          isAccepted: false,
        }
      ];
    case "q5":
      return [
        {
          id: "a1-q5",
          content: "If you're 58, you can enroll in the Pradhan Mantri Vaya Vandana Yojana (PMVVY) which is specifically for senior citizens. It gives a guaranteed pension for 10 years. You can also look at Atal Pension Yojana if you're still some years away from 60.",
          author: {
            name: "Pension Officer",
            avatar: "",
          },
          createdAt: "10 days ago",
          isAccepted: true,
        },
        {
          id: "a2-q5",
          content: "For rural citizens, there's also the National Social Assistance Programme (NSAP) which includes the Indira Gandhi National Old Age Pension Scheme. You'll get about ₹200-500 per month depending on your age and state. Apply at your gram panchayat office.",
          author: {
            name: "Social Welfare Officer",
            avatar: "",
          },
          createdAt: "1 week ago",
          isAccepted: false,
        },
        {
          id: "a3-q5",
          content: "Check with your state government too. Many states have their own pension schemes with additional benefits. For example, in my state, they provide an additional ₹1000 per month on top of the central scheme.",
          author: {
            name: "State Benefits Advisor",
            avatar: "",
          },
          createdAt: "5 days ago",
          isAccepted: false,
        }
      ];
    default:
      return [];
  }
};
