from flask import Flask, render_template, jsonify
import json
from phi.agent import Agent
from phi.model.groq import Groq
from crewai import Agent as CrewAgent, Task, Crew, Process
from crewai_tools import SerperDevTool
from crewai import LLM
import os
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

os.environ["CREWAI_TELEMETRY"] = os.getenv('CREWAI_TELEMETRY', 'false')
# Load environment variables
os.environ["SERPER_API_KEY"] = os.getenv('SERPER_API_KEY')
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_API_KEY2=os.getenv('GROQ_API_KEY2')
GROQ_API_KEY3=os.getenv('GROQ_API_KEY3')
GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY_OLD')

# Load Service Account JSON
# file_path = 'D:\\Data Science\\Projects\\TVS Credit Project\\white-feat-434302-h9-f2d820a43a34.json'
# with open(file_path, 'r') as file:
#     vertex_credentials = json.load(file)

# vertex_credentials_json = json.dumps(vertex_credentials)

# Initialize LLMs
# llm = LLM(
#     model="gemini/gemini-1.5-pro-latest",
#     temperature=0.7,
#     vertex_credentials=vertex_credentials_json,
#     api_key=GEMINI_API_KEY
# )

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

search_tool = SerperDevTool(max_depth=1)
search_tool2 = SerperDevTool(max_depth=1)

# Create Flask App
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# Function to fetch latest news and keywords
def fetch_news_and_keywords():
    researcher = CrewAgent(
        role='Senior research analyst',
        goal='Search the web for best financial news that is helpful for people of rural India',
        verbose=False,
        backstory="You are very good with financial knowledge of India",
        allow_delegation=False,
        llm=llm3,
        tools=[search_tool]
    )

    writer = CrewAgent(
        role='Financial content strategist',
        goal='craft compelling content on financial domain helpful for rural indian people',
        backstory="You are very good with financial knowledge of India and writing about it",
        verbose=False,
        llm=llm,
    )

    word_agent = CrewAgent(
        role="Search for 5 basic words and their short description of at max 20 words that are used in finance and should be helpful for people of rural India.",
        goal='Find 5 financial words that are currently being used in financial domain and can be helpful for rural indian people',
        backstory="You are very good with financial knowledge of India and the terms associated with it.",
        verbose=False,
        llm=llm2,
        tools=[search_tool2]
        #verbose=True,
        #allow_delegation=True
    )

    task1 = Task(
        description=""" Conduct an analysis of at max 40 words of the latest news relevant for the rural indian people in the financial domain.""",
        expected_output="News in bullet points",
        agent=researcher
    )

    task2 = Task(
        description=""" Using the insights provided, make a news article with bullet points that highlights the financial news related to
        rural indian people. The post should be informative and engaging so that it can be easily understood by rural indian people. And then add the 5 key words along with their short description""",
        expected_output="Engaging news article with news realted to financial domain of india and then 5 key words with their short explanation",
        agent=writer
    )

    task3 = Task(
        description="""Find 5 financial words that are currently being used in financial domain and their definition of at max 10 words and can be helpful for rural indian people""",
        expected_output="Show 5 words in bold letters and then their definitions along with that.",
        agent=word_agent
    )

    crew = Crew(
        agents=[researcher, writer, word_agent],
        tasks=[task1, task2],
        verbose=False,
        process=Process.sequential
    )

    result = crew.kickoff()
    
    # Extract the actual response
    if hasattr(result, "final_output"):
        final_output = result.final_output  # Extract actual generated content
        print (final_output)
    else:
        final_output = str(result)  # Convert to string if no direct attribute

    # **Ensure final_output is valid before processing**
    if not isinstance(final_output, str) or len(final_output) == 0:
        print("⚠️ Error: No valid response generated!")
        return

    # **Splitting Logic - Ensuring Correct Parsing**
    if "5 Key Words to know" in final_output:
        parts = final_output.split("To help you understand these financial concepts better")
        news_text = parts[0].strip()
        keywords_text = parts[1].strip()
    else:
        print("⚠️ Error: Expected delimiter not found! Storing entire result.")
        news_text = final_output
        keywords_text = "No keywords found."

    # **Save the extracted outputs**
    with open("news.json", "w", encoding="utf-8") as news_file:
        json.dump({"news": news_text}, news_file, indent=4, ensure_ascii=False)

    with open("keywords.json", "w", encoding="utf-8") as keywords_file:
        json.dump({"keywords": keywords_text}, keywords_file, indent=4, ensure_ascii=False)

    print("✅ News and Keywords have been saved successfully!")

# Flask Routes
@app.route('/')
def home():
    return render_template("news.html")

@app.route('/fetch_news')
def get_news():
    with open("news.json", "r", encoding="utf-8") as file:
        news_data = json.load(file)
    return jsonify(news_data)

@app.route('/fetch_keywords')
def get_keywords():
    with open("keywords.json", "r", encoding="utf-8") as file:
        keywords_data = json.load(file)
    return jsonify(keywords_data)

if __name__ == '__main__':
    fetch_news_and_keywords()  # Run AI agents once when the app starts
    app.run(debug=True, port=6484)
