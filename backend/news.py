import os
import requests
import json
from dotenv import load_dotenv
load_dotenv()
from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool
from crewai import LLM
import itertools
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import tempfile
from google.cloud import translate_v2 as translate
from groq import Groq
from pydub import AudioSegment
import threading
import time
import logging
import re

app = Flask(__name__)
CORS(app)

# Setup Google Cloud credentials
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = r"translation.json"

# API Keys
GROQ_API_KEY = os.getenv('GROQ_API_KEY_NEWS')
GROQ_API_KEY2 = os.getenv('GROQ_API_KEY_NEWS2')
GROQ_API_KEY3 = os.getenv('GROQ_API_KEY_NEWS3')
os.environ["SERPER_API_KEY"] = os.getenv('SERPER_API_KEY')
GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')

groq_keys = [k.strip() for k in (GROQ_API_KEY, GROQ_API_KEY2, GROQ_API_KEY3) if k and len(k.strip()) > 10]
if not groq_keys:
    print("⚠️ No valid GROQ_API_KEY_NEWS / _NEWS2 / _NEWS3 in environment — crew runs will fail.")
groq_key_cycle = itertools.cycle(groq_keys if groq_keys else [""])

# Rate limiting: cache duration, cooldown between crew runs, Groq model (smaller = fewer TPM issues)
NEWS_CACHE_SECONDS = int(os.getenv("NEWS_CACHE_SECONDS", "7200"))  # default 2h; was 3600
NEWS_FETCH_COOLDOWN_SECONDS = int(os.getenv("NEWS_FETCH_COOLDOWN_SECONDS", "180"))
GROQ_MODEL = os.getenv("GROQ_MODEL", "groq/llama-3.3-70b-versatile")
# Alternative with higher free-tier throughput: groq/llama-3.1-8b-instant
CREW_KICKOFF_RETRIES = int(os.getenv("CREW_KICKOFF_RETRIES", "4"))
_fetch_lock = threading.Lock()

# Initialize translation and audio clients using your setup
try:
    translate_client = translate.Client()
    print("✅ Google Translate client initialized successfully")
except Exception as e:
    print(f"❌ Translation service initialization error: {e}")
    print("Please ensure translation.json file exists and is valid")
    translate_client = None

try:
    groq_client = Groq(api_key=GROQ_API_KEY)
    print("✅ Groq audio client initialized successfully")
except Exception as e:
    print(f"❌ Audio transcription service initialization error: {e}")
    print("Please check your Groq API key")
    groq_client = None

# Global storage for news content
news_storage = {
    "original_content": None,
    "translated_content": {},
    "last_updated": None,
    "is_fetching": False,
    "last_fetch_attempt": 0.0,
}

def get_llm():
    """Returns an LLM object with the next API key (rotate on each call)."""
    api_key = next(groq_key_cycle).strip()
    return LLM(
        model=GROQ_MODEL,
        temperature=0.5,
        api_key=api_key,
    )


def _assign_fresh_llms_to_agents():
    """Give each agent a new LLM + key so every crew run spreads load across keys."""
    researcher.llm = get_llm()
    writer.llm = get_llm()
    wordsmith.llm = get_llm()

# Search tool — fewer results = fewer Serper / search calls per step
_serper_max = int(os.getenv("SERPER_MAX_RESULTS", "6"))
search_tool = SerperDevTool(max_results=_serper_max, max_depth=1)

# Agents
researcher = Agent(
    role="Agricultural News Researcher",
    goal="Fetch and summarize the latest 8–10 Agricultural news for rural India",
    backstory="You are an expert at finding only the most relevant agricultural updates.",
    llm=get_llm(),
    tools=[search_tool],
    verbose=True,
    allow_delegation=False,
    max_iter=1,
    max_execution_time=15,
)

writer = Agent(
    role="Agricultural Content Writer",
    goal="Turn news into an easy-to-understand article with bullet points",
    backstory="You simplify complex agricultural news into language for rural India.",
    llm=get_llm(),
    verbose=True,
    allow_delegation=False,
    max_iter=1,
    max_execution_time=15,
)

wordsmith = Agent(
    role="Agricultural Glossary Expert",
    goal="Provide 5 Agricultural terms with simple <30 word explanations",
    backstory="You explain agricultural terms in very simple words.",
    llm=get_llm(),
    verbose=True,
    allow_delegation=False,
    max_iter=1,
    max_execution_time=10,
)

# Tasks
task1 = Task(
    description="Search and summarize the latest 8–10 agricultural news relevant for rural Indian people. Keep it within 100 words, use bullet points.",
    expected_output="8-10 concise bullet points with headline + 2 line summary",
    agent=researcher,
)

task2 = Task(
    description="Turn the bullet points from task1 into a simple, engaging agricultural news article with easy language.",
    expected_output="An article with bullet points highlighting the agricultural news in plain language.",
    agent=writer,
)

task3 = Task(
    description="List 5 agricultural terms (bolded) with short explanations under 30 words each, useful for rural Indian people.",
    expected_output="5 terms with short, plain-English definitions.",
    agent=wordsmith,
)

# Crew
crew = Crew(
    agents=[researcher, writer, wordsmith],
    tasks=[task1, task2, task3],
    verbose=True,
    process=Process.sequential
)

def transcribe_audio(audio_file_path):
    """Transcribe audio file using your exact function"""
    try:
        with open(audio_file_path, "rb") as audio_file:
            transcription = groq_client.audio.transcriptions.create(
                model="whisper-large-v3", 
                file=audio_file
            )
        return transcription.text
    except Exception as e:
        print(f"❌ Transcription error: {e}")
        return f"Error transcribing audio: {str(e)}"

def transcribe_audio_step(audio_file):
    """Process uploaded Flask FileStorage object for transcription"""
    try:
        if not groq_client:
            print("❌ Groq client not initialized")
            return "Audio transcription service not available - Groq client not initialized"
            
        if audio_file is None:
            return "No audio file received."
        
        print("🎤 Starting audio transcription...")
        
        # Save uploaded FileStorage to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio_file:
            print("📁 Saving uploaded audio file...")
            
            # Save the uploaded file first
            temp_input_path = temp_audio_file.name + "_input"
            audio_file.save(temp_input_path)
            
            # Convert to WAV format using pydub
            print("🔄 Converting audio to WAV format...")
            audio = AudioSegment.from_file(temp_input_path)
            audio.export(temp_audio_file.name, format="wav")
            
            print(f"📤 Transcribing audio file: {temp_audio_file.name}")
            
            # Now use your transcription function with the file path
            user_input = transcribe_audio(temp_audio_file.name)
            
            print(f"✅ Transcription successful: {user_input}")
        
        # -------------------------
        # Safe cleanup section
        # -------------------------
        try:
            audio = None  # release reference so file handles close
            time.sleep(0.1)  # tiny delay for Windows to release locks

            if os.path.exists(temp_audio_file.name):
                os.remove(temp_audio_file.name)
            if os.path.exists(temp_input_path):
                os.remove(temp_input_path)

        except Exception as cleanup_error:
            print(f"⚠️ Cleanup warning (not fatal): {cleanup_error}")
        
        return user_input
        
    except Exception as e:
        print(f"❌ Audio processing error: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return f"Error processing audio: {str(e)}"

def translate_to_english(text):
    """Your exact translation function"""
    try:
        if not translate_client:
            return text, "en"
            
        detection = translate_client.detect_language(text)
        detected_language = detection['language']

        if detected_language == "hi":  
            print("Detected Hindi, translating to English...")
            translation = translate_client.translate(text, target_language="en")
            return translation['translatedText'], detected_language
        
        print("Detected English, no translation needed.")
        return text, detected_language
        
    except Exception as e:
        print(f"Translation error: {e}")
        return text, "en"
def translate_to_original_language(text, target_language):
    """Enhanced translation that preserves formatting"""
    try:
        if not translate_client or target_language == "en":
            return text
        
        # Preserve markdown formatting during translation
        # Split text into chunks to preserve structure
        lines = text.split('\n')
        translated_lines = []
        
        for line in lines:
            if line.strip():  # Only translate non-empty lines
                # Preserve markdown markers
                if line.startswith('##'):
                    # Translate header but keep ##
                    header_text = line.replace('##', '').strip()
                    translated_header = translate_client.translate(header_text, target_language=target_language)
                    translated_lines.append(f"## {translated_header['translatedText']}")
                elif line.startswith('**') and line.endswith('**'):
                    # Translate bold text but keep **
                    bold_text = line.replace('**', '').strip()
                    translated_bold = translate_client.translate(bold_text, target_language=target_language)
                    translated_lines.append(f"**{translated_bold['translatedText']}**")
                elif line.startswith('•') or line.startswith('-') or line.startswith('*'):
                    # Translate bullet points but keep bullet marker
                    bullet_char = line[0]
                    bullet_text = line[1:].strip()
                    translated_bullet = translate_client.translate(bullet_text, target_language=target_language)
                    translated_lines.append(f"{bullet_char} {translated_bullet['translatedText']}")
                else:
                    # Regular line translation
                    translation = translate_client.translate(line, target_language=target_language)
                    translated_lines.append(translation['translatedText'])
            else:
                # Keep empty lines for structure
                translated_lines.append(line)
        
        return '\n'.join(translated_lines)
        
    except Exception as e:
        print(f"Back-translation error: {e}")
        return text
def detect_language(text):
    """Detect language using the translate_to_english function"""
    try:
        _, detected_language = translate_to_english(text)
        return detected_language
    except Exception as e:
        print(f"Language detection error: {e}")
        return "en"


CATEGORY_IMAGES = {
    "SUSTAINABILITY": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop",
    "TECHNOLOGY": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=400&fit=crop",
    "MARKET": "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=400&fit=crop",
    "POLICY": "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=400&fit=crop",
}

# Unsplash Search API — https://unsplash.com/developers (free: 50 requests/hour for demo apps)
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "").strip()
_image_search_cache = {}
_CATEGORY_FALLBACK_QUERY = {
    "SUSTAINABILITY": "sustainable farming soil crops",
    "TECHNOLOGY": "smart agriculture technology drone",
    "MARKET": "grain market agriculture trade",
    "POLICY": "rural india farming policy",
}


def _build_image_search_query(headline: str, summary: str, category: str) -> str:
    """Build a short English search query from headline + category context."""
    words = re.findall(r"[A-Za-z]{3,}", headline or "")
    stop = {
        "the", "and", "for", "with", "from", "that", "this", "have", "has", "are", "was", "were",
        "will", "been", "into", "over", "than", "its", "also", "not", "may", "new", "per", "set",
    }
    picked = [w for w in words[:8] if w.lower() not in stop][:5]
    base = " ".join(picked) if picked else ""
    if len(base) < 4:
        base = _CATEGORY_FALLBACK_QUERY.get(category, "agriculture farming rural india")
    q = f"{base} agriculture"
    if len(q) > 100:
        q = q[:97].rsplit(" ", 1)[0]
    return q


def fetch_unsplash_image_for_query(query: str, fallback_url: str) -> str:
    """Return an image URL from Unsplash keyword search, or fallback if no key / error."""
    if not UNSPLASH_ACCESS_KEY:
        return fallback_url
    key = query.lower().strip()
    if key in _image_search_cache:
        return _image_search_cache[key]
    try:
        resp = requests.get(
            "https://api.unsplash.com/search/photos",
            params={
                "query": query,
                "per_page": 1,
                "orientation": "landscape",
                "content_filter": "high",
            },
            headers={"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results") or []
        if not results:
            _image_search_cache[key] = fallback_url
            return fallback_url
        urls = results[0].get("urls") or {}
        raw = urls.get("small") or urls.get("regular") or urls.get("thumb")
        if not raw:
            _image_search_cache[key] = fallback_url
            return fallback_url
        sep = "&" if "?" in raw else "?"
        out = f"{raw}{sep}w=400&h=400&fit=crop&q=80"
        _image_search_cache[key] = out
        return out
    except Exception as e:
        print(f"Unsplash image search error ({query[:40]}...): {e}")
        return fallback_url

PHONETIC_HINTS = {
    "irrigation": "/ˌɪrɪˈɡeɪʃən/",
    "subsidy": "/ˈsʌbsɪdi/",
    "harvest": "/ˈhɑːvɪst/",
    "fertilizer": "/ˈfɜːtɪlaɪzə(r)/",
    "pesticide": "/ˈpestɪsaɪd/",
    "crop": "/krɒp/",
    "soil": "/sɔɪl/",
}


def _infer_news_category(headline: str, summary: str) -> str:
    blob = f"{headline} {summary}".lower()
    if any(k in blob for k in ("soil", "organic", "sustain", "carbon", "water", "climate", "green")):
        return "SUSTAINABILITY"
    if any(k in blob for k in ("tech", "sensor", "digital", "drone", "app", "ai", "smart", "iot")):
        return "TECHNOLOGY"
    if any(k in blob for k in ("market", "price", "export", "trade", "commodity", "msp", "mandi")):
        return "MARKET"
    return "POLICY"


def build_dashboard_from_content(news_article: str, agricultural_terms: str) -> dict:
    """Structured UI payload: news cards, word of the day, quiz meta, farmer tip."""
    cards = []
    pattern = re.compile(r"\*\*([^*]+)\*\*:\s*([^\n]+)")
    for m in pattern.finditer(news_article or ""):
        headline = m.group(1).strip()
        summary = m.group(2).strip()
        if not headline:
            continue
        if len(summary) > 220:
            summary = summary[:217].rstrip() + "..."
        cat = _infer_news_category(headline, summary)
        read_min = max(3, min(12, len(summary) // 45 + 3))
        fallback_img = CATEGORY_IMAGES.get(cat, CATEGORY_IMAGES["POLICY"])
        search_q = _build_image_search_query(headline, summary, cat)
        image_url = fetch_unsplash_image_for_query(search_q, fallback_img)
        cards.append({
            "category": cat,
            "headline": headline,
            "summary": summary,
            "readMinutes": read_min,
            "imageUrl": image_url,
            "imageSearchQuery": search_q,
        })
        if UNSPLASH_ACCESS_KEY:
            time.sleep(0.2)
    cards = cards[:10]

    term_matches = list(re.finditer(r"\*\*([^*]+)\*\*[:\s]+([^\n*]+)", agricultural_terms or ""))
    word_list = []
    for tm in term_matches[:8]:
        w = tm.group(1).strip()
        d = tm.group(2).strip()
        if not w:
            continue
        word_list.append(
            {
                "word": w,
                "phonetic": PHONETIC_HINTS.get(w.lower().strip(), ""),
                "definition": d,
            }
        )
    if word_list:
        primary_word = word_list[0]
    else:
        primary_word = {
            "word": "Irrigation",
            "phonetic": "/ˌɪrɪˈɡeɪʃən/",
            "definition": (
                "The supply of water to land or crops to help growth, typically by means of channels, pipes, or sprinklers."
            ),
        }
        word_list = [primary_word]

    return {
        "news_cards": cards,
        "word_of_the_day": primary_word,
        "word_of_the_day_list": word_list,
        "quick_quiz": {
            "title": "How healthy is your soil?",
            "description": (
                "Test your knowledge on Sustainable Pest Management and earn the Soil Protector badge."
            ),
            "topic": "Pest Control",
            "topicIsNew": True,
            "difficulty": "Intermediate",
            "ctaLabel": "Start Quiz",
        },
        "farmer_tip": (
            "Rotate your nitrogen-heavy crops with legumes like peas or beans to naturally restore soil balance."
        ),
    }


def translate_dashboard(dash: dict, target_language: str) -> dict:
    if target_language == "en" or not dash:
        return dash
    try:
        out = {
            "news_cards": [],
            "word_of_the_day": dict(dash.get("word_of_the_day", {})),
            "quick_quiz": dict(dash.get("quick_quiz", {})),
            "farmer_tip": translate_to_original_language(dash.get("farmer_tip", ""), target_language),
        }
        w = out["word_of_the_day"]
        if w.get("definition"):
            w["definition"] = translate_to_original_language(w["definition"], target_language)
        if w.get("word"):
            w["word"] = translate_to_original_language(w["word"], target_language)
        out["word_of_the_day_list"] = []
        for itm in dash.get("word_of_the_day_list") or []:
            ni = dict(itm)
            if ni.get("word"):
                ni["word"] = translate_to_original_language(ni["word"], target_language)
            if ni.get("definition"):
                ni["definition"] = translate_to_original_language(ni["definition"], target_language)
            out["word_of_the_day_list"].append(ni)
        q = out["quick_quiz"]
        for fld in ("title", "description", "topic", "difficulty", "ctaLabel"):
            if q.get(fld):
                q[fld] = translate_to_original_language(q[fld], target_language)
        for c in dash.get("news_cards") or []:
            nc = dict(c)
            if nc.get("headline"):
                nc["headline"] = translate_to_original_language(nc["headline"], target_language)
            if nc.get("summary"):
                nc["summary"] = translate_to_original_language(nc["summary"], target_language)
            out["news_cards"].append(nc)
        return out
    except Exception as e:
        print(f"Dashboard translation error: {e}")
        return dash


def _is_rate_limit_error(exc: BaseException) -> bool:
    msg = str(exc).lower()
    if "429" in msg or "rate" in msg and "limit" in msg:
        return True
    if "too many requests" in msg:
        return True
    return False


def fetch_latest_news():
    """Fetch latest agricultural news using the crew (single-flight + Groq retries)."""
    global news_storage

    with _fetch_lock:
        if news_storage["is_fetching"]:
            return None
        news_storage["is_fetching"] = True

    print("Fetching latest agricultural news...")

    try:
        if not groq_keys:
            print("Error fetching news: no Groq API keys configured")
            return None

        result = None
        last_error = None
        for attempt in range(CREW_KICKOFF_RETRIES):
            try:
                _assign_fresh_llms_to_agents()
                result = crew.kickoff()
                last_error = None
                break
            except Exception as e:
                last_error = e
                print(f"Crew kickoff attempt {attempt + 1}/{CREW_KICKOFF_RETRIES}: {e}")
                if _is_rate_limit_error(e):
                    wait = min(90.0, (2.5 ** attempt) * 5.0)
                    print(f"Rate limit / overload — backing off {wait:.1f}s before retry...")
                    time.sleep(wait)
                elif attempt + 1 < CREW_KICKOFF_RETRIES:
                    time.sleep(3.0 * (attempt + 1))
                else:
                    raise

        if last_error is not None and result is None:
            raise last_error

        research_output = crew.tasks[0].output if len(crew.tasks) > 0 else ""
        article_output = crew.tasks[1].output if len(crew.tasks) > 1 else ""
        glossary_output = crew.tasks[2].output if len(crew.tasks) > 2 else ""

        article_str = str(article_output)
        glossary_str = str(glossary_output)
        dashboard = build_dashboard_from_content(article_str, glossary_str)

        news_storage["original_content"] = {
            "research_summary": str(research_output),
            "news_article": article_str,
            "agricultural_terms": glossary_str,
            "full_result": str(result),
            "dashboard": dashboard,
        }

        news_storage["last_updated"] = time.time()
        news_storage["translated_content"] = {}

        print("News fetched successfully!")
        return news_storage["original_content"]

    except Exception as e:
        print(f"Error fetching news: {e}")
        return None
    finally:
        with _fetch_lock:
            news_storage["is_fetching"] = False

def get_translated_news(target_language):
    """Get news in the specified language using your translation functions"""
    global news_storage
    
    # If English or no translation needed
    if target_language == "en" or not news_storage["original_content"]:
        return news_storage["original_content"]
    
    # Check if already translated
    if target_language in news_storage["translated_content"]:
        return news_storage["translated_content"][target_language]
    
    # Translate the content using your function
    try:
        original = news_storage["original_content"]
        translated = {}

        for key, content in original.items():
            if key == "dashboard":
                translated[key] = translate_dashboard(content, target_language)
            else:
                translated[key] = translate_to_original_language(content, target_language)

        # Store translation
        news_storage["translated_content"][target_language] = translated
        return translated
        
    except Exception as e:
        print(f"Error translating news: {e}")
        return news_storage["original_content"]

@app.route('/')
def home():
    return render_template('voice_news.html')

@app.route('/api/test-transcription', methods=['POST'])
def test_transcription():
    """Test endpoint to debug transcription issues"""
    try:
        print("🧪 Test transcription endpoint called")
        
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        print(f"📁 Received file: {audio_file}")
        print(f"📊 File type: {type(audio_file)}")
        print(f"📝 File name: {audio_file.filename}")
        print(f"📏 File size: {len(audio_file.read())} bytes")
        
        # Reset file pointer after reading size
        audio_file.seek(0)
        
        # Test basic file operations
        with tempfile.NamedTemporaryFile(delete=False, suffix=".test") as temp_file:
            temp_path = temp_file.name
            print(f"💾 Saving to temp file: {temp_path}")
            
            audio_file.save(temp_path)
            print(f"✅ File saved successfully")
            
            # Check if file exists and has content
            if os.path.exists(temp_path):
                file_size = os.path.getsize(temp_path)
                print(f"📏 Saved file size: {file_size} bytes")
                
                if file_size > 0:
                    # Try to process with pydub
                    try:
                        audio_segment = AudioSegment.from_file(temp_path)
                        print(f"🎵 Audio loaded: {len(audio_segment)}ms duration")
                        
                        # Convert to WAV
                        wav_path = temp_path + ".wav"
                        audio_segment.export(wav_path, format="wav")
                        print(f"🔄 Converted to WAV: {wav_path}")
                        
                        # Test direct Groq transcription
                        if groq_client:
                            print("🎤 Testing Groq transcription...")
                            with open(wav_path, "rb") as audio_file_handle:
                                transcription = groq_client.audio.transcriptions.create(
                                    model="whisper-large-v3", 
                                    file=audio_file_handle
                                )
                            result_text = transcription.text
                            print(f"✅ Transcription result: {result_text}")
                            
                            # Clean up
                            os.unlink(temp_path)
                            os.unlink(wav_path)
                            
                            return jsonify({
                                'success': True,
                                'transcription': result_text,
                                'message': 'Test successful'
                            })
                        else:
                            return jsonify({'error': 'Groq client not available'}), 500
                            
                    except Exception as audio_error:
                        print(f"❌ Audio processing error: {audio_error}")
                        return jsonify({'error': f'Audio processing failed: {str(audio_error)}'}), 500
                else:
                    return jsonify({'error': 'Saved file is empty'}), 500
            else:
                return jsonify({'error': 'Failed to save file'}), 500
        
    except Exception as e:
        print(f"❌ Test transcription error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Test failed: {str(e)}'}), 500

@app.route('/api/voice-transcribe', methods=['POST'])
def voice_transcribe():
    """Handle voice transcription and language detection"""
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # ✅ Use the correct function for FileStorage
        transcribed_text = transcribe_audio_step(audio_file)
        print(f"Transcribed text: {transcribed_text}")
        
        # Detect language
        detected_language = detect_language(transcribed_text)
        print(f"Detected language: {detected_language}")
        
        return jsonify({
            'transcribed_text': transcribed_text,
            'detected_language': detected_language,
            'success': True
        })
        
    except Exception as e:
        print(f"Voice transcription API error: {e}")
        return jsonify({'error': 'Error processing audio'}), 500

@app.route('/api/get-news', methods=['POST'])
def get_news():
    """Get agricultural news in the specified language"""
    try:
        data = request.get_json()
        language = data.get('language', 'en')
        force_refresh = data.get('force_refresh', False)
        now = time.time()
        cache_expired = news_storage["last_updated"] is None or (
            now - news_storage["last_updated"] > NEWS_CACHE_SECONDS
        )
        need_fetch = (
            news_storage["original_content"] is None
            or force_refresh
            or cache_expired
        )
        # Cooldown only while we still have no content (avoids hammering Groq/Serper on failed boot)
        if need_fetch and not news_storage["is_fetching"]:
            if news_storage["original_content"] is None:
                cooldown_ok = (now - news_storage["last_fetch_attempt"]) >= NEWS_FETCH_COOLDOWN_SECONDS
            else:
                cooldown_ok = force_refresh or cache_expired
            if cooldown_ok:
                news_storage["last_fetch_attempt"] = now
                threading.Thread(target=fetch_latest_news, daemon=True).start()
                time.sleep(1)
        
        # If still fetching, return status
        if news_storage["is_fetching"]:
            return jsonify({
                'status': 'fetching',
                'message': 'Fetching latest agricultural news...',
                'language': language
            })
        
        # Get news in requested language
        news_content = get_translated_news(language)
        
        if news_content:
            return jsonify({
                'status': 'success',
                'language': language,
                'news_content': news_content,
                'last_updated': news_storage["last_updated"]
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'No news content available'
            }), 404
        
    except Exception as e:
        print(f"Get news API error: {e}")
        return jsonify({'error': 'Error fetching news'}), 500

@app.route('/api/voice-query', methods=['POST'])
def voice_query():
    """Handle voice query and return news in detected language"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        detected_language = data.get('detected_language', 'en')
        
        print(f"Voice query: {query}")
        print(f"Detected language: {detected_language}")
        
        # Get news in the detected language
        news_content = get_translated_news(detected_language)
        
        if not news_content:
            # If no content, try to fetch fresh news
            if not news_storage["is_fetching"]:
                fetch_latest_news()
                news_content = get_translated_news(detected_language)
        
        news_content = get_translated_news(detected_language)
        
        return jsonify({
            'status': 'success',
            'query': query,
            'detected_language': detected_language,
            'response': news_content,
            'language_name': 'Hindi' if detected_language == 'hi' else 'English'
        })
        
    except Exception as e:
        print(f"Voice query API error: {e}")
        return jsonify({'error': 'Error processing voice query'}), 500

@app.route('/api/change-language', methods=['POST'])
def change_language():
    """Change the language of existing news content"""
    try:
        data = request.get_json()
        target_language = data.get('language', 'en')
        
        if not news_storage["original_content"]:
            return jsonify({
                'status': 'error',
                'message': 'No news content available to translate'
            }), 404
        
        # Get translated content
        translated_content = get_translated_news(target_language)
        
        return jsonify({
            'status': 'success',
            'language': target_language,
            'news_content': translated_content,
            'language_name': 'Hindi' if target_language == 'hi' else 'English'
        })
        
    except Exception as e:
        print(f"Change language API error: {e}")
        return jsonify({'error': 'Error changing language'}), 500

@app.route('/api/refresh-news', methods=['POST'])
def refresh_news():
    """Force refresh the news content"""
    try:
        if not news_storage["is_fetching"]:
            # Start fetching in background
            threading.Thread(target=fetch_latest_news).start()
        
        return jsonify({
            'status': 'success',
            'message': 'News refresh initiated'
        })
        
    except Exception as e:
        print(f"Refresh news API error: {e}")
        return jsonify({'error': 'Error refreshing news'}), 500

if __name__ == "__main__":
    print("🚀 Starting Agricultural Voice News Agent...")
    print("=" * 50)
    
    # Verify API Keys
    print("🔑 Checking API Keys...")
    print(f"   GROQ_API_KEY: {'✅ Set' if GROQ_API_KEY and len(GROQ_API_KEY) > 10 else '❌ Missing/Invalid'}")
    print(f"   GEMINI_API_KEY: {'✅ Set' if GEMINI_API_KEY and len(GEMINI_API_KEY) > 10 else '❌ Missing/Invalid'}")
    print(f"   SERPER_API_KEY: {'✅ Set' if os.environ.get('SERPER_API_KEY') else '❌ Missing/Invalid'}")
    print(f"   UNSPLASH_ACCESS_KEY: {'✅ Set (keyword images)' if UNSPLASH_ACCESS_KEY else '⚠️  Not set — using category fallback images'}")
    
    # Verify Services
    print("\n🔧 Checking Services...")
    print(f"   Translation Client: {'✅ Ready' if translate_client else '❌ Not Available'}")
    print(f"   Audio Client (Groq): {'✅ Ready' if groq_client else '❌ Not Available'}")
    
    # Check dependencies
    print("\n📦 Checking Dependencies...")
    try:
        import pydub
        print("   ✅ pydub installed")
    except ImportError:
        print("   ❌ pydub missing - run: pip install pydub")
    
    try:
        from google.cloud import translate_v2
        print("   ✅ google-cloud-translate installed")
    except ImportError:
        print("   ❌ google-cloud-translate missing - run: pip install google-cloud-translate")
    
    try:
        from groq import Groq
        print("   ✅ groq installed")
    except ImportError:
        print("   ❌ groq missing - run: pip install groq")
    
    print("\n" + "=" * 50)
    
    if not groq_client:
        print("⚠️  WARNING: Audio transcription will not work without Groq client!")
        print("   Please check your GROQ_API_KEY")
    
    if not translate_client:
        print("⚠️  WARNING: Translation will not work without Google Cloud credentials!")
        print("   Please set up Google Cloud Translation API")
    
    print("\n📰 Fetching initial news content...")
    
    # Fetch initial news
    fetch_latest_news()
    
    print("\n🌐 Starting Flask server...")
    print("   Access the app at: http://localhost:5001")
    app.run(debug=True, host='0.0.0.0', port=7864)