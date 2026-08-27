const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RAPIDAPI_KEY = 'fc6913bc44mshe149c9656412612p112700jsn3afdba0e14f3';

// Detect platform from URL
function detectPlatform(url) {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/facebook\.com/i.test(url)) return 'facebook';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/(twitter\.com|x\.com)/i.test(url)) return 'twitter';
  return 'unknown';
}

// Format duration (seconds) to "m:ss" or "h:mm:ss"
function formatDuration(seconds) {
  if (!seconds) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

// Format number (views) to "2.7M" etc.
function formatNumber(num) {
  if (!num) return 'N/A';
  if (num >= 1e6) return (num/1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num/1e3).toFixed(1) + 'K';
  return num.toString();
}

// Format bytes to MB/GB
function formatSize(bytes) {
  if (!bytes) return 'N/A';
  if (bytes >= 1e9) return (bytes/1e9).toFixed(2) + ' GB';
  if (bytes >= 1e6) return (bytes/1e6).toFixed(2) + ' MB';
  if (bytes >= 1e3) return (bytes/1e3).toFixed(2) + ' KB';
  return bytes + ' B';
}

app.post('/extract', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Missing url' });
  }

  const platform = detectPlatform(url);
  if (platform === 'unknown') {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  try {
    const options = {
      method: 'POST',
      url: 'https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'social-download-all-in-one.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
      data: { url },
    };

    const response = await axios.request(options);
    const data = response.data;

    // Log raw response for debugging
    console.log('Raw API response:', JSON.stringify(data, null, 2));

    // Extract fields from response
    const title = data.title || 'Video';
    const duration = formatDuration(data.duration);
    const views = formatNumber(data.statistics?.play_count);

    // Build qualities from "medias" array
    const qualities = [];
    if (data.medias && Array.isArray(data.medias)) {
      // Video options (type: "video")
      data.medias
        .filter(m => m.type === 'video')
        .forEach(m => {
          const label = m.quality === 'hd_no_watermark' ? 'HD No Watermark' :
                      m.quality === 'no_watermark' ? 'No Watermark' :
                      m.quality || 'Video';
          qualities.push({
            label: label + ' (' + (m.extension || 'mp4') + ')',
            size: formatSize(m.data_size),
            url: m.url,
          });
        });

      // Audio option (type: "audio") – optional, you can include it
      data.medias
        .filter(m => m.type === 'audio')
        .forEach(m => {
          qualities.push({
            label: 'Audio (MP3)',
            size: formatSize(m.data_size),
            url: m.url,
          });
        });
    }

    if (qualities.length === 0) {
      return res.status(500).json({ error: 'No media found in API response' });
    }

    res.json({
      platform,
      title,
      duration,
      views,
      qualities,
    });
    
  } catch (err) {
    console.error('API error:', err.message);
    res.status(500).json({ error: `Extraction failed: ${err.message}` });
  }
});

app.get('/', (req, res) => res.send('Social Downloader API is running.'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
