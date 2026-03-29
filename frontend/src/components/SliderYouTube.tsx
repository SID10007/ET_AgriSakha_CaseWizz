// import React, { useState } from "react";
// import { ChevronLeft, ChevronRight } from "lucide-react";

// interface NewsItem {
//   id: number;
//   embed: string;
// }

// const InfiniteNewsSlider: React.FC = () => {
//   const [currentPage, setCurrentPage] = useState(0);
//   const totalPages = 2; // 10 items / 5 per page = 2 pages

//   const nextPage = () => {
//     setCurrentPage((prev) => (prev + 1) % totalPages);
//   };

//   const prevPage = () => {
//     setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
//   };
  
//   // News data with modified iframe dimensions
//   const newsItems: NewsItem[] = [
//     {id: 1, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/0ovnhc2ej6s?si=KO6YJ64fryDpsIC7" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
//     {id: 2, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/gU_nZH1MJBc?si=i91R-IpUtmoczEyb" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
//     {id: 3, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/47ROs0iltn0?si=bDyRjXGWeXr_eeLH" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
//     {id: 4, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/XLn59XmCYaQ?si=GtDgcN7kx4N1139-" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
//     {id: 5, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/qf8lIZTv6KE?si=mMQID7W5oJdw0zJT" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
//     {id: 6, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/YZXcG0fJpO4?si=9VUqqnocJdtxFczf" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
//     {id: 7, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/827yJ3bJnK0?si=gEH8oNq9yLWyY8ZV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
//     {id: 8, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/LcygZdOy6gk?si=piMmiel5qcCnfd6c" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
//     {id: 9, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/HTzKyVVEH6s?si=4znxOMU3AFCADFKV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
//     {id: 10, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/qTJEC6VVdY4?si=5_Una08dbuQHz3CQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
//   ];

//   return (
//     <div className="relative">
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 transition-all duration-500 ease-in-out">
//         {newsItems.slice(currentPage * 5, (currentPage * 5) + 5).map((feature, index) => (
//           <div key={feature.id} className="w-full h-full p-3 bg-gray-900 rounded-lg">
//             <div dangerouslySetInnerHTML={{ __html: feature.embed }} />
//           </div>
//         ))}
//       </div>
//       <div className="flex justify-center mt-12 space-x-4">
//         <button 
//           onClick={prevPage}
//           className={`p-3 rounded-full bg-[#fccd03] text-black hover:bg-white transition-all duration-300 ${currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
//           disabled={currentPage === 0}
//         >
//           <ChevronLeft className="w-6 h-6" />
//         </button>
//         <button 
//           onClick={nextPage}
//           className={`p-3 rounded-full bg-[#fccd03] text-black hover:bg-white transition-all duration-300 ${currentPage === totalPages - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
//           disabled={currentPage === totalPages - 1}
//         >
//           <ChevronRight className="w-6 h-6" />
//         </button>
//       </div>
//     </div>
//   );
// };

// export default InfiniteNewsSlider;


import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NewsItem {
  id: number;
  embed: string;
  title?: string;
  description?: string;
}

const InfiniteNewsSlider: React.FC<{ youtubeIndex: any[] }> = ({ youtubeIndex }) => {
  const [currentPage, setCurrentPage] = useState(0);

  // News data with modified iframe dimensions (kept for reference, currently unused)
  const newsItems: NewsItem[] = [
    {id: 1, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/0ovnhc2ej6s?si=KO6YJ64fryDpsIC7" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
    {id: 2, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/gU_nZH1MJBc?si=i91R-IpUtmoczEyb" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
    {id: 3, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/47ROs0iltn0?si=bDyRjXGWeXr_eeLH" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
    {id: 4, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/XLn59XmCYaQ?si=GtDgcN7kx4N1139-" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
    {id: 5, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/qf8lIZTv6KE?si=mMQID7W5oJdw0zJT" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
    {id: 6, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/YZXcG0fJpO4?si=9VUqqnocJdtxFczf" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
    {id: 7, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/827yJ3bJnK0?si=gEH8oNq9yLWyY8ZV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
    {id: 8, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/LcygZdOy6gk?si=piMmiel5qcCnfd6c" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
    {id: 9, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/HTzKyVVEH6s?si=4znxOMU3AFCADFKV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
    {id: 10, embed: '<iframe width="100%" height="200" src="https://www.youtube.com/embed/qTJEC6VVdY4?si=5_Una08dbuQHz3CQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'},
  ];

  const youtubeItems: NewsItem[] = youtubeIndex.map((item: any, index: number) => ({
    id: item.id ?? index,
    title: item.title,
    description: item.description,
    // Make the iframe fully responsive so it fits neatly inside its card
    embed: `<iframe 
      src="${item.embed_link}" 
      title="${item.title ?? "YouTube video player"}" 
      style="width:100%;height:100%;border:0;border-radius:16px;" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
      referrerpolicy="strict-origin-when-cross-origin" 
      allowfullscreen
    ></iframe>`,
  }));

  const itemsPerPage = 4;
  const totalPages = Math.max(1, Math.ceil(youtubeItems.length / itemsPerPage));

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-8 xl:gap-10 transition-all duration-500 ease-in-out">
        {youtubeItems.slice(currentPage * itemsPerPage, (currentPage * itemsPerPage) + itemsPerPage).map((feature, index) => (
          <div
            key={feature.id}
            className="w-full h-full p-3 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl shadow-lg shadow-black/40 
                       hover:-translate-y-1 hover:shadow-[rgba(252,205,3,0.45)] transition-transform duration-300 flex flex-col gap-3"
          >
            <div className="relative w-full overflow-hidden rounded-xl aspect-video bg-black/60">
              <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: feature.embed }} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm md:text-base font-semibold text-white leading-snug line-clamp-2">
                {feature.title || "Expert financial insights video"}
              </h3>
              {feature.description && (
                <p className="text-xs text-gray-400 leading-snug line-clamp-2">
                  {feature.description}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-500">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#fccd03]/10 text-[10px] font-semibold text-[#fccd03]">
                  ₹
                </span>
                <span>AgriSakha Insights</span>
                <span className="h-1 w-1 rounded-full bg-gray-500" />
                <span>For Indian farmers</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-12 space-x-4">
        <button 
          onClick={prevPage}
          className={`p-3 rounded-full bg-[#fccd03] text-black hover:bg-white transition-all duration-300 ${currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={currentPage === 0}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={nextPage}
          className={`p-3 rounded-full bg-[#fccd03] text-black hover:bg-white transition-all duration-300 ${currentPage === totalPages - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={currentPage === totalPages - 1}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default InfiniteNewsSlider;
