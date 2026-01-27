const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const avatarService = require('./services/avatarService');
const videoService = require('./services/videoService');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/avatars', express.static(path.join(__dirname, '..', 'avatars')));
app.use('/videos', express.static(path.join(__dirname, '..', 'videos')));

// Ensure directories exist
const baseDir = __dirname;
['uploads', 'avatars', 'videos'].forEach(dir => {
  const dirPath = path.join(baseDir, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Upload photo and create avatar
app.post('/api/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const photoPath = req.file.path;
    const avatarId = uuidv4();

    // Process photo and create avatar
    const avatarData = await avatarService.createAvatar(photoPath, avatarId);

    res.json({
      success: true,
      avatarId: avatarId,
      avatarUrl: `/avatars/${avatarData.filename}`,
      message: 'Avatar created successfully'
    });
  } catch (error) {
    console.error('Error creating avatar:', error);
    res.status(500).json({ error: error.message || 'Failed to create avatar' });
  }
});

// Generate video with avatar
app.post('/api/generate-video', async (req, res) => {
  try {
    const { avatarId, text, voice } = req.body;

    if (!avatarId || !text) {
      return res.status(400).json({ error: 'Avatar ID and text are required' });
    }

      // Generate video
      const videoData = await videoService.generateVideo(avatarId, text, voice);

      // Check if video file exists, if not, return avatar as fallback
      const videoPath = path.join(__dirname, '..', 'videos', videoData.filename);
      const videoExists = fs.existsSync(videoPath);
      
      // If video doesn't exist but avatar does, return avatar URL as fallback
      if (!videoExists) {
        const avatarPath = path.join(__dirname, '..', 'avatars', `${avatarId}.png`);
        if (fs.existsSync(avatarPath)) {
          return res.json({
            success: true,
            videoId: videoData.videoId,
            videoUrl: `/avatars/${avatarId}.png`,
            message: 'Video generation requires FFmpeg. Avatar image returned as placeholder.',
            isPlaceholder: true
          });
        }
      }

      res.json({
        success: true,
        videoId: videoData.videoId,
        videoUrl: `/videos/${videoData.filename}`,
        message: 'Video generated successfully'
      });
  } catch (error) {
    console.error('Error generating video:', error);
    res.status(500).json({ error: error.message || 'Failed to generate video' });
  }
});

// Get avatar status
app.get('/api/avatar/:avatarId', (req, res) => {
  try {
    const { avatarId } = req.params;
    const avatarPath = path.join(__dirname, '..', 'avatars', `${avatarId}.png`);
    
    if (fs.existsSync(avatarPath)) {
      res.json({
        success: true,
        avatarId: avatarId,
        avatarUrl: `/avatars/${avatarId}.png`
      });
    } else {
      res.status(404).json({ error: 'Avatar not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get video status
app.get('/api/video/:videoId', (req, res) => {
  try {
    const { videoId } = req.params;
    const videoPath = path.join(__dirname, '..', 'videos', `${videoId}.mp4`);
    
    if (fs.existsSync(videoPath)) {
      res.json({
        success: true,
        videoId: videoId,
        videoUrl: `/videos/${videoId}.mp4`
      });
    } else {
      res.status(404).json({ error: 'Video not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
