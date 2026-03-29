import React from 'react';

interface NewsCardProps {
  headline: string;
  imageUrl?: string;
}

const NewsHeadlineCard: React.FC<NewsCardProps> = ({ headline, imageUrl }) => {
  return (
    <div className="max-w-md bg-black text-white rounded-md overflow-hidden">
      <div className="flex items-center p-3">
        <div className="flex-1">
          <h2 className="text-blue-400 font-medium text-base leading-tight">
            {headline}
          </h2>
        </div>
        
        {imageUrl && (
          <div className="ml-3">
            <img 
              src={imageUrl} 
              alt="News thumbnail" 
              className="w-[200px] h-[100px] object-cover rounded-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Example usage
const App: React.FC = () => {
  return (
    <div className="p-4">
      <NewsHeadlineCard 
        headline="Father's State? Tejashwi Yadav As MLA Asks Muslims To Stay Home On Holi"
        imageUrl="https://images.yourstory.com/cs/21/220356402d6d11e9aa979329348d4c3e/SAVEGroupFeatureImage-1741100383126.jpg?mode=crop&crop=faces&ar=16%3A9&format=auto&w=1920&q=75" // Replace with your actual image URL
      />
    </div>
  );
};

export default App;