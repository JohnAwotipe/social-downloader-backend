const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RAPIDAPI_KEY = 'fc6913bc44mshe149c9656412612p112700jsn3afdba0e14f3';

app.post('/extract', async (req, res) => {
  const { url } = req.body;
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

    // Log the raw response for debugging (will appear in Render logs)
    console.log('Raw API response:', JSON.stringify(data, null, 2));

    // Try to extract the video info
    // The structure might be like { data: { title, video_url, ... } } or direct
    const result = data.data || data;

    if (!result) {
      return res.status(500).json({ error: 'API returned empty response' });
    }

    // Build quality options – if video_url exists, we have a direct link
    const qualities = [];
    if (result.video_url || result.url) {
      qualities.push({
        label: 'Original (no watermark)',
        size: result.size || 'N/A',
        url: result.video_url || result.url,
      });
    }

    // If no qualities found, return an error
    if (qualities.length === 0) {
      return res.status(500).json({ error: 'No video URL found in API response' });
    }

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
