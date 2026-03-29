import os
import cv2
import pytesseract
from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from werkzeug.utils import secure_filename
import numpy as np
import re
import base64
import io
from PIL import Image
import json
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY_ALT')
model = genai.GenerativeModel(model_name="gemini-2.0-flash")
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GOOGLE_API_KEY)
# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.urandom(24)  # Set a secret key for session management

# Path to the Tesseract OCR executable (for Windows)
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"  # Update this path

# Define file upload settings
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Function to extract text from image using pytesseract
def extract_text_from_image(image_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    text = pytesseract.image_to_string(gray, config='--psm 6')
    print("Extracted Text:", text)  # Debugging line
    return text

# Function to extract relevant information from OCR text
def extract_relevant_data(ocr_text):
    data = {
        "first_name": "",
        "middle_name": "",
        "last_name": "",
        "address": "",
        "aadhaar_no": "",
        "dob": "",
        "gender": "",
        "pan_card_no": "",  # PAN number field
    }

    # Clean up OCR text by removing extra spaces and lines
    clean_text = re.sub(r"[^A-Za-z0-9/\s]", " ", ocr_text)  # Keep only letters, numbers, and spaces
    clean_text = re.sub(r"\s+", " ", clean_text).strip()  # Remove extra spaces

    # Extract Aadhaar number (12-digit number)
    aadhaar_match = re.search(r"\b\d{4} \d{4} \d{4}\b", ocr_text)
    if aadhaar_match:
        data["aadhaar_no"] = aadhaar_match.group(0).replace(" ", "")  # Remove spaces in Aadhaar number

    # Extract First Name and Last Name (from Name fields, assumed to be in 'Name' format)
    
    prompt = (
            f"You will be given a clean OCR sentence. You need to provide me name of the person out of that sentence and the name will most likely lie in between government of India and the Date of birth. The address will be found after S/O: and before Rajasthan. The name will be indian name.\n"
            f"First Name: This is the first Name of the person.\n"
            f"Last Name: This is the last Name of the person.\n"
            f"Address: This is the address of the person.\n"
            f"Clean Sentence: {clean_text}"     
    )

    llm_response = llm.invoke(prompt)
    response_content = llm_response.content.strip()
    # Use regex to extract first and last names
    print("Response Content:", response_content)  # Debugging line
    first_name_match = re.search(r"First Name:\s*(\w+)", response_content)
    last_name_match = re.search(r"Last Name:\s*(\w+)", response_content)

    if first_name_match and last_name_match:
        data["first_name"] = first_name_match.group(1)  # Extracted first name
        data["last_name"] = last_name_match.group(1)  # Extracted last name
    else:
        # Handle the case where names are not found
        data["first_name"] = ""
        data["last_name"] = ""



    # Extract Date of Birth (in the format dd/mm/yyyy)
    dob_match = re.search(r"\b\d{2}/\d{2}/\d{4}\b", ocr_text)
    if dob_match:
        data["dob"] = dob_match.group(0)

    # Extract Gender
    gender_match = re.search(r"\b(Male|Female)\b", ocr_text, re.IGNORECASE)
    if gender_match:
        data["gender"] = gender_match.group(0)

    # Extract Address (looking for 'Address:' or a pattern similar to it)
    address_match = re.search(r"Address:\s*(\w+)", response_content)

    if address_match:
        data["address"] = address_match.group(1)  # Extracted first name
        
    else:
        # Handle the case where names are not found
        data["address"] = ""
        

    # Extract PAN number (format: XXXXX9999X)
    pan_match = re.search(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", ocr_text)
    if pan_match:
        data["pan_card_no"] = pan_match.group(0)

    return data

# Route for the home page
@app.route('/', methods=['GET', 'POST'])
def index():

    if 'stored_data' not in session:
        session['stored_data'] = {}

    if request.method == 'POST':
        # Check if the file is part of the form
        if 'file' not in request.files:
            return redirect(request.url)
        file = request.files['file']
        
        # If a valid file is selected
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # Extract text from the uploaded image
            ocr_text = extract_text_from_image(file_path)
            
            # Extract relevant data from the OCR text
            extracted_data = extract_relevant_data(ocr_text)

            # Update only empty fields in session data
            for key, value in extracted_data.items():
                if value and key not in session['stored_data']:  
                    session['stored_data'][key] = value
            
            session.modified = True  # Ensure session updates are saved
            
            return render_template('index_ocr.html', extracted_data=session['stored_data'], filename=filename)

    return render_template('index_ocr.html', extracted_data=session.get('stored_data', {}))

# Route to capture image using webcam
@app.route('/capture', methods=['GET', 'POST'])
def capture_image():
    if request.method == 'POST':
        # Ensure the 'uploads' folder exists
        upload_folder = app.config['UPLOAD_FOLDER']
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)  # Create the folder if it doesn't exist
        
        # Get the base64-encoded image from the request
        data = request.get_json()
        image_data = data['image']
        
        # Decode the base64 image data
        imgdata = base64.b64decode(image_data.split(',')[1])  # Remove 'data:image/jpeg;base64,' part
        
        # Convert binary data to an image using PIL
        image = Image.open(io.BytesIO(imgdata))
        
        # Save the image to a file
        filename = "captured_image.jpg"
        file_path = os.path.join(upload_folder, filename)
        image.save(file_path)
        
        # Extract text from the captured image
        ocr_text = extract_text_from_image(file_path)
        
        # Extract relevant data from the OCR text
        extracted_data = extract_relevant_data(ocr_text)
        print("Received image data:", image_data[:100])
        # Render the template and pass the extracted data
        return jsonify({"status": "success", "extracted_data": extracted_data, "filename": filename})

    return render_template('capture_ocr.html')

# Route to handle the "Send" action
@app.route('/send', methods=['POST'])
def send_data():
    return "Sent successfully!"

@app.route('/clear', methods=['POST'])
def clear_data():
    session.pop('stored_data', None)
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
