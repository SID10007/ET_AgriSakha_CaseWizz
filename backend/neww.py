from flask import Flask, render_template
from langchain_google_genai import ChatGoogleGenerativeAI
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure LLM
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')  # Replace with your actual API key
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GOOGLE_API_KEY)

# Define the prompt
prompt = '''Translate the following text into Hindi:
 • Financial News for Rural Indian People: Empowering Growth and Development
 • As the Indian economy continues to grow, rural India is emerging as a key driver...
'''

# Get response from LLM
response = llm.invoke(prompt)

@app.route('/')
def index():
    return render_template('indexxx.html', response=response)

if __name__ == '__main__':
    app.run(debug=True)
print '''asdfb'''

if (x=en){
    print"asdgf"
}
else{
    
}