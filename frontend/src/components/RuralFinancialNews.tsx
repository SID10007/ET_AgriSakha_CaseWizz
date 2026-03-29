import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import SliderYouTube from "./SliderYouTube";
import Ragi1 from "../images/1M_Ragi.png";
import Ragi3 from "../images/3M_Ragi.png";
import Ragi6 from "../images/6M_Ragi.png";
import Tomato1 from "../images/1M_Tomato.png";
import Tomato3 from "../images/3M_Tomato.png";
import Tomato6 from "../images/6M_Tomato.png";
import Rice1 from "../images/1M_Rice.png";
import Rice3 from "../images/3M_Rice.jpg";
import Rice6 from "../images/6M_Rice.jpg";
import Wheat1 from "../images/1M_Wheat.jpg";
import Wheat3 from "../images/3M_Wheat.jpg";
import Wheat6 from "../images/6M_Wheat.png";
import NewGraphs from "./NewGraphs";
import Layout from "./Layout";
import QuickQuizModal from "./QuickQuizModal";
import { useToast } from "../hooks/use-toast";
import { Toaster } from "./extraComponents/toaster";
import {
  Calendar,
  BookOpen,
  Volume2,
  Bookmark,
  BookMarked,
  Zap,
  Star,
  Lightbulb,
  ArrowRight,
  Mic,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";


interface NewsData {
  news: string;
}

interface GraphData {
  id: string;
  name: string;
}

interface AudioRecordingState {
  isRecording: boolean;
  chunks: Blob[];
  recorder: MediaRecorder | null;
}

interface LiteracyLevel {
  value: "poor" | "good" | "very good" | null;
  label: string;
}
interface KeywordsData {
  keywords: string;
}

// Add missing type definitions
interface User {
  id: string;
  "1m": string;
  "3m": string;
  "6m": string;
}

interface EnglishItem {
  id: number;
  headline: string;
  content: string;
  publishDate: string;
}

interface HindiItem {
  id: number;
  headline: string;
  content: string;
  publishDate: string;
}

interface NewsCardData {
  category: string;
  headline: string;
  summary: string;
  readMinutes: number;
  imageUrl: string;
  /** Present when backend used Unsplash keyword search */
  imageSearchQuery?: string;
}

interface DashboardPayload {
  news_cards: NewsCardData[];
  word_of_the_day: {
    word: string;
    phonetic: string;
    definition: string;
  };
  word_of_the_day_list?: Array<{
    word: string;
    phonetic: string;
    definition: string;
  }>;
  quick_quiz: {
    title: string;
    description: string;
    topic: string;
    topicIsNew: boolean;
    difficulty: string;
    ctaLabel: string;
  };
  farmer_tip: string;
}

interface GlossaryEntry {
  word: string;
  definition: string;
  phonetic?: string;
  savedAt: number;
}

const CARD_IMAGES: Record<string, string> = {
  SUSTAINABILITY:
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop",
  TECHNOLOGY:
    "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=400&fit=crop",
  MARKET:
    "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=400&fit=crop",
  POLICY:
    "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=400&fit=crop",
};

function inferCategoryLabel(headline: string, summary: string): string {
  const blob = `${headline} ${summary}`.toLowerCase();
  if (/\b(soil|organic|sustain|carbon|water|climate|green)\b/.test(blob)) {
    return "SUSTAINABILITY";
  }
  if (/\b(tech|sensor|digital|drone|app|ai|smart|iot)\b/.test(blob)) {
    return "TECHNOLOGY";
  }
  if (/\b(market|price|export|trade|commodity|msp|mandi)\b/.test(blob)) {
    return "MARKET";
  }
  return "POLICY";
}

/** Visible rows in the news slideshow viewport */
const VISIBLE_NEWS_SLOTS = 4;
/** Time between each downward slide (ms) */
const NEWS_SLIDE_INTERVAL_MS = 4200;
const CATEGORY_BADGE: Record<string, string> = {
  TECHNOLOGY: "bg-[#e8efe0] text-[#2d4a22]",
  POLICY: "bg-[#e8dfd0] text-[#5c4a32]",
  SUSTAINABILITY: "bg-[#d8ead8] text-[#1e3d2f]",
  MARKET: "bg-[#fff3c4] text-[#003322]",
};

function fallbackDashboardFromArticles(
  arts: { heading: string; desc: string }[]
): DashboardPayload {
  const cards: NewsCardData[] = arts.slice(0, 10).map((a) => {
    const cat = inferCategoryLabel(a.heading, a.desc);
    let summary = a.desc;
    if (summary.length > 220) summary = summary.slice(0, 217).trimEnd() + "...";
    const readMinutes = Math.max(3, Math.min(12, Math.ceil(summary.length / 45) + 2));
    return {
      category: cat,
      headline: a.heading,
      summary,
      readMinutes,
      imageUrl: CARD_IMAGES[cat] ?? CARD_IMAGES.POLICY,
    };
  });
  return {
    news_cards: cards,
    word_of_the_day: {
      word: "Irrigation",
      phonetic: "/ˌɪrɪˈɡeɪʃən/",
      definition:
        "The supply of water to land or crops to help growth, typically by means of channels or sprinklers.",
    },
    word_of_the_day_list: [
      {
        word: "Irrigation",
        phonetic: "/ˌɪrɪˈɡeɪʃən/",
        definition:
          "The supply of water to land or crops to help growth, typically by means of channels or sprinklers.",
      },
    ],
    quick_quiz: {
      title: "How healthy is your soil?",
      description:
        "Test your knowledge on Sustainable Pest Management and earn the Soil Protector badge.",
      topic: "Pest Control",
      topicIsNew: true,
      difficulty: "Intermediate",
      ctaLabel: "Start Quiz",
    },
    farmer_tip:
      "Rotate your nitrogen-heavy crops with legumes like peas or beans to naturally restore soil balance.",
  };
}

const RuralFinancialNews: React.FC = () => {
  const { toast } = useToast();
  
  // Loading states for different sections
  const [newsLoading, setNewsLoading] = useState<boolean>(true);
  const [keywordsLoading, setKeywordsLoading] = useState<boolean>(true);
  const [youtubeLoading, setYoutubeLoading] = useState<boolean>(true);
  const [graphsLoading, setGraphsLoading] = useState<boolean>(false);

  const [nameRecording, setNameRecording] = useState<AudioRecordingState>({
    isRecording: false,
    chunks: [],
    recorder: null,
  });
  const [nameStatus, setNameStatus] = useState<string>(
    "Status: Waiting for input..."
  );
  const [nameProcessing, setNameProcessing] = useState<boolean>(false);

  // State for managing query recording
  const [queryRecording, setQueryRecording] = useState<AudioRecordingState>({
    isRecording: false,
    chunks: [],
    recorder: null,
  });
  const [queryStatus, setQueryStatus] = useState<string>("Query: None");
  const [queryProcessing, setQueryProcessing] = useState<boolean>(false);

  // State for literacy level
  const [literacyLevel, setLiteracyLevel] = useState<LiteracyLevel>({
    value: null,
    label: "Status: Literacy level not set.",
  });

  const [news, setNews] = useState<string>("Loading latest news...");
  const [keywords, setKeywords] = useState<string[]>(["Loading keywords..."]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [response, setResponse] = useState<string>(
    "Response will appear here..."
  );
  const [isPlayingResponse, setIsPlayingResponse] = useState<boolean>(false);
  const [detectedLanguageCode, setDetectedLanguageCode] =
    useState<string>("en");
  const [showPlayButton, setShowPlayButton] = useState<boolean>(false);

  const users: User[] = [
    {
      id: "Ragi",
      "1m": Ragi1,
      "3m": Ragi3,
      "6m": Ragi6
    },
    { id: "Tomato",
      "1m": Tomato1, 
      "3m": Tomato3, 
      "6m": Tomato6 
    },
    { id: "Rice", 
      "1m": Rice1, 
      "3m": Rice3, 
      "6m": Rice6 
    },
    { id: "Wheat", 
      "1m": Wheat1, 
      "3m": Wheat3, 
      "6m": Wheat6 
    },
  ];

  const [egnlishItems, setEnglishItems] = useState<EnglishItem[]>([
    {
      id: 1,
      headline: "India Seeks Parliament's Nod for Extra Spending",
      content: "The government is asking for approval to spend an extra 514.63 billion rupees ($5.90 billion) in the current fiscal year, mainly to upgrade telecom networks in underserved areas and fund a new pension scheme for federal employees.",
      publishDate: "Mar 10, 2025"
    },
    {
      id: 2,
      headline: "Dulloo Urges Banks to Strengthen Rural Services",
      content: "At the 15th Union Territory Level Bankers’ Committee meeting in Jammu, Chief Secretary Atal Dulloo called on banks to expand their reach by setting up touchpoints in unbanked rural centers by June, stressing improved KYC compliance to boost local credit access.",
      publishDate: "Mar 10, 2025"
    },
    {
      id: 3,
      headline: "Women’s Day Survey: Rural Women Entrepreneurs Save Diligently",
      content: "A survey by Haqdarshak and DBS Bank India reveals that 90% of rural women entrepreneurs save part of their income, with 33% saving between 20% and 50%. The study highlights evolving financial decision-making in rural households and emphasizes the need for digital banking enhancements.",
      publishDate: "Mar 10, 2025"
    }, {
      id: 4,
      headline: "DAY-NRLM Webinar: Targeting the Last Mile",
      content: "A webinar under the DAY-NRLM banner discussed strategies to reach the last mile in rural areas, emphasizing the role of technology and community networks in ensuring that subsidized credit and benefit transfers reach vulnerable populations.",
      publishDate: "Mar 05, 2025"
    },
    {
      id: 5,
      headline: "Expert Praises Government’s Efforts in Women Empowerment",
      content: "A MIT professor commended recent government initiatives targeting women empowerment in rural India. Enhanced access to financial services and targeted support programs are reportedly shifting traditional decision-making dynamics in rural households.",
      publishDate: "Mar 01, 2025"
    },
    {
      id: 6,
      headline: "Rural India’s Learning Curve: Time Use Survey Findings",
      content: "The latest MoSPI Time Use Survey shows rural residents spent 90 minutes daily on learning activities in 2024, a slight decline from previous years, but still robust compared to urban areas. This data may drive future investments in rural education and digital learning.",
      publishDate: "Mar 04, 2025"
    },
    {
      id: 7,
      headline: "Rural Loan Defaults on the Rise, Warns Private Banks",
      content: "Private banks are witnessing an uptick in defaults on small and personal loans in rural areas due to slower economic growth. Tighter lending rules introduced recently are expected to stabilize asset quality by mid-2025 despite current challenges.",
      publishDate: "Mar 10, 2025"
    },
    {
      id: 8,
      headline: "Budget for Rural Subsidies Remains Steady",
      content: "India’s federal government will maintain a subsidy allocation of 4.57 trillion rupees for food, fertilisers, and rural employment schemes in the next fiscal year, reflecting ongoing support for rural livelihoods amid urban slowdowns.",
      publishDate: "Mar 06, 2025"
    },
    {
      id: 9,
      headline: "Budget Reforms Aim to Boost Household Consumption",
      content: "The new Union Budget introduces income tax cuts for the middle class and boosts spending on agriculture and rural development, aiming to increase disposable income and drive growth in rural areas. Subsidized credit for farmers is also set to be expanded.",
      publishDate: "Mar 06, 2025"
    },
    {
      id: 10,
      headline: "Rural Consumer Spending Drives FMCG Growth",
      content: "NielsenIQ reports a 10.6% sales growth in the FMCG sector driven by strong rural demand, with increased spending on staples like edible oil and wheat flour. Rural markets continue to outperform urban areas, signaling rising consumer power in the countryside.",
      publishDate: "Mar 10, 2025"
    },
  ]);
  const [hindiItems, setHindiItems] = useState<HindiItem[]>([
    {
      id: 1,
      headline: "भारत संसद से अतिरिक्त खर्च की मंजूरी चाहता है",
      content: "सरकार चालू वित्त वर्ष में अतिरिक्त 514.63 अरब रुपये (5.90 अरब डॉलर) खर्च करने की मंजूरी मांग रही है, मुख्य रूप से कम सेवा वाले क्षेत्रों में दूरसंचार नेटवर्क को उन्नत करने और संघीय कर्मचारियों के लिए एक नई पेंशन योजना को निधि देने के लिए।",
      publishDate: "Mar 10, 2025"
    },
    {
      id: 2,
      headline: "डुल्लू ने बैंकों से ग्रामीण सेवाओं को मजबूत करने का आग्रह किया",
      content: "जम्मू में 15वीं केंद्र शासित प्रदेश स्तरीय बैंकर्स समिति की बैठक में, मुख्य सचिव अटल डुल्लू ने बैंकों से जून तक गैर-बैंकिंग ग्रामीण केंद्रों में टचप्वाइंट स्थापित करके अपनी पहुंच का विस्तार करने का आह्वान किया, स्थानीय ऋण पहुंच को बढ़ावा देने के लिए बेहतर केवाईसी अनुपालन पर जोर दिया।",
      publishDate: "Mar 10, 2025"
    },
    {
      id: 3,
      headline: "महिला दिवस सर्वेक्षण: ग्रामीण महिला उद्यमी लगन से बचत करती हैं",
      content: "हकदर्शक और डीबीएस बैंक इंडिया के एक सर्वेक्षण से पता चलता है कि 90% ग्रामीण महिला उद्यमी अपनी आय का कुछ हिस्सा बचाती हैं, जिनमें से 33% 20% से 50% के बीच बचत करती हैं। अध्ययन में ग्रामीण घरों में विकसित हो रहे वित्तीय निर्णय लेने पर प्रकाश डाला गया है और डिजिटल बैंकिंग संवर्द्धन की आवश्यकता पर जोर दिया गया है।",
      publishDate: "Mar 10, 2025"
    }, {
      id: 4,
      headline: "डी ए वाई-एनआरएलएम वेबिनार: अंतिम मील को लक्षित करना",
      content: "डी ए वाई-एनआरएलएम बैनर के तहत एक वेबिनार में ग्रामीण क्षेत्रों में अंतिम मील तक पहुंचने की रणनीतियों पर चर्चा की गई, जिसमें रियायती ऋण और लाभ हस्तांतरण को कमजोर आबादी तक पहुंचाने में प्रौद्योगिकी और सामुदायिक नेटवर्क की भूमिका पर जोर दिया गया।",
      publishDate: "Mar 05, 2025"
    },
    {
      id: 5,
      headline: "विशेषज्ञ ने महिला सशक्तिकरण में सरकार के प्रयासों की सराहना की",
      content: "एम आई टी के एक प्रोफेसर ने ग्रामीण भारत में महिला सशक्तिकरण को लक्षित करने वाली हालिया सरकारी पहलों की सराहना की। कथित तौर पर वित्तीय सेवाओं तक बेहतर पहुंच और लक्षित समर्थन कार्यक्रम ग्रामीण घरों में पारंपरिक निर्णय लेने की गतिशीलता को बदल रहे हैं।",
      publishDate: "Mar 01, 2025"
    },
    {
      id: 6,
      headline: "ग्रामीण भारत का लर्निंग कर्व: टाइम यूज सर्वे के निष्कर्ष",
      content: "नवीनतम एमओएसपीआई टाइम यूज सर्वे से पता चलता है कि ग्रामीण निवासियों ने 2024 में सीखने की गतिविधियों पर प्रतिदिन 90 मिनट बिताए, जो पिछले वर्षों की तुलना में थोड़ी गिरावट है, लेकिन फिर भी शहरी क्षेत्रों की तुलना में मजबूत है। यह डेटा ग्रामीण शिक्षा और डिजिटल सीखने में भविष्य के निवेश को बढ़ावा दे सकता है।",
      publishDate: "Mar 04, 2025"
    },
    {
      id: 7,
      headline: "ग्रामीण ऋण चूक में वृद्धि, निजी बैंकों की चेतावनी",
      content: "निजी बैंक धीमी आर्थिक विकास के कारण ग्रामीण क्षेत्रों में छोटे और व्यक्तिगत ऋणों पर चूक में वृद्धि देख रहे हैं। हाल ही में पेश किए गए सख्त ऋण नियमों से वर्तमान चुनौतियों के बावजूद मध्य 2025 तक संपत्ति की गुणवत्ता स्थिर होने की उम्मीद है।",
      publishDate: "Mar 10, 2025"
    },
    {
      id: 8,
      headline: "ग्रामीण सब्सिडी के लिए बजट स्थिर बना हुआ है",
      content: "भारत की संघीय सरकार अगले वित्तीय वर्ष में भोजन, उर्वरक और ग्रामीण रोजगार योजनाओं के लिए 4.57 ट्रिलियन रुपये का सब्सिडी आवंटन बनाए रखेगी, जो शहरी मंदी के बीच ग्रामीण आजीविका के लिए चल रहे समर्थन को दर्शाता है।",
      publishDate: "Mar 06, 2025"
    },
    {
      id: 9,
      headline: "बजट सुधारों का उद्देश्य घरेलू खपत को बढ़ावा देना है",
      content: "The new Union Budget introduces income tax cuts for the middle class and boosts spending on agriculture and rural development, aiming to increase disposable income and drive growth in rural areas. Subsidized credit for farmers is also set to be expanded.",
      publishDate: "Mar 06, 2025"
    },
    {
      id: 10,
      headline: "ग्रामीण उपभोक्ता खर्च से एफएमसीजी विकास को गति मिली",
      content: "नए केंद्रीय बजट में मध्यम वर्ग के लिए आयकर में कटौती और कृषि और ग्रामीण विकास पर खर्च में वृद्धि की गई है, जिसका उद्देश्य ग्रामीण क्षेत्रों में प्रयोज्य आय को बढ़ाना और विकास को बढ़ावा देना है। किसानों के लिए रियायती ऋण का भी विस्तार किया जाना तय है।",
      publishDate: "Mar 10, 2025"
    },
  ]);

  // Show welcome toast on component mount
  useEffect(() => {
    toast({
      title: "Welcome to Rural Financial News",
      description: "Loading latest agricultural updates and insights...",
      variant: "info",
    });
  }, [toast]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("agri_glossary");
      if (raw) {
        const parsed = JSON.parse(raw) as GlossaryEntry[];
        if (Array.isArray(parsed)) {
          setGlossaryItems(parsed);
        }
      }
    } catch {
      // Ignore parse errors and continue with empty glossary.
    }
  }, []);

  // Audio reference
  const responseAudioRef = useRef<HTMLAudioElement | null>(null);

  // const english = "english it is";
  // const hindi = "hindi it is";
  // useEffect(() => {
  //   // Fetch news data
  //   fetch("http://127.0.0.1:6484//fetch_news")
  //     .then((response) => response.json())
  //     .then((data: NewsData) => {
  //       if (data.news) {
  //         // Split news and keywords at "5 Key Words"
  //         const [newsContent, keywordsContent] = data.news.split("5 Key Words");

  //         // Set news content with bullet points
  //         const formattedNews = newsContent
  //           .split("*")
  //           .map((point) => point.trim())
  //           .filter((point) => point.length > 0)
  //           .join("\n• ");
  //         setNews("• " + formattedNews);
  //         localStorage.setItem("news", formattedNews);

  //         // Extract and format keywords
  //         const keywordsList = keywordsContent
  //           .split(/\d+\.\s+\*\*/)
  //           .map((keyword) => keyword.trim())
  //           .filter(
  //             (keyword) =>
  //               keyword.length > 0 &&
  //               !keyword.includes("with Short Descriptions:")
  //           );

  //         setKeywords(keywordsList);
  //         localStorage.setItem("keywords", keywordsList.join("\n"));
  //       } else {
  //         // If no data from backend, get from localStorage
  //         const savedNews = localStorage.getItem("news");
  //         const savedKeywords = localStorage.getItem("keywords");

  //         if (savedNews) {
  //           setNews("• " + savedNews);
  //         } else {
  //           setNews("No news available");
  //         }

  //         if (savedKeywords) {
  //           setKeywords(savedKeywords.split("\n"));
  //         } else {
  //           setKeywords(["No keywords available"]);
  //         }
  //       }
  //     })
  //     .catch((error) => {
  //       console.error("Error fetching news:", error);
  //       // On error, try to get from localStorage
  //       const savedNews = localStorage.getItem("news");
  //       const savedKeywords = localStorage.getItem("keywords");

  //       if (savedNews) {
  //         setNews("• " + savedNews);
  //       } else {
  //         setNews("Failed to load news. Please try again later.");
  //       }

  //       if (savedKeywords) {
  //         setKeywords(savedKeywords.split("\n"));
  //       } else {
  //         setKeywords(["Failed to load keywords. Please try again later."]);
  //       }
  //     });

  // }, []);

  const [youtubeIndex, setYoutubeIndex] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [selectedStory, setSelectedStory] = useState<NewsCardData | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [glossaryItems, setGlossaryItems] = useState<GlossaryEntry[]>([]);
  const [pronunciationOpen, setPronunciationOpen] = useState(false);
  const [pronunciationTranscript, setPronunciationTranscript] = useState("");
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [pronunciationListening, setPronunciationListening] = useState(false);
  const [pronunciationTarget, setPronunciationTarget] = useState<{
    word: string;
    phonetic?: string;
    definition?: string;
  } | null>(null);
  const [selectedWordIndex, setSelectedWordIndex] = useState(0);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore stop errors during unmount.
        }
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pollAttempts = 0;

    // Fetch YouTube index data
    setYoutubeLoading(true);
    fetch("http://127.0.0.1:7863/")
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data.yt_index)) {
          setYoutubeIndex(data.yt_index);
        } else if (data && data.yt_index) {
          setYoutubeIndex([data.yt_index]);
        } else {
          setYoutubeIndex([]);
        }
        setYoutubeLoading(false);
        toast({
          title: "YouTube Data Loaded",
          description: "Expert financial insights are ready!",
          variant: "success",
        });
      })
      .catch((error) => {
        console.error("Error fetching YouTube index:", error);
        if (!cancelled) {
          setYoutubeIndex([]);
          setYoutubeLoading(false);
          toast({
            title: "YouTube Data Error",
            description: "Failed to load expert insights. Please try again.",
            variant: "destructive",
          });
        }
      });

    const loadNews = () => {
      setNewsLoading(true);
      setKeywordsLoading(true);
      fetch("http://localhost:7864/api/get-news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language: detectedLanguageCode }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          if (data.status === "fetching" || !data.news_content) {
            pollAttempts += 1;
            if (pollAttempts > 30) {
              setNewsLoading(false);
              setKeywordsLoading(false);
              setDashboard(fallbackDashboardFromArticles([]));
              toast({
                title: "News Loading Timeout",
                description: "Could not load fresh news in time. Showing placeholders.",
                variant: "destructive",
              });
              return;
            }
            setTimeout(loadNews, 2000);
            return;
          }

          const rawArt = data.news_content.news_article ?? "";
          const matchesArt = rawArt.matchAll(/\*\*([^*]+)\*\*: ([^\n]+)/g);

          const formattedArt = Array.from(matchesArt, (m) => {
            const match = m as RegExpMatchArray;
            return {
              heading: match[1].trim(),
              desc: match[2].trim(),
            };
          });

          const fromApi = data.news_content.dashboard as DashboardPayload | undefined;
          if (fromApi?.news_cards?.length) {
            setDashboard(fromApi);
          } else {
            setDashboard(
              formattedArt.length
                ? fallbackDashboardFromArticles(formattedArt)
                : fallbackDashboardFromArticles([])
            );
          }

          setNewsLoading(false);
          setKeywordsLoading(false);

          toast({
            title: "News & Keywords Loaded",
            description: "Latest agricultural updates are ready!",
            variant: "success",
          });
        })
        .catch((err) => {
          console.error("Error fetching:", err);
          if (!cancelled) {
            setNewsLoading(false);
            setKeywordsLoading(false);
            setDashboard(fallbackDashboardFromArticles([]));
            toast({
              title: "News Loading Error",
              description: "Failed to load latest news. Please try again.",
              variant: "destructive",
            });
          }
        });
    };

    loadNews();
    return () => {
      cancelled = true;
    };
  }, [detectedLanguageCode, toast]);

  const startRecording = async (type: "name" | "query") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        processRecording(type, chunks);
      };

      mediaRecorder.start();

      if (type === "name") {
        setNameRecording({
          isRecording: true,
          chunks: [],
          recorder: mediaRecorder,
        });
        setNameStatus("Recording...");
        toast({
          title: "Recording Started",
          description: "Listening for your name...",
          variant: "info",
        });
      } else {
        setQueryRecording({
          isRecording: true,
          chunks: [],
          recorder: mediaRecorder,
        });
        setQueryStatus("Recording...");
        toast({
          title: "Recording Started",
          description: "Listening for your question...",
          variant: "info",
        });
      }
    } catch (error) {
      console.error(`Error starting ${type} recording:`, error);
      if (type === "name") {
        setNameStatus("Error accessing microphone.");
      } else {
        setQueryStatus("Error accessing microphone.");
      }
      toast({
        title: "Microphone Error",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Function to stop recording
  const stopRecording = (type: "name" | "query") => {
    if (type === "name" && nameRecording.recorder) {
      nameRecording.recorder.stop();
      nameRecording.recorder.stream
        .getTracks()
        .forEach((track) => track.stop());
      setNameRecording((prev) => ({ ...prev, isRecording: false }));
      setNameStatus("Processing audio...");
      setNameProcessing(true);
      toast({
        title: "Processing Audio",
        description: "Converting your voice to text...",
        variant: "info",
      });
    } else if (type === "query" && queryRecording.recorder) {
      queryRecording.recorder.stop();
      queryRecording.recorder.stream
        .getTracks()
        .forEach((track) => track.stop());
      setQueryRecording((prev) => ({ ...prev, isRecording: false }));
      setQueryStatus("Processing audio...");
      setQueryProcessing(true);
      toast({
        title: "Processing Audio",
        description: "Converting your voice to text...",
        variant: "info",
      });
    }
  };

  // Function to process recording
  const processRecording = async (type: "name" | "query", chunks: Blob[]) => {
    const audioBlob = new Blob(chunks, { type: "audio/wav" });
    const formData = new FormData();
    formData.append("audio", audioBlob);

    try {
      if (type === "name") {
        const response = await fetch("http://127.0.0.1:5000/ey_get_name", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        setNameProcessing(false);

        if (data.error) {
          setNameStatus(data.error);
          console.error(data.error);
          toast({
            title: "Name Processing Error",
            description: data.error,
            variant: "destructive",
          });
          return;
        }

        setNameStatus(`${data.message}`);
        toast({
          title: "Name Processed",
          description: `Hello, ${data.message}!`,
          variant: "success",
        });
      } else if (type === "query") {
        const response = await fetch("http://127.0.0.1:5000/ey_query", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        setQueryProcessing(false);

        if (data.error) {
          setQueryStatus(data.error);
          console.error(data.error);
          toast({
            title: "Query Processing Error",
            description: data.error,
            variant: "destructive",
          });
          return;
        }

        setQueryStatus(`Query: ${data.query || "No query available."}`);
        setResponse(data.response || "No response available.");
        setDetectedLanguageCode(data.language_code || "en");
        if (data.response) setShowPlayButton(true);
        
        toast({
          title: "Response Generated",
          description: "AI has processed your query successfully!",
          variant: "success",
        });
      }
    } catch (error) {
      console.error(`Error processing ${type} recording:`, error);
      if (type === "name") {
        setNameProcessing(false);
        setNameStatus("Error processing audio.");
      } else if (type === "query") {
        setQueryProcessing(false);
        setQueryStatus("Error processing query.");
      }
      toast({
        title: "Processing Error",
        description: "Failed to process audio. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to set literacy level
  const handleSetLiteracyLevel = async (
    level: "poor" | "good" | "very good"
  ) => {
    try {
      const response = await fetch("http://127.0.0.1:5000/ey_set_literacy_level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ literacy_level: level }),
      });

      const data = await response.json();
      console.log(data.message);
      setLiteracyLevel({
        value: level,
        label: data.message || `Status: Literacy level set to ${level}.`,
      });
      
      toast({
        title: "Literacy Level Set",
        description: `Response will be tailored for ${level} literacy level.`,
        variant: "success",
      });
    } catch (error) {
      console.error("Error setting literacy level:", error);
      setLiteracyLevel({
        value: null,
        label: "Status: Error setting literacy level.",
      });
      
      toast({
        title: "Literacy Level Error",
        description: "Failed to set literacy level. Please try again.",
        variant: "destructive",
      });
    }
  };
  const newsArray = [
    "India's gross GST collections rose by 9.1% year-on-year in February, reaching ₹1.83 lakh crore, reflecting an economic rebound. This increase in GST collections is expected to boost government revenues, which can be utilized for rural development initiatives.",
    "Retail inflation for farm and rural workers eased to 5.01 per cent and 5.05 per cent in December from 5.35 per cent and 5.47 per cent, respectively. This decline in inflation rates is likely to increase the purchasing power of rural households, enabling them to allocate more resources to essential expenses.",
    "Rural spending may soon align with urban markets, with packaged food and dining out expected to see increased allocation. In rural areas, the allocation for these expenses is projected to rise from 9.4% to 11.3%, while in urban areas, it is expected to increase from 10.6% to 12.3%.",
    "Rural India will propel internet users to over 900 million in 2025, finds a recent study. This rapid growth in internet penetration is expected to bridge the digital divide between urban and rural areas, providing rural residents with access to various online services and opportunities.",
    "The budget is likely to prioritize rural roads, with the PMGSY allocation expected to rise by 10%. This increased investment in rural infrastructure will improve connectivity, facilitate trade, and enhance the overall quality of life in rural areas.",
    "Rural poverty has plunged from 25.7 per cent to 4.86 per cent over 12 years, a testament to targeted interventions. This significant decline in poverty rates is a result of effective government policies and initiatives aimed at promoting rural development and inclusive growth.",

  ];


  // Function to play response
  const playResponse = async () => {
    try {
      toast({
        title: "Generating Audio",
        description: "Converting response to speech...",
        variant: "info",
      });
      
      const apiResponse = await fetch("http://127.0.0.1:5000/ey_play_response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: response,
          language_code: detectedLanguageCode,
        }),
      });

      // console.log(apiResponse.blob())

      if (!apiResponse.ok) {
        console.error("Error generating audio response.");
        toast({
          title: "Audio Generation Error",
          description: "Failed to generate audio response.",
          variant: "destructive",
        });
        return;
      }

      const audioBlob = await apiResponse.blob();
      console.log(audioBlob);
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log(audioUrl);

      if (responseAudioRef.current) {
        responseAudioRef.current.src = audioUrl;
        responseAudioRef.current.play();
        setIsPlayingResponse(true);
        
        toast({
          title: "Audio Playing",
          description: "Response is now playing...",
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Error playing response:", error);
      toast({
        title: "Audio Error",
        description: "Failed to play audio response.",
        variant: "destructive",
      });
    }
  };

  // Function to stop response playback
  const stopResponse = () => {
    if (responseAudioRef.current) {
      responseAudioRef.current.pause();
      responseAudioRef.current.currentTime = 0;
      setIsPlayingResponse(false);
      
      toast({
        title: "Audio Stopped",
        description: "Response playback has been stopped.",
        variant: "info",
      });
    }
  };

  const speakWordOfDay = (word: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast({
        title: "Unavailable",
        description: "Speech synthesis is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }
    const u = new SpeechSynthesisUtterance(word);
    u.lang = detectedLanguageCode === "hi" ? "hi-IN" : "en-IN";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const saveWordToGlossary = (
    word: string,
    definition: string,
    phonetic?: string
  ) => {
    try {
      const key = "agri_glossary";
      const prev = JSON.parse(localStorage.getItem(key) || "[]") as GlossaryEntry[];
      const trimmedWord = word.trim();
      const existing = prev.find(
        (x) => x.word.toLowerCase() === trimmedWord.toLowerCase()
      );
      let updated: GlossaryEntry[];
      if (existing) {
        updated = prev.map((x) =>
          x.word.toLowerCase() === trimmedWord.toLowerCase()
            ? {
                ...x,
                definition: definition || x.definition,
                phonetic: phonetic || x.phonetic,
                savedAt: Date.now(),
              }
            : x
        );
      } else {
        updated = [
          { word: trimmedWord, definition, phonetic, savedAt: Date.now() },
          ...prev,
        ];
      }
      localStorage.setItem(key, JSON.stringify(updated));
      setGlossaryItems(updated);
      toast({
        title: "Saved to My Glossary",
        description: `"${trimmedWord}" is in your glossary list.`,
        variant: "success",
      });
    } catch {
      toast({
        title: "Could not save",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const removeGlossaryWord = (word: string) => {
    const updated = glossaryItems.filter(
      (item) => item.word.toLowerCase() !== word.toLowerCase()
    );
    setGlossaryItems(updated);
    localStorage.setItem("agri_glossary", JSON.stringify(updated));
  };

  const clearGlossary = () => {
    setGlossaryItems([]);
    localStorage.setItem("agri_glossary", JSON.stringify([]));
  };

  const getPronunciationScore = (targetWord: string, spoken: string): number => {
    const normalize = (v: string) =>
      v.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
    const t = normalize(targetWord);
    const s = normalize(spoken);
    if (!t || !s) return 0;
    if (s === t || s.includes(t) || t.includes(s)) return 100;
    const m = t.length;
    const n = s.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = t[i - 1] === s[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    const dist = dp[m][n];
    const score = Math.round((1 - dist / Math.max(m, n)) * 100);
    return Math.max(0, Math.min(100, score));
  };

  const startPronunciationPractice = (
    word: string,
    definition?: string,
    phonetic?: string
  ) => {
    setPronunciationTarget({ word, definition, phonetic });
    setPronunciationTranscript("");
    setPronunciationScore(null);
    setPronunciationOpen(true);
    speakWordOfDay(word);
  };

  const beginPronunciationListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Browser not supported",
        description: "Speech recognition is not available in this browser.",
        variant: "destructive",
      });
      return;
    }
    if (!pronunciationTarget) return;
    const recognition = new SpeechRecognition();
    recognition.lang = detectedLanguageCode === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setPronunciationListening(true);
    recognition.onerror = () => {
      setPronunciationListening(false);
      toast({
        title: "Could not capture voice",
        description: "Please try speaking again in a quieter environment.",
        variant: "destructive",
      });
    };
    recognition.onend = () => setPronunciationListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      setPronunciationTranscript(transcript);
      setPronunciationScore(getPronunciationScore(pronunciationTarget.word, transcript));
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const dash = dashboard ?? fallbackDashboardFromArticles([]);
  const wordChoices = dash.word_of_the_day_list?.length
    ? dash.word_of_the_day_list
    : [dash.word_of_the_day];
  const activeWord =
    wordChoices[Math.min(selectedWordIndex, Math.max(0, wordChoices.length - 1))] ||
    dash.word_of_the_day;

  useEffect(() => {
    setSelectedWordIndex(0);
  }, [dashboard, detectedLanguageCode]);

  const newsCards = dash.news_cards;
  const newsViewportRef = useRef<HTMLDivElement>(null);
  const [viewportH, setViewportH] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);

  const maxSlide = useMemo(
    () => Math.max(0, newsCards.length - VISIBLE_NEWS_SLOTS),
    [newsCards.length]
  );

  useLayoutEffect(() => {
    const el = newsViewportRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      if (h > 0) setViewportH(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    let rafInner = 0;
    const rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(measure);
    });
    return () => {
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
      ro.disconnect();
    };
  }, [newsLoading, newsCards.length]);

  useEffect(() => {
    setSlideIndex(0);
  }, [dashboard, newsCards.length]);

  useEffect(() => {
    if (newsLoading || maxSlide === 0) return;
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i >= maxSlide ? 0 : i + 1));
    }, NEWS_SLIDE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [newsLoading, maxSlide]);

  const cardPx = viewportH > 0 ? viewportH / VISIBLE_NEWS_SLOTS : 0;

    return (
    <Layout activePage="rural-financial-news">
      <Toaster />
      {/* Main Content */}
      <div className="flex-1 flex flex-col">

        {/* Main Content Area — black/yellow primary theme */}
        <main className="flex-1 bg-gradient-to-b from-black to-[#0f0f0f] pt-2 pb-16">
          <div className="container mx-auto px-4 py-10 max-w-7xl">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                Economic Times Hackathon · AgriSakha
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Rural India{" "}
                <span className="text-[#fccd03]">Agricultural</span>{" "}
                <span className="text-[#fccd03]">Insights</span>
              </h1>
              <p className="mt-2 text-gray-300 text-sm md:text-base max-w-2xl mx-auto">
                Curated rural financial news, vocabulary, and quick learning tools for farmers and agri professionals.
              </p>
            </div>

            {/* Dashboard: equal column height — bottoms align (Farmer&apos;s tip pinned to column base) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch lg:gap-8">
              <div className="flex min-h-0 flex-col lg:col-span-7 xl:col-span-8 lg:h-[min(86vh,920px)]">
              {/* Left: vertical slideshow — 4 visible rows, scrolls through all items then loops */}
              <section className="flex flex-col min-h-0 h-full flex-1">
                <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                  <h2 className="text-xl md:text-2xl font-bold text-white font-serif tracking-tight">
                    Recent Agricultural News
                  </h2>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="w-5 h-5 shrink-0" aria-hidden />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mb-3 shrink-0 hidden lg:block">
                  Auto-scrolling slideshow — moves down through every story, then loops to the top
                </p>

                <div
                  ref={newsViewportRef}
                  className="flex-1 min-h-[280px] lg:min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#151515] shadow-sm"
                >
                  {newsLoading ? (
                    <div className="flex h-full flex-col gap-2 p-3">
                      {Array.from({ length: VISIBLE_NEWS_SLOTS }).map((_, index) => (
                        <div
                          key={index}
                          className="flex flex-1 min-h-[64px] gap-4 rounded-xl border border-white/10 bg-[#1d1d1d] p-4 animate-pulse"
                        >
                          <div className="w-24 h-24 shrink-0 rounded-xl bg-white/10" />
                          <div className="flex-1 space-y-3 py-1">
                            <div className="h-3 bg-white/10 rounded w-1/3" />
                            <div className="h-4 bg-white/15 rounded w-5/6" />
                            <div className="h-3 bg-white/10 rounded w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : newsCards.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-8">
                      <p className="text-sm text-gray-300 text-center">
                        No article cards yet. Refresh news from the server or try again shortly.
                      </p>
                    </div>
                  ) : cardPx > 0 ? (
                    <div
                      className="transition-transform duration-[900ms] ease-in-out will-change-transform"
                      style={{
                        transform: `translateY(-${slideIndex * cardPx}px)`,
                      }}
                    >
                      {newsCards.map((card, i) => (
                        <article
                          key={`news-row-${i}-${card.headline.slice(0, 40)}`}
                          style={{ height: cardPx }}
                          className="box-border flex flex-row items-stretch gap-4 border-b border-white/10 px-4 py-3 last:border-b-0"
                        >
                          <div className="shrink-0 self-center">
                            <img
                              src={card.imageUrl}
                              alt=""
                              className="h-[5.25rem] w-[5.25rem] sm:h-28 sm:w-28 object-cover rounded-xl border border-white/10"
                            />
                          </div>
                          <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide sm:text-xs ${
                                  CATEGORY_BADGE[card.category] ?? "bg-[#fccd03]/20 text-[#fccd03]"
                                }`}
                              >
                                {card.category}
                              </span>
                              <span className="text-xs text-gray-400">
                                {card.readMinutes} min read
                              </span>
                            </div>
                            <h3 className="mb-1 line-clamp-2 text-base font-bold leading-snug text-white sm:text-lg">
                              {card.headline}
                            </h3>
                            <p className="mb-2 line-clamp-2 text-sm leading-relaxed text-gray-300">
                              {card.summary}
                            </p>
                            <button
                              type="button"
                              onClick={() => setSelectedStory(card)}
                              className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-[#fccd03] hover:text-[#f5c400]"
                            >
                              Read Full Story
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-sm text-gray-400">
                      Resizing…
                    </div>
                  )}
                </div>
              </section>
              </div>

              {/* Right sidebar — same fixed height as news column; tip at bottom */}
              <aside className="flex min-h-0 flex-col gap-4 lg:col-span-5 xl:col-span-4 lg:h-[min(86vh,920px)] lg:overflow-hidden">
                {/* Word of the Day */}
                <div className="relative rounded-2xl bg-[#121212] border border-white/10 shadow-md overflow-hidden shrink-0">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#fccd03]" />
                  <div className="pl-5 pr-4 py-4">
                    <div className="flex items-center gap-2 text-[#fccd03] font-semibold text-xs uppercase tracking-wider mb-3">
                      <BookOpen className="w-4 h-4" />
                      Word of the Day
                    </div>
                    {keywordsLoading ? (
                      <div className="animate-pulse space-y-2">
                        <div className="h-8 bg-white/10 rounded w-1/2" />
                        <div className="h-3 bg-white/10 rounded w-2/3" />
                        <div className="h-16 bg-white/10 rounded" />
                      </div>
                    ) : (
                      <>
                        <h3 className="text-2xl md:text-3xl font-bold text-white">
                          {activeWord.word}
                        </h3>
                        {activeWord.phonetic ? (
                          <p className="text-sm text-gray-400 font-mono mt-1">
                            {activeWord.phonetic}
                          </p>
                        ) : null}
                        <p className="text-sm text-gray-300 leading-relaxed mt-3">
                          {activeWord.definition}
                        </p>
                        {wordChoices.length > 1 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {wordChoices.map((w, idx) => (
                              <button
                                key={`${w.word}-${idx}`}
                                type="button"
                                onClick={() => setSelectedWordIndex(idx)}
                                className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                                  idx === selectedWordIndex
                                    ? "bg-[#fccd03] text-black border-[#fccd03]"
                                    : "bg-black/30 text-[#fccd03] border-[#fccd03]/30 hover:bg-[#fccd03]/10"
                                }`}
                              >
                                {w.word}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <div className="flex flex-col sm:flex-row gap-2 mt-5">
                          <button
                            type="button"
                            onClick={() =>
                              startPronunciationPractice(
                                activeWord.word,
                                activeWord.definition,
                                activeWord.phonetic
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fccd03] text-black text-sm font-semibold px-4 py-2.5 hover:bg-[#f5c400] transition-colors"
                          >
                            <Volume2 className="w-4 h-4" />
                            Practice Pronunciation
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              saveWordToGlossary(
                                activeWord.word,
                                activeWord.definition,
                                activeWord.phonetic
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black/30 text-[#fccd03] text-sm font-medium px-4 py-2.5 border border-[#fccd03]/30 hover:bg-[#fccd03]/10 transition-colors"
                          >
                            <Bookmark className="w-4 h-4" />
                            Save to My Glossary
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGlossaryOpen(true)}
                          className="mt-3 text-xs text-gray-400 hover:text-[#fccd03] inline-flex items-center gap-1"
                        >
                          <BookMarked className="w-3.5 h-3.5" />
                          Open My Glossary ({glossaryItems.length})
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Quiz */}
                <div className="rounded-2xl bg-[#121212] text-white p-4 md:p-5 shadow-lg border border-white/10 shrink-0">
                  <div className="flex items-center gap-2 text-[#fccd03] text-xs uppercase tracking-wider font-semibold mb-3">
                    <Zap className="w-4 h-4 text-[#fccd03]" />
                    Quick Quiz
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {dash.quick_quiz.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/85 leading-relaxed mb-3 line-clamp-2">
                    {dash.quick_quiz.description}
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm">
                      <span className="text-white/90">Topic: {dash.quick_quiz.topic}</span>
                      {dash.quick_quiz.topicIsNew ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#fccd03] text-[#003322]">
                          New
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white/90">
                      <Star className="w-4 h-4 text-[#fccd03]" />
                      Difficulty: {dash.quick_quiz.difficulty}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuizOpen(true)}
                    className="w-full rounded-xl bg-[#fccd03] text-black font-bold py-3.5 text-sm hover:bg-[#f5c400] transition-colors shadow-md"
                  >
                    {dash.quick_quiz.ctaLabel}
                  </button>
                </div>

                {/* Farmer&apos;s Tip */}
                <div className="relative mt-auto shrink-0 rounded-2xl bg-[#121212] border border-white/10 p-4 pt-7 shadow-sm">
                  <div className="absolute -top-3 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#fccd03] text-black shadow-md">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-[#fccd03] mb-2 pl-1">
                    Farmer&apos;s Tip
                  </h4>
                  <p className="text-sm italic text-gray-300 leading-relaxed pl-1">
                    &ldquo;{dash.farmer_tip}&rdquo;
                  </p>
                </div>
              </aside>
            </div>

            <QuickQuizModal isOpen={quizOpen} onClose={() => setQuizOpen(false)} />

            {glossaryOpen ? (
              <div
                className="fixed inset-0 z-[70] bg-black/45 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                onClick={() => setGlossaryOpen(false)}
              >
                <div
                  className="w-full max-w-xl rounded-2xl border border-[#003322]/15 bg-[#F9F9F4] shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#003322]/10">
                    <h3 className="text-lg font-bold text-[#003322]">My Glossary</h3>
                    <button
                      type="button"
                      onClick={() => setGlossaryOpen(false)}
                      className="p-1 rounded hover:bg-[#003322]/10 text-[#003322]/70"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-5 max-h-[55vh] overflow-y-auto space-y-3">
                    {glossaryItems.length === 0 ? (
                      <p className="text-sm text-[#003322]/65">
                        No saved words yet. Use &quot;Save to My Glossary&quot; in Word of the Day.
                      </p>
                    ) : (
                      glossaryItems.map((item) => (
                        <div
                          key={item.word.toLowerCase()}
                          className="rounded-xl border border-[#003322]/12 bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-base font-bold text-[#003322]">{item.word}</h4>
                              {item.phonetic ? (
                                <p className="text-xs text-[#003322]/55 font-mono mt-0.5">
                                  {item.phonetic}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => speakWordOfDay(item.word)}
                                className="p-2 rounded-lg border border-[#003322]/15 hover:bg-[#f3f3ee]"
                              >
                                <Volume2 className="w-4 h-4 text-[#003322]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeGlossaryWord(item.word)}
                                className="p-2 rounded-lg border border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-[#003322]/75 mt-2 leading-relaxed">
                            {item.definition}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-5 py-4 border-t border-[#003322]/10 flex justify-between">
                    <button
                      type="button"
                      onClick={clearGlossary}
                      disabled={glossaryItems.length === 0}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-700 disabled:opacity-40"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => setGlossaryOpen(false)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-[#003322] text-white"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {pronunciationOpen && pronunciationTarget ? (
              <div
                className="fixed inset-0 z-[75] bg-black/45 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                onClick={() => setPronunciationOpen(false)}
              >
                <div
                  className="w-full max-w-lg rounded-2xl border border-[#003322]/15 bg-[#F9F9F4] shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#003322]/10">
                    <h3 className="text-lg font-bold text-[#003322]">Practice Pronunciation</h3>
                    <button
                      type="button"
                      onClick={() => setPronunciationOpen(false)}
                      className="p-1 rounded hover:bg-[#003322]/10 text-[#003322]/70"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-wider text-[#003322]/55 mb-2">
                      Word
                    </p>
                    <h4 className="text-3xl font-bold text-[#003322]">{pronunciationTarget.word}</h4>
                    {pronunciationTarget.phonetic ? (
                      <p className="font-mono text-sm text-[#003322]/55 mt-1">
                        {pronunciationTarget.phonetic}
                      </p>
                    ) : null}
                    <p className="text-sm text-[#003322]/70 mt-2">
                      {pronunciationTarget.definition}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => speakWordOfDay(pronunciationTarget.word)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#003322] text-white text-sm px-4 py-2.5"
                      >
                        <Volume2 className="w-4 h-4" />
                        Hear Correct Pronunciation
                      </button>
                      <button
                        type="button"
                        onClick={beginPronunciationListening}
                        disabled={pronunciationListening}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#ffd89e] text-[#003322] text-sm px-4 py-2.5 border border-[#e85d3a]/30 disabled:opacity-50"
                      >
                        <Mic className="w-4 h-4" />
                        {pronunciationListening ? "Listening..." : "Speak Now"}
                      </button>
                    </div>

                    {pronunciationTranscript ? (
                      <div className="mt-5 rounded-xl border border-[#003322]/10 bg-white p-4">
                        <p className="text-xs text-[#003322]/55 mb-1">You said</p>
                        <p className="text-sm text-[#003322] font-medium">
                          {pronunciationTranscript}
                        </p>
                        {pronunciationScore !== null ? (
                          <div className="mt-3">
                            <div className="flex items-center gap-2">
                              {pronunciationScore >= 75 ? (
                                <CheckCircle2 className="w-4 h-4 text-green-700" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-amber-700" />
                              )}
                              <p className="text-sm text-[#003322]">
                                Match score: <span className="font-bold">{pronunciationScore}%</span>
                              </p>
                            </div>
                            <p className="text-xs text-[#003322]/60 mt-1">
                              {pronunciationScore >= 75
                                ? "Great pronunciation. Keep going!"
                                : "Try once more — listen and repeat slowly."}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {selectedStory ? (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
                role="dialog"
                aria-modal="true"
                onClick={() => setSelectedStory(null)}
              >
                <div
                  className="bg-[#F9F9F4] max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-[#003322]/15"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-xl font-bold text-[#003322] mb-2">{selectedStory.headline}</h3>
                  <p className="text-sm text-[#003322]/70 mb-4">{selectedStory.summary}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedStory(null)}
                    className="w-full rounded-xl bg-[#003322] text-white py-2.5 font-medium hover:bg-[#004433]"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}

            
            <div className="mt-14">
              <h2 className="text-2xl md:text-3xl font-bold text-[#003322] text-center mb-8">
                <span className="text-[#fccd03] mr-2">📈</span>
                Market Trends &amp; Graphs
              </h2>
              <NewGraphs />
              {!graphsLoading && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      setGraphsLoading(true);
                      setTimeout(() => {
                        setGraphsLoading(false);
                        toast({
                          title: "Market Trends Updated",
                          description: "Latest market data has been refreshed!",
                          variant: "success",
                        });
                      }, 2000);
                    }}
                    className="rounded-xl bg-[#003322] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#004433] transition-colors shadow-md"
                  >
                    Refresh Market Data
                  </button>
                </div>
              )}
            </div>

            



            {/* <div className="mt-10">
              <h1 className="text-[#fccd03] text-3xl font-extrabold mb-6 text-center relative group animate-pulse flex items-center justify-center">
                <div className="h-0.5 bg-gradient-to-r from-transparent to-[#fccd03] w-16 md:w-32 mr-4"></div>
                <span className="bg-gradient-to-r from-[#fccd03] to-amber-400 bg-clip-text text-transparent drop-shadow-lg">
                  Breaking News 🔥
                </span>
                <div className="h-0.5 bg-gradient-to-l from-transparent to-[#fccd03] w-16 md:w-32 ml-4"></div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-[#fccd03] rounded-full group-hover:w-48 transition-all duration-500"></div>
              </h1>
              <InfiniteSlider />
            </div> */}
            <div className="mt-16">
              <h2 className="text-2xl md:text-3xl font-bold text-[#003322] text-center mb-8">
                <span className="text-[#fccd03] mr-2">✨</span>
                Expert Financial Insights
              </h2>
              {youtubeLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#003322]/15 rounded-full mx-auto mb-4 animate-pulse" />
                    <div className="h-4 bg-[#003322]/15 rounded w-48 mx-auto mb-2 animate-pulse" />
                    <div className="h-3 bg-[#003322]/10 rounded w-32 mx-auto animate-pulse" />
                  </div>
                </div>
              ) : (
                <SliderYouTube youtubeIndex={youtubeIndex} />
              )}
            </div>


          </div>
        </main>


        {/* Chat Bot Button */}
        <button
          onClick={() => {
            setIsChatOpen(!isChatOpen);
            if (!isChatOpen) {
              toast({
                title: "Chat Assistant",
                description: "Voice assistant is ready to help!",
                variant: "info",
              });
            }
          }}
          className="fixed bottom-8 right-8 bg-[#fccd03] text-black p-4 rounded-full shadow-lg hover:bg-[#e6b800] transition-all duration-300 z-50"
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
          className={`fixed bottom-24 right-8 w-[600px] h-[700px] bg-black rounded-lg shadow-2xl border border-white/10 z-50 transition-all duration-300 ease-in-out transform ${isChatOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8 pointer-events-none"
            }`}
        >
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-[#fccd03] font-bold">
                Rural Financial Assistant
              </h3>
              <button
                onClick={() => {
                  setIsChatOpen(false);
                  toast({
                    title: "Chat Closed",
                    description: "Voice assistant has been closed.",
                    variant: "info",
                  });
                }}
                className="text-gray-400 hover:text-white transition-colors duration-200"
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
              {/* Messages will go here */}
              <p className="bg-[#fccd03] text-black mt-4 px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:translate-x-2">
                {queryStatus}
              </p>
              {queryProcessing && (
                <div className="mx-auto my-4 w-8 h-8 border-4 border-[#fccd03] border-t-[#e3b902] rounded-full animate-spin"></div>
              )}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-2 mt-6 text-white transition-all duration-300 hover:shadow-2xl hover:shadow-[#fccd03]/20 hover:scale-[1.02] hover:-translate-y-1 active:scale-95">
                <div className="bg-black/30 rounded-lg p-8 mb-8 min-h-[300px] font-medium text-lg leading-relaxed transition-all duration-300 hover:bg-black/40">
                  {queryProcessing ? (
                    // Chat Response Skeleton
                    <div className="space-y-4">
                      <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse"></div>
                      <div className="h-4 bg-gray-700 rounded w-full animate-pulse"></div>
                      <div className="h-4 bg-gray-700 rounded w-11/12 animate-pulse"></div>
                      <div className="h-4 bg-gray-700 rounded w-2/3 animate-pulse"></div>
                      <div className="h-4 bg-gray-700 rounded w-5/6 animate-pulse"></div>
                    </div>
                  ) : (
                    response
                  )}
                </div>

                <div className="flex gap-4">
                  {showPlayButton && !isPlayingResponse && (
                    <button
                      onClick={playResponse}
                      className="flex-1 bg-[#fccd03] text-black px-6 py-4 rounded-lg font-semibold hover:bg-[#e3b902] transition-all duration-300 hover:scale-105 active:scale-95 text-lg shadow-lg hover:shadow-xl shadow-[#fccd03]/20"
                    >
                      🔊 Play Response
                    </button>
                  )}

                  {isPlayingResponse && (
                    <button
                      onClick={stopResponse}
                      className="flex-1 bg-red-500 text-white px-6 py-4 rounded-lg font-semibold hover:bg-red-600 transition-all duration-300 hover:scale-105 active:scale-95 text-lg shadow-lg hover:shadow-xl"
                    >
                      ⏹ Stop Response
                    </button>
                  )}

                  <audio ref={responseAudioRef} />
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/10 mt-auto">
              <div className="flex flex-wrap gap-2 justify-center items-center">
                <div className="flex gap-2 mr-4">
                  <button
                    onClick={(e) => {
                      e.currentTarget.classList.toggle("bg-green-500");
                      handleSetLiteracyLevel("poor");
                      toast({
                        title: "Literacy Level Selected",
                        description: "Responses will be simplified for better understanding.",
                        variant: "info",
                      });
                    }}
                    className="bg-[#fccd03] text-black rounded-lg px-3 py-1.5 transition-colors duration-200 flex-1 min-w-[60px] max-w-[80px] text-sm"
                  >
                    Poor
                  </button>
                  <button
                    onClick={(e) => {
                      e.currentTarget.classList.toggle("bg-green-500");
                      handleSetLiteracyLevel("good");
                                          toast({
                      title: "Literacy Level Selected",
                      description: "Responses will be tailored for moderate understanding.",
                      variant: "info",
                    });
                    }}
                    className="bg-[#fccd03] text-black rounded-lg px-3 py-1.5 transition-colors duration-200 flex-1 min-w-[60px] max-w-[80px] text-sm"
                  >
                    Good
                  </button>
                  <button
                    onClick={(e) => {
                      e.currentTarget.classList.toggle("bg-green-500");
                      handleSetLiteracyLevel("very good");
                                          toast({
                      title: "Literacy Level Selected",
                      description: "Responses will include detailed financial insights.",
                      variant: "info",
                    });
                    }}
                    className="bg-[#fccd03] text-black rounded-lg px-3 py-1.5 transition-colors duration-200 flex-1 min-w-[80px] max-w-[80px] text-sm"
                  >
                    Excellent
                  </button>
                </div>
                {!queryRecording.isRecording ? (
                  <button
                    onClick={() => startRecording("query")}
                    className="bg-[#fccd03] text-black px-3 py-3 rounded-full font-semibold hover:bg-[#e3b902] transition-all duration-300 hover:scale-105 active:scale-95 text-lg shadow-lg hover:shadow-xl shadow-[#fccd03]/20"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => stopRecording("query")}
                    className="bg-red-500 text-white px-3 py-3 rounded-full font-semibold hover:bg-red-600 transition-all duration-300 hover:scale-105 active:scale-95 text-lg shadow-lg hover:shadow-xl"
                  >
                    ⏹
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RuralFinancialNews;
