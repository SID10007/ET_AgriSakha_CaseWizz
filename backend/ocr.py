import os
import cv2
import pytesseract
from flask import Flask, request, jsonify, session
from flask_cors import CORS  # Import CORS
from werkzeug.utils import secure_filename
import re
import base64
import io
from PIL import Image
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("the version of tesseract is : -->")
print(pytesseract.get_tesseract_version())
print(pytesseract.__file__)

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY_ALT')
model = genai.GenerativeModel(model_name="gemini-2.0-flash")
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GOOGLE_API_KEY)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.secret_key = os.urandom(24)  # Set a secret key for session management

# Path to the Tesseract OCR executable
pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"

# Define file upload settings
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create upload folder if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

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

    # Extract Name, Address, and Gender using LLM
    prompt = (
            f"You will be given a clean OCR sentence. You need to provide me name of the person out of that sentence and the name will most likely lie in between government of India and the Date of birth. The address will be found in Address section of the image and if it doesnt contain that then you should return N/A only for the address. The name will be indian name.\n"
            f"First Name: This is the first Name of the person.\n"
            f"Last Name: This is the last Name of the person.\n"
            f"Address: This is the address of the person.\n"
            f"Gender: This is the gender of a person either MALE or FEMALE.\n"
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
    gender_match = re.search(r"Gender:\s*(\w+)", response_content)
    if gender_match:
        data["gender"] = gender_match.group(1)  # Extracted gender
    else:
        # Handle the case where gender is not found
        data["gender"] = "MALE"
        
    # Extract Address
    address_match = re.search(r"Address:\s*(.+?)(?=$|\n)", response_content)
    if address_match:
        data["address"] = address_match.group(1).strip()  # Extracted address
    else:
        # Handle the case where address is not found
        data["address"] = "N/A"

    # Extract PAN number (format: XXXXX9999X)
    pan_match = re.search(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", ocr_text)
    if pan_match:
        data["pan_card_no"] = pan_match.group(0)

    return data

# Route for the home page - Modified to handle API requests
@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        # Check if the file is part of the form
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file part"}), 400
            
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
            
            # Store data in session if needed
            if 'stored_data' not in session:
                session['stored_data'] = {}
                
            # Preserve first name, last name, and gender on first upload
            if 'first_name' not in session['stored_data']:
                session['stored_data']['first_name'] = extracted_data.get('first_name', '')
            if 'last_name' not in session['stored_data']:
                session['stored_data']['last_name'] = extracted_data.get('last_name', '')
            if 'gender' not in session['stored_data']:
                session['stored_data']['gender'] = extracted_data.get('gender', '')

            session['stored_data']['address'] = extracted_data.get('address', '')

            # Preserve other fields if they were not previously stored
            for key in ['middle_name', 'aadhaar_no', 'dob', 'pan_card_no']:
                if key not in session['stored_data']:
                    session['stored_data'][key] = extracted_data.get(key, '')
            
            session.modified = True  # Ensure session updates are saved
            
            # Return JSON response for React
            return jsonify({
                "status": "success", 
                "extracted_data": session['stored_data'],
                "filename": filename
            })
    
    # For GET requests, return stored data if any
    return jsonify({
        "status": "success", 
        "extracted_data": session.get('stored_data', {})
    })

# Route to capture image using webcam - Modified for API use
@app.route('/capture', methods=['POST'])
def capture_image():
    # Ensure the 'uploads' folder exists
    upload_folder = app.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)  # Create the folder if it doesn't exist
    
    # Get the base64-encoded image from the request
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({"status": "error", "message": "No image data provided"}), 400
        
    image_data = data['image']
    
    try:
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
        
        # Store in session if needed
        if 'stored_data' not in session:
            session['stored_data'] = {}
            
        # Update session data
        session['stored_data'].update(extracted_data)
        session.modified = True
        
        return jsonify({
            "status": "success", 
            "extracted_data": extracted_data, 
            "filename": filename
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Route to clear data - Modified for API use
@app.route('/clear_data', methods=['POST'])
def clear_data():
    session.pop('stored_data', None)
    return jsonify({"status": "success", "message": "Data cleared successfully"})

if __name__ == '__main__':
    app.run(debug=True, port=9999)