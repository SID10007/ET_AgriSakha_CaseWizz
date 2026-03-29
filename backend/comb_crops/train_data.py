import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt
import json

state_crops_mapping = {
    "Andhra Pradesh": ["Rice", "Maize", "Cotton", "Pulses"],
    "Arunachal Pradesh": ["Rice", "Maize", "Pulses", "Tea"],
    "Assam": ["Rice", "Jute", "Tea", "Sugarcane"],
    "Bihar": ["Rice", "Wheat", "Maize", "Pulses"],
    "Chhattisgarh": ["Rice", "Maize", "Pulses", "Groundnut"],
    "Goa": ["Rice", "Pulses", "Groundnut", "Sugarcane"],
    "Gujarat": ["Cotton", "Rice", "Wheat", "Groundnut"],  
    "Haryana": ["Wheat", "Rice", "Sugarcane", "Cotton"],
    "Himachal Pradesh": ["Maize", "Wheat", "Pulses", "Tea"],
    "Jharkhand": ["Rice", "Maize", "Pulses", "Groundnut"],
    "Karnataka": ["Rice", "Maize", "Sugarcane", "Coffee"],
    "Kerala": ["Rice", "Tea", "Coffee", "Pulses"],
    "Madhya Pradesh": ["Wheat", "Cotton", "Pulses", "Maize"],  
    "Maharashtra": ["Cotton", "Sugarcane", "Groundnut", "Rice"],
    "Manipur": ["Rice", "Maize", "Pulses", "Groundnut"],
    "Meghalaya": ["Rice", "Maize", "Tea", "Pulses"],
    "Mizoram": ["Rice", "Maize", "Groundnut", "Pulses"],
    "Nagaland": ["Rice", "Maize", "Millets", "Pulses"],  
    "Odisha": ["Rice", "Maize", "Pulses", "Groundnut"],
    "Punjab": ["Wheat", "Rice", "Sugarcane", "Cotton"],
    "Rajasthan": ["Wheat", "Pulses", "Groundnut", "Maize"],
    "Sikkim": ["Rice", "Maize", "Pulses", "Tea"],
    "Tamil Nadu": ["Rice", "Sugarcane", "Cotton", "Tea"],
    "Telangana": ["Rice", "Maize", "Cotton", "Pulses"],
    "Tripura": ["Rice", "Maize", "Pulses", "Tea"],
    "Uttar Pradesh": ["Wheat", "Rice", "Sugarcane", "Pulses"],
    "Uttarakhand": ["Rice", "Wheat", "Maize", "Pulses"],
    "West Bengal": ["Rice", "Jute", "Tea", "Sugarcane"]
}

df = pd.read_csv("groundnut.csv")
df_ml = df.copy()

# Encode categorical variables
label_encoders = {}
categorical_columns = ['Weather_Condition', 'Demand_Level', 'Supply_Status', 'Season']

for col in categorical_columns:
    le = LabelEncoder()
    df_ml[f'{col}_encoded'] = le.fit_transform(df_ml[col])
    label_encoders[col] = le

# Select features for training
feature_columns = [
    'Temperature_Celsius', 'Rainfall_mm', 'Humidity_Percent', 'Month',
    'Weather_Condition_encoded', 'Demand_Level_encoded', 'Supply_Status_encoded', 
    'Season_encoded', 'High_Temp', 'Heavy_Rainfall', 'High_Humidity'
]

X = df_ml[feature_columns]
y = df_ml['Price_per_Quintal_INR']

print(f"Features selected: {feature_columns}")
print(f"Training data shape: X={X.shape}, y={y.shape}")

print("\nStep 3: Training Random Forest model...")

# Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train Random Forest model
rf_model = RandomForestRegressor(
    n_estimators=100,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)

rf_model.fit(X_train, y_train)

# Make predictions on test set
y_pred = rf_model.predict(X_test)

print("\nStep 4: Evaluating model accuracy...")

# Calculate accuracy metrics
mae = mean_absolute_error(y_test, y_pred)
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
r2 = r2_score(y_test, y_pred)

# Calculate MAPE (Mean Absolute Percentage Error)
mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100

print(f"Model Performance Metrics:")
print(f"Mean Absolute Error (MAE): ₹{mae:.2f}")
print(f"Root Mean Square Error (RMSE): ₹{rmse:.2f}")
print(f"R² Score: {r2:.4f}")
print(f"Mean Absolute Percentage Error (MAPE): {mape:.2f}%")
print(f"Model Accuracy: {(100 - mape):.2f}%")

# Feature importance
feature_importance = pd.DataFrame({
    'feature': feature_columns,
    'importance': rf_model.feature_importances_
}).sort_values('importance', ascending=False)

print(f"\nTop 5 Most Important Features:")
for i, row in feature_importance.head().iterrows():
    print(f"{row['feature']}: {row['importance']:.4f}")

print("\nStep 5: Generating future predictions for next 6 months...")

# Generate future dates (next 6 months)
if isinstance(df['Date'].iloc[0], str):
    df['Date'] = pd.to_datetime(df['Date'])

last_date = df['Date'].max()
future_dates = pd.date_range(start=last_date + timedelta(days=1), periods=180, freq='D')

# Generate future weather data (simplified prediction)
future_data = []

for date in future_dates:
    month = date.month
    
    # Seasonal patterns for future weather
    if month in [6, 7, 8, 9]:  # Monsoon
        temp = np.random.normal(28, 4)
        rainfall = np.random.exponential(25)
        humidity = np.random.normal(80, 10)
        weather_prob = [0.15, 0.15, 0.20, 0.25, 0.10, 0.10, 0.05]  # More rain
        demand = np.random.choice(['Low', 'Medium', 'High'], p=[0.1, 0.5, 0.4])
        supply = np.random.choice(['Low', 'Medium', 'High'], p=[0.3, 0.5, 0.2])
    elif month in [10, 11, 12]:  # Post-harvest
        temp = np.random.normal(25, 4)
        rainfall = np.random.exponential(5)
        humidity = np.random.normal(60, 15)
        weather_prob = [0.35, 0.25, 0.20, 0.15, 0.02, 0.02, 0.01]  # Less rain
        demand = np.random.choice(['Low', 'Medium', 'High'], p=[0.3, 0.5, 0.2])
        supply = np.random.choice(['Low', 'Medium', 'High'], p=[0.1, 0.4, 0.5])
    elif month in [1, 2, 3]:  # Winter
        temp = np.random.normal(20, 5)
        rainfall = np.random.exponential(3)
        humidity = np.random.normal(55, 12)
        weather_prob = [0.40, 0.25, 0.20, 0.10, 0.02, 0.02, 0.01]
        demand = np.random.choice(['Low', 'Medium', 'High'], p=[0.2, 0.6, 0.2])
        supply = np.random.choice(['Low', 'Medium', 'High'], p=[0.2, 0.6, 0.2])
    else:  # Summer
        temp = np.random.normal(35, 6)
        rainfall = np.random.exponential(8)
        humidity = np.random.normal(50, 12)
        weather_prob = [0.30, 0.25, 0.25, 0.15, 0.03, 0.02, 0.00]
        demand = np.random.choice(['Low', 'Medium', 'High'], p=[0.15, 0.5, 0.35])
        supply = np.random.choice(['Low', 'Medium', 'High'], p=[0.25, 0.5, 0.25])
    
    temp = max(15, min(45, temp))
    humidity = max(25, min(95, humidity))
    
    weather = np.random.choice(['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Heavy Rain', 'Drizzle', 'Thunderstorm'], 
                              p=weather_prob)
    
    season = 'Monsoon' if month in [6,7,8,9] else 'Post-Harvest' if month in [10,11,12] else 'Winter' if month in [1,2,3] else 'Summer'
    
    future_data.append({
        'Date': date,
        'Temperature_Celsius': round(temp, 1),
        'Rainfall_mm': round(rainfall, 1),
        'Humidity_Percent': round(humidity, 1),
        'Weather_Condition': weather,
        'Demand_Level': demand,
        'Supply_Status': supply,
        'Month': month,
        'Season': season,
        'High_Temp': temp > 35,
        'Heavy_Rainfall': rainfall > 20,
        'High_Humidity': humidity > 75
    })

future_df = pd.DataFrame(future_data)

# Encode categorical variables for future data
for col in categorical_columns:
    future_df[f'{col}_encoded'] = label_encoders[col].transform(future_df[col])

# Prepare future features
X_future = future_df[feature_columns]

# Make future predictions
future_predictions = rf_model.predict(X_future)

# Add predictions to future dataframe
future_df['Predicted_Price_INR'] = future_predictions

print(f"Generated predictions for {len(future_df)} future days")
print(f"Future price range: ₹{future_predictions.min():.2f} - ₹{future_predictions.max():.2f}")
print(f"Average predicted price: ₹{future_predictions.mean():.2f}")

print("\nStep 6: Preparing data arrays for frontend...")

# Prepare arrays for frontend visualization
# Historical data (X and Y coordinates) - Select every 10th point
historical_dates_all = df['Date'].dt.strftime('%Y-%m-%d').tolist()
historical_prices_all = df['Price_per_Quintal_INR'].tolist()

# Select every 10th point for better graph readability
historical_dates = [historical_dates_all[i] for i in range(0, len(historical_dates_all), 10)]
historical_prices = [historical_prices_all[i] for i in range(0, len(historical_prices_all), 10)]

# Future predictions (X and Y coordinates) - Select every 10th point
future_dates_all = future_df['Date'].dt.strftime('%Y-%m-%d').tolist()
future_prices_all = future_df['Predicted_Price_INR'].tolist()

# Select every 10th point for better graph readability
future_dates_str = [future_dates_all[i] for i in range(0, len(future_dates_all), 10)]
future_prices = [future_prices_all[i] for i in range(0, len(future_prices_all), 10)]

# Create arrays for frontend
frontend_data = {
    'historical_x': historical_dates,
    'historical_y': historical_prices,
    'predicted_x': future_dates_str,
    'predicted_y': future_prices,
    'model_accuracy': {
        'mae': round(mae, 2),
        'rmse': round(rmse, 2),
        'r2_score': round(r2, 4),
        'mape': round(mape, 2),
        'accuracy_percentage': round(100 - mape, 2)
    },
    'feature_importance': feature_importance.to_dict('records')
}

# Save arrays to JSON file for easy frontend integration
with open('rice_price_prediction_data.json', 'w') as f:
    json.dump(frontend_data, f, indent=2)

print("Frontend data saved to 'rice_price_prediction_data.json'")

# Save future predictions to CSV
future_df.to_csv('future_rice_price_predictions.csv', index=False)
print("Future predictions saved to 'future_rice_price_predictions.csv'")

print("\nStep 7: Displaying arrays for frontend...")

print(f"\nArray lengths:")
print(f"Historical X coordinates: {len(historical_dates)} points")
print(f"Historical Y coordinates: {len(historical_prices)} points")
print(f"Predicted X coordinates: {len(future_dates_str)} points") 
print(f"Predicted Y coordinates: {len(future_prices)} points")

print(f"\nSample Historical Data (first 5 points):")
for i in range(5):
    print(f"Date: {historical_dates[i]}, Price: ₹{historical_prices[i]}")

print(f"\nSample Future Predictions (first 5 points):")
for i in range(5):
    print(f"Date: {future_dates_str[i]}, Predicted Price: ₹{future_prices[i]:.2f}")

print("\n" + "="*60)
print("SUMMARY FOR FRONTEND INTEGRATION")
print("="*60)
print(f"✓ Model trained with {r2:.1%} accuracy (R² score)")
print(f"✓ Prediction accuracy: {100-mape:.1f}%")
print(f"✓ Historical data: {len(historical_dates)} data points")
print(f"✓ Future predictions: {len(future_dates_str)} data points (6 months)")
print(f"✓ All data saved to JSON and CSV files")
print("\nArrays ready for frontend:")
print("- historical_x: Array of historical dates")
print("- historical_y: Array of historical prices") 
print("- predicted_x: Array of future dates")
print("- predicted_y: Array of predicted prices")

plt.figure(figsize=(15, 8))

# Plot with all data points but with transparency
plt.plot(df['Date'], df['Price_per_Quintal_INR'], label='Historical Prices (All Data)', 
         color='lightblue', alpha=0.3, linewidth=0.5)
plt.plot(future_df['Date'], future_df['Predicted_Price_INR'], label='Predicted Prices (All Data)', 
         color='lightcoral', alpha=0.3, linewidth=0.5)

# Plot with reduced points for clarity
historical_dates_dt = pd.to_datetime(historical_dates)
future_dates_dt = pd.to_datetime(future_dates_str)

plt.plot(historical_dates_dt, historical_prices, label='Historical Prices (Every 10th Point)', 
         color='blue', marker='o', markersize=3, linewidth=2)
plt.plot(future_dates_dt, future_prices, label='Predicted Prices (Every 10th Point)', 
         color='red', linestyle='--', marker='s', markersize=3, linewidth=2)

plt.xlabel('Date')
plt.ylabel('Price per Quintal (INR)')
plt.title('Rice Price Prediction: Historical vs Future (Optimized for Readability)')
plt.legend()
plt.xticks(rotation=45)
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('rice_price_prediction_chart.png', dpi=300, bbox_inches='tight')
plt.show()

print("\nVisualization saved as 'rice_price_prediction_chart.png'")