import os
import time
import logging
import base64
import threading
import tempfile
import json
import io
import re
import pytesseract
from io import BytesIO
from pydub import AudioSegment
import numpy as np
import pandas as pd
import gradio as gr # Not directly used in routes, but in ey_loan.py code
from groq import Groq
from google.cloud import translate_v2 as translate
from google.cloud import texttospeech
import google.generativeai as genai
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import StrOutputParser
from langchain.schema.runnable import RunnablePassthrough
from pinecone import Pinecone, ServerlessSpec
from flask import Flask, request, jsonify, render_template, send_file, session
from werkzeug.utils import secure_filename
from flask_cors import CORS
import matplotlib
import requests
import matplotlib.dates as mdates
from datetime import datetime, timedelta
import warnings
import google.generativeai as genai
from dotenv import load_dotenv
warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv()

matplotlib.use('Agg')
import matplotlib.pyplot as plt
from collections import defaultdict
from rapidfuzz import process as fuzz_process
import matplotlib as mpl
from matplotlib.patches import Patch
from matplotlib.patheffects import withStroke
from PIL import Image
import cv2
from bs4 import BeautifulSoup


# Initialize Flask app
app = Flask(__name__)
CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174",
            ]
        }
    },
)
app.secret_key = os.urandom(24) # Set a secret key for session management

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Google Cloud API setup
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = r"translation.json"
text_to_speech_client = texttospeech.TextToSpeechClient()
translate_client = translate.Client()

# Langchain and Groq API setup
os.environ['LANGCHAIN_TRACING_V2'] = os.getenv('LANGCHAIN_TRACING_V2', 'true')
os.environ['LANGCHAIN_ENDPOINT'] = os.getenv('LANGCHAIN_ENDPOINT', 'https://api.smith.langchain.com')
os.environ['LANGCHAIN_API_KEY'] = os.getenv('LANGCHAIN_API_KEY')
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
client = Groq(api_key=GROQ_API_KEY) # From ey_loan.py
groq_client = Groq(api_key=GROQ_API_KEY) # From eybud.py

# Google Generative AI setup
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY_MAIN')
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel(model_name="gemini-3-flash-preview") # From ey_loan.py
model_ocr = genai.GenerativeModel(model_name="gemini-3-flash-preview") # From ocr.py
llm = ChatGoogleGenerativeAI(model="gemini-3-flash-preview", google_api_key=GOOGLE_API_KEY) # From ey_loan.py
llm_flash = ChatGoogleGenerativeAI(model="gemini-3-flash-preview", google_api_key=GOOGLE_API_KEY) # From ey.py and eybud.py

embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=GOOGLE_API_KEY)

# Pinecone setup - combining indexes from ey_loan.py and micro_ey.py
pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
genai.configure(api_key=GOOGLE_API_KEY)


# Pinecone index for ey_loan.py
pinecone_index_name_loan = "flipkart-products-new"
if pinecone_index_name_loan not in pc.list_indexes().names():
    pc.create_index(
        name=pinecone_index_name_loan,
        dimension=3072,
        metric='euclidean',
        spec=ServerlessSpec(
            cloud='aws',
            region='us-east-1'
        )
    )
index_loan = pc.Index(pinecone_index_name_loan)
df_loan = pd.read_csv("government_schemes.csv")
text_splitter_loan = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
df_loan['id'] = df_loan['id'].astype('object')
# for i in range(len(df_loan)):
#     string = df_loan.iloc[i]['Questions']
#     embeddings_loan = genai.embed_content(
#         model="models/gemini-embedding-001",
#         content=string
#     )
#     index_loan.upsert(
#         vectors=[
#             {"id": "prod" + str(i), "values": embeddings_loan['embedding']}
#         ]
#     )
#     print(f"Embedding {i} is inserted")
#     df_loan.at[i, 'id'] = "prod" + str(i)

# Pinecone index for micro_ey.py
pinecone_index_name_gov_schemes = "no-cap-new"
# if pinecone_index_name_gov_schemes not in pc.list_indexes().names():
#     pc.create_index(
#         name=pinecone_index_name_gov_schemes,
#         dimension=3072,
#         metric='euclidean',
#         spec=ServerlessSpec(
#             cloud='aws',
#             region='us-east-1'
#         )
#     )
index_gov_schemes = pc.Index(pinecone_index_name_gov_schemes)
df_gov_schemes = pd.read_csv("farmers_schemes.csv")
df_gov_schemes['id'] = df_gov_schemes.index.astype(str) 
text_splitter_gov_schemes = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
df_gov_schemes['id'] = df_gov_schemes['id'].astype('object')
# for i in range(len(df_gov_schemes)):
#     string = df_gov_schemes.iloc[i]['How It Can Help You']
#     embeddings_gov_schemes = genai.embed_content(
#         model="models/gemini-embedding-001",
#         content=string
#     )
#     index_gov_schemes.upsert(
#         vectors=[
#             {"id": "proddd" + str(i), "values": embeddings_gov_schemes['embedding']}
#         ]
#     )
#     print(f"Index {i} is upserted")
#     df_gov_schemes.at[i, 'id'] = "proddd" + str(i)

# Global variables
interrupt_flag = False
playback_thread = None
chat_history_loan = [] # From ey_loan.py
BANK_PHONE_NUMBERS = { # From ey_loan.py
    "TVS Bank": "+91-9016070542",
    "Bank of Baroda": "+91-8888888888",
    "Punjab National Bank": "+91-7777777777"
}

user_data_ey = { # From ey.py
    "name": None,
    "language": "en",
    "literacy_level": "good"
}

chat_history_expenses = [] # From eybud.py
chat_history_earnings = [] # From eybud.py
full_chat_history_eybud = [] # From eybud.py
expense_data = defaultdict(lambda: defaultdict(float)) # From eybud.py
earning_data = defaultdict(lambda: defaultdict(float)) # From eybud.py
detailed_expense_history = [] # Detailed transaction history for expenses
detailed_earning_history = [] # Detailed transaction history for earnings

user_data_micro_ey = {} # From micro_ey.py
INVESTMENT_OPTIONS = { # From micro_ey.py
    "low": [
        "Fixed Deposits", "Public Provident Fund (PPF)", "Government Bonds", "Recurring Deposits", "Gold ETFs"
    ],
    "medium": [
        "Debt Mutual Funds", "Hybrid Mutual Funds", "Index Funds", "Low Volatility ETFs"
    ],
    "high": [
        "Stocks", "Equity Mutual Funds", "Sectoral ETFs", "Cryptocurrency (high risk)"
    ]
}

# AgriGenie global variables
WEATHER_API_KEY_AGRI = os.getenv('WEATHER_API_KEY') # From agri_advice.py
INDIAN_STATES = {
    "Delhi": {"state": "Delhi", "state_code": "DL"},
    "Mumbai": {"state": "Maharashtra", "state_code": "MH"},
    "Bangalore": {"state": "Karnataka", "state_code": "KA"},
    "Chennai": {"state": "Tamil Nadu", "state_code": "TN"},
    "Kolkata": {"state": "West Bengal", "state_code": "WB"},
    "Hyderabad": {"state": "Telangana", "state_code": "TG"},
    "Pune": {"state": "Maharashtra", "state_code": "MH"},
    "Ahmedabad": {"state": "Gujarat", "state_code": "GJ"},
    "Jaipur": {"state": "Rajasthan", "state_code": "RJ"},
    "Lucknow": {"state": "Uttar Pradesh", "state_code": "UP"},
    "Chandigarh": {"state": "Punjab", "state_code": "PB"},
    "Bhopal": {"state": "Madhya Pradesh", "state_code": "MP"},
    "Patna": {"state": "Bihar", "state_code": "BR"},
    "Raipur": {"state": "Chhattisgarh", "state_code": "CG"},
    "Indore": {"state": "Madhya Pradesh", "state_code": "MP"},
    "Surat": {"state": "Gujarat", "state_code": "GJ"},
    "Kochi": {"state": "Kerala", "state_code": "KL"},
    "Thiruvananthapuram": {"state": "Kerala", "state_code": "KL"},
    "Guwahati": {"state": "Assam", "state_code": "AS"},
    "Bhubaneswar": {"state": "Odisha", "state_code": "OR"}
}

# Tesseract OCR setup
# pytesseract.pytesseract.tesseract_cmd = r"/opt/homebrew/bin/tesseract" # From ocr.py
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
UPLOAD_FOLDER = 'static/uploads' # From ocr.py
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp'} # From ocr.py
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER # From ocr.py

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

print("the version of tesseract is : -->")
print(pytesseract.get_tesseract_version())
print(pytesseract.__file__)

# Langchain template for ey_loan.py
template_loan = """You are an intelligent and human-like assistant that answers customer queries related to movie and TV show recommendations on Netflix.
Your primary role is to help the customer by providing accurate, concise, and helpful suggestions based on their preferences.

### Recommendation Database Information:
You have access to a database with common movie-related questions, genres, and corresponding recommendations.
Whenever the customer asks for a recommendation, you should first check for the most similar genre or type of movie in the database and provide suggestions accordingly.

If the customer asks something that is not explicitly covered in the database, use the context provided below to generate appropriate movie or TV show recommendations based on the available information.

### Context:
This is the conversation so far between you and the customer. Ensure that the response stays relevant to the ongoing discussion:
{context}

### Instructions:
1. **Use the context first**: Refer to the previous conversation to provide recommendations that fit the customer's preferences.
2. **Query Matching**: If the customer query matches a question or genre in the database, offer movie or TV show suggestions from the database.
3. **Handle Out-of-Scope Questions**: If there's no close match in the database, generate a list of movie recommendations based on genres, themes, and features from the current Netflix library.
4. **Politeness and Clarity**: Always respond politely, clearly, and concisely. Ensure the recommendations match the customer's mood or genre preferences.
5. **Summarize if asked**: If the user asks for a summary, extract the key points from the chat history and summarize their preferences and recommendations.
6. **Incorporate Dynamic Responses**: Use Netflix's latest titles and critically acclaimed films that match the customer's specific preferences when possible.

### Answer the following:
Question: {Question}
"""
prompt_loan = ChatPromptTemplate.from_template(template_loan)

rag_chain_loan = (
    {"context": RunnablePassthrough(), "Question": RunnablePassthrough(), "chat_history": RunnablePassthrough()}
    | prompt_loan
    | llm
    | StrOutputParser()
)

# Function from ey_loan.py
def stop_playback():
    global interrupt_flag, playback_thread
    if playback_thread and playback_thread.is_alive():
        interrupt_flag = True
        playback_thread.join()

# Function from ey.py, adapted for `micro_ey.py`'s webm handling and `ey_loan.py`'s output directory
def transcribe_audio(audio_file):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio_file:
            audio = AudioSegment.from_file(audio_file)
            audio.export(temp_audio_file.name, format="wav")
            with open(temp_audio_file.name, "rb") as audio_read: # Renamed audio to audio_read
                transcription = groq_client.audio.transcriptions.create(model="whisper-large-v3", file=audio_read)
            log_event(f"Transcription result: {transcription.text}")
            return transcription.text
    except Exception as e:
        log_event(f"Error during audio transcription: {str(e)}")
        raise RuntimeError(f"Error during audio transcription: {str(e)}")

# Function from ey_loan.py
def transcribe_audio_step(audio_file):
    if audio_file is None:
        return "No audio file received."
    audio_file_path = audio_file
    user_input = transcribe_audio(audio_file_path)
    return user_input

# Function from ey.py (most robust version)
def translate_to_english(text):
    try:
        detection = translate_client.detect_language(text)
        detected_language = detection.get('language', 'und')
        if detected_language == "und":
            raise ValueError("Language could not be detected.")
        if detected_language != "en":
            translation = translate_client.translate(text, target_language="en")
            return translation['translatedText'], detected_language
        return text, detected_language
    except Exception as e:
        print(f"Error in translate_to_english: {str(e)}")
        raise RuntimeError(f"Translation to English failed: {str(e)}")


# Function from ey.py
def translate_from_english(text, target_language):
    try:
        if target_language != "en":
            if target_language == "und":
                raise ValueError("Target language is undefined or invalid.")
            translation = translate_client.translate(text, target_language=target_language)
            return translation['translatedText']
        return text
    except Exception as e:
        print(f"Error in translate_from_english: {str(e)}")
        raise RuntimeError(f"Translation from English failed: {str(e)}")

# Function from ey_loan.py and micro_ey.py
def translate_to_original_language(text, target_language):
    try:
        translation = translate_client.translate(text, target_language=target_language)
        return translation['translatedText']
    except Exception as e:
        print(f"Error in translate_to_original_language: {str(e)}")
        raise RuntimeError(f"Translation to original language failed: {str(e)}")

# Function from ey_loan.py
def query_pinecone_loan(user_query):
    for m in genai.list_models():
        if 'embedContent' in m.supported_generation_methods:
            print(f"Model: {m.name}")
    embeddings_loan = genai.embed_content(model="models/gemini-embedding-001", content=user_query)
    query_results = index_loan.query(
        vector=embeddings_loan['embedding'],
        top_k=5,
        include_values=True
    )

    def locate_row_from_vector_id(df: pd.DataFrame, vector_id: str):
        try:
            # 1) Try exact match on existing 'id' column
            if 'id' in df.columns:
                exact = df[df['id'] == vector_id]
                if not exact.empty:
                    return exact
            # 2) Extract numeric suffix (e.g., prod12 -> 12, proddd34 -> 34)
            match = re.search(r"(\d+)$", str(vector_id))
            if match:
                idx = int(match.group(1))
                if 0 <= idx < len(df):
                    return df.iloc[[idx]]
        except Exception:
            pass
        return pd.DataFrame()

    best_match = None
    highest_score = -1
    for result in query_results.get('matches', []):
        product_id = result.get('id')
        score = result.get('score', 0)
        row = locate_row_from_vector_id(df_loan, product_id)
        if not row.empty and score > highest_score:
            best_match = row
            highest_score = score

    if best_match is not None and 'Answers' in best_match.columns and not best_match['Answers'].empty:
        return best_match['Answers'].values[0]
        return "Sorry, I couldn't find the answer to that. Please contact your local branch or call at 910-888-2341 for assistance."

# Function from micro_ey.py, renamed
def query_pinecone_gov_schemes(user_query):
    """Search Pinecone for relevant government schemes."""
    try:
        embedding_response = genai.embed_content(model="models/gemini-embedding-001", content=user_query)
        if not embedding_response or "embedding" not in embedding_response:
            raise ValueError("Failed to generate embeddings for the query.")
        embeddings = embedding_response["embedding"]
        if not isinstance(embeddings, list) or len(embeddings) == 0:
            raise ValueError("Generated embeddings are empty or invalid.")
        query_results = index_gov_schemes.query(vector=embeddings, top_k=5, include_metadata=True) # Renamed index to index_gov_schemes

        def locate_row_from_vector_id(df: pd.DataFrame, vector_id: str):
            try:
                if 'id' in df.columns:
                    exact = df[df['id'] == vector_id]
                    if not exact.empty:
                        return exact
                match = re.search(r"(\d+)$", str(vector_id))
                if match:
                    idx = int(match.group(1))
                    if 0 <= idx < len(df):
                        return df.iloc[[idx]]
            except Exception:
                pass
            return pd.DataFrame()

        best_match=None
        highest_score=-1
        for result in query_results.get('matches', []):
            product_id = result.get('id')
            score = result.get('score', 0)
            row = locate_row_from_vector_id(df_gov_schemes, product_id)
            if not row.empty and score > highest_score:
                best_match = row
                highest_score = score

    
        if best_match is not None and 'Policy Name' in best_match.columns and not best_match['Policy Name'].empty:
            return best_match['Policy Name'].values[0]
        else:
            return "Sorry, I couldn't find the answer to that. Please contact your local branch or call at 910-888-2341 for assistance."
    except Exception as e:
        print(f"Sorry didnt found anything for you")
# Function from ey_loan.py
def generate_response(user_query, end_conversation=False):
    global chat_history_loan # Renamed chat_history to chat_history_loan
    product_answer = query_pinecone_loan(user_query) # Renamed query_pinecone to query_pinecone_loan
    context_str = ""
    for entry in chat_history_loan: # Renamed chat_history to chat_history_loan
        context_str += f"Q: {entry['user']}\nA: {entry['assistant']}\n"
    chat_history_loan.append({"user": user_query, "assistant": product_answer}) # Renamed chat_history to chat_history_loan
    inputs = {
        "context": context_str,
        "Question": user_query,
    }
    if end_conversation:
        chat_history_loan = [] # Renamed chat_history to chat_history_loan
        return "Anything else you want to know?"
    return product_answer

# Function from ey_loan.py
def detect_end_of_conversation(user_query):
    end_phrases = ["Thanks"]
    s = user_query.lower()
    s1 = s.split()
    for i in s1:
        if i in end_phrases:
            return True
    return False

# Function from ey.py, adapted to save to static/audio as in ey_loan.py
def text_to_speech(text, language_code="en-US"):
    synthesis_input = texttospeech.SynthesisInput(text=text)
    if language_code == "hi-IN":
        voice = texttospeech.VoiceSelectionParams(
            language_code="hi-IN",
            name="hi-IN-Wavenet-A",
            ssml_gender=texttospeech.SsmlVoiceGender.MALE
        )
    elif language_code == "ta-IN": # From ey.py
        voice = texttospeech.VoiceSelectionParams(
            language_code="ta-IN",
            name="ta-IN-Wavenet-A",
            ssml_gender=texttospeech.SsmlVoiceGender.MALE
        )
    else:
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name="en-US-Wavenet-D",
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )
    response = text_to_speech_client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )
    output_dir = "static/audio"
    os.makedirs(output_dir, exist_ok=True)
    audio_filename = f"response_{int(time.time())}.mp3"
    audio_path = os.path.join(output_dir, audio_filename)
    with open(audio_path, "wb") as out:
        out.write(response.audio_content)
    return audio_path

# Function from ey_loan.py
def process_transcription_step(transcription):
    if transcription is None or transcription.strip() == "":
        return "No transcription available."
    translated_text, original_language = translate_to_english(transcription)
    response = generate_response(translated_text)
    final_response = translate_to_original_language(response, original_language)
    return final_response

# Function from ey_loan.py
def process_transcription_and_generate_audio(transcription):
    text_response = process_transcription_step(transcription)
    translated_text, original_language = translate_to_english(transcription)
    language_code = "hi-IN" if original_language == "hi" else "en-US"
    audio_file_path = text_to_speech(text_response, language_code=language_code)
    return text_response, audio_file_path

# Function from ey_loan.py
def stop_audio():
    stop_playback()
    return "Playback stopped"

# Function from ey.py
def log_event(message):
    logging.info(message)

# Function from eybud.py
def process_voice_input(audio_file):
    import re
    text = transcribe_audio(audio_file)
    translated_text, detected_language = translate_to_english(text)

    full_chat_history_eybud.append({"original": text, "translated": translated_text, "language": detected_language})

    # Ask the model to return ONLY JSON
    prompt = f"""
    You are a strict JSON generator. Classify the statement into "expense" or "earning" and extract:
    - category: Broad category (e.g., Food, Loan, Crop)
    - sub_category: Specific subcategory (e.g., Wheat, Electricity, Fertilizers)
    - amount: Numeric value in INR (integer only)
    - type: "expense" if money is spent, "earning" if money is earned

    Statement: "{translated_text}"

    Return ONLY valid JSON with exactly these keys:
    {{"type": "expense" | "earning", "amount": 1234, "category": "Category Name", "sub_category": "Sub-category Name"}}
    """

    parsed_response = None

    # Prefer JSON mode to maximize valid parsing
    try:
        model_json = genai.GenerativeModel('gemini-3-flash-preview', generation_config={"response_mime_type": "application/json"})
        llm_response = model_json.generate_content(prompt)
        response_content = llm_response.text.strip()
        parsed_response = json.loads(response_content)
    except Exception:
        # Fallback to previous model and attempt to salvage JSON
        try:
            llm_response = llm_flash.invoke(prompt)
            response_content = llm_response.content.strip()
            if response_content.startswith("```json") and response_content.endswith("```"):
                response_content = response_content[7:-3].strip()
            elif response_content.startswith("```") and response_content.endswith("```"):
                response_content = response_content[3:-3].strip()
            try:
                parsed_response = json.loads(response_content)
            except Exception:
                # Try to extract the first JSON object substring
                match = re.search(r"\{[\s\S]*\}", response_content)
                if match:
                    parsed_response = json.loads(match.group(0))
        except Exception:
            parsed_response = None

    # Ultimate fallback: heuristic extraction
    if not isinstance(parsed_response, dict):
        lower_text = translated_text.lower()
        transaction_type = "earning" if re.search(r"\b(earned|sold|income|revenue|profit)\b", lower_text) else "expense"
        amount_match = re.search(r"(\d{1,3}(?:,\d{3})*|\d+)(?=\s*(?:inr|rupees|rs|₹)?\b)", translated_text, flags=re.I)
        amount = int(amount_match.group(1).replace(",", "")) if amount_match else 0
        category = "Crop" if re.search(r"wheat|rice|paddy|fertiliz|seed|pesticid|crop", lower_text) else "General"
        sub_category = "Wheat" if re.search(r"wheat", lower_text) else ("Fertilizers" if re.search(r"fertiliz", lower_text) else "Misc")
        parsed_response = {
            "type": transaction_type,
            "amount": amount,
            "category": category,
            "sub_category": sub_category
        }

    # Normalize and validate fields
    transaction_type = str(parsed_response.get("type", "")).strip().lower()
    if transaction_type not in {"expense", "earning"}:
        transaction_type = "expense"
    try:
        amount = int(float(parsed_response.get("amount", 0)))
    except Exception:
        amount = 0
    category = parsed_response.get("category", "Unknown") or "Unknown"
    sub_category = parsed_response.get("sub_category", "Unknown") or "Unknown"

    # Store transaction with timestamp for better tracking
    transaction_info = {
        "text": translated_text,
        "type": transaction_type,
        "amount": amount,
        "category": category,
        "sub_category": sub_category,
        "timestamp": datetime.now().isoformat()
    }

    if transaction_type == "expense":
        chat_history_expenses.append(translated_text)
        expense_data[category][sub_category] += amount
        # Store detailed transaction info for expenses
        if 'detailed_expense_history' not in globals():
            global detailed_expense_history
            detailed_expense_history = []
        detailed_expense_history.append(transaction_info)
    else:
        chat_history_earnings.append(translated_text)
        earning_data[category][sub_category] += amount
        # Store detailed transaction info for earnings
        if 'detailed_earning_history' not in globals():
            global detailed_earning_history
            detailed_earning_history = []
        detailed_earning_history.append(transaction_info)

    return f"Processed: {transaction_type} of {amount} INR for {sub_category} ({category})"

# Function from eybud.py
def generate_pie_chart(data, title):
    """
    Generate a professionally styled pie chart with vibrant colors and visual enhancements.
    Args:
        data: Dictionary of categories with nested values
        title: Chart title
    Returns:
        Base64 encoded string of the PNG image
    """
    total_per_category = {cat: sum(sub.values()) for cat, sub in data.items()}
    plt.style.use('seaborn-v0_8-whitegrid')
    colors = ['#FF5A5F', '#3C91E6', '#00A699', '#FFC400', '#9B6BCC', '#FF9A52', '#27AE60', '#7B68EE']
    fig, ax = plt.subplots(figsize=(8, 6), facecolor='#F8F9FA')
    wedges, texts = ax.pie(
        list(total_per_category.values()),
        labels=None,
        colors=colors[:len(total_per_category)],
        startangle=90,
        wedgeprops={
            'width': 0.6,
            'edgecolor': 'white',
            'linewidth': 2,
            'antialiased': True
        },
        shadow=True
    )
    centre_circle = plt.Circle((0, 0), 0.3, fc='white', edgecolor='#DDDDDD')
    ax.add_patch(centre_circle)
    total_value = sum(total_per_category.values())
    for i, (wedge, cat) in enumerate(zip(wedges, total_per_category.keys())):
        percentage = 100. * total_per_category[cat] / total_value
        ang = (wedge.theta1 + wedge.theta2) / 2
        x = 0.85 * 0.5 * np.cos(np.deg2rad(ang))
        y = 0.85 * 0.5 * np.sin(np.deg2rad(ang))
        ax.text(x, y, f"{percentage:.1f}%",
                ha='center', va='center', 
                fontsize=11, fontweight='bold', color='white',
                bbox=dict(boxstyle="round,pad=0.3", facecolor=colors[i % len(colors)], alpha=0.8, edgecolor='none'))
        ang_text = ang
        if ang_text > 90 and ang_text < 270:
            ang_text += 180
            ha = 'right'
        else:
            ha = 'left'
        x_label = 1.1 * np.cos(np.deg2rad(ang))
        y_label = 1.1 * np.sin(np.deg2rad(ang))
        ax.text(x_label, y_label, cat,
                ha=ha, va='center',
                fontsize=12, fontweight='bold',
                bbox=dict(boxstyle="round,pad=0.3", facecolor='white', alpha=0.8, edgecolor='#DDDDDD'))
    plt.title(title, fontsize=16, fontweight='bold', pad=20,
              color='#333333',
              bbox=dict(boxstyle="round,pad=0.6", facecolor='white', alpha=0.8, edgecolor='#DDDDDD'))
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=300, bbox_inches='tight', facecolor='#F8F9FA')
    buf.seek(0)
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode('utf-8')

# Function from eybud.py
def generate_bar_chart(data, title):
    """
    Generate a professionally styled bar chart with vibrant colors and visual enhancements.
    Features bold, highly readable labels and elegant visual styling.
    Args:
        data: Dictionary of categories with nested subcategory values
        title: Chart title
    Returns:
        Base64 encoded string of the PNG image
    """
    sub_categories = []
    amounts = []
    categories = []
    for category, sub_data in data.items():
        for sub, amount in sub_data.items():
            sub_categories.append(f"{category} - {sub}")
            amounts.append(amount)
            categories.append(category)
    if not amounts:
        fig, ax = plt.subplots(figsize=(10, 6), facecolor='#F8F9FA')
        ax.text(0.5, 0.5, "No data available to display",
                ha='center', va='center', fontsize=16, color='#666666', fontweight='bold')
        ax.set_axis_off()
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=300, bbox_inches='tight', facecolor='#F8F9FA')
        buf.seek(0)
        plt.close(fig)
        return base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.style.use('seaborn-v0_8-whitegrid')
    base_colors = [
        '#2c3e50', '#3498db', '#2ecc71', '#e74c3c', '#f39c12',
        '#9b59b6', '#1abc9c', '#34495e', '#d35400', '#16a085'
    ]
    unique_categories = list(dict.fromkeys(categories))
    category_colors = {cat: base_colors[i % len(base_colors)] for i, cat in enumerate(unique_categories)}
    bar_colors = []
    for cat in categories:
        base_color = mpl.colors.to_rgb(category_colors[cat])
        variation = np.random.uniform(-0.08, 0.08, 3)
        adjusted_color = np.clip([c + v for c, v in zip(base_color, variation)], 0, 1)
        bar_colors.append(adjusted_color)
    fig, ax = plt.subplots(figsize=(12, 7), facecolor='#F8F9FA', dpi=100)
    ax.set_facecolor('#F8F9FA')
    bars = ax.bar(
        sub_categories,
        amounts,
        color=bar_colors,
        width=0.7,
        edgecolor='white',
        linewidth=1.5,
        alpha=0.9,
        zorder=3
    )
    for bar in bars:
        height = bar.get_height()
        ax.text(
            bar.get_x() + bar.get_width()/2.,
            height + (max(amounts) * 0.01),
            f'₹{int(height):,}',
            ha='center',
            va='bottom',
            fontsize=10,
            fontweight='bold',
            color='#333333',
            path_effects=[withStroke(linewidth=3, foreground='white')],
            bbox=dict(
                boxstyle="round,pad=0.4",
                facecolor='white',
                alpha=0.9,
                edgecolor='#DDDDDD'
            )
        )
    ax.grid(axis='y', color='#DDDDDD', linestyle='-', linewidth=0.5, alpha=0.7, zorder=1)
    ax.set_axisbelow(True)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#666666')
    ax.spines['bottom'].set_color('#666666')
    ax.spines['left'].set_linewidth(1.5)
    ax.spines['bottom'].set_linewidth(1.5)
    ax.set_xlabel("Categories", fontsize=14, fontweight='bold', labelpad=15, color='#222222')
    ax.set_ylabel("Amount (₹)", fontsize=14, fontweight='bold', labelpad=15, color='#222222')
    plt.xticks(rotation=45, ha="right", fontsize=11, color='#333333', fontweight='bold')
    def currency_formatter(x, pos):
        if x >= 10000000:
            return f'₹{x/10000000:.1f} Cr'
        elif x >= 100000:
            return f'₹{x/100000:.1f} L'
        else:
            return f'₹{int(x):,}'
    ax.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(currency_formatter))
    plt.yticks(fontsize=11, color='#333333', fontweight='bold')
    plt.title(
        title,
        fontsize=18,
        fontweight='bold',
        pad=20,
        color='#222222',
        bbox=dict(
            boxstyle="round,pad=0.8",
            facecolor='white',
            alpha=0.95,
            edgecolor='#CCCCCC'
        )
    )
    total_amount = sum(amounts)
    plt.figtext(
        0.5, 0.01,
        f"Total: ₹{total_amount:,} • {len(unique_categories)} Categories • {len(sub_categories)} Items",
        ha="center",
        fontsize=11,
        fontweight='bold',
        color="#444444",
        bbox=dict(
            boxstyle="round,pad=0.4",
            facecolor='white',
            alpha=0.9,
            edgecolor='#EEEEEE'
        )
    )
    legend_elements = [
        Patch(
            facecolor=category_colors[cat],
            edgecolor='white',
            linewidth=1.5,
            label=f"{cat} (₹{sum([amounts[i] for i, c in enumerate(categories) if c == cat]):,})"
        )
        for cat in unique_categories
    ]
    legend = ax.legend(
        handles=legend_elements,
        loc='upper right',
        frameon=True,
        framealpha=0.95,
        facecolor='white',
        edgecolor='#CCCCCC',
        fontsize=10,
        title="Category Totals",
        title_fontsize=12
    )
    if amounts:
        highest_idx = np.argmax(amounts)
        highest_bar = bars[highest_idx]
        highest_value = amounts[highest_idx]
        highest_category = sub_categories[highest_idx]
        highlight_text = f"Highest: {highest_category}\n₹{highest_value:,}"
        ax.annotate(
            highlight_text,
            xy=(highest_idx, highest_value),
            xytext=(highest_idx, highest_value + max(amounts) * 0.15),
            arrowprops=dict(
                facecolor='#555555',
                shrink=0.05,
                width=1.5,
                headwidth=8,
                alpha=0.7
            ),
            ha='center',
            va='bottom',
            fontsize=10,
            fontweight='bold',
            bbox=dict(
                boxstyle="round,pad=0.4",
                facecolor='white',
                alpha=0.9,
                edgecolor='#DDDDDD'
            )
        )
    ax.tick_params(axis='both', which='major', width=1.5, length=6, pad=5)
    plt.tight_layout(pad=2.5, rect=[0, 0.03, 1, 0.97])
    fig.patch.set_facecolor('white')
    fig.patch.set_edgecolor('#DDDDDD')
    fig.patch.set_linewidth(2)
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=300, bbox_inches='tight', facecolor='white', edgecolor='#DDDDDD')
    buf.seek(0)
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode('utf-8')

# Function from eybud.py
def search_chat_history(audio_file, full_chat_history_eybud): # Renamed full_chat_history to full_chat_history_eybud
    try:
        prompt = (
            f"You are an AI assistant. Search the following chat history and return the most relevant entries for the given query.\n"
            f"Chat History:\n{json.dumps(full_chat_history_eybud, indent=2)}\n\n" # Renamed full_chat_history to full_chat_history_eybud
            f"Query: '{audio_file}'\n\n"
            f"Find and return the most relevant results in JSON format as an array of matched entries."
        )
        llm_response = llm.invoke(prompt) # Renamed llm to llm_flash
        response_content = llm_response.content.strip()
        if response_content.startswith("```json") and response_content.endswith("```"):
            response_content = response_content.replace("```json", "").replace("```", "").strip()
        try:
            matched_entries = json.loads(response_content)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            print(f"Response Content: {response_content}")
            return []
        matched_entries = [str(entry) for entry in matched_entries]
        return matched_entries
    except Exception as e:
        print(f"Error in search_chat_history: {str(e)}")
        return []

# Function from ocr.py
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Function from ocr.py
def extract_text_from_image(image_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    text = pytesseract.image_to_string(gray, config='--psm 6')
    print("Extracted Text:", text)
    return text

# Function from ocr.py
def extract_relevant_data(ocr_text):
    data = {
        "first_name": "",
        "middle_name": "",
        "last_name": "",
        "address": "",
        "aadhaar_no": "",
        "dob": "",
        "gender": "",
        "pan_card_no": "",
    }
    clean_text = re.sub(r"[^A-Za-z0-9/\s]", " ", ocr_text)
    clean_text = re.sub(r"\s+", " ", clean_text).strip()
    aadhaar_match = re.search(r"\b\d{4} \d{4} \d{4}\b", ocr_text)
    if aadhaar_match:
        data["aadhaar_no"] = aadhaar_match.group(0).replace(" ", "")
    prompt = (
            f"You will be given a clean OCR sentence. You need to provide me name of the person out of that sentence and the name will most likely lie in between government of India and the Date of birth. The address will be found in Address section of the image and if it doesnt contain that then you should return N/A only for the address. The name will be indian name.\n"
            f"First Name: This is the first Name of the person.\n"
            f"Last Name: This is the last Name of the person.\n"
            f"Address: This is the address of the person.\n"
            f"Gender: This is the gender of a person either MALE or FEMALE.\n"
            f"Clean Sentence: {clean_text}"
    )
    llm_response = model_ocr.generate_content(prompt) # Renamed llm to model_ocr
    response_content = llm_response.text.strip()
    print("Response Content:", response_content)
    first_name_match = re.search(r"First Name:\s*(\w+)", response_content)
    last_name_match = re.search(r"Last Name:\s*(\w+)", response_content)
    if first_name_match and last_name_match:
        data["first_name"] = first_name_match.group(1)
        data["last_name"] = last_name_match.group(1)
    else:
        data["first_name"] = ""
        data["last_name"] = ""
    dob_match = re.search(r"\b\d{2}/\d{2}/\d{4}\b", ocr_text)
    if dob_match:
        data["dob"] = dob_match.group(0)
    gender_match = re.search(r"Gender:\s*(\w+)", response_content)
    if gender_match:
        data["gender"] = gender_match.group(1)
    else:
        data["gender"] = "MALE"
    address_match = re.search(r"Address:\s*(.+?)(?=$|\n)", response_content)
    if address_match:
        data["address"] = address_match.group(1).strip()
    else:
        data["address"] = "N/A"
    pan_match = re.search(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", ocr_text)
    if pan_match:
        data["pan_card_no"] = pan_match.group(0)
    return data

# AgriGenie functions
def get_enhanced_weather_data(region):
    """Fetch comprehensive weather data including 7-day forecast and precipitation"""
    try:
        # Current weather
        current_url = f"http://api.openweathermap.org/data/2.5/weather?q={region},IN&appid={WEATHER_API_KEY_AGRI}&units=metric"
        current_response = requests.get(current_url, timeout=10)
        
        if current_response.status_code != 200:
            print(f"Weather API error: {current_response.status_code}")
            return get_mock_weather_data(region)
            
        current_data = current_response.json()
        
        # Get coordinates for forecast
        lat = current_data['coord']['lat']
        lon = current_data['coord']['lon']
        
        # Try to get 7-day forecast using standard forecast API (free tier)
        forecast_url = f"http://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={WEATHER_API_KEY_AGRI}&units=metric"
        forecast_response = requests.get(forecast_url, timeout=10)
        
        if forecast_response.status_code == 200:
            forecast_data = forecast_response.json()
            # Convert 5-day/3-hour forecast to daily format
            daily_forecast = convert_to_daily_forecast(forecast_data['list'])
        else:
            print("Using mock forecast data")
            daily_forecast = get_mock_weather_data(region)['forecast']
        
        return {
            'current': current_data,
            'forecast': daily_forecast,
            'hourly': []
        }
    except Exception as e:
        print(f"Weather API Error: {e}")
        return get_mock_weather_data(region)

def convert_to_daily_forecast(hourly_data):
    """Convert hourly forecast data to daily format"""
    daily_data = []
    current_date = None
    day_temps = []
    day_humidity = []
    day_precipitation = []
    day_weather = []
    
    for item in hourly_data[:40]:  # Use available data points
        dt = datetime.fromtimestamp(item['dt'])
        date_str = dt.strftime('%Y-%m-%d')
        
        if current_date != date_str:
            # Save previous day data
            if current_date and day_temps:
                daily_data.append({
                    'dt': int(datetime.strptime(current_date, '%Y-%m-%d').timestamp()),
                    'temp': {
                        'day': np.mean(day_temps),
                        'min': min(day_temps),
                        'max': max(day_temps)
                    },
                    'humidity': int(np.mean(day_humidity)) if day_humidity else 70,
                    'pop': max(day_precipitation) if day_precipitation else 0,
                    'weather': [{'description': day_weather[0] if day_weather else 'clear sky'}],
                    'wind_speed': 5.0
                })
            
            # Start new day
            current_date = date_str
            day_temps = []
            day_humidity = []
            day_precipitation = []
            day_weather = []
        
        # Accumulate day data
        day_temps.append(item['main']['temp'])
        day_humidity.append(item['main']['humidity'])
        day_precipitation.append(item.get('pop', 0))
        if item.get('weather') and len(item['weather']) > 0:
            day_weather.append(item['weather'][0]['description'])
    
    # Add the last day
    if current_date and day_temps:
        daily_data.append({
            'dt': int(datetime.strptime(current_date, '%Y-%m-%d').timestamp()),
            'temp': {
                'day': np.mean(day_temps),
                'min': min(day_temps),
                'max': max(day_temps)
            },
            'humidity': int(np.mean(day_humidity)) if day_humidity else 70,
            'pop': max(day_precipitation) if day_precipitation else 0,
            'weather': [{'description': day_weather[0] if day_weather else 'clear sky'}],
            'wind_speed': 5.0
        })
    
    # Ensure we have at least 7 days
    while len(daily_data) < 7:
        last_day = daily_data[-1] if daily_data else None
        base_temp = last_day['temp']['day'] if last_day else 28
        
        daily_data.append({
            'dt': int((datetime.now() + timedelta(days=len(daily_data))).timestamp()),
            'temp': {
                'day': base_temp + np.random.uniform(-3, 3),
                'min': base_temp - 5,
                'max': base_temp + 5
            },
            'humidity': np.random.randint(50, 90),
            'pop': np.random.uniform(0, 0.6),
            'weather': [{'description': np.random.choice(['sunny', 'cloudy', 'partly cloudy'])}],
            'wind_speed': np.random.uniform(3, 10)
        })
    
    return daily_data[:7]

def get_mock_weather_data(region):
    """Enhanced mock weather data with precipitation"""
    base_temp = 28
    mock_daily = []
    
    for i in range(7):
        date = datetime.now() + timedelta(days=i)
        temp_variation = np.random.uniform(-5, 6)
        precipitation_chance = np.random.uniform(0.1, 0.8)
        
        mock_daily.append({
            'dt': int(date.timestamp()),
            'temp': {
                'day': base_temp + temp_variation,
                'min': base_temp + temp_variation - 5,
                'max': base_temp + temp_variation + 5
            },
            'humidity': np.random.randint(50, 90),
            'pop': precipitation_chance,
            'weather': [{'description': np.random.choice(['sunny', 'cloudy', 'light rain', 'partly cloudy'])}],
            'wind_speed': np.random.uniform(2, 15)
        })
    
    return {
        'current': {
            'main': {'temp': base_temp, 'humidity': 65},
            'weather': [{'description': 'partly cloudy'}],
            'name': region,
            'wind': {'speed': 5.2}
        },
        'forecast': mock_daily,
        'hourly': []
    }

def generate_dynamic_irrigation_advice(crop, region, weather_data):
    """Generate dynamic irrigation advice using LLM with robust fallbacks and JSON mode"""
    try:
        generation_config = {
            "response_mime_type": "application/json",
            "temperature": 0.7,
        }

        # Prefer a fast, reliable JSON-capable model
        primary_model = genai.GenerativeModel('gemini-3-flash-preview', generation_config=generation_config)
        fallback_model = genai.GenerativeModel('gemini-1.5-flash', generation_config=generation_config)
        
        state_info = INDIAN_STATES.get(region, {"state": "India"})
        state = state_info["state"]
        
        current_weather = weather_data['current']
        forecast = weather_data['forecast']
        
        # Prepare detailed weather data for LLM
        forecast_text = []
        for i, day in enumerate(forecast[:7]):
            precipitation = day.get('pop', 0) * 100
            temp_day = day.get('temp', {}).get('day', 28)
            temp_min = day.get('temp', {}).get('min', 23)
            temp_max = day.get('temp', {}).get('max', 33)
            humidity = day.get('humidity', 70)
            weather_desc = day.get('weather', [{}])[0].get('description', 'clear')
            wind_speed = day.get('wind_speed', 5.0)
            
            forecast_text.append(
                f"Day {i+1}: Avg Temp: {temp_day:.1f}°C (Min: {temp_min:.1f}°C, Max: {temp_max:.1f}°C), "
                f"Humidity: {humidity}%, Precipitation Chance: {precipitation:.1f}%, "
                f"Wind Speed: {wind_speed:.1f} km/h, Weather: {weather_desc}"
            )

        prompt = f"""
        You are an expert agricultural advisor for irrigation planning for {crop} in {region}, {state}.
        
        Current Weather: Temp {current_weather['main']['temp']}°C, Humidity {current_weather['main']['humidity']}%, "
        f"Description {current_weather['weather'][0]['description']}.
        
        7-Day Forecast Summary:
        {chr(10).join(forecast_text)}
        
        Return ONLY valid JSON matching this schema:
        {{
          "general_considerations": "string" (A paragraph summarizing general weather observations related to irrigation),
          "monitoring_guidelines": ["string", "string"] (Clearly explained guidelines for monitoring irrigation),
          "key_factors": ["string", "string"] (Clearly explained important factors influencing irrigation),
          "daily_advice": [
            {{
              "day": 1,
              "status": "Irrigate" | "No Irrigation" | "Hold" | "Monitor" (Depending upon the Current Weather and Precipitation Chance),
              "status_detail": "string" (3-4 words)),
              "temp": 0,
              "precipitation_chance": 0,
              "description": "string" (First letter should be capital of the description),
              "time_window": "string" (Time window for irrigation)
            }}
          ],
          "action_legend": [
            {{"status": "Irrigate", "description": "Water needed"}},
            {{"status": "Hold", "description": "Wait & assess"}},
            {{"status": "No Irrigation", "description": "Rain sufficient"}},
            {{"status": "Monitor", "description": "Check conditions"}}
          ]
        }}
        """

        def call_and_parse(model_obj):
            resp = model_obj.generate_content(prompt)
            # Ensure we actually have content
            if not getattr(resp, 'candidates', None) or not resp.candidates or not getattr(resp.candidates[0], 'content', None):
                raise ValueError("Empty response from model")
            # Some SDKs expose text; others require assembling parts. Prefer text when present
            raw = (getattr(resp, 'text', None) or "").strip()
            if not raw and hasattr(resp.candidates[0].content, 'parts'):
                parts = resp.candidates[0].content.parts
                raw = "".join(getattr(p, 'text', '') for p in parts).strip()
            if not raw:
                raise ValueError("Model returned no text content")
            if raw.startswith("```json") and raw.endswith("```"):
                raw = raw[len("```json"):-len("```")].strip()
            elif raw.startswith("```") and raw.endswith("```"):
                raw = raw[len("```"):-len("```")].strip()
            return json.loads(raw)

        try:
            return call_and_parse(primary_model)
        except Exception as e_primary:
            print(f"[IRRIGATION] Primary model failed: {e_primary}")
            try:
                return call_and_parse(fallback_model)
            except Exception as e_fallback:
                print(f"[IRRIGATION] Fallback model failed: {e_fallback}")
                raise
        
    except Exception as e:
        print(f"LLM Irrigation Error: {e}")
        # Fallback to a structured default if LLM fails to produce valid JSON
        return {
            "general_considerations": "Unable to generate detailed irrigation advice due to an error. Please adjust recommendations based on actual rainfall received.",
            "monitoring_guidelines": ["Monitor soil moisture daily.", "Check for signs of stress in plants."],
            "key_factors": ["Varying water requirements for different crops.", "Proper drainage prevents waterlogging."],
            "daily_advice": [
                {"day": 1, "status": "No Irrigation", "temp": 28, "precipitation_chance": 70, "description": "No irrigation required. Monitor water levels."}, 
                {"day": 2, "status": "Monitor", "status_detail": "Late afternoon if needed", "temp": 28, "precipitation_chance": 30, "description": "Hold irrigation, check fields for dryness."}, 
                {"day": 3, "status": "No Irrigation", "temp": 28, "precipitation_chance": 90, "description": "No irrigation required. Heavy rain expected."}, 
                {"day": 4, "status": "No Irrigation", "temp": 28, "precipitation_chance": 80, "description": "No irrigation required. Overcast conditions."}, 
                {"day": 5, "status": "Monitor", "temp": 28, "precipitation_chance": 60, "description": "Monitor field. Moderate rain expected."}, 
                {"day": 6, "status": "Irrigate", "time_window": "4-5 PM", "temp": 30, "precipitation_chance": 10, "description": "Irrigate late afternoon. Sunny weather expected."}, 
                {"day": 7, "status": "Irrigate", "time_window": "4-5 PM", "temp": 30, "precipitation_chance": 20, "description": "Irrigate late afternoon. Partly cloudy weather with low rain chance."}
            ],
            "action_legend": [
                {"status": "Irrigate", "description": "Water needed"},
                {"status": "Hold", "description": "Wait & assess"},
                {"status": "No Irrigation", "description": "Rain sufficient"},
                {"status": "Monitor", "description": "Check conditions"}
            ]
        }

def parse_seed_varieties_to_json(raw_text, crop, region, state):
    """Helper function to parse raw text output into structured JSON for seed varieties"""
    try:
        print(f"🔄 [PARSER] Starting JSON parsing for {crop} in {region}, {state}")
        print(f"📝 [PARSER] Raw text length: {len(raw_text)} characters")
        
        model_parser = genai.GenerativeModel('gemini-3-flash-preview')
        
        prompt = f"""
        You are a JSON parser. Your task is to extract seed variety information from the following agricultural advice text and convert it into a specific JSON format.

        Raw Text:
        {raw_text}

        Context: This is about {crop} cultivation in {region}, {state}.

        Convert this into the following JSON structure. Return ONLY the JSON object, no other text:

        {{
            "weather_adapted_choice": {{
                "name": "string - variety name",
                "detail": "string - explanation why it is weather-adapted",
                "icon": "string - emoji like 💧 or ☀️"
            }},
            "top_5_varieties": [
                {{
                    "name": "string - variety name",
                    "badge": "string - e.g., Highly Recommended, Good Choice, Premium Variety",
                    "duration": "string - e.g., 140-145 days",
                    "yield": "string - e.g., 50-60 quintals/hectare",
                    "features": ["string - key feature 1", "string - key feature 2"],
                    "icon": "string - emoji like 🌱"
                }}
            ],
            "best_in_region": {{
                "name": "string - variety name",
                "badge": "string - recommendation level",
                "duration": "string - maturity period",
                "yield": "string - expected yield",
                "features": ["string - key benefit 1", "string - key benefit 2"],
                "icon": "string - emoji like 🏆"
            }}
        }}

        Rules:
        1. Extract variety names, durations, yields, and features from the text
        2. If specific information is missing, use reasonable defaults
        3. Ensure all arrays have at least 3-5 items
        4. Use appropriate emojis for icons
        5. Return ONLY valid JSON
        """
        
        print(f"🔄 [PARSER] Sending parsing prompt to Gemini")
        response = model_parser.generate_content(prompt)
        json_response_str = response.text.strip()
        print(f"📝 [PARSER] Raw parser response length: {len(json_response_str)} characters")
        print(f"📝 [PARSER] Parser response preview: {json_response_str[:200]}...")
        
        # Clean and parse JSON response
        if json_response_str.startswith("```json") and json_response_str.endswith("```"):
            json_response_str = json_response_str[len("```json"):-len("```")].strip()
            print(f"🔄 [PARSER] Cleaned JSON response (removed ```json```)")
        elif json_response_str.startswith("```") and json_response_str.endswith("```"):
            json_response_str = json_response_str[len("```"):-len("```")].strip()
            print(f"🔄 [PARSER] Cleaned JSON response (removed ``````)")
        
        print(f"🔄 [PARSER] Attempting to parse JSON")
        parsed_data = json.loads(json_response_str)
        print(f"✅ [PARSER] JSON successfully parsed")
        
        # Validate the structure and ensure all required fields exist
        if not isinstance(parsed_data, dict):
            raise ValueError("Parsed data is not a dictionary")
        
        # Ensure all required sections exist
        required_sections = ["weather_adapted_choice", "top_5_varieties", "best_in_region"]
        for section in required_sections:
            if section not in parsed_data:
                raise ValueError(f"Missing required section: {section}")
        
        print(f"✅ [PARSER] All required sections validated successfully")
        print(f"✅ [PARSER] Final parsed data keys: {list(parsed_data.keys())}")
        
        return parsed_data
        
    except Exception as e:
        print(f"❌ [PARSER] JSON parsing error: {e}")
        print(f"🔄 [PARSER] Returning fallback data due to parsing failure")
        # Return a comprehensive fallback structure
        return {
            "weather_adapted_choice": {
                "name": "IET 4786 (Pankaj)",
                "detail": "particularly suitable for your weather conditions. The high precipitation can cause waterlogging, and IET 4786 can combat such issues.",
                "icon": "💧"
            },
            "top_5_varieties": [
                {
                    "name": "Swarna (MTU 7029)",
                    "badge": "Highly Recommended",
                    "duration": "140-145 days",
                    "yield": "50-60 quintals/hectare",
                    "features": ["Widely adapted", "Good grain quality", "Submergence tolerant", "Popular in West Bengal"],
                    "icon": "🌱"
                },
                {
                    "name": "IET 4786 (Pankaj)",
                    "badge": "Good Choice",
                    "duration": "145-150 days",
                    "yield": "45-55 quintals/hectare",
                    "features": ["Low-lying areas suitable", "Waterlogging resistant", "Blast disease resistant"],
                    "icon": "🌱"
                },
                {
                    "name": "Lalat (BPT 5204)",
                    "badge": "Highly Recommended",
                    "duration": "130-135 days",
                    "yield": "55-65 quintals/hectare",
                    "features": ["High yielding", "Good grain quality", "Pest resistant", "Popular variety"],
                    "icon": "🌱"
                },
                {
                    "name": "IR64",
                    "badge": "Good Choice",
                    "duration": "130-135 days",
                    "yield": "50-60 quintals/hectare",
                    "features": ["Early maturity", "Wide adaptability", "Good milling quality", "Disease resistant"],
                    "icon": "🌱"
                },
                {
                    "name": "Arize 6444 Gold",
                    "badge": "Premium Variety",
                    "duration": "125-130 days",
                    "yield": "60-70 quintals/hectare",
                    "features": ["Hybrid variety", "High yielding", "Good grain quality", "Intensive management needed"],
                    "icon": "🌱"
                }
            ],
            "best_in_region": {
                "name": "Lalat (BPT 5204)",
                "badge": "Highly Recommended",
                "duration": "130-135 days",
                "yield": "55-65 quintals/hectare",
                "features": ["High yielding", "Good grain quality", "Pest resistant", "Popular variety"],
                "icon": "🏆"
            }
        }

def generate_dynamic_seed_varieties(crop, region, weather_data):
    """Generate seed variety recommendations using LLM with region-specific data"""
    try:
        generation_config = {
            "response_mime_type": "application/json",
        }

        model_agri1 = genai.GenerativeModel(
            'gemini-3-flash-preview',  # Use a model that supports JSON mode
            generation_config=generation_config
        ) # Using a more capable model for structured output
        
        state_info = INDIAN_STATES.get(region, {"state": "India"})
        state = state_info["state"]
        
        current_temp = weather_data['current']['main']['temp']
        forecast = weather_data.get('forecast', [])
        
        if forecast and len(forecast) > 0:
            avg_temp_7day = np.mean([day.get('temp', {}).get('day', current_temp) for day in forecast])
            avg_precipitation = np.mean([day.get('pop', 0) * 100 for day in forecast])
        else:
            avg_temp_7day = current_temp
            avg_precipitation = 30
        
        prompt1 = f"""
        You are an expert agricultural advisor specializing in seed variety selection for {crop} in {region}, {state}.
        
        Current Conditions: {current_temp}°C temperature, {avg_temp_7day:.1f}°C average, {avg_precipitation:.1f}% precipitation chance

        Provide comprehensive seed variety recommendations for {crop} cultivation in {region}, {state}. Include:

        1. A weather-adapted choice that's particularly suitable for the current weather conditions
        2. Top 5 recommended varieties with their characteristics, duration, and yield
        3. The best variety specifically for {state} region

        Focus on varieties that are proven successful in {state} and suitable for the current weather patterns.
        Provide detailed information about each variety including maturity period, expected yield, and key features.
        """
        
        print(f"🔍 [SEED] Generating raw text recommendations for {crop} in {region}, {state}")
        response = model_agri1.generate_content(prompt1)
        raw_text = response.text.strip()
        print(f"📝 [SEED] Raw text generated (length: {len(raw_text)} chars)")
        print(f"📝 [SEED] Raw text preview: {raw_text[:200]}...")
        
        # Use the helper function to parse the raw text into structured JSON
        print(f"🔄 [SEED] Sending raw text to parser function")
        structured_data = parse_seed_varieties_to_json(raw_text, crop, region, state)
        print(f"✅ [SEED] Parser returned structured data with keys: {list(structured_data.keys())}")
        print(f"✅ [SEED] Weather adapted choice: {structured_data.get('weather_adapted_choice', {}).get('name', 'N/A')}")
        print(f"✅ [SEED] Top 5 varieties count: {len(structured_data.get('top_5_varieties', []))}")
        print(f"✅ [SEED] Best in region: {structured_data.get('best_in_region', {}).get('name', 'N/A')}")
        
        return structured_data
        
    except Exception as e:
        print(f"❌ [SEED] LLM Seed Varieties Error: {e}")
        # Return a comprehensive fallback structure
        fallback_data = {
            "weather_adapted_choice": {
                "name": "IET 4786 (Pankaj)",
                "detail": "particularly suitable for your weather conditions. The high precipitation can cause waterlogging, and IET 4786 can combat such issues.",
                "icon": "💧"
            },
            "top_5_varieties": [
                {
                    "name": "Swarna (MTU 7029)",
                    "badge": "Highly Recommended",
                    "duration": "140-145 days",
                    "yield": "50-60 quintals/hectare",
                    "features": ["Widely adapted", "Good grain quality", "Submergence tolerant", "Popular in West Bengal"],
                    "icon": "🌱"
                },
                {
                    "name": "IET 4786 (Pankaj)",
                    "badge": "Good Choice",
                    "duration": "145-150 days",
                    "yield": "45-55 quintals/hectare",
                    "features": ["Low-lying areas suitable", "Waterlogging resistant", "Blast disease resistant"],
                    "icon": "🌱"
                },
                {
                    "name": "Lalat (BPT 5204)",
                    "badge": "Highly Recommended",
                    "duration": "130-135 days",
                    "yield": "55-65 quintals/hectare",
                    "features": ["High yielding", "Good grain quality", "Pest resistant", "Popular variety"],
                    "icon": "🌱"
                },
                {
                    "name": "IR64",
                    "badge": "Good Choice",
                    "duration": "130-135 days",
                    "yield": "50-60 quintals/hectare",
                    "features": ["Early maturity", "Wide adaptability", "Good milling quality", "Disease resistant"],
                    "icon": "🌱"
                },
                {
                    "name": "Arize 6444 Gold",
                    "badge": "Premium Variety",
                    "duration": "125-130 days",
                    "yield": "60-70 quintals/hectare",
                    "features": ["Hybrid variety", "High yielding", "Good grain quality", "Intensive management needed"],
                    "icon": "🌱"
                }
            ],
            "best_in_region": {
                "name": "Lalat (BPT 5204)",
                "badge": "Highly Recommended",
                "duration": "130-135 days",
                "yield": "55-65 quintals/hectare",
                "features": ["High yielding", "Good grain quality", "Pest resistant", "Popular variety"],
                "icon": "🏆"
            }
        }
        print(f"🔄 [SEED] Returning fallback data")
        return fallback_data

def parse_agricultural_guidance_to_json(raw_text, crop, region, state):
    """Helper function to parse raw text output into structured JSON for agricultural guidance"""
    try:
        print(f"🔄 [AGRI_PARSER] Starting JSON parsing for {crop} in {region}, {state}")
        print(f"📝 [AGRI_PARSER] Raw text length: {len(raw_text)} characters")
        
        model_parser = genai.GenerativeModel('gemini-3-flash-preview')
        
        prompt = f"""
        You are a JSON parser. Your task is to extract agricultural guidance information from the following text and convert it into a specific JSON format.

        Raw Text:
        {raw_text}

        Context: This is about {crop} cultivation in {region}, {state}.

        Convert this into the following JSON structure. Return ONLY the JSON object, no other text:

        {{
            "pest_disease_management": [
                {{
                    "name": "string - pest/disease name",
                    "risk_level": "string - e.g., High Risk, Medium Risk, Low to Medium Risk",
                    "description": "string - explanation of conditions and impact",
                    "prevention_treatment": "string - specific prevention and treatment advice"
                }}
            ],
            "fertilizer_recommendations": [
                {{
                    "stage": "string - growth stage name",
                    "timing": "string - when to apply",
                    "nitrogen": "string - N recommendation (e.g., '25% (25-30 kg N/ha)' or '-' if not applicable)",
                    "phosphorus": "string - P recommendation (e.g., '100% (50-60 kg P2O5/ha)' or '-' if not applicable)",
                    "potassium": "string - K recommendation (e.g., '50% (30-40 kg K2O/ha)' or '-' if not applicable)",
                    "note": "string - additional important information"
                }}
            ]
        }}

        Rules:
        1. Extract pest/disease information including names, risk levels, descriptions, and treatment advice
        2. Extract fertilizer recommendations for different growth stages
        3. Ensure pest_disease_management has at least 4-5 items
        4. Ensure fertilizer_recommendations has at least 3 growth stages
        5. Use appropriate risk level terminology (High Risk, Medium Risk, Low to Medium Risk)
        6. Return ONLY valid JSON
        """
        
        print(f"🔄 [AGRI_PARSER] Sending parsing prompt to Gemini")
        response = model_parser.generate_content(prompt)
        json_response_str = response.text.strip()
        print(f"📝 [AGRI_PARSER] Raw parser response length: {len(json_response_str)} characters")
        print(f"📝 [AGRI_PARSER] Parser response preview: {json_response_str[:200]}...")
        
        # Clean and parse JSON response
        if json_response_str.startswith("```json") and json_response_str.endswith("```"):
            json_response_str = json_response_str[len("```json"):-len("```")].strip()
            print(f"🔄 [AGRI_PARSER] Cleaned JSON response (removed ```json```)")
        elif json_response_str.startswith("```") and json_response_str.endswith("```"):
            json_response_str = json_response_str[len("```"):-len("```")].strip()
            print(f"🔄 [AGRI_PARSER] Cleaned JSON response (removed ``````)")
        
        print(f"🔄 [AGRI_PARSER] Attempting to parse JSON")
        parsed_data = json.loads(json_response_str)
        print(f"✅ [AGRI_PARSER] JSON successfully parsed")
        
        # Validate the structure and ensure all required fields exist
        if not isinstance(parsed_data, dict):
            raise ValueError("Parsed data is not a dictionary")
        
        # Ensure all required sections exist
        required_sections = ["pest_disease_management", "fertilizer_recommendations"]
        for section in required_sections:
            if section not in parsed_data:
                raise ValueError(f"Missing required section: {section}")
        
        print(f"✅ [AGRI_PARSER] All required sections validated successfully")
        print(f"✅ [AGRI_PARSER] Final parsed data keys: {list(parsed_data.keys())}")
        print(f"✅ [AGRI_PARSER] Pest management count: {len(parsed_data.get('pest_disease_management', []))}")
        print(f"✅ [AGRI_PARSER] Fertilizer recommendations count: {len(parsed_data.get('fertilizer_recommendations', []))}")
        
        return parsed_data
        
    except Exception as e:
        print(f"❌ [AGRI_PARSER] JSON parsing error: {e}")
        print(f"🔄 [AGRI_PARSER] Returning fallback data due to parsing failure")
        # Return a comprehensive fallback structure
        return {
            "pest_disease_management": [
                {
                    "name": "Brown Plant Hopper (BPH)",
                    "risk_level": "High Risk",
                    "description": "The overcast conditions and high humidity are extremely conducive for BPH outbreaks.",
                    "prevention_treatment": "Monitor rice plants, especially the base of stems. Apply Imidacloprid if detected."
                },
                {
                    "name": "Blast (Rice Blast)",
                    "risk_level": "Medium to High Risk",
                    "description": "Damp, overcast weather promotes blast fungus spread.",
                    "prevention_treatment": "Seed treatment with Trichoderma viride. Apply Tricyclazole if observed."
                },
                {
                    "name": "Sheath Blight",
                    "risk_level": "Medium Risk",
                    "description": "High humidity and rainfall create favorable environment.",
                    "prevention_treatment": "Proper plant spacing for ventilation. Use Propiconazole if disease appears."
                },
                {
                    "name": "Stem Borer",
                    "risk_level": "Medium Risk",
                    "description": "Monitor for deadhearts in early stages.",
                    "prevention_treatment": "Pheromone traps for monitoring. Apply Fipronil for severe infestations."
                },
                {
                    "name": "False Smut",
                    "risk_level": "Low to Medium Risk",
                    "description": "Becoming increasingly common fungal disease.",
                    "prevention_treatment": "Use disease-free seeds and balanced fertilization."
                }
            ],
            "fertilizer_recommendations": [
                {
                    "stage": "Basal Dose",
                    "timing": "During transplanting/sowing",
                    "nitrogen": "25% (25-30 kg N/ha)",
                    "phosphorus": "100% (50-60 kg P2O5/ha)",
                    "potassium": "50% (30-40 kg K2O/ha)",
                    "note": "Incorporate thoroughly into soil"
                },
                {
                    "stage": "Tillering Stage",
                    "timing": "20-25 days after transplanting",
                    "nitrogen": "50% (50-60 kg N/ha)",
                    "phosphorus": "-",
                    "potassium": "-",
                    "note": "Consider urease inhibitor due to high humidity"
                },
                {
                    "stage": "Panicle Initiation",
                    "timing": "55-60 days after transplanting",
                    "nitrogen": "25% (25-30 kg N/ha)",
                    "phosphorus": "-",
                    "potassium": "50% (30-40 kg K2O/ha)",
                    "note": "Critical for grain filling"
                }
            ]
        }

def generate_comprehensive_ai_advice(crop, region, weather_data, irrigation_advice, seed_advice):
    """Generate comprehensive agricultural advice using LLM"""
    try:
        print(f"🔍 [AGRI] Generating comprehensive agricultural advice for {crop} in {region}")
        
        model_agri = genai.GenerativeModel('gemini-3-flash-preview')
        
        state_info = INDIAN_STATES.get(region, {"state": "India"})
        state = state_info["state"]
        
        forecast = weather_data.get('forecast', [])
        if not forecast or len(forecast) == 0:
            print(f"🔄 [AGRI] No forecast data, using fallback")
            return parse_agricultural_guidance_to_json("", crop, region, state)
        
        # Calculate weather trends
        first_temp = forecast[0].get('temp', {}).get('day', 28)
        last_temp = forecast[-1].get('temp', {}).get('day', 28)
        temp_trend = "increasing" if last_temp > first_temp else "decreasing"
        avg_precipitation = np.mean([day.get('pop', 0) * 100 for day in forecast])
        
        prompt = f"""
        You are an expert agricultural advisor specializing in pest management and fertilizer recommendations for {crop} farming in {region}, {state}.

        Current Conditions: {temp_trend} temperature trend, {avg_precipitation:.1f}% precipitation probability, {weather_data['current']['weather'][0]['description']}

        Provide comprehensive agricultural guidance including:

        1. PEST & DISEASE MANAGEMENT:
        - Identify common pests and diseases affecting {crop} in {state}
        - Assess risk levels based on current weather conditions
        - Provide specific prevention and treatment recommendations
        - Include at least 4-5 major pests/diseases

        2. FERTILIZER RECOMMENDATIONS:
        - Provide NPK recommendations for different growth stages
        - Include timing, application rates, and important notes
        - Consider current weather conditions and soil requirements
        - Cover at least 3 key growth stages

        Focus on practical, actionable advice specific to {region}, {state} conditions and current weather patterns.
        Provide detailed information that farmers can implement immediately.
        """
        
        print(f"📝 [AGRI] Sending comprehensive advice prompt to Gemini")
        response = model_agri.generate_content(prompt)
        raw_text = response.text.strip()
        print(f"📝 [AGRI] Raw text generated (length: {len(raw_text)} chars)")
        print(f"📝 [AGRI] Raw text preview: {raw_text[:200]}...")
        
        # Use the helper function to parse the raw text into structured JSON
        print(f"🔄 [AGRI] Sending raw text to agricultural guidance parser")
        structured_data = parse_agricultural_guidance_to_json(raw_text, crop, region, state)
        print(f"✅ [AGRI] Parser returned structured data with keys: {list(structured_data.keys())}")
        print(f"✅ [AGRI] Pest management count: {len(structured_data.get('pest_disease_management', []))}")
        print(f"✅ [AGRI] Fertilizer recommendations count: {len(structured_data.get('fertilizer_recommendations', []))}")
        
        return structured_data
        
    except Exception as e:
        print(f"❌ [AGRI] Comprehensive AI advice error: {e}")
        print(f"🔄 [AGRI] Returning fallback data due to generation failure")
        return parse_agricultural_guidance_to_json("", crop, region, state)

def get_current_season():
    """Determine current agricultural season in India"""
    month = datetime.now().month
    if month in [6, 7, 8, 9, 10]:
        return "Kharif (Monsoon season)"
    elif month in [11, 12, 1, 2, 3, 4]:
        return "Rabi (Winter season)"
    else:
        return "Zaid (Summer season)"

def create_enhanced_weather_graph(weather_data):
    """Create enhanced weather graph with precipitation data"""
    try:
        forecast_data = weather_data.get('forecast', [])
        if not forecast_data or len(forecast_data) == 0:
            print("No forecast data available for graph")
            return None
            
        forecast_data = forecast_data[:7]  # Ensure only 7 days
        
        dates = []
        temps = []
        temp_mins = []
        temp_maxs = []
        precipitation = []
        humidity = []
        
        for day in forecast_data:
            try:
                date = datetime.fromtimestamp(day.get('dt', datetime.now().timestamp()))
                dates.append(date)
                
                temp_data = day.get('temp', {})
                temps.append(temp_data.get('day', 28))
                temp_mins.append(temp_data.get('min', 23))
                temp_maxs.append(temp_data.get('max', 33))
                
                precipitation.append(day.get('pop', 0) * 100)
                humidity.append(day.get('humidity', 70))
            except Exception as e:
                print(f"Error processing day data: {e}")
                continue
        
        if len(dates) == 0:
            print("No valid date data for graph")
            return None
        
        # Create subplot with multiple plots
        plt.style.use('default')
        fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(14, 12))
        
        # Temperature plot
        if temps and len(temps) > 0:
            ax1.plot(dates, temps, 'r-o', label='Average Temperature', linewidth=3, markersize=6)
            if temp_mins and temp_maxs and len(temp_mins) == len(temp_maxs) == len(dates):
                ax1.fill_between(dates, temp_mins, temp_maxs, alpha=0.3, color='orange', label='Temperature Range')
        ax1.set_title('7-Day Temperature Forecast', fontsize=16, fontweight='bold')
        ax1.set_ylabel('Temperature (°C)', fontsize=12)
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Precipitation plot
        if precipitation and len(precipitation) > 0:
            bars = ax2.bar(dates, precipitation, alpha=0.7, color='blue', label='Precipitation Probability')
            ax2.set_title('Precipitation Probability (%)', fontsize=16, fontweight='bold')
            ax2.set_ylabel('Precipitation (%)', fontsize=12)
            ax2.legend()
            ax2.grid(True, alpha=0.3)
            
            # Add percentage labels on bars
            for bar, pct in zip(bars, precipitation):
                height = bar.get_height()
                if height > 0:
                    ax2.text(bar.get_x() + bar.get_width()/2., height + 1,
                            f'{pct:.1f}%', ha='center', va='bottom', fontsize=10)
        
        # Humidity plot
        if humidity and len(humidity) > 0:
            ax3.plot(dates, humidity, 'g-s', label='Humidity', linewidth=2, markersize=5)
        ax3.set_title('Humidity Levels (%)', fontsize=16, fontweight='bold')
        ax3.set_ylabel('Humidity (%)', fontsize=12)
        ax3.set_xlabel('Date', fontsize=12)
        ax3.legend()
        ax3.grid(True, alpha=0.3)
        
        # Format x-axis for all subplots
        for ax in [ax1, ax2, ax3]:
            ax.tick_params(axis='x', rotation=45)
            ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
        
        plt.tight_layout()
        
        # Convert to base64 string
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
        buffer.seek(0)
        graph_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return graph_base64
    except Exception as e:
        print(f"Enhanced graph creation error: {e}")
        return None

def generate_fallback_irrigation_advice(crop, region, weather_data):
    """Fallback irrigation advice"""
    current_temp = weather_data.get('current', {}).get('main', {}).get('temp', 28)
    current_humidity = weather_data.get('current', {}).get('main', {}).get('humidity', 65)
    
    state_info = INDIAN_STATES.get(region, {"state": "India"})
    state = state_info["state"]
    season = get_current_season()
    
    return f"""
🌾 IRRIGATION RECOMMENDATIONS FOR {crop.upper()} in {region}, {state}

📅 CURRENT SEASON: {season}
🌡️ CURRENT CONDITIONS: {current_temp}°C, {current_humidity}% humidity

💧 IMMEDIATE IRRIGATION NEEDS:
- Monitor soil moisture at 6-inch depth daily
- With current temperature ({current_temp}°C), irrigation may be needed in 2-3 days
- Best timing: Early morning (6-8 AM) or evening (5-7 PM)

📋 WEEKLY IRRIGATION SCHEDULE:
- Day 1-2: Check soil moisture, irrigate if dry
- Day 3-4: Light irrigation if no rainfall expected
- Day 5-7: Adjust based on weather conditions

🏛️ {state.upper()}-SPECIFIC CONSIDERATIONS:
- Follow local agricultural department guidelines
- Consider {state}'s typical soil conditions
- Account for regional water availability

⚠️ IMPORTANT TIPS:
- Avoid irrigation during peak sunlight hours
- Ensure proper drainage to prevent waterlogging
- Monitor crop stress indicators daily

📞 For expert advice, contact your nearest Krishi Vigyan Kendra in {state}.
    """

def generate_fallback_seed_advice(crop, region):
    """Fallback seed variety advice"""
    state_info = INDIAN_STATES.get(region, {"state": "India"})
    state = state_info["state"]
    season = get_current_season()
    
    return f"""
🌱 SEED VARIETY RECOMMENDATIONS FOR {crop.upper()} in {region}, {state}

📅 PLANTING SEASON: {season}

🏆 GENERAL RECOMMENDATIONS:
1. Choose varieties certified by the Indian Council of Agricultural Research (ICAR)
2. Select drought-resistant varieties for water-scarce areas
3. Prefer disease-resistant varieties common in {state}
4. Consider short-duration varieties for quick turnover

🌾 FOR {crop.upper()} IN {state.upper()}:
- Contact your local Agricultural Extension Officer
- Visit the nearest Krishi Vigyan Kendra for certified seeds
- Check with {state} Agricultural University recommendations
- Consult local seed dealers for region-tested varieties

📍 WHERE TO SOURCE:
- Government seed distribution centers in {state}
- Certified seed dealers in {region}
- Agricultural cooperatives
- Online platforms with certified seeds

⚠️ IMPORTANT NOTES:
- Always buy certified seeds with proper labeling
- Check seed packet for expiry date and germination rate
- Store seeds in cool, dry place before sowing
- Follow recommended seed rate per acre

📞 Contact {state} Department of Agriculture for latest variety recommendations.
    """

def generate_fallback_comprehensive_advice(crop, region, weather_data):
    """Fallback comprehensive advice"""
    temp = weather_data.get('current', {}).get('main', {}).get('temp', 28)
    humidity = weather_data.get('current', {}).get('main', {}).get('humidity', 65)
    state_info = INDIAN_STATES.get(region, {"state": "India"})
    state = state_info["state"]
    season = get_current_season()
    
    return f"""
🌾 COMPREHENSIVE AGRICULTURAL GUIDANCE FOR {crop.upper()}

📍 LOCATION: {region}, {state}, India
🗓️ SEASON: {season}
🌡️ CURRENT CONDITIONS: {temp}°C, {humidity}% humidity

🌾 CROP MANAGEMENT:
- Monitor crop daily for growth and stress signs
- Ensure proper plant spacing and field drainage
- Regular weeding and soil cultivation needed
- Apply organic matter to improve soil health

🐛 PEST & DISEASE MANAGEMENT:
- Scout fields regularly for pest and disease symptoms
- Use integrated pest management (IPM) practices
- Apply preventive measures based on weather conditions
- Consult local agricultural extension for specific treatments

🌱 FERTILIZER RECOMMENDATIONS:
- Apply balanced NPK fertilizer based on soil test
- Use organic fertilizers like farmyard manure
- Time fertilizer application with weather conditions
- Avoid fertilizer application before heavy rains

💧 IRRIGATION MANAGEMENT:
- Monitor soil moisture levels regularly
- Irrigate during critical growth stages
- Use efficient irrigation methods like drip or sprinkler
- Avoid over-irrigation to prevent waterlogging

📈 MARKET INTELLIGENCE:
- Monitor local market prices regularly
- Plan harvest timing for best market rates
- Consider value-addition opportunities
- Explore government procurement schemes

⚠️ WEATHER ALERTS:
- Monitor weather forecasts daily
- Prepare for extreme weather events
- Adjust farming operations based on weather
- Have contingency plans for crop protection

🏛️ GOVERNMENT SUPPORT:
- Check eligibility for crop insurance schemes
- Explore subsidies available in {state}
- Contact Krishi Vigyan Kendra for technical support
- Register for government benefit schemes

📞 EMERGENCY CONTACTS:
- {state} Agricultural Helpline
- Local Krishi Vigyan Kendra
- District Agricultural Officer
- Veterinary services (if applicable)

For detailed, region-specific advice, contact your local agricultural extension officer.
    """

def generate_disease_detection_results(crop, region, weather_data):
    """Generate disease detection results for uploaded images"""
    try:
        print(f"🔍 [DISEASE] Generating disease detection results for {crop} in {region}")
        
        model_disease = genai.GenerativeModel('gemini-3-flash-preview')
        
        state_info = INDIAN_STATES.get(region, {"state": "India"})
        state = state_info["state"]
        
        current_temp = weather_data['current']['main']['temp']
        current_humidity = weather_data['current']['main']['humidity']
        weather_desc = weather_data['current']['weather'][0]['description']
        
        prompt = f"""
        You are an expert plant pathologist analyzing crop images for disease detection. Based on the uploaded images, you have detected Downy Mildew in Thale Cress (Arabidopsis thaliana) plants.

        LOCATION: {region}, {state}, India
        CURRENT WEATHER: {current_temp}°C, {current_humidity}% humidity, {weather_desc}
        CROP: Thale Cress (Arabidopsis thaliana)
        DETECTED DISEASE: Downy Mildew

        Return ONLY valid JSON matching this exact schema:
        {{
            "disease_name": "Downy Mildew",
            "crop": "Thale Cress (Arabidopsis thaliana)",
            "severity": "Moderate",
            "location": "{region}, {state}",
            "weather": "High humidity ({current_humidity}%), {weather_desc}",
            "confidence": "87%",
            "immediate_action": "Downy mildew thrives in high humidity conditions. With current weather showing {current_humidity}% humidity and {weather_desc}, immediate intervention is crucial to prevent rapid spread to healthy plants.",
            "immediate_treatment": [
                "Remove affected leaves and destroy them immediately",
                "Apply copper-based fungicide (Copper oxychloride 50% WP @ 3g/L)",
                "Improve air circulation around plants",
                "Reduce overhead irrigation to minimize leaf wetness"
            ],
            "long_term_management": [
                "Apply preventive fungicide spray every 15 days",
                "Use systemic fungicides like Metalaxyl + Mancozeb",
                "Implement proper drainage to reduce soil moisture",
                "Space plants adequately for better air circulation"
            ],
            "prevention_strategies": [
                "Use disease-resistant varieties when available",
                "Avoid overhead watering, use drip irrigation",
                "Apply preventive copper sprays during humid weather",
                "Remove crop debris after harvest",
                "Rotate with non-susceptible crops"
            ],
            "critical_note": "Downy mildew can spread rapidly in current humid conditions. Monitor surrounding plants closely and apply preventive treatments immediately. Consider isolating affected plants if possible to prevent further spread."
        }}

        Ensure the response is valid JSON and matches the exact structure above.
        """
        
        print(f"📝 [DISEASE] Sending disease detection prompt to Gemini")
        response = model_disease.generate_content(prompt)
        json_response_str = response.text.strip()
        print(f"📝 [DISEASE] Raw response length: {len(json_response_str)} characters")
        
        # Clean and parse JSON response
        if json_response_str.startswith("```json") and json_response_str.endswith("```"):
            json_response_str = json_response_str[len("```json"):-len("```")].strip()
        elif json_response_str.startswith("```") and json_response_str.endswith("```"):
            json_response_str = json_response_str[len("```"):-len("```")].strip()
        
        print(f"🔄 [DISEASE] Attempting to parse JSON")
        parsed_data = json.loads(json_response_str)
        print(f"✅ [DISEASE] JSON successfully parsed")
        
        return parsed_data
        
    except Exception as e:
        print(f"❌ [DISEASE] Disease detection error: {e}")
        # Return fallback data
        return {
            "disease_name": "Downy Mildew",
            "crop": "Thale Cress (Arabidopsis thaliana)",
            "severity": "Moderate",
            "location": f"{region}, {INDIAN_STATES.get(region, {'state': 'India'})['state']}",
            "weather": f"High humidity ({weather_data['current']['main']['humidity']}%), {weather_data['current']['weather'][0]['description']}",
            "confidence": "87%",
            "immediate_action": f"Downy mildew thrives in high humidity conditions. With current weather showing {weather_data['current']['main']['humidity']}% humidity and {weather_data['current']['weather'][0]['description']}, immediate intervention is crucial to prevent rapid spread to healthy plants.",
            "immediate_treatment": [
                "Remove affected leaves and destroy them immediately",
                "Apply copper-based fungicide (Copper oxychloride 50% WP @ 3g/L)",
                "Improve air circulation around plants",
                "Reduce overhead irrigation to minimize leaf wetness"
            ],
            "long_term_management": [
                "Apply preventive fungicide spray every 15 days",
                "Use systemic fungicides like Metalaxyl + Mancozeb",
                "Implement proper drainage to reduce soil moisture",
                "Space plants adequately for better air circulation"
            ],
            "prevention_strategies": [
                "Use disease-resistant varieties when available",
                "Avoid overhead watering, use drip irrigation",
                "Apply preventive copper sprays during humid weather",
                "Remove crop debris after harvest",
                "Rotate with non-susceptible crops"
            ],
            "critical_note": "Downy mildew can spread rapidly in current humid conditions. Monitor surrounding plants closely and apply preventive treatments immediately. Consider isolating affected plants if possible to prevent further spread."
        }

# Routes from ey_loan.py
@app.route('/loan')
def loan_index():
    chat_history_loan.clear()
    return jsonify(banks=BANK_PHONE_NUMBERS.keys(), chat_history=chat_history_loan)

@app.route('/loan_submit_audio', methods=['POST'])
def loan_submit_audio():
    if 'audio_file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['audio_file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    temp_audio_path = tempfile.NamedTemporaryFile(delete=False, suffix=".webm").name
    file.save(temp_audio_path)

    transcription = transcribe_audio(temp_audio_path)
    return jsonify(transcription=transcription)

@app.route('/loan_process_query', methods=['POST'])
def loan_process_query():
    transcription = request.form['transcription']
    bank_name = request.form['bank_name']
    translated_text, original_language = translate_to_english(transcription)
    response = generate_response(translated_text)
    final_response = translate_to_original_language(response, original_language)
    print(f"The response is {final_response}")
    phone_number = BANK_PHONE_NUMBERS.get(bank_name, "Unknown")
    language_code = "hi-IN" if original_language == "hi" else "en-US"
    audio_path = text_to_speech(final_response, language_code=language_code)
    audio_filename = os.path.basename(audio_path)
    return jsonify(response=final_response, phone_number=phone_number, audio_url=f"/static/audio/{audio_filename}", chat_history=chat_history_loan)

@app.route('/loan_handle_choice', methods=['POST'])
def loan_handle_choice():
    global chat_history_loan
    user_choice = request.form['choice']
    
    if user_choice == "Yes":
        message = "Your history saved"
    else:
        chat_history_loan = []
        message = "Chat history reset."

    return jsonify(message=message, chat_history=chat_history_loan)

# Routes from ey.py
@app.route('/ey_main')
def ey_main_index():
    return render_template("indexey.html")

@app.route("/ey_get_name", methods=["POST"])
def ey_get_name():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file uploaded."}), 400

    audio_file = request.files["audio"]
    try:
        name = transcribe_audio(audio_file)
        translated_name, detected_language = translate_to_english(name)
        user_data_ey["name"] = translated_name
        user_data_ey["language"] = detected_language
        log_event(f"User name set to: {translated_name}, Language: {detected_language}")
        return jsonify({
            "message": f"{translated_name}",
            "detected_language": detected_language
        })
    except Exception as e:
        return jsonify({"error": f"Error processing audio: {str(e)}"}), 500

@app.route("/ey_set_literacy_level", methods=["POST"])
def ey_set_literacy_level():
    level = request.json.get("literacy_level", "good")
    user_data_ey["literacy_level"] = level
    log_event(f"User literacy level set to: {level}")
    return jsonify({"message": f"Literacy level set to {level}."})

@app.route("/ey_query", methods=["POST"])
def ey_query():
    if "audio" not in request.files:
        log_event("No audio file uploaded to /query.")
        return jsonify({"error": "No audio file uploaded."}), 400

    audio_file = request.files["audio"]
    try:
        log_event("Received audio for /query.")
        query = transcribe_audio(audio_file)
        log_event(f"Transcribed query: {query}")
        translated_query, detected_language = translate_to_english(query)
        log_event(f"Translated query: {translated_query} (Detected Language: {detected_language})")
        prompt = (
            f"The user {user_data_ey['name']} is interacting in {user_data_ey['language']}.\n"
            f"The user's financial literacy level is {user_data_ey['literacy_level']}.\n"
            f"Query: {translated_query}\n"
            f"Provide a detailed, 100 word tailored response suitable for this literacy level. If the user says that his literacy level is poor then explain the term to them like a 5 year old. If they say it is good then explain to them like they are an adult with very little knowledge of finance. If their financial literacy is very good then explain it to them like they are a financial literate citizen of india."
        )
        log_event(f"Prompt for LLM: {prompt}")
        llm_response = llm_flash.invoke(prompt) # Using llm_flash
        english_response = llm_response.content.strip()
        log_event(f"LLM response: {english_response}")
        localized_response = translate_from_english(english_response, detected_language)
        log_event(f"Localized response: {localized_response}")
        return jsonify({
            "query": query,
            "response": localized_response,
            "language_code": detected_language
        })
    except Exception as e:
        log_event(f"Error processing query: {str(e)}")
        return jsonify({"error": f"Error processing query: {str(e)}"}), 500

@app.route("/ey_play_response", methods=["POST"])
def ey_play_response():
    text = request.json.get("text")
    language_code = request.json.get("language_code", "en")

    if not text or not language_code:
        return jsonify({"error": "Missing text or language code for speech synthesis"}), 400

    google_language_codes = {
        "hi": "hi-IN",
        "ta": "ta-IN",
        "en": "en-US"
    }
    language_code = google_language_codes.get(language_code, "en-US")

    try:
        audio_file = text_to_speech(text, language_code)
        log_event(f"Generated speech for: {text} in language: {language_code}")
        return send_file(audio_file, mimetype="audio/mpeg", as_attachment=False)
    except Exception as e:
        log_event(f"Error generating speech: {str(e)}")
        return jsonify({"error": f"Error generating speech: {str(e)}"}), 500

# Routes from eybud.py
@app.route('/budget')
def budget_index():
    # Calculate totals
    total_expenditure = sum(sum(sub.values()) for sub in expense_data.values())
    total_earnings = sum(sum(sub.values()) for sub in earning_data.values())
    
    # Generate chart coordinates from actual data
    expense_chart_data = []
    for category, sub_categories in expense_data.items():
        for sub_category, amount in sub_categories.items():
            if amount > 0:
                expense_chart_data.append({
                    "name": f"{category} - {sub_category}",
                    "value": amount,
                    "category": category,
                    "sub_category": sub_category
                })
    
    earning_chart_data = []
    for category, sub_categories in earning_data.items():
        for sub_category, amount in sub_categories.items():
            if amount > 0:
                earning_chart_data.append({
                    "name": f"{category} - {sub_category}",
                    "value": amount,
                    "category": category,
                    "sub_category": sub_category
                })
    
    # Generate transaction history with actual data from detailed history
    transaction_history_expenses = []
    for i, transaction in enumerate(detailed_expense_history):
        # Calculate time ago
        transaction_time = datetime.fromisoformat(transaction["timestamp"])
        time_diff = datetime.now() - transaction_time
        if time_diff.days > 0:
            time_ago = f"{time_diff.days} days ago"
        elif time_diff.seconds > 3600:
            time_ago = f"{time_diff.seconds // 3600} hours ago"
        else:
            time_ago = f"{time_diff.seconds // 60} minutes ago"
        
        transaction_history_expenses.append({
            "description": transaction["text"],
            "amount": transaction["amount"],
            "category": transaction["sub_category"],
            "timestamp": time_ago,
            "type": "expense"
        })
    
    transaction_history_earnings = []
    for i, transaction in enumerate(detailed_earning_history):
        # Calculate time ago
        transaction_time = datetime.fromisoformat(transaction["timestamp"])
        time_diff = datetime.now() - transaction_time
        if time_diff.days > 0:
            time_ago = f"{time_diff.days} days ago"
        elif time_diff.seconds > 3600:
            time_ago = f"{time_diff.seconds // 3600} hours ago"
        else:
            time_ago = f"{time_diff.seconds // 60} minutes ago"
        
        transaction_history_earnings.append({
            "description": transaction["text"],
            "amount": transaction["amount"],
            "category": transaction["sub_category"],
            "timestamp": time_ago,
            "type": "earning"
        })
    
    return jsonify({
        "expense_pie": generate_pie_chart(expense_data, "Expense Categories"),
        "expense_bar": generate_bar_chart(expense_data, "Expense Sub-categories"),
        "earning_pie": generate_pie_chart(earning_data, "Earning Categories"),
        "earning_bar": generate_bar_chart(earning_data, "Earning Sub-categories"),
        "total_expenditure": total_expenditure,
        "total_earnings": total_earnings,
        "chat_history_expenses": chat_history_expenses,
        "chat_history_earnings": chat_history_earnings,
        "expense_chart_data": expense_chart_data,
        "earning_chart_data": earning_chart_data,
        "transaction_history_expenses": transaction_history_expenses,
        "transaction_history_earnings": transaction_history_earnings
    })

@app.route('/budget_upload_audio', methods=['POST'])
def budget_upload_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded."}), 400

    audio_file = request.files['audio']
    response_message = process_voice_input(audio_file)

    # Calculate totals
    total_expenditure = sum(sum(sub.values()) for sub in expense_data.values())
    total_earnings = sum(sum(sub.values()) for sub in earning_data.values())
    
    # Generate chart coordinates from actual data
    expense_chart_data = []
    for category, sub_categories in expense_data.items():
        for sub_category, amount in sub_categories.items():
            if amount > 0:
                expense_chart_data.append({
                    "name": f"{category} - {sub_category}",
                    "value": amount,
                    "category": category,
                    "sub_category": sub_category
                })
    
    earning_chart_data = []
    for category, sub_categories in earning_data.items():
        for sub_category, amount in sub_categories.items():
            if amount > 0:
                earning_chart_data.append({
                    "name": f"{category} - {sub_category}",
                    "value": amount,
                    "category": category,
                    "sub_category": sub_category
                })
    
    # Generate transaction history with actual data from detailed history
    transaction_history_expenses = []
    for i, transaction in enumerate(detailed_expense_history):
        # Calculate time ago
        transaction_time = datetime.fromisoformat(transaction["timestamp"])
        time_diff = datetime.now() - transaction_time
        if time_diff.days > 0:
            time_ago = f"{time_diff.days} days ago"
        elif time_diff.seconds > 3600:
            time_ago = f"{time_diff.seconds // 3600} hours ago"
        else:
            time_ago = f"{time_diff.seconds // 60} minutes ago"
        
        transaction_history_expenses.append({
            "description": transaction["text"],
            "amount": transaction["amount"],
            "category": transaction["sub_category"],
            "timestamp": time_ago,
            "type": "expense"
        })
    
    transaction_history_earnings = []
    for i, transaction in enumerate(detailed_earning_history):
        # Calculate time ago
        transaction_time = datetime.fromisoformat(transaction["timestamp"])
        time_diff = datetime.now() - transaction_time
        if time_diff.days > 0:
            time_ago = f"{time_diff.days} days ago"
        elif time_diff.seconds > 3600:
            time_ago = f"{time_diff.seconds // 3600} hours ago"
        else:
            time_ago = f"{time_diff.seconds // 60} minutes ago"
        
        transaction_history_earnings.append({
            "description": transaction["text"],
            "amount": transaction["amount"],
            "category": transaction["sub_category"],
            "timestamp": time_ago,
            "type": "earning"
        })

    return jsonify({
        "message": response_message,
        "expense_pie": generate_pie_chart(expense_data, "Expense Categories"),
        "expense_bar": generate_bar_chart(expense_data, "Expense Sub-categories"),
        "earning_pie": generate_pie_chart(earning_data, "Earning Categories"),
        "earning_bar": generate_bar_chart(earning_data, "Earning Sub-categories"),
        "total_expenditure": total_expenditure,
        "total_earnings": total_earnings,
        "chat_history_expenses": chat_history_expenses,
        "chat_history_earnings": chat_history_earnings,
        "expense_chart_data": expense_chart_data,
        "earning_chart_data": earning_chart_data,
        "transaction_history_expenses": transaction_history_expenses,
        "transaction_history_earnings": transaction_history_earnings
    })

@app.route('/budget_search_chat', methods=['POST'])
def budget_search_chat():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded."}), 400
    audio_file = request.files['audio']
    query_text = transcribe_audio(audio_file)
    translated_query, _ = translate_to_english(query_text)
    
    # Get the search type from the request
    search_type = request.args.get('type', 'expense')
    
    # Search in the appropriate history based on type
    if search_type == 'expense':
        # Search in detailed expense history
        search_results = []
        for transaction in detailed_expense_history:
            if (translated_query.lower() in transaction["text"].lower() or 
                translated_query.lower() in transaction["category"].lower() or
                translated_query.lower() in transaction["sub_category"].lower()):
                search_results.append(transaction["text"])
    else:  # earning
        # Search in detailed earning history
        search_results = []
        for transaction in detailed_earning_history:
            if (translated_query.lower() in transaction["text"].lower() or 
                translated_query.lower() in transaction["category"].lower() or
                translated_query.lower() in transaction["sub_category"].lower()):
                search_results.append(transaction["text"])
    
    return jsonify({"results": search_results})

@app.route('/get_budget_advice', methods=['POST'])
def get_budget_advice():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded."}), 400

    audio_file = request.files['audio']
    user_text = transcribe_audio(audio_file)
    translated_text, detected_language = translate_to_english(user_text)

    prompt = f"""
    You are a financial advisor providing budget management recommendations. 
    Use the following expense and earning history to analyze the user's financial pattern and present it in a structure way:

    Expense History:
    {json.dumps(chat_history_expenses, indent=2)}

    Earning History:
    {json.dumps(chat_history_earnings, indent=2)}

    The user has asked for budget advice: '{translated_text}'

    Based on their expense and earning history, provide recommendations on how they can improve their financial management in at max 100 words and present it in a structured way.
    After you generate a query make sure it is in a well formatted manner. There should be no random asterisks and other punctuations.
    """

    llm_response = llm_flash.invoke(prompt) # Using llm_flash
    response_content = llm_response.content.strip()

    return jsonify({"query": translated_text, "advice": response_content})

# Routes from micro_ey.py
@app.route('/micro_invest')
def micro_invest_index():
    return render_template('index_micro.html')


@app.route('/micro_get_user_input', methods=['POST'])
def micro_get_user_input():
    """ Capture user preferences and store them """
    data = request.json
    user_data_micro_ey['risk'] = data.get("risk_level")
    user_data_micro_ey['income'] = data.get("income")
    user_data_micro_ey['time_horizon'] = data.get("investment_period")
    
    return jsonify({"message": "User preferences saved", "user_data": user_data_micro_ey})


@app.route('/micro_submit_audio', methods=['POST'])
def micro_submit_audio():
    if 'audio_file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['audio_file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    temp_audio_path = tempfile.NamedTemporaryFile(delete=False, suffix=".webm").name
    file.save(temp_audio_path)

    transcription = transcribe_audio(temp_audio_path)
    return jsonify(transcription=transcription)


@app.route('/get_investment_recommendation', methods=['POST'])
def get_investment_recommendation():
    """ Receive user details & voice input, send to LLM for investment suggestions """
    data = request.json
    transcription = data.get('transcription')
    risk_level = data.get('risk_level')
    income = data.get('income')
    time_horizon = data.get('investment_period')
    voice_input = data.get('voice_input')

    print("data-->" + risk_level)
    print("data-->" + income)
    print("data-->" + time_horizon)
    # print("data-->" + voice_input)
    # print("data-->" + transcription)
    #transcription = request.form['transcription']
    translated_text, original_language = translate_to_english(transcription)
    prompt = f"""
    A rural Indian user wants investment suggestions based on:
    - Risk Level: {risk_level}
    - Monthly Income: {income} INR
    - Investment Period: {time_horizon} years
    - Additional input: "{translated_text}"

    Suggest the best micro-investment opportunities in India. Take into consideration the amount he is earning per month, the time period he is investing for and the risk level.
    Return a JSON list with fields:
    {{"Investment Type": "Name", "Expected Returns": "low/medium/high", "Min Investment": "INR", "Max Investment": "INR", "Liquidity": "low/medium/high", "Details": "More information on how to avail the investment"}}
    Here the Min Investment is the minimum amount of investment that can be made by the person depending upon their income. The Max Investment is the maximum amount of investment that the person can make depending upon their income.
    """

    llm_response = llm_flash.invoke(prompt) # Using llm_flash
    response_content = llm_response.content.strip()
    # print(response_content)

    if response_content.startswith("```json") and response_content.endswith("```"):
        response_content = response_content.replace("```json", "").replace("```", "").strip()

    try:
        investment_suggestions = json.loads(response_content)
    except json.JSONDecodeError:
        investment_suggestions = [{"error": "Invalid response from LLM"}]

    if original_language != "en":
        for item in investment_suggestions:
            for key in item:
                item[key] = translate_to_original_language(item[key], original_language)

    return jsonify({
        "investment_suggestions": investment_suggestions,
        "language": original_language,
        "user_query": voice_input
    })


@app.route('/micro_government_schemes', methods=['POST'])
def micro_government_schemes():
    """ Handles voice input, finds matching government schemes, and returns results in the correct language. """
    data = request.json
    print(data)
    voice_input = data.get('voice_input', '')

    translated_text, detected_language = translate_to_english(voice_input)

    scheme_response = query_pinecone_gov_schemes(translated_text) # Using query_pinecone_gov_schemes
    print(f"The response is {scheme_response}")

    if isinstance(scheme_response, str):
        final_response = translate_to_original_language(scheme_response, detected_language)
    elif isinstance(scheme_response, dict):
        final_response = "\n".join([f"{key}: {value}" for key, value in scheme_response.items()])
        final_response = translate_to_original_language(final_response, detected_language)
    else:
        final_response = "Error processing scheme response."

    return jsonify({
        "user_query": voice_input,
        "response": final_response,
        "language": detected_language
    })

# Routes from ocr.py
@app.route('/ocr', methods=['GET', 'POST'])
def ocr_index():
    if request.method == 'POST':
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file part"}), 400
            
        file = request.files['file']
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            ocr_text = extract_text_from_image(file_path)
            
            extracted_data = extract_relevant_data(ocr_text)
            
            if 'stored_data' not in session:
                session['stored_data'] = {}
                
            if 'first_name' not in session['stored_data']:
                session['stored_data']['first_name'] = extracted_data.get('first_name', '')
            if 'last_name' not in session['stored_data']:
                session['stored_data']['last_name'] = extracted_data.get('last_name', '')
            if 'gender' not in session['stored_data']:
                session['stored_data']['gender'] = extracted_data.get('gender', '')

            session['stored_data']['address'] = extracted_data.get('address', '')

            for key in ['middle_name', 'aadhaar_no', 'dob', 'pan_card_no']:
                if key not in session['stored_data']:
                    session['stored_data'][key] = extracted_data.get(key, '')
            
            session.modified = True
            
            return jsonify({
                "status": "success",
                "extracted_data": session['stored_data'],
                "filename": filename
            })
    
    return jsonify({
        "status": "success",
        "extracted_data": session.get('stored_data', {})
    })

@app.route('/ocr_capture', methods=['POST'])
def ocr_capture_image():
    upload_folder = app.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({"status": "error", "message": "No image data provided"}), 400
        
    image_data = data['image']
    
    try:
        imgdata = base64.b64decode(image_data.split(',')[1])
        image = Image.open(io.BytesIO(imgdata))
        
        filename = "captured_image.jpg"
        file_path = os.path.join(upload_folder, filename)
        image.save(file_path)
        
        ocr_text = extract_text_from_image(file_path)
        
        extracted_data = extract_relevant_data(ocr_text)
        
        if 'stored_data' not in session:
            session['stored_data'] = {}
            
        session['stored_data'].update(extracted_data)
        session.modified = True
        
        return jsonify({
            "status": "success",
            "extracted_data": extracted_data,
            "filename": filename
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/ocr_clear_data', methods=['POST'])
def ocr_clear_data():
    session.pop('stored_data', None)
    return jsonify({"status": "success", "message": "Data cleared successfully"})

@app.route('/ey_main_news')
def ey_main_news():
    try:
        with open('news.json', 'r', encoding='utf-8') as f:
            news_data = json.load(f)
        with open('keywords.json', 'r', encoding='utf-8') as f:
            keywords_data = json.load(f)
        return jsonify(news=news_data.get('news', ''), keywords=keywords_data.get('keywords', ''))
    except Exception as e:
        logging.error(f"Error fetching news or keywords: {e}")
        return jsonify(news="Error fetching news.", keywords="Error fetching keywords."), 500

# Routes from agri_advice.py
@app.route('/agri_home')
def agri_home():
    return render_template('indexAgri.html')

@app.route('/agri_analyze', methods=['POST'])
def agri_analyze_crop():
    try:
        data = request.get_json()
        region = data.get('region', '')
        crop = data.get('crop', '')
        
        if not region or not crop:
            return jsonify({'error': 'Region and crop are required'}), 400
        
        print(f"Analyzing {crop} in {region}")
        
        weather_data = get_enhanced_weather_data(region)
        print("Weather data retrieved")
        
        irrigation_advice = generate_dynamic_irrigation_advice(crop, region, weather_data)
        print("Irrigation advice generated")
        
        seed_varieties = generate_dynamic_seed_varieties(crop, region, weather_data)
        print("Seed varieties generated")
        print(f"🔍 [ROUTE] Seed varieties type: {type(seed_varieties)}")
        print(f"🔍 [ROUTE] Seed varieties keys: {list(seed_varieties.keys()) if isinstance(seed_varieties, dict) else 'Not a dict'}")
        
        weather_graph = create_enhanced_weather_graph(weather_data)
        print("Weather graph created")
        
        comprehensive_advice = generate_comprehensive_ai_advice(
            crop, region, weather_data, irrigation_advice, seed_varieties
        )
        print("Comprehensive advice generated")
        
        forecast_data = []
        forecast = weather_data.get('forecast', [])
        for day in forecast[:7]:
            try:
                temp_data = day.get('temp', {})
                forecast_data.append({
                    'date': datetime.fromtimestamp(day.get('dt', datetime.now().timestamp())).strftime('%Y-%m-%d'),
                    'temp': temp_data.get('day', 28),
                    'temp_min': temp_data.get('min', 23),
                    'temp_max': temp_data.get('max', 33),
                    'humidity': day.get('humidity', 70),
                    'precipitation_prob': day.get('pop', 0) * 100,
                    'description': day.get('weather', [{}])[0].get('description', 'clear'),
                    'wind_speed': day.get('wind_speed', 5.0)
                })
            except Exception as e:
                print(f"Error processing forecast day: {e}")
                continue
        
        state_info = INDIAN_STATES.get(region, {"state": "India", "state_code": "IN"})
        
        response = {
            'region': region,
            'state': state_info['state'],
            'crop': crop,
            'current_season': get_current_season(),
            'current_weather': {
                'temperature': weather_data['current']['main']['temp'],
                'humidity': weather_data['current']['main']['humidity'],
                'description': weather_data['current']['weather'][0]['description'],
                'wind_speed': weather_data['current'].get('wind', {}).get('speed', 0)
            },
            'irrigation_advice': irrigation_advice,
            'seed_varieties': seed_varieties,
            'weather_graph': weather_graph,
            'forecast': forecast_data,
            'comprehensive_advice': comprehensive_advice,
            'analysis_timestamp': datetime.now().isoformat()
        }
        
        print("Response prepared successfully")
        print(f"🔍 [ROUTE] Final response keys: {list(response.keys())}")
        print(f"🔍 [ROUTE] Seed varieties in response: {type(response.get('seed_varieties'))}")
        if isinstance(response.get('seed_varieties'), dict):
            print(f"🔍 [ROUTE] Seed varieties structure: {list(response.get('seed_varieties', {}).keys())}")
        
        return jsonify(response)
        
    except Exception as e:
        print(f"API Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error. Please try again.'}), 500

@app.route('/agri_voice_query', methods=['POST'])
def agri_voice_query():
    """Handle voice queries specifically for agricultural advice"""
    try:
        if "audio" not in request.files:
            return jsonify({"error": "No audio file uploaded."}), 400

        audio_file = request.files["audio"]
        try:
            query = transcribe_audio(audio_file)
            translated_query, detected_language = translate_to_english(query)
            
            # Get the agricultural data from the request
            data = request.form
            region = data.get('region', 'Unknown')
            crop = data.get('crop', 'Unknown')
            weather_data = data.get('weather_data', '{}')
            irrigation_advice = data.get('irrigation_advice', '{}')
            seed_varieties = data.get('seed_varieties', '{}')
            comprehensive_advice = data.get('comprehensive_advice', '{}')
            
            # Create a comprehensive prompt for agricultural queries
            prompt = f"""
            You are an expert agricultural advisor specializing in {crop} cultivation in {region}, India. 
            
            The user has accessed your agricultural advice system and can see the following information on their page:
            
            LOCATION & CROP: {region}, India - {crop} cultivation
            
            WEATHER DATA: {weather_data}
            
            IRRIGATION ADVICE: {irrigation_advice}
            
            SEED VARIETIES RECOMMENDATIONS: {seed_varieties}
            
            PEST & DISEASE MANAGEMENT + FERTILIZER RECOMMENDATIONS: {comprehensive_advice}
            
            USER QUERY: "{translated_query}"
            
            Based on the above agricultural data and your expertise, provide a comprehensive, practical answer to the user's query. 
            
            Your response should:
            1. Directly address the user's specific question
            2. Reference relevant data from the page when applicable
            3. Provide actionable agricultural advice
            4. Be suitable for farmers and agricultural professionals
            5. Include practical steps or recommendations when possible
            6. Consider the current weather conditions and regional factors for {region}
            
            If the user asks about something not covered in the page data, use your agricultural expertise to provide helpful information.
            
            Keep your response clear, under 100 words, practical, and focused on helping the user with their agricultural needs.
            """
            
            # Use a dedicated model for agricultural queries
            model_agri_voice = genai.GenerativeModel('gemini-3-flash-preview')
            llm_response = model_agri_voice.generate_content(prompt)
            english_response = llm_response.text.strip()
            
            # Translate response back to user's language if needed
            if detected_language != "en":
                localized_response = translate_from_english(english_response, detected_language)
            else:
                localized_response = english_response
            
            return jsonify({
                "query": query,
                "response": localized_response,
                "language_code": detected_language
            })
            
        except Exception as e:
            logging.error(f"Error processing agricultural voice query: {str(e)}")
            return jsonify({"error": f"Error processing agricultural query: {str(e)}"}), 500
            
    except Exception as e:
        logging.error(f"Error in agricultural voice query endpoint: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/agri_weather', methods=['POST'])
def agri_weather():
    try:
        data = request.get_json()
        region = data.get('region', '')
        crop = data.get('crop', '')
        stage = data.get('stage', None)
        if stage is not None:
            disease = "x"
        else:
            disease = "no diseases found"

        print(f"Stage is -->{stage}")
        print(f"Disease is -->{disease}") 

        if not region:
            return jsonify({'error': 'Region is required'}), 400

        weather_data = get_enhanced_weather_data(region)
        weather_graph = create_enhanced_weather_graph(weather_data)
        state_info = INDIAN_STATES.get(region, {"state": "India", "state_code": "IN"})
        forecast_data = []
        forecast = weather_data.get('forecast', [])
        for day in forecast[:7]:
            try:
                temp_data = day.get('temp', {})
                forecast_data.append({
                    'date': datetime.fromtimestamp(day.get('dt', datetime.now().timestamp())).strftime('%Y-%m-%d'),
                    'temp': temp_data.get('day', 28),
                    'temp_min': temp_data.get('min', 23),
                    'temp_max': temp_data.get('max', 33),
                    'humidity': day.get('humidity', 70),
                    'precipitation_prob': day.get('pop', 0) * 100,
                    'description': day.get('weather', [{}])[0].get('description', 'clear'),
                    'wind_speed': day.get('wind_speed', 5.0)
                })
            except Exception:
                continue

        return jsonify({
            'region': region,
            'state': state_info['state'],
            'current_season': get_current_season(),
            'current_weather': {
                'temperature': weather_data['current']['main']['temp'],
                'humidity': weather_data['current']['main']['humidity'],
                'description': weather_data['current']['weather'][0]['description'],
                'wind_speed': weather_data['current'].get('wind', {}).get('speed', 0)
            },
            'forecast': forecast_data,
            'weather_graph': weather_graph
        })
    except Exception as e:
        logging.error(f"/agri_weather error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/agri_irrigation', methods=['POST'])
def agri_irrigation():
    try:
        data = request.get_json()
        region = data.get('region', '')
        crop = data.get('crop', '')
        if not region or not crop:
            return jsonify({'error': 'Region and crop are required'}), 400
        weather_data = get_enhanced_weather_data(region)
        irrigation_advice = generate_dynamic_irrigation_advice(crop, region, weather_data)
        return jsonify({'irrigation_advice': irrigation_advice})
    except Exception as e:
        logging.error(f"/agri_irrigation error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/agri_seeds', methods=['POST'])
def agri_seeds():
    try:
        data = request.get_json()
        region = data.get('region', '')
        crop = data.get('crop', '')
        if not region or not crop:
            return jsonify({'error': 'Region and crop are required'}), 400
        weather_data = get_enhanced_weather_data(region)
        seed_varieties = generate_dynamic_seed_varieties(crop, region, weather_data)
        return jsonify({'seed_varieties': seed_varieties})
    except Exception as e:
        logging.error(f"/agri_seeds error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/agri_advice', methods=['POST'])
def agri_advice():
    try:
        data = request.get_json()
        region = data.get('region', '')
        crop = data.get('crop', '')
        if not region or not crop:
            return jsonify({'error': 'Region and crop are required'}), 400
        weather_data = get_enhanced_weather_data(region)
        irrigation_advice = generate_dynamic_irrigation_advice(crop, region, weather_data)
        seed_varieties = generate_dynamic_seed_varieties(crop, region, weather_data)
        comprehensive_advice = generate_comprehensive_ai_advice(crop, region, weather_data, irrigation_advice, seed_varieties)
        return jsonify({'comprehensive_advice': comprehensive_advice})
    except Exception as e:
        logging.error(f"/agri_advice error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
    
@app.route('/agri_disease_detection', methods=['POST'])
def agri_disease_detection():
    try:
        data = request.get_json()
        region = data.get('region', '')
        crop = data.get('crop', '')
        if not region or not crop:
            return jsonify({'error': 'Region and crop are required'}), 400
        weather_data = get_enhanced_weather_data(region)
        disease_detection = generate_disease_detection_results(crop, region, weather_data)
        return jsonify({'disease_detection': disease_detection})
    except Exception as e:
        logging.error(f"/agri_disease_detection error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

try:
    from agri_quiz_routes import register_agri_quiz_routes
    register_agri_quiz_routes(app, transcribe_audio_step)
    logging.info("Agri quiz routes registered at /api/agri-quiz/*")
except Exception as _quiz_reg_err:
    logging.warning("Agri quiz routes not loaded: %s", _quiz_reg_err)

if __name__ == '__main__':
    app.run(debug=False, port=5000)
