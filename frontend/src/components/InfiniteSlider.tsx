// import { motion, useAnimation } from "framer-motion";
// import { useState } from "react";

// const im = 'https://cdn.royalcanin-weshare-online.io/HiJiPmYBaxEApS7LmAfe/v1/ed7a-how-to-buy-a-puppy-article-dog'
// const images = [
//   { id: 1, src: "https://bsmedia.business-standard.com/_media/bs/img/article/2025-02/07/full/1738948918-4125.jpg?im=FeatureCrop,size=(826,465)", headline: '90% of rural women entrepreneurs save, 56% opt for bank deposits: survey' }, 
//   { id: 2, src: "https://images.yourstory.com/cs/21/220356402d6d11e9aa979329348d4c3e/SAVEGroupFeatureImage-1741100383126.jpg?mode=crop&crop=faces&ar=16%3A9&format=auto&w=640&q=75%20640w,%20https://images.yourstory.com/cs/21/220356402d6d11e9aa979329348d4c3e/SAVEGroupFeatureImage-1741100383126.jpg?mode=crop&crop=faces&ar=16%3A9&format=auto&w=750&q=75%20750w,%20https://images.yourstory.com/cs/21/220356402d6d11e9aa979329348d4c3e/SAVEGroupFeatureImage-1741100383126.jpg?mode=crop&crop=faces&ar=16%3A9&format=auto&w=828&q=75%20828w,%20https://images.yourstory.com/cs/21/220356402d6d11e9aa979329348d4c3e/SAVEGroupFeatureImage-1741100383126.jpg?mode=crop&crop=faces&ar=16%3A9&format=auto&w=1080&q=75%201080w,%20https://images.yourstory.com/cs/21/220356402d6d11e9aa979329348d4c3e/SAVEGroupFeatureImage-1741100383126.jpg?mode=crop&crop=faces&ar=16%3A9&format=auto&w=1200&q=75%201200w,%20https://images.yourstory.com/cs/21/220356402d6d11e9aa979329348d4c3e/SAVEGroupFeatureImage-1741100383126.jpg?mode=crop&crop=faces&ar=16%3A9&format=auto&w=1920&q=75%201920w", headline: 'How three friends built a Rs 2,000 Cr rural financial company from Bihar'}, 
//   { id: 3, src: "https://images.assettype.com/fortuneindia/2022-03/03fe0a50-27a1-4940-9737-31ba4b5c0e23/MGNREGS.jpg?w=480&h=270&q=60&fit=cover", headline: 'Grameen Credit Score: Can it unlock financial freedom for rural women?' }, 
//   { id: 4, src: "https://www.medianama.com/wp-content/uploads/2019/02/banking-cc0.jpg.jpg 1920w, https://www.medianama.com/wp-content/uploads/2019/02/banking-cc0.jpg-300x212.jpg 300w, https://www.medianama.com/wp-content/uploads/2019/02/banking-cc0.jpg-1024x725.jpg 1024w, https://www.medianama.com/wp-content/uploads/2019/02/banking-cc0.jpg-768x544.jpg 768w, https://www.medianama.com/wp-content/uploads/2019/02/banking-cc0.jpg-1536x1087.jpg 1536w", headline: 'MPAI Report: How Privacy Concerns Are Undermining Public Trust in Digital Finance in India' }, 
//   { id: 5, src: "https://assets.entrepreneur.com/content/3x2/2000/1741332467-Photo-2025-03-07T125728355.png", headline: '90% of Rural Women Entrepreneurs Save, But Financial Planning Needs Improvement: Report' }, 
//   { id: 6, src: "https://cdndailyexcelsior.b-cdn.net/wp-content/uploads/2025/03/Chief-Secretary-calls-for-enhanced-credit-access-investment-in-JKs-rural-sector-at-NABARD-seminar-4-1-696x418.jpeg 696w, https://cdndailyexcelsior.b-cdn.net/wp-content/uploads/2025/03/Chief-Secretary-calls-for-enhanced-credit-access-investment-in-JKs-rural-sector-at-NABARD-seminar-4-1-300x180.jpeg 300w, https://cdndailyexcelsior.b-cdn.net/wp-content/uploads/2025/03/Chief-Secretary-calls-for-enhanced-credit-access-investment-in-JKs-rural-sector-at-NABARD-seminar-4-1-1024x614.jpeg 1024w, https://cdndailyexcelsior.b-cdn.net/wp-content/uploads/2025/03/Chief-Secretary-calls-for-enhanced-credit-access-investment-in-JKs-rural-sector-at-NABARD-seminar-4-1-768x461.jpeg 768w, https://cdndailyexcelsior.b-cdn.net/wp-content/uploads/2025/03/Chief-Secretary-calls-for-enhanced-credit-access-investment-in-JKs-rural-sector-at-NABARD-seminar-4-1.jpeg 1280w", headline: 'CS Calls For Enhanced Credit Access, Investment In J&K’s Rural Sector At NABARD Seminar' }, 
//   { id: 7, src: "https://www.constructionworld.in/assets/uploads/a9dfe813fa6548ff201af5f07dc9af7e.webp", headline: '15th Finance Commission Grants Rs 6.99 Bn to West Bengal’s Rural Bodies' }, 
//   { id: 8, src: "https://bsmedia.business-standard.com/_media/bs/img/article/2020-05/17/full/1589737754-0285.jpg?im=FitAndFill=(826,465)", headline: 'Govt considers increasing MGNREGS funds as rural work demand rises' },
//   { id: 9, src: "https://www.timesbull.com/wp-content/uploads/2025/03/Har-Ghar-Lakhpati-Yojna.jpg", headline: 'Har Ghar Lakhpati Yojana 2024: Empowering Rural Families for Financial Growth – Apply Now' },
//   { id: 10, src: "https://d3pc1xvrcw35tl.cloudfront.net/ln/feedImages/420x315/202503053344478_202503.jpeg", headline: 'MP: 16th Finance Commission discuss state’s financial needs with rural, urban bodies in Bhopal' }
// ];

// const InfiniteSlider = () => {
//   const controls = useAnimation();
//   const [isHovered, setIsHovered] = useState(false);

//   return (
//     <div
//       className="overflow-hidden mt-10"
//       onMouseEnter={() => {
//         setIsHovered(true);
//         controls.stop();
//       }}
//       onMouseLeave={() => {
//         setIsHovered(false);
//         controls.start({
//           x: ["0%", "-100%"],
//           // y: ["0%", "-100%"],
//           transition: { repeat: Infinity, ease: "linear", duration: 12 },
//         });
//       }}
//     >
//       <motion.div
//         className="flex space-evenly"
//         animate={controls}
//         initial={{ y: "0%" }}
//       >
//         {images.map((item, index) => (
//            <div className="max-w-md bg-black text-white rounded-md overflow-hidden">
//            <div className="flex items-center p-3">
//              <div className="flex-1">
//                <h2 className="text-blue-400 font-medium text-base leading-tight">
//                  {item.headline}
//                </h2>
//              </div>
             
//              {item.src && (
//                <div className="ml-3">
//                  <img 
//                    src={item.src} 
//                    alt="News thumbnail" 
//                    className="w-[200px] h-[100px] object-cover rounded-sm"
//                  />
//                </div>
//              )}
//            </div>
//          </div>
//         ))}
//       </motion.div>
//     </div>
//   );
// };

// export default InfiniteSlider;

// import React, { useEffect } from "react";
// import { motion, useAnimation } from "framer-motion";

// interface NewsItem {
//   id: number;
//   src: string;
//   headline: string;
// }

// const InfiniteNewsSlider: React.FC = () => {
//   const controls = useAnimation();
  
//   // News data
//   const newsItems: NewsItem[] = [
//     { id: 1, src: "https://www.medianama.com/wp-content/uploads/2019/02/banking-cc0.jpg-768x544.jpg", headline: 'MPAI Report: How Privacy Concerns Are Undermining Public Trust in Digital Finance in India' },
//     { id: 2, src: "https://assets.entrepreneur.com/content/3x2/2000/1741332467-Photo-2025-03-07T125728355.png", headline: '90% of Rural Women Entrepreneurs Save, But Financial Planning Needs Improvement: Report' },
//     { id: 3, src: "https://cdndailyexcelsior.b-cdn.net/wp-content/uploads/2025/03/Chief-Secretary-calls-for-enhanced-credit-access-investment-in-JKs-rural-sector-at-NABARD-seminar-4-1-768x461.jpeg", headline: 'CS Calls For Enhanced Credit Access, Investment In J&Ks Rural Sector At NABARD Seminar' },
//     { id: 4, src: "https://www.constructionworld.in/assets/uploads/a9dfe813fa6548ff201af5f07dc9af7e.webp", headline: '15th Finance Commission Grants Rs 6.99 Bn to West Bengals Rural Bodies' },
//     { id: 5, src: "https://bsmedia.business-standard.com/_media/bs/img/article/2020-05/17/full/1589737754-0285.jpg", headline: 'Govt considers increasing MGNREGS funds as rural work demand rises' },
//     { id: 6, src: "https://www.timesbull.com/wp-content/uploads/2025/03/Har-Ghar-Lakhpati-Yojna.jpg", headline: 'Har Ghar Lakhpati Yojana 2024: Empowering Rural Families for Financial Growth – Apply Now' },
//     { id: 7, src: "https://d3pc1xvrcw35tl.cloudfront.net/ln/feedImages/420x315/202503053344478_202503.jpeg", headline: 'MP: 16th Finance Commission discuss states financial needs with rural, urban bodies in Bhopal' }
//   ];

//   // Start the animation when component mounts
//   useEffect(() => {
//     controls.start({
//       x: [0, -2800], // Adjust based on your total width
//       transition: { 
//         repeat: Infinity,
//         ease: "linear",
//         duration: 30,
//         repeatType: "loop"
//       }
//     });
//   }, [controls]);

//   // Handle hover pause
//   const handleMouseEnter = () => {
//     controls.stop();
//   };

//   const handleMouseLeave = () => {
//     controls.start({
//       x: [0, -2800], // Adjust based on your total width
//       transition: { 
//         repeat: Infinity,
//         ease: "linear",
//         duration: 30,
//         repeatType: "loop"
//       }
//     });
//   };

//   return (
//     <div 
//       className="w-full overflow-hidden bg-black gap-5" 
//       onMouseEnter={handleMouseEnter}
//       onMouseLeave={handleMouseLeave}
//     >
//       <motion.div 
//         className="flex"
//         animate={controls}
//         style={{ width: "fit-content" }}
//       >
//         {/* Display the news items */}
//         {newsItems.map((item) => (
//           <div key={item.id} className="w-80 flex-shrink-0 px-5 py-2 rounded-xl">
//             <div className="flex items-center h-full">
//               <div className="flex-1 pr-3">
//                 <div className="text-blue-400 font-medium text-sm leading-tight">
//                   {item.headline}
//                 </div>
//               </div>
//               <div className="w-24 flex-shrink-0">
//                 <img 
//                   src={item.src} 
//                   alt={`News thumbnail for ${item.headline}`}
//                   className="w-full h-20 object-cover rounded-sm"
//                 />
//               </div>
//             </div>
//           </div>
//         ))}
        
//         {/* Duplicate the news items to create a seamless loop */}
//         {newsItems.map((item) => (
//           <div key={`duplicate-${item.id}`} className="w-80 flex-shrink-0 px-4 py-2">
//             <div className="flex items-center h-full">
//               <div className="flex-1 pr-3">
//                 <div className="text-blue-400 font-medium text-sm leading-tight">
//                   {item.headline}
//                 </div>
//               </div>
//               <div className="w-24 flex-shrink-0">
//                 <img 
//                   src={item.src} 
//                   alt={`News thumbnail for ${item.headline}`}
//                   className="w-full h-20 object-cover rounded-sm"
//                 />
//               </div>
//             </div>
//           </div>
//         ))}
//       </motion.div>
//     </div>
//   );
// };

// export default InfiniteNewsSlider;

import React, { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";

interface NewsItem {
  id: number;
  src: string;
  headline: string;
}

const InfiniteNewsSlider: React.FC = () => {
  const controls = useAnimation();
  
  // News data
  const newsItems: NewsItem[] = [
    { id: 1, src: "https://www.medianama.com/wp-content/uploads/2019/02/banking-cc0.jpg-768x544.jpg", headline: 'MPAI Report: How Privacy Concerns Are Undermining Public Trust in Digital Finance in India' },
    { id: 2, src: "https://assets.entrepreneur.com/content/3x2/2000/1741332467-Photo-2025-03-07T125728355.png", headline: '90% of Rural Women Entrepreneurs Save, But Financial Planning Needs Improvement: Report' },
    { id: 3, src: "https://cdndailyexcelsior.b-cdn.net/wp-content/uploads/2025/03/Chief-Secretary-calls-for-enhanced-credit-access-investment-in-JKs-rural-sector-at-NABARD-seminar-4-1-768x461.jpeg", headline: 'CS Calls For Enhanced Credit Access, Investment In J&Ks Rural Sector At NABARD Seminar' },
    { id: 4, src: "https://www.constructionworld.in/assets/uploads/a9dfe813fa6548ff201af5f07dc9af7e.webp", headline: '15th Finance Commission Grants Rs 6.99 Bn to West Bengals Rural Bodies' },
    { id: 5, src: "https://bsmedia.business-standard.com/_media/bs/img/article/2020-05/17/full/1589737754-0285.jpg", headline: 'Govt considers increasing MGNREGS funds as rural work demand rises' },
    { id: 6, src: "https://www.timesbull.com/wp-content/uploads/2025/03/Har-Ghar-Lakhpati-Yojna.jpg", headline: 'Har Ghar Lakhpati Yojana 2024: Empowering Rural Families for Financial Growth – Apply Now' },
    { id: 7, src: "https://d3pc1xvrcw35tl.cloudfront.net/ln/feedImages/420x315/202503053344478_202503.jpeg", headline: 'MP: 16th Finance Commission discuss states financial needs with rural, urban bodies in Bhopal' }
  ];

  // Start the animation when component mounts
  useEffect(() => {
    controls.start({
      x: [0, -2800], // Adjust based on your total width
      transition: { 
        repeat: Infinity,
        ease: "linear",
        duration: 60,
        repeatType: "loop"
      }
    });
  }, [controls]);

  // Handle hover pause
  const handleMouseEnter = () => {
    controls.stop();
  };

  const handleMouseLeave = () => {
    controls.start({
      x: [0, -2800], // Adjust based on your total width
      transition: { 
        repeat: Infinity,
        ease: "linear",
        duration: 30,
        repeatType: "loop"
      }
    });
  };

  return (
    <div 
      className="w-full overflow-hidden bg-gray" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div 
        className="flex gap-4 h-[160px]"
        animate={controls}
        style={{ width: "fit-content" }}
      >
        {/* Display the news items */}
        {newsItems.map((item) => (
          <a href="" target="_blank">
          <div key={item.id} className="w-96 flex-shrink-0 border-r border-gray-800 mx-2 rounded-lg bg-white">
            <div className="flex items-center h-full p-3">
              <div className="flex-1 pr-3">
                <div className="text-black-400 font-medium text-md leading-tight">
                  {item.headline}
                </div>
              </div>
              <div className="w-32 flex-shrink-0">
                <img 
                  src={item.src} 
                  alt={`News thumbnail for ${item.headline}`}
                  className="w-full h-[120px] object-cover rounded"
                />
              </div>
            </div>
          </div>
          </a>
        ))}
        
        {/* Duplicate the news items to create a seamless loop */}
        {newsItems.map((item) => (
          <a href="" target="_blank">
          <div key={`duplicate-${item.id}`} className="w-96 flex-shrink-0 border-r border-gray-800 mx-2 rounded-lg bg-white">
            <div className="flex items-center h-full p-3">
              <div className="flex-1 pr-3">
                <div className="text-black-400 font-medium text-md leading-tight">
                  {item.headline}
                </div>
              </div>
              <div className="w-32 flex-shrink-0">
                <img 
                  src={item.src} 
                  alt={`News thumbnail for ${item.headline}`}
                  className="w-full h-[120px] object-cover rounded"
                />
              </div>
            </div>
          </div>
          </a>
        ))}
      </motion.div>
    </div>
  );
};

export default InfiniteNewsSlider;
