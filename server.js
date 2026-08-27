const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🔴 PASTE YOUR RAPIDAPI KEY HERE
const RAPIDAPI_KEY = 'fc6913bc44mshe149c9656412612p112700jsn3afdba0e14f3';

// Platform → API mapping
const API_CONFIG = {
  youtube: {
    host: 'youtube-video-downloader2.p.rapidapi.com',
    path: '/video',
    params: (url) => ({ url }),
    parse: (data) => ({
      title: data.title || 'YouTube Video',
      duration: formatSeconds(data.duration || 0),
      views: formatNumber(data.views || 0),
      qualities: (data.formats || []).map(f => ({
        label: `${f.quality || 'HD'} (${f.format || 'mp4'})`,
        size: f.size ? formatSize(f.size) : 'N/A',
        url: f.url || f.downloadUrl,
      })),
    }),
  },
  tiktok: {
    host: 'tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com',
    path: '/video',
    params: (url) => ({ url }),
    parse: (data) => ({
      title: data.title || data.description || 'TikTok Video',
      duration: '0:15',
      views: formatNumber(data.play_count || 0),
      qualities: [
        {
          label: 'Original (no watermark)',
          size: data.video_size ? formatSize(data.video_size) : 'N/A',
          url: data.video_url || data.url,
        },
      ],
    }),
  },
  facebook: {
    host: 'facebook-video-downloader.p.rapidapi.com',
    path: '/api/v1/video',
    params: (url) => ({ url }),
    parse: (data) => ({
      title: data.title || 'Facebook Video',
      duration: data.duration || 'N/A',
      views: data.views_count || 'N/A',
      qualities: (data.videos || []).map(v => ({
        label: v.quality || 'HD',
        size: v.size || 'N/A',
        url: v.url,
      })),
    }),
  },
  instagram: {
    host: 'instagram-video-downloader.p.rapidapi.com',
    path: '/api/v1/video',
    params: (url) => ({ url }),
    parse: (data) => ({
      title: data.title || 'Instagram Reel/Post',
      duration: data.duration || 'N/A',
      views: data.views || 'N/A',
      qualities: (data.videos || []).map(v => ({
        label: v.quality || 'HD',
        size: v.size || 'N/A',
        url: v.url,
      })),
    }),
  },
  twitter: {
    host: 'twitter-video-downloader.p.rapidapi.com',
    path: '/api/v1/video',
    params: (url) => ({ url }),
    parse: (data) => ({
      title: data.title || 'Twitter/X Video',
      duration: data.duration || 'N/A',
      views: data.views || 'N/A',
      qualities: (data.videos || []).map(v => ({
        label: v.quality || 'HD',
        size: v.size || 'N/A',
        url: v.url,
      })),
    }),
  },
};

app.post('/extract', async (req, res) => {
  const { url, platform } = req.body;
  
  if (!url || !platform) {
    return res.status(400).json({ error: 'Missing url or platform' });
  }

  const config = API_CONFIG[platform];
  if (!config) {
    return res.status(400).json({ error: `Unsupported platform: ${platform}` });
  }

  try {
    const options = {
      method: 'GET',
      url: `https://${config.host}${config.path}`,
      params: config.params(url),
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': config.host,
      },
    };

    const response = await axios.request(options);
    const parsed = config.parse(response.data);
    res.json({ platform, ...parsed });
    
  } catch (err) {
    console.error('API error:', err.message);
    res.status(500).json({ 
      error: `Extraction failed: ${err.message}. Check your RapidAPI key and subscription.` 
    });
  }
});

app.get('/', (req, res) => res.send('Social Downloader API is running.'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Helper functions
function formatSeconds(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

function formatNumber(num) {
  if (!num) return 'N/A';
  if (num >= 1e6) return (num/1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num/1e3).toFixed(1) + 'K';
  return num.toString();
}

function formatSize(size) {
  // RapidAPI often returns size in MB as a number
  if (typeof size === 'number') {
    if (size >= 1000) return (size/1000).toFixed(2) + ' GB';
    return size.toFixed(2) + ' MB';
  }
  return size || 'N/A';
}
