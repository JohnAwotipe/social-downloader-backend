const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🔴 Your RapidAPI key
const RAPIDAPI_KEY = 'fc6913bc44mshe149c9656412612p112700jsn3afdba0e14f3';

app.post('/extract', async (req, res) => {
  const { url } = req.body; // platform is not needed; autolink detects it
  
  if (!url) {
    return res.status(400).json({ error: 'Missing url' });
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

    // 🔴 Adjust parsing based on actual response structure
    // Common structure: { data: { title, video_url, thumbnail, ... } }
    // If it's different, we'll adapt.
    const result = data.data || data;

    const qualities = [];
    // If the API returns a direct video URL, we can add it as one quality
    if (result.video_url || result.url) {
      qualities.push({
        label: 'Original (no watermark)',
        size: result.size || 'N/A',
        url: result.video_url || result.url,
      });
    }
    // If it returns multiple formats, you can map them similarly

    res.json({
      platform: 'auto',
      title: result.title || 'Video',
      duration: result.duration || 'N/A',
      views: result.views || 'N/A',
      qualities,
    });
    
  } catch (err) {
    console.error('API error:', err.message);
    res.status(500).json({ error: `Extraction failed: ${err.message}` });
  }
});

app.get('/', (req, res) => res.send('Social Downloader API is running.'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
