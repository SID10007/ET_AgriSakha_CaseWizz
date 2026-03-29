import os
import json
import io
import base64
import tempfile
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from flask import Flask, request, jsonify, render_template
from collections import defaultdict
from google.cloud import translate_v2 as translate
from langchain_google_genai import ChatGoogleGenerativeAI
from pydub import AudioSegment
from groq import Groq
from rapidfuzz import process as fuzz_process
import matplotlib as mpl
from matplotlib.patches import Patch
from matplotlib.patheffects import withStroke
import numpy as np
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = r"translation.json"
translate_client = translate.Client()
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-exp", google_api_key=GOOGLE_API_KEY)
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))
chat_history_expenses = []
chat_history_earnings = []
full_chat_history = []
expense_data = defaultdict(lambda: defaultdict(float))
earning_data = defaultdict(lambda: defaultdict(float))

def transcribe_audio(audio_file):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio_file:
        audio = AudioSegment.from_file(audio_file)
        audio.export(temp_audio_file.name, format="wav")
        with open(temp_audio_file.name, "rb") as audio:
            transcription = groq_client.audio.transcriptions.create(model="whisper-large-v3", file=audio)
    return transcription.text

def translate_to_english(text):
    detection = translate_client.detect_language(text)
    detected_language = detection['language']
    if detected_language != "en":
        translation = translate_client.translate(text, target_language="en")
        return translation['translatedText'], detected_language
    return text, detected_language

def process_voice_input(audio_file):
    text = transcribe_audio(audio_file)
    translated_text, detected_language = translate_to_english(text)

    full_chat_history.append({"original": text, "translated": translated_text, "language": detected_language})

    prompt = f"""
    Classify the following statement into 'expense' or 'earning'. Extract:
    - category: The broad category (e.g., Food, Loan, Crop)
    - sub_category: The specific subcategory (e.g., Wheat, Electricity, Fertilizers)
    - amount: The numeric value in INR
    - type: 'expense' if money is spent, 'earning' if money is earned
    
    Example Inputs:
    - "I spent 3000 rupees on fertilizers" → Expense (Category: Crop, Sub-category: Fertilizers, Amount: 3000)
    - "I earned 5000 rupees by selling wheat" → Earning (Category: Crop, Sub-category: Wheat, Amount: 5000)
    
    Statement: '{translated_text}'
    
    Return JSON format:
    {{
        "type": "expense" or "earning",
        "amount": 1234,
        "category": "Category Name",
        "sub_category": "Sub-category Name"
    }}
    """

    llm_response = llm.invoke(prompt)
    response_content = llm_response.content.strip()

    if response_content.startswith("```json") and response_content.endswith("```"):
        response_content = response_content.replace("```json", "").replace("```", "").strip()

    parsed_response = json.loads(response_content)
    transaction_type = parsed_response.get("type", "")
    amount = parsed_response.get("amount", 0)
    category = parsed_response.get("category", "Unknown")
    sub_category = parsed_response.get("sub_category", "Unknown")

    if transaction_type == "expense":
        chat_history_expenses.append(translated_text)
        expense_data[category][sub_category] += amount
    elif transaction_type == "earning":
        chat_history_earnings.append(translated_text)
        earning_data[category][sub_category] += amount

    return f"Processed: {transaction_type} of {amount} INR for {sub_category} ({category})"



import matplotlib as mpl
from matplotlib.patches import Patch
from matplotlib.patheffects import withStroke



def generate_pie_chart(data, title):
    """
    Generate a professionally styled pie chart with vibrant colors and visual enhancements.

    Args:
        data: Dictionary of categories with nested values
        title: Chart title

    Returns:
        Base64 encoded string of the PNG image
    """

    # Calculate totals per category
    total_per_category = {cat: sum(sub.values()) for cat, sub in data.items()}

    # Set the style to a clean, professional template
    plt.style.use('seaborn-v0_8-whitegrid')

    # Create custom color palette (vibrant but professional)
    colors = ['#FF5A5F', '#3C91E6', '#00A699', '#FFC400', '#9B6BCC', '#FF9A52', '#27AE60', '#7B68EE']

    # Create the figure with a light background
    fig, ax = plt.subplots(figsize=(8, 6), facecolor='#F8F9FA')

    # Draw the enhanced pie chart
    wedges, texts = ax.pie(
        list(total_per_category.values()),  # Convert to list for safety
        labels=None,  # We'll add custom labels
        colors=colors[:len(total_per_category)],
        startangle=90,
        wedgeprops={
            'width': 0.6,  # Creates a donut chart for modern look
            'edgecolor': 'white',
            'linewidth': 2,
            'antialiased': True
        },
        shadow=True
    )

    # Add a white circle at the center for a refined donut chart look
    centre_circle = plt.Circle((0, 0), 0.3, fc='white', edgecolor='#DDDDDD')
    ax.add_patch(centre_circle)

    # Add percentage and labels with enhanced styling
    total_value = sum(total_per_category.values())
    for i, (wedge, cat) in enumerate(zip(wedges, total_per_category.keys())):
        # Calculate percentage based on the category value
        percentage = 100. * total_per_category[cat] / total_value

        # Calculate angle for text positioning (middle of the wedge)
        ang = (wedge.theta1 + wedge.theta2) / 2
        x = 0.85 * 0.5 * np.cos(np.deg2rad(ang))
        y = 0.85 * 0.5 * np.sin(np.deg2rad(ang))

        # Add percentage inside the pie
        ax.text(x, y, f"{percentage:.1f}%",
                ha='center', va='center',
                fontsize=11, fontweight='bold', color='white',
                bbox=dict(boxstyle="round,pad=0.3", facecolor=colors[i % len(colors)], alpha=0.8, edgecolor='none'))

        # Add category labels outside the pie
        ang_text = ang
        # Adjust label position for better readability
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

    # Add an elegant title with shadow effect
    plt.title(title, fontsize=16, fontweight='bold', pad=20,
              color='#333333',
              bbox=dict(boxstyle="round,pad=0.6", facecolor='white', alpha=0.8, edgecolor='#DDDDDD'))

    # Make the chart look balanced
    plt.tight_layout()

    # Save the image to a buffer
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=300, bbox_inches='tight', facecolor='#F8F9FA')
    buf.seek(0)

    # Close the figure to free up memory
    plt.close(fig)

    return base64.b64encode(buf.getvalue()).decode('utf-8')

"""def generate_bar_chart(data, title):
    sub_categories = []
    amounts = []
    for category, sub_data in data.items():
        for sub, amount in sub_data.items():
            sub_categories.append(f"{category} - {sub}")
            amounts.append(amount)

    plt.figure(figsize=(8, 5))
    plt.bar(sub_categories, amounts)
    plt.xlabel("Sub-category")
    plt.ylabel("Amount (INR)")
    plt.xticks(rotation=45, ha="right")
    plt.title(title)
    buf = io.BytesIO()
    plt.savefig(buf, format="png")
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode('utf-8')"""

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
    import matplotlib.pyplot as plt
    import matplotlib as mpl
    import numpy as np
    import io
    import base64
    from matplotlib.patheffects import withStroke

    # Extract subcategories and amounts
    sub_categories = []
    amounts = []
    categories = []

    for category, sub_data in data.items():
        for sub, amount in sub_data.items():
            sub_categories.append(f"{category} - {sub}")
            amounts.append(amount)
            categories.append(category)

    # Check if we have data to display
    if not amounts:
        # Create a simple chart showing "No data available"
        fig, ax = plt.subplots(figsize=(10, 6), facecolor='#F8F9FA')
        ax.text(0.5, 0.5, "No data available to display",
                ha='center', va='center', fontsize=16, color='#666666', fontweight='bold')
        ax.set_axis_off()

        # Save the image to a buffer
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=300, bbox_inches='tight', facecolor='#F8F9FA')
        buf.seek(0)
        plt.close(fig)

        return base64.b64encode(buf.getvalue()).decode('utf-8')

    # Set the style to a clean, professional template
    plt.style.use('seaborn-v0_8-whitegrid')

    # Create vibrant color palette with enhanced professional tones
    base_colors = [
        '#2c3e50', '#3498db', '#2ecc71', '#e74c3c', '#f39c12',
        '#9b59b6', '#1abc9c', '#34495e', '#d35400', '#16a085'
    ]

    # Create a mapping of categories to colors
    unique_categories = list(dict.fromkeys(categories))
    category_colors = {cat: base_colors[i % len(base_colors)] for i, cat in enumerate(unique_categories)}

    # Generate slightly different shades for subcategories within the same category
    bar_colors = []
    for cat in categories:
        base_color = mpl.colors.to_rgb(category_colors[cat])
        # Add slight variation to make adjacent bars from same category distinguishable
        variation = np.random.uniform(-0.08, 0.08, 3)
        adjusted_color = np.clip([c + v for c, v in zip(base_color, variation)], 0, 1)
        bar_colors.append(adjusted_color)

    # Create figure with light background
    fig, ax = plt.subplots(figsize=(12, 7), facecolor='#F8F9FA', dpi=100)
    ax.set_facecolor('#F8F9FA')

    # Create bars with enhanced styling
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

    # Add prominent value labels on top of bars with enhanced styling
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

    # Enhance grid for better readability
    ax.grid(axis='y', color='#DDDDDD', linestyle='-', linewidth=0.5, alpha=0.7, zorder=1)
    ax.set_axisbelow(True)

    # Remove top and right spines for cleaner look
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#666666')
    ax.spines['bottom'].set_color('#666666')
    ax.spines['left'].set_linewidth(1.5)
    ax.spines['bottom'].set_linewidth(1.5)

    # Enhance axis labels with bold, prominent styling
    ax.set_xlabel("Categories", fontsize=14, fontweight='bold', labelpad=15, color='#222222')
    ax.set_ylabel("Amount (₹)", fontsize=14, fontweight='bold', labelpad=15, color='#222222')

    # Format x-axis ticks with enhanced readability
    plt.xticks(rotation=45, ha="right", fontsize=11, color='#333333', fontweight='bold')

    # Format y-axis with elegant formatting for currency values
    def currency_formatter(x, pos):
        if x >= 10000000:  # For values in crores
            return f'₹{x/10000000:.1f} Cr'
        elif x >= 100000:  # For values in lakhs
            return f'₹{x/100000:.1f} L'
        else:
            return f'₹{int(x):,}'

    ax.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(currency_formatter))
    plt.yticks(fontsize=11, color='#333333', fontweight='bold')

    # Add an elegant title with enhanced styling
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

    # Add a subtle total value annotation
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

    # Enhanced category color legend with professional styling

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

    # Highlight the highest value
    if amounts:
        highest_idx = np.argmax(amounts)
        highest_bar = bars[highest_idx]
        highest_value = amounts[highest_idx]
        highest_category = sub_categories[highest_idx]

        # Add a subtle highlight
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

    # Set professional tick parameters
    ax.tick_params(axis='both', which='major', width=1.5, length=6, pad=5)

    # Ensure layout is tight but with enough padding
    plt.tight_layout(pad=2.5, rect=[0, 0.03, 1, 0.97])

    # Add a subtle border to the entire figure
    fig.patch.set_facecolor('#FFFFFF')
    fig.patch.set_edgecolor('#DDDDDD')
    fig.patch.set_linewidth(2)

    # Save the image to a buffer with high resolution
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=300, bbox_inches='tight', facecolor='#FFFFFF', edgecolor='#DDDDDD')
    buf.seek(0)

    # Close the figure to free up memory
    plt.close(fig)

    return base64.b64encode(buf.getvalue()).decode('utf-8')

def search_chat_history(audio_file, full_chat_history):
    try:
        # Step 1: Convert Audio to Text (Speech-to-Text)
        #query_text = transcribe_audio(audio_file)

        # Step 2: Translate Query if Needed
        #translated_query, detected_language = translate_to_english(query_text)
        #print(f"Original Query: {query_text} | Translated Query: {translated_query} | Language: {detected_language}")

        # Step 3: Prepare LLM Prompt for Searching Chat History
        prompt = (
            f"You are an AI assistant. Search the following chat history and return the most relevant entries for the given query.\n"
            f"Chat History:\n{json.dumps(full_chat_history, indent=2)}\n\n"
            f"Query: '{audio_file}'\n\n"
            f"Find and return the most relevant results in JSON format as an array of matched entries."
        )

        llm_response = llm.invoke(prompt)
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

# @app.route('/')
# def index():
#     return render_template('indexeybud.html',
#                            expense_pie=generate_pie_chart(expense_data, "Expense Categories"),
#                            expense_bar=generate_bar_chart(expense_data, "Expense Sub-categories"),
#                            earning_pie=generate_pie_chart(earning_data, "Earning Categories"),
#                            earning_bar=generate_bar_chart(earning_data, "Earning Sub-categories"),
#                            total_expenditure=sum(sum(sub.values()) for sub in expense_data.values()),
#                            total_earnings=sum(sum(sub.values()) for sub in earning_data.values()),
#                            chat_history_expenses=chat_history_expenses,
#                            chat_history_earnings=chat_history_earnings)
@app.route('/')
def index():
    return jsonify(
                    expense_pie=generate_pie_chart(expense_data, "Expense Categories"),
                    expense_bar=generate_bar_chart(expense_data, "Expense Sub-categories"),
                    earning_pie=generate_pie_chart(earning_data, "Earning Categories"),
                    earning_bar=generate_bar_chart(earning_data, "Earning Sub-categories"),
                    total_expenditure=sum(sum(sub.values()) for sub in expense_data.values()),
                    total_earnings=sum(sum(sub.values()) for sub in earning_data.values()),
                    chat_history_expenses=chat_history_expenses,
                    chat_history_earnings=chat_history_earnings)

@app.route('/upload_audio', methods=['POST'])
def upload_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded."}), 400

    audio_file = request.files['audio']
    response_message = process_voice_input(audio_file)

    return jsonify({
        "message": response_message,
        "expense_pie": generate_pie_chart(expense_data, "Expense Categories"),
        "expense_bar": generate_bar_chart(expense_data, "Expense Sub-categories"),
        "earning_pie": generate_pie_chart(earning_data, "Earning Categories"),
        "earning_bar": generate_bar_chart(earning_data, "Earning Sub-categories"),
        "total_expenditure": sum(sum(sub.values()) for sub in expense_data.values()),
        "total_earnings": sum(sum(sub.values()) for sub in earning_data.values()),
        "chat_history_expenses": chat_history_expenses,
        "chat_history_earnings": chat_history_earnings
    })



@app.route('/search_chat', methods=['POST'])
def search_chat():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded."}), 400
    # I am translating here only
    audio_file = request.files['audio']
    query_text = transcribe_audio(audio_file)
    translated_query, _ = translate_to_english(query_text)
    
    results = search_chat_history(translated_query,full_chat_history)
    
    return jsonify({"results": results})
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

    llm_response = llm.invoke(prompt)
    response_content = llm_response.content.strip()

    return jsonify({"query": translated_text, "advice": response_content})
if __name__ == '__main__':
    app.run(debug=True, port = 6060)
