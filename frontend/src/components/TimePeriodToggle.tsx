import React, { useState } from 'react';

interface TimePeriodImageToggleProps {
  images: {
    '1m': string;
    '3m': string;
    '6m': string;
  };
  altText?: string;
}

const TimePeriodImageToggle: React.FC<TimePeriodImageToggleProps> = ({ 
  images, 
  altText = "Time period image" 
}) => {
  // State to track which time period is selected
  const [selectedPeriod, setSelectedPeriod] = useState<'1m' | '3m' | '6m'>('1m');

  // Handle toggle button click
  const handlePeriodChange = (period: '1m' | '3m' | '6m') => {
    setSelectedPeriod(period);
  };

  return (
    <div className="flex flex-col">
      {/* Title/ID and toggle buttons above the image */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[30px] font-extrabold text-[#fccd03]">
          {images.id}
        </h3>
        
        {/* Time period toggle buttons */}
        <div className="flex bg-gray-100 p-1 rounded-md shadow-md">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPeriod === '1m' 
                ? 'bg-blue-500 text-white' 
                : 'bg-transparent text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handlePeriodChange('1m')}
          >
            1M
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPeriod === '3m' 
                ? 'bg-blue-500 text-white' 
                : 'bg-transparent text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handlePeriodChange('3m')}
          >
            3M
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPeriod === '6m' 
                ? 'bg-blue-500 text-white' 
                : 'bg-transparent text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handlePeriodChange('6m')}
          >
            6M
          </button>
        </div>
      </div>

      {/* Image display */}
      <div className="border rounded-lg overflow-hidden">
        <img 
          src={images[selectedPeriod]} 
          alt={`${altText} - ${selectedPeriod}`} 
          className="w-full h-auto"
        />
      </div>
    </div>
  );
};

export default TimePeriodImageToggle;