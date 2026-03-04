'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

const TwitterVideoWidget = ({ accessToken }: { accessToken: string }) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accessToken) {
      const fetchVideos = async () => {
        setLoading(true);
        try {
          const res = await axios.get('https://api.twitter.com/2/users/me/media', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              'media.fields': 'url,type,preview_image_url'
            }
          });

          const videoMedia = res.data.data.filter((item: any) => item.type === 'video');
          setVideos(videoMedia);
        } catch (err) {
          console.error('Error fetching Twitter videos:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchVideos();
    }
  }, [accessToken]);

  return (
    <div>
      <h3>Twitter Videos</h3>
      {loading ? (
        <p>Loading videos...</p>
      ) : videos.length > 0 ? (
        videos.map((video) => (
          <video key={video.media_key} controls poster={video.preview_image_url} width={300}>
            <source src={video.url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ))
      ) : (
        <p>No videos found.</p>
      )}
    </div>
  );
};

export default TwitterVideoWidget;
