import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"], supports_credentials=True)
# State → Crops mapping
state_crops_mapping = {
    "Andhra Pradesh": ["Rice","Maize","Cotton","Pulses"],
    "Arunachal Pradesh": ["Rice","Maize","Pulses","Tea"],
    "Assam": ["Rice","Jute","Tea","Sugarcane"],
    "Bihar": ["Rice","Wheat","Maize","Pulses"],
    "Chhattisgarh": ["Rice","Maize","Pulses","Groundnut"],
    "Goa": ["Rice", "Pulses","Groundnut","Sugarcane"],
    "Gujarat": ["Cotton","Rice","Wheat","Groundnut"],  
    "Haryana": ["Wheat","Rice","Sugarcane","Cotton"],
    "Himachal Pradesh": ["Maize","Wheat","Pulses","Tea"],
    "Jharkhand": ["Rice","Maize","Pulses","Groundnut"],
    "Karnataka": ["Rice","Maize","Sugarcane","Coffee"],
    "Kerala": ["Rice", "Tea","Coffee","Pulses"],
    "Madhya Pradesh": ["Wheat","Cotton","Pulses","Maize"],  
    "Maharashtra": ["Cotton","Sugarcane","Groundnut","Rice"],
    "Manipur": ["Rice","Maize","Pulses","Groundnut"],
    "Meghalaya": ["Rice","Maize","Tea","Pulses"],
    "Mizoram": ["Rice","Maize","Groundnut","Pulses"],
    "Nagaland": ["Rice","Maize","Millets","Pulses"],  # Millets not allowed → use Groundnut
    "Odisha": ["Rice","Maize","Pulses","Groundnut"],
    "Punjab": ["Wheat","Rice","Sugarcane","Cotton"],
    "Rajasthan": ["Wheat","Pulses","Groundnut","Maize"],
    "Sikkim": ["Rice","Maize","Pulses","Tea"],
    "Tamil Nadu": ["Rice","Sugarcane","Cotton","Tea"],
    "Telangana": ["Rice","Maize","Cotton","Pulses"],
    "Tripura": ["Rice","Maize","Pulses","Tea"],
    "Uttar Pradesh": ["Wheat","Rice","Sugarcane","Pulses"],
    "Uttarakhand": ["Rice","Wheat","Maize","Pulses"],
    "West Bengal": ["Rice","Jute","Tea","Sugarcane"]
}

CROPS_FOLDER = "comb_crops"   

def load_crop_json(crop_name):
    """Load crop JSON file given crop name"""
    filename = f"comb_{crop_name.lower()}.json"   
    filepath = os.path.join(CROPS_FOLDER, filename)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)
    return {"error": f"Dataset not found for {crop_name}"}

@app.route("/get_region_crops", methods=["GET"])
def get_region_crops():
    region = request.args.get("region", "").strip()

    if not region:
        return jsonify({"error": "Please provide a region"}), 400

    # Case insensitive lookup
    found_region = None
    for state in state_crops_mapping:
        if state.lower() == region.lower():
            found_region = state
            break

    if not found_region:
        return jsonify({"error": f"No data available for {region}"}), 404

    crops = state_crops_mapping[found_region]
    datasets = {crop: load_crop_json(crop) for crop in crops}

    return jsonify({
        "region": found_region,
        "crops": crops
    })

@app.route("/cropData", methods=["GET"])
def get_crop_data():
    """HTTP endpoint to return crop JSON given query param crop_name"""
    crop_name = request.args.get("crop_name", "").strip()
    if not crop_name:
        return jsonify({"error": "Please provide crop_name"}), 400

    data = load_crop_json(crop_name)
    if isinstance(data, dict) and "error" in data:
        return jsonify(data), 404
    return jsonify(data)


if __name__ == "__main__":
    app.run(debug=True, port=6969)
