const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000; // Render will set PORT automatically

// URL validation per platform
const platformPatterns = {
  facebook: /facebook\.com\/.*\/(videos|watch|reel)/i,
  tiktok: /tiktok\.com\/@[\w.-]+\/video\/\d+/i,
  youtube: /(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/i,
  twitter: /(twitter\.com|x\.com)\/\w+\/status\/\d+/i,
  instagram: /instagram\.com\/(reel|p)\/[\w-]+/i,
};

function extractInfo(url, platform) {
  return new Promise((resolve, reject) => {
    const cmd = `yt-dlp -J --no-playlist "${url}"`;
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`yt-dlp failed: ${stderr || error.message}`));
        return;
      }
      try {
        const data = JSON.parse(stdout);
        const title = data.title || 'Untitled';
        const duration = data.duration ? formatDuration(data.duration) : 'N/A';
        const views = data.view_count ? formatNumber(data.view_count) : 'N/A';
        const formats = data.formats || [];
        const usableFormats = formats.filter(f => f.url && f.vcodec !== 'none' && f.acodec !== 'none');
        usableFormats.sort((a, b) => (b.height || 0) - (a.height || 0));

        const qualities = [];
        const seen = new Set();
        for (const f of usableFormats) {
          const height = f.height || 0;
          const label = height >= 2160 ? '4K' : height >= 1080 ? '1080p' : height >= 720 ? '720p' : height >= 480 ? '480p' : 'SD';
          if (!seen.has(label)) {
            seen.add(label);
            qualities.push({
              label: `${label} (${f.ext})`,
              size: f.filesize ? formatSize(f.filesize) : 'N/A',
              url: f.url,
            });
          }
        }

        resolve({ platform, title, duration, views, qualities });
      } catch (e) {
        reject(new Error('Failed to parse yt-dlp output'));
      }
    });
  });
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

function formatNumber(num) {
  if (num >= 1e6) return (num/1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num/1e3).toFixed(1) + 'K';
  return num.toString();
}

function formatSize(bytes) {
  if (bytes >= 1e9) return (bytes/1e9).toFixed(2) + ' GB';
  if (bytes >= 1e6) return (bytes/1e6).toFixed(2) + ' MB';
  if (bytes >= 1e3) return (bytes/1e3).toFixed(2) + ' KB';
  return bytes + ' B';
}

app.post('/extract', async (req, res) => {
  const { url, platform } = req.body;
  if (!url || !platform) {
    return res.status(400).json({ error: 'Missing url or platform' });
  }
  if (!platformPatterns[platform] || !platformPatterns[platform].test(url)) {
    return res.status(400).json({ error: `Invalid URL for platform: ${platform}` });
  }
  try {
    const data = await extractInfo(url, platform);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('Social Downloader API is running.'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});