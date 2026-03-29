from langchain_google_genai import ChatGoogleGenerativeAI
import os
import json
from dotenv import load_dotenv
load_dotenv()
from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool
from crewai.tools import BaseTool
from crewai import LLM
import itertools
from flask import Flask, render_template, request, jsonify
from googleapiclient.discovery import build
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"], supports_credentials=True)
#os.environ["GOOGLE_API_KEY"]=os.getenv('GOOGLE_API_KEY_ALT')
GROQ_API_KEY=os.getenv('GROQ_API_KEY')
GROQ_API_KEY2=os.getenv('GROQ_API_KEY2')
GROQ_API_KEY3=os.getenv('GROQ_API_KEY3')
os.environ["SERPER_API_KEY"]=os.getenv('SERPER_API_KEY')
GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
#GEMINI_API_KEY=os.getenv('GOOGLE_API_KEY_OLD')
YOUTUBE_API_KEY =os.getenv('YOUTUBE_API_KEY')

groq_keys = [GROQ_API_KEY, GROQ_API_KEY2, GROQ_API_KEY3]
groq_key_cycle = itertools.cycle(groq_keys)



llm = LLM(
    model="groq/llama-3.3-70b-versatile",
    temperature=0.7,
    api_key=GROQ_API_KEY3
)

llm2 = LLM(
    model="groq/llama-3.3-70b-versatile",
    temperature=0.7,
    api_key=GROQ_API_KEY
)

llm3 = LLM(
    model="groq/llama-3.3-70b-versatile",
    temperature=0.7,
    api_key=GROQ_API_KEY2
)

def get_llm():
    """Returns an LLM object with the next API key"""
    api_key = next(groq_key_cycle).strip()
    return LLM(
        model="groq/llama-3.3-70b-versatile",
        temperature=0.5,
        api_key=api_key
    )

# Search tool (limit results)
search_tool = SerperDevTool(max_results=10, max_depth=1)

class YouTubeVideoTool(BaseTool):
    name: str = "YouTube Video Fetch Tool"
    description: str = "Fetches top YouTube videos for farmers and provides embedded video links with thumbnails."

    def _run(self, query: str):
        api_key = os.getenv('YOUTUBE_API_KEY')  # Store in .env
        youtube = build("youtube", "v3", developerKey=api_key)

        # Search videos
        request = youtube.search().list(
            q=query,
            part="snippet",
            type="video",
            maxResults=10  # you can increase
        )
        response = request.execute()

        videos = []
        for item in response.get("items", []):
            video_id = item["id"]["videoId"]
            snippet = item["snippet"]

            videos.append({
                "title": snippet["title"],
                "description": snippet["description"],
                "thumbnail": snippet["thumbnails"]["high"]["url"],
                "embed_link": f"https://www.youtube.com/embed/{video_id}"
            })

        return videos


youtube_agent = Agent(
    role="YouTube Farming Educator",
    goal="Find YouTube videos helpful for farmers with embedded links.",
    backstory="You provide farmers with direct access to helpful YouTube videos inside the webpage without redirection.",
    llm=get_llm(),
    tools=[YouTubeVideoTool()],
    verbose=True,
    allow_delegation=False
)

task4 = Task(
    description="Find top 5 YouTube videos useful for farmers about agriculture, techniques, and subsidies. Provide embedded links and thumbnails.",
    expected_output="List of videos with title, description, thumbnail, and embedded links.",
    agent=youtube_agent
)


crew = Crew(
    agents=[youtube_agent],
    tasks=[task4],
    verbose=True,
    process=Process.sequential
)


# Flask app configuration

@app.route("/", methods=["GET", "POST", "OPTIONS"])
def index():
    # Handle preflight requests
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        return response
    
    default_query = "latest agricultural news in India"

    tool = YouTubeVideoTool()
    videos = tool._run(default_query)

    # If form is submitted, override with user query
    if request.method == "POST":
        query = request.form.get("query")
        if query:
            videos = tool._run(query)

    # return render_template("yt_index.html", videos=videos)
    return jsonify({"yt_index": videos})
    # response.headers.add("Access-Control-Allow-Origin", "*")
    # return response

if __name__ == "__main__":
    app.run(debug=True, port=7863)