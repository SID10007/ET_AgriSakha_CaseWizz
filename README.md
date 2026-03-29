# AgriSakha - AI-Powered Agricultural Platform

AgriSakha is an AI-powered multilingual platform that empowers farmers with personalized agricultural news, real-time crop price forecasts, and voice-based financial guidance. By combining AI insights with human mentorship, it bridges the gap in localized information and financial literacy, fostering a more resilient and profitable farming sector.

# Video, Images, Presentation Demonstration of the Prototype:
https://drive.google.com/drive/folders/1DczLIUB--G7M3A9KC132PffXMvOKU5Hp?usp=sharing

# Images of Prototype
![WhatsApp Image 2025-08-18 at 23 09 53_73414274](https://github.com/user-attachments/assets/19c5bdbc-007f-4539-8e8a-b1b3613a6410)

![WhatsApp Image 2025-08-18 at 23 10 02_9b647a3e](https://github.com/user-attachments/assets/f861899a-78af-4810-b571-b4623f5e3dc9)

![WhatsApp Image 2025-08-18 at 23 10 35_16a4ccea](https://github.com/user-attachments/assets/7107d48b-3698-4237-87be-9c7c7dcd5fe4)

![WhatsApp Image 2025-08-18 at 23 11 27_f5ab8fe0](https://github.com/user-attachments/assets/d285c3c1-1c07-48ea-a14b-ee3902fcbcb2)

![WhatsApp Image 2025-08-18 at 23 11 46_6417e270](https://github.com/user-attachments/assets/1aa65f89-776c-4771-b1f5-0411fbb87a5e)

<img width="2544" height="1317" alt="Screenshot 2025-08-19 at 6 51 49 PM" src="https://github.com/user-attachments/assets/b510dd36-15dd-480e-b0ea-b1f82013e21f" />

![WhatsApp Image 2025-08-18 at 23 16 04_1335cd34](https://github.com/user-attachments/assets/93c94242-e8af-4088-95a7-1c658134d8c6)

![WhatsApp Image 2025-08-18 at 23 16 24_b1ce27db](https://github.com/user-attachments/assets/dfbcf600-460c-4a8c-bad5-e93d4dc19696)

![WhatsApp Image 2025-08-18 at 23 16 46_66f2d63a](https://github.com/user-attachments/assets/7bba1ab5-559f-43f3-be79-891b42464a74)

![WhatsApp Image 2025-08-19 at 06 46 02_dd329e26](https://github.com/user-attachments/assets/029cad6a-1ba3-4235-ab49-2661d61566ae)

![WhatsApp Image 2025-08-18 at 23 56 11_344cbfc4](https://github.com/user-attachments/assets/7528c90d-734b-4967-af55-ad2e2e15181c)


## 🌾 Features

### Core Functionalities
- **AI-Powered Agricultural News**: Personalized news delivery based on farmer preferences and location
- **Real-time Crop Price Forecasts**: Predictive analytics for crop pricing and market trends
- **Voice-based Financial Guidance**: Multilingual voice interface for financial literacy
- **Government Scheme Information**: Comprehensive database of agricultural and financial schemes
- **Community Features**: Farmer-to-farmer knowledge sharing and Q&A platform
- **OCR Document Processing**: Extract information from agricultural documents and receipts
- **YouTube Integration**: Educational videos and tutorials for farmers
- **WhatsApp Bot**: Automated assistance through WhatsApp

### Technical Capabilities
- **Multilingual Support**: Hindi, English, and regional language support
- **AI Integration**: Gemini AI, Groq, and LangChain integration for intelligent responses
- **WhatsApp Integration**: Automated WhatsApp bot for easy access
- **Web Application**: Modern React-based frontend with TypeScript
- **Backend Services**: Python Flask backend with multiple specialized modules

## 🏗️ Project Structure

```
CaseWizz_CO_AgriSakha/
├── backend/                    # Python Flask backend services
│   ├── main_backend.py        # Main backend server (Port 5000)
│   ├── yt.py                  # YouTube integration service (Port 7863)
│   ├── news.py                # News aggregation service (Port 7864)
│   ├── find_crop.py           # Crop data service (Port 6969)
│   ├── templates/             # HTML templates
│   ├── static/                # Static assets
│   ├── comb_crops/            # Crop combination data
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
├── ayushWhatsApp/             # WhatsApp bot integration
│   ├── eyserver.js            # WhatsApp bot server
│   ├── index.js               # Bot entry point
│   ├── package.json           # Node.js dependencies
│   └── .env                   # Environment variables
├── frontend/                  # Main React TypeScript frontend
│   ├── src/                   # Source code
│   ├── package.json           # Dependencies
│   ├── .env                   # Environment variables
│   └── vite.config.ts         # Vite configuration
├── frontend/community-feature-main/  # Community features frontend
│   ├── src/                   # Source code
│   ├── package.json           # Dependencies
│   ├── .env                   # Environment variables
│   └── vite.config.ts         # Vite configuration
└── farmers_schemes.csv        # Government schemes database
```

## 🚀 Getting Started (If you face any issues, please do visit the support section below)

### Prerequisites
- **Node.js** 
- **Python** (ver<=3.12)
- **Git**
- **FFmpeg** (for audio processing)
- **Google Cloud Platform** You need to enable some APIs like speech to text, text to speech, and translation ones, and corresponding to that, you need to install the JSON file, which will be used a lot in this project. Our given keys have been flagged by GCP and will not work now so you have to generate on your own on GCP console.
- **API KEYS** Download the source code PDF file from our submission and keep the API keys handy that have been written there.

### 1. Backend Setup

The backend consists of multiple Python services that need to be run simultaneously:

#### Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Environment Variables Setup
Create a `.env` file in the `backend/` directory (Obtain the API keys through the source code pdf attached in the submission):
```env
# Google API Keys
GOOGLE_API_KEY=your_google_api_key
GOOGLE_API_KEY_ALT=your_google_api_key_alt
GOOGLE_API_KEY_MAIN=your_google_api_key_main
GOOGLE_API_KEY_OLD=your_google_api_key_old

# YouTube API Key
YOUTUBE_API_KEY=your_youtube_api_key

# Groq API Keys
GROQ_API_KEY=your_groq_api_key
GROQ_API_KEY2=your_groq_api_key2
GROQ_API_KEY3=your_groq_api_key3
GROQ_API_KEY_NEWS=your_groq_api_key_news
GROQ_API_KEY_NEWS2=your_groq_api_key_news2
GROQ_API_KEY_NEWS3=your_groq_api_key_news3

# Serper API Key
SERPER_API_KEY=your_serper_api_key

# LangChain API Keys
LANGCHAIN_API_KEY=your_langchain_api_key
LANGCHAIN_API_KEY_LOAN=your_langchain_api_key_loan

# Pinecone API Key
PINECONE_API_KEY=your_pinecone_api_key

# Weather API Key
WEATHER_API_KEY=your_weather_api_key

# Environment Variables
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
CREWAI_TELEMETRY=false
```

**JSON File for Translation**

Create a `translation.json` file in the `backend/` directory and enter the credentials of the JSON that are present in the source code PDF file.

#### Run Backend Services

**Main Backend Server (Port 5000):**
```bash
cd backend
python main_backend.py
```

**YouTube Integration Service (Port 7863):**
```bash
cd backend
python yt.py
```

**News Aggregation Service (Port 7864):**
```bash
cd backend
python news.py
```

**Crop Data Service (Port 6969):**
```bash
cd backend
python find_crop.py
```

### 2. WhatsApp Bot Setup

#### Install Node.js Dependencies
```bash
cd ayushWhatsApp
npm install express@latest nodemon
npm install
```

#### Environment Variables Setup
Create a `.env` file in the `ayushWhatsApp/` directory. (Obtain the API keys through the source code PDF attached in the submission):
```env
GOOGLE_API_KEY=your_google_api_key
```

#### Run WhatsApp Bot
```bash
cd ayushWhatsApp
npm run dev
# or
nodemon eyserver.js
```

### 3. Frontend Setup

#### Main Frontend Application

**Install Dependencies:**
```bash
cd frontend
npm install
```

**Environment Variables Setup:**
Create a `.env` file in the `frontend/` directory. (Obtain the API keys through the source code PDF attached in the submission):
```env
VITE_WEATHER_API_KEY=your_weather_api_key
```

Substitute the `API keys` into the `frontend/community-feature-main/src/services/geminiService.ts` directory:
```env
GOOGLE_API_KEY = your_gemini_api_key;
GROQ_API_KEY = your_groq_api_key;

```

**Start Development Server:**
```bash
cd frontend
npm run dev
```

#### Community Features Frontend

**Install Dependencies:**
```bash
cd frontend/community-feature-main
npm install
```

**Environment Variables Setup:**
Create a `.env` file in the `frontend/community-feature-main/` directory:
```env
VITE_GOOGLE_API_KEY=your_google_api_key
VITE_GROQ_API_KEY=your_groq_api_key
```

**Start Development Server:**
```bash
cd frontend/community-feature-main
npm run dev
```

## 🔧 Configuration Details

### Backend Services Configuration

#### Main Backend (`main_backend.py`)
- **Port**: 5000
- **Features**: 
  - Agricultural analysis
  - Loan assistance
  - Budget management
  - OCR document processing
  - Voice transcription
  - Weather data integration

#### YouTube Service (`yt.py`)
- **Port**: 7863
- **Features**:
  - YouTube video search for farmers
  - Educational content aggregation
  - Embedded video links

#### News Service (`news.py`)
- **Port**: 7864
- **Features**:
  - Agricultural news aggregation
  - Voice-based news delivery
  - Multilingual news translation

#### Crop Data Service (`find_crop.py`)
- **Port**: 6969
- **Features**:
  - Crop price forecasting
  - Regional crop recommendations
  - Historical price data

### Frontend Applications

#### Main Frontend
- **Port**: 5173 (default Vite port)
- **Features**:
  - Agricultural dashboard
  - Weather integration
  - Crop price graphs
  - Voice input capabilities

#### Community Features Frontend
- **Port**: 8080 (or next available)
- **Features**:
  - Q&A platform
  - Community discussions
  - Knowledge sharing
  - Voice-based interactions

### WhatsApp Bot
- **Port**: 3000 (default)
- **Features**:
  - AI-powered responses
  - Voice message processing
  - Agricultural guidance
  - Multilingual support

## 🌐 API Endpoints

### Main Backend (`main_backend.py`)
- `GET /` - Main application
- `POST /agri_analyze` - Agricultural analysis
- `POST /loan_process_query` - Loan processing
- `POST /budget_upload_audio` - Budget audio processing
- `POST /ocr_capture` - OCR document processing
- `GET /agri_home` - Agricultural home page

### YouTube Service (`yt.py`)
- `GET /` - YouTube video search
- `POST /` - Custom video search queries

### News Service (`news.py`)
- `GET /` - News home page
- `POST /api/voice-transcribe` - Voice transcription
- `POST /api/get-news` - Get agricultural news
- `POST /api/voice-query` - Voice-based news queries

### Crop Data Service (`find_crop.py`)
- `GET /get_region_crops` - Get crops by region
- `GET /cropData` - Get crop price data

## 📱 Usage Guide

### Web Application
1. **Access the main application** at `http://localhost:5173`
2. **Navigate through modules present on the homescreen as cards**:
   - Agriculture: Crop analysis and recommendations
   - Budget: Financial planning tools
   - Loans: Government scheme assistance
   - OCR: Document processing
3. **Use voice features** for hands-free interaction
4. **Access community features** at `http://localhost:8080`

### WhatsApp Bot
1. **Start the bot** using `npm run dev` in ayushWhatsApp directory
2. **Scan QR code** to connect WhatsApp
3. **Send messages** for agricultural guidance
4. **Use voice messages** for natural interaction

### API Integration
- **Main Backend**: `http://localhost:5000`
- **YouTube Service**: `http://localhost:7863`
- **News Service**: `http://localhost:7864`
- **Crop Data**: `http://localhost:6969`

## 🗃️ Data Sources

- **Government Schemes**: Comprehensive database of agricultural and financial schemes
- **Crop Data**: Historical and predictive crop pricing information
- **News API**: Real-time agricultural news and updates
- **Weather API**: Real-time weather data for agricultural planning
- **YouTube API**: Educational content for farmers
- **Community Knowledge**: User-generated content and expert responses

## 🔒 Security

### Environment Variables
- All API keys are stored in `.env` files
- Never commit `.env` files to version control
- Use different API keys for different environments

### API Key Management
- Rotate API keys regularly
- Use environment-specific configurations
- Monitor API usage and costs

## 🐛 Troubleshooting

### Common Issues

**Backend Services Not Starting:**
- Check if ports are already in use
- Verify all dependencies are installed
- Ensure `.env` files are properly configured

**Frontend Build Issues:**
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify environment variables are set

**WhatsApp Bot Connection:**
- Ensure stable internet connection
- Check if WhatsApp Web is accessible
- Verify phone number and session

### Logs and Debugging
- Check console logs for error messages
- Monitor network requests in browser dev tools
- Use browser developer tools for frontend debugging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is developed as part of the Capital One CaseWizz competition. All rights reserved.

## 👥 Team

- **Ayush Sikarwal**
- **Sanyam Jhuria**
- **Siddharth Asthana**

## 🙏 Acknowledgments

- Capital One for providing the platform and resources
- Google Gemini AI for intelligent response capabilities
- Groq for fast AI inference
- LangChain for AI orchestration
- Open source community for various libraries and tools
- Agricultural experts and farmers for domain knowledge

## 📞 Support

For support and queries, please reach out through:
- Gmail: sikarwalayush147@gmail.com, jhuriasanyam@gmail.com, asthanasiddharth2002@gmail.com
- Contact: 6375767633,8078630257,9016070542


## 📋 Quick Start Checklist

- [ ] Install Python dependencies: `cd backend && pip install -r requirements.txt`
- [ ] Install Node.js dependencies for WhatsApp: `cd ayushWhatsApp && npm install express@latest nodemon && npm install`
- [ ] Install frontend dependencies: `cd frontend && npm install`
- [ ] Install community frontend dependencies: `cd frontend/community-feature-main && npm install`
- [ ] Create `.env` files in all directories with proper API keys
- [ ] Start backend services: `python main_backend.py`, `python yt.py`, `python news.py`, `python find_crop.py`
- [ ] Start WhatsApp bot: `cd ayushWhatsApp && npm run dev`
- [ ] Start frontend applications: `npm run dev` in both frontend directories
- [ ] Access applications at their respective ports

---

**AgriSakha** - Empowering Farmers with AI-Driven Solutions 🌱




















