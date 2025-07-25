import { useState } from "react";

export const SecretDak = () => {
  const [, setImageError] = useState(false);
  // Extract video ID from YouTube URL
  const videoUrl = 'https://www.youtube.com/watch?v=GpJW1vv-0y4';
  const videoId = videoUrl.split('v=')[1]?.split('&')[0] || 'GpJW1vv-0y4';
  const basePath = import.meta.env.MODE === 'production' ? '/ffu-app' : '';
  const dakUrl = `${basePath}/dak-head.png`;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            🏈 1.01 🏈
          </h1>
        </div>

        {/* Embedded YouTube Video */}
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full rounded-lg shadow-2xl"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title="Secret Dak Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
        <div className="relative">
          <div className="flex items-center justify-center text-white font-bold text-xs transition-all duration-300 transform hover:scale-105">
            <img
              src={dakUrl}
              alt={`dak`}
              className="w-full h-full object-cover transition-colors"
              onError={() => setImageError(true)}
              onLoad={() => setImageError(false)}
            />
          </div>
        </div>

      </div>
    </div>
  );
};