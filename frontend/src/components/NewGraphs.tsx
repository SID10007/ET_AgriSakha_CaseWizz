import { useState, useEffect } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';

// Example crop options
const cropOptions = [
  { label: 'Rice', value: 'rice' },
  { label: 'Jute', value: 'jute' },
  { label: 'Coffee', value: 'coffee' },
  { label: 'Sugarcane', value: 'sugarcane' },
  { label: 'Pulses', value: 'pulses' },
  { label: 'Tea', value: 'tea' },
  { label: 'Maize', value: 'maize' },
  { label: 'Wheat', value: 'wheat' },
  { label: 'Groundnut', value: 'groundnut' },
  { label: 'Cotton', value: 'cotton' },
];

// Dummy API function (replace with real API call)
async function fetchCropGraphData(crop: string) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  // Make an API call to fetch crop data from the backend
  try {
    const response = await fetch(`http://127.0.0.1:6969/cropData?crop_name=${encodeURIComponent(crop)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch crop data');
    }
    const data = await response.json();
    // The API returns { combined_x: [...], y1: [...], y2: [...] }
    // To plot dates (YYYY-MM-DD) on the x-axis using @mui/x-charts/LineChart,
    // you should pass the array of date strings as the x prop, and set the xAxis scale to 'time' in the chart component.
    // Here, just return the data as-is; the chart component will handle the date formatting.
    const xValues = Array.isArray(data?.combined_x)
      ? data.combined_x.map((d: string) => new Date(d))
      : [];
    return {
      x: xValues,
      series: [
        { data: data.y1 },
        { data: data.y2 }
      ]
    };
  } catch (error) {
    // If the API call fails, fall back to dummy data below
    console.error('Error fetching crop graph data:', error);
  }
  // Return dummy data based on crop
  switch (crop) {
    case 'rice':
      return {
        x: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        series: [
          { data: [2, 5.5, 2, 8.5, 1.5, 5, 6, 7, 8] },
          { data: [null, null, null, null, 5.5, 2, 8.5, 1.5, 5] },
          { data: [7, 8, 5, 4, null, null, 2, 5.5, 1] },
        ],
      };
    case 'jute':
      return {
        x: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        series: [
          { data: [3, 4, 6, 7, 8, 5, 4, 3, 2] },
          { data: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
          { data: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
        ],
      };
    case 'tea':
      return {
        x: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        series: [
          { data: [5, 4, 3, 2, 1, 2, 3, 4, 5] },
          { data: [1, 3, 5, 7, 9, 7, 5, 3, 1] },
          { data: [2, 2, 2, 2, 2, 2, 2, 2, 2] },
        ],
      };
    case 'sugarcane':
      return {
        x: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        series: [
          { data: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] },
          { data: [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1] },
          { data: [2, 3, 2, 3, 2, 3, 2, 3, 2] },
        ],
      };
    default:
      return {
        x: [],
        series: [],
      };
  }
}

function CropGraph({
  cropOptions,
  initialCrop,
  title,
}: {
  cropOptions: { label: string; value: string }[];
  initialCrop: string;
  title: string;
}) {
  const [selectedCrop, setSelectedCrop] = useState(initialCrop);
  const [graphData, setGraphData] = useState<{ x: (number | string | Date)[]; series: { data: (number | null)[] }[] }>({
    x: [],
    series: [],
  });
  const [loading, setLoading] = useState(false);
  const dynamicTitle =
    cropOptions.find((opt) => opt.value === selectedCrop)?.label || title || selectedCrop;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchCropGraphData(selectedCrop).then((data) => {
      if (isMounted) {
        setGraphData(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCrop]);

  return (
    <div className="white-axis bg-black/30 rounded-lg p-4 mb-6 shadow-lg mx-auto w-full max-w-[600px]" style={{ minWidth: 0 }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-[#fccd03]">{dynamicTitle}</h3>
        <select
          className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 focus:outline-none"
          value={selectedCrop}
          onChange={(e) => setSelectedCrop(e.target.value)}
        >
          {cropOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="text-white text-center py-8">Loading...</div>
      ) : (
        <LineChart
          xAxis={[
            {
              data: graphData.x,
              scaleType: graphData.x.length && graphData.x[0] instanceof Date ? 'time' : 'linear',
              labelStyle: { fill: 'white' },
              tickLabelStyle: { fill: 'white' },
            },
          ]}
          yAxis={[
            {
              labelStyle: { fill: 'white' },
              tickLabelStyle: { fill: 'white' },
            },
          ]}
          series={graphData.series.map((s, idx) => ({
            ...s,
            // area: true,
            showMark: false,
            label:
              idx === 0
                ? 'Existing price'
                : idx === 1
                ? 'Predicted price'
                : s && (s as any).label
                ? (s as any).label
                : `Series ${idx + 1}`,
            color: idx === 0 ? '#3b82f6' : idx === 1 ? '#facc15' : undefined,
            valueFormatter: (value: number | null) =>
              value == null ? (idx === 0 ? 'NaN' : '?') : value.toString(),
          }))}
          height={320}
          width={560}
          margin={{ top: 20, bottom: 10 }}
        />
      )}
    </div>
  );
}

export default function NewGraphs() {
    const coords = JSON.parse(sessionStorage.getItem("userLocation") || 'null') as { lat: number; lon: number } | null
    const lat = coords?.lat
    const lon = coords?.lon
    const [stateName, setStateName] = useState<string | null>(null)
    const [regionCrops, setRegionCrops] = useState<string[]>([]);
    useEffect(() => {
      if (lat == null || lon == null) return;
      fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${import.meta.env.VITE_WEATHER_API_KEY}`)
        .then((resp) => resp.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0 && data[0].state) {
            setStateName(data[0].state);
          }
        })
        .catch((err) => {
          console.error("Error fetching state name:", err);
        });
    }, [lat, lon])

    useEffect(() => {
      if (!stateName) return;
      fetch(`http://127.0.0.1:6969/get_region_crops?region=${encodeURIComponent(stateName)}`)
        .then((resp) => resp.json())
        .then((data) => {
          if (data && Array.isArray(data.crops)) {
            const allowed = new Set(cropOptions.map((c) => c.value));
            const normalized = data.crops
              .map((c: string) => String(c).toLowerCase())
              .filter((c: string) => allowed.has(c));
            setRegionCrops(normalized);
          } else {
            setRegionCrops([]);
          }
        })
        .catch((err) => {
          console.error("Error fetching region crops:", err);
          setRegionCrops([]);
        });
    }, [stateName])
  return (
    <div style={{ background: 'transparent', position: 'relative' }}>
      <style>
        {`
          .white-axis .MuiChartsAxis-line {
            stroke: white !important;
          }
          .white-axis .MuiChartsAxis-tick {
            stroke: white !important;
          }
          .white-axis .MuiChartsAxis-tickLabel {
            fill: white !important;
          }
          .white-axis .MuiChartsAxis-label {
            fill: white !important;
          }
          .white-axis .MuiChartsLegend-root {
            color: white !important;
          }
          .white-axis .MuiChartsLegend-root text {
            fill: white !important;
          }
          .white-axis .MuiChartsLegend-root .MuiTypography-root {
            color: white !important;
          }
        `}
      </style>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-7xl mx-auto px-4 justify-items-center">
        {regionCrops.map((item) => (
          <CropGraph key={item} cropOptions={cropOptions} initialCrop={item} title={item} />
        ))}
      </div>
    </div>
  );
}