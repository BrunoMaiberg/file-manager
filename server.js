const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const archiver = require('archiver');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const PORT = process.env.PORT || 8181;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Base upload directory
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fsSync.existsSync(UPLOAD_DIR)) {
  fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads - use temp directory first
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Always upload to temp directory first
      const tempDir = path.join(UPLOAD_DIR, '.temp');
      if (!fsSync.existsSync(tempDir)) {
        fsSync.mkdirSync(tempDir, { recursive: true });
      }
      cb(null, tempDir);
    },
    filename: (req, file, cb) => {
      // Use timestamp + original name to avoid conflicts
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  })
});

// Helper function to get file stats
async function getFileStats(filePath, relativePath) {
  const stats = await fs.stat(filePath);
  const name = path.basename(filePath);
  
  return {
    name,
    path: relativePath,
    type: stats.isDirectory() ? 'folder' : 'file',
    size: stats.size,
    modified: stats.mtime,
    extension: stats.isDirectory() ? null : path.extname(name).slice(1)
  };
}

// Helper function to validate path (prevent directory traversal)
function isValidPath(requestedPath) {
  const fullPath = path.join(UPLOAD_DIR, requestedPath);
  const normalizedPath = path.normalize(fullPath);
  return normalizedPath.startsWith(UPLOAD_DIR);
}

// API Routes

// List files and folders
app.get('/api/files', async (req, res) => {
  try {
    const requestedPath = req.query.path || '';
    
    if (!isValidPath(requestedPath)) {
      return res.status(403).json({ error: 'Invalid path' });
    }
    
    const fullPath = path.join(UPLOAD_DIR, requestedPath);
    
    // Check if directory exists
    try {
      await fs.access(fullPath);
    } catch {
      return res.json({ files: [], currentPath: requestedPath });
    }
    
    const items = await fs.readdir(fullPath);
    const files = [];
    
    for (const item of items) {
      // Skip temp and thumbnails directories
      if (item === '.temp' || item === '.thumbnails') continue;
      
      const itemPath = path.join(fullPath, item);
      const relPath = path.join(requestedPath, item);
      const stats = await getFileStats(itemPath, relPath);
      files.push(stats);
    }
    
    // Sort: folders first, then by name
    files.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'folder' ? -1 : 1;
    });
    
    res.json({ files, currentPath: requestedPath });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Upload files - now moves from temp to target directory
app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const targetPath = req.body.path || '';
    console.log('Upload request - Target path:', targetPath);
    console.log('Files uploaded to temp:', req.files.length);
    
    if (!isValidPath(targetPath)) {
      // Clean up temp files
      for (const file of req.files) {
        await fs.unlink(file.path).catch(() => {});
      }
      return res.status(403).json({ error: 'Invalid path' });
    }
    
    const targetDir = path.join(UPLOAD_DIR, targetPath);
    
    // Ensure target directory exists
    if (!fsSync.existsSync(targetDir)) {
      fsSync.mkdirSync(targetDir, { recursive: true });
    }
    
    const uploadedFiles = [];
    
    // Move each file from temp to target directory
    for (const file of req.files) {
      const originalName = file.originalname;
      const tempPath = file.path;
      const finalPath = path.join(targetDir, originalName);
      
      console.log(`Moving: ${tempPath} -> ${finalPath}`);
      
      // Move file
      await fs.rename(tempPath, finalPath);
      
      uploadedFiles.push({
        name: originalName,
        size: file.size,
        path: path.join(targetPath, originalName)
      });
    }
    
    console.log('Files moved successfully:', uploadedFiles.length);
    
    res.json({ success: true, files: uploadedFiles });
  } catch (error) {
    console.error('Error uploading files:', error);
    
    // Clean up temp files on error
    for (const file of req.files) {
      await fs.unlink(file.path).catch(() => {});
    }
    
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Download file or folder
app.get('/api/download', async (req, res) => {
  try {
    const requestedPath = req.query.path || '';
    
    if (!isValidPath(requestedPath)) {
      return res.status(403).json({ error: 'Invalid path' });
    }
    
    const fullPath = path.join(UPLOAD_DIR, requestedPath);
    const stats = await fs.stat(fullPath);
    const fileName = path.basename(fullPath);
    
    if (stats.isDirectory()) {
      // Download folder as ZIP
      const zipName = `${fileName}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        res.status(500).json({ error: 'Failed to create archive' });
      });
      
      archive.pipe(res);
      archive.directory(fullPath, false);
      await archive.finalize();
    } else {
      // Download single file with correct name and extension
      // Use both formats for maximum compatibility
      const encodedFilename = encodeURIComponent(fileName);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFilename}`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      const fileStream = fsSync.createReadStream(fullPath);
      fileStream.pipe(res);
    }
  } catch (error) {
    console.error('Error downloading:', error);
    res.status(500).json({ error: 'Failed to download' });
  }
});

// Stream video with range support
app.get('/api/stream', async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const fullPath = path.join(UPLOAD_DIR, filePath);
    
    // Security check
    if (!fullPath.startsWith(UPLOAD_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fsSync.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fsSync.statSync(fullPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Detect content type based on file extension
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.ogv': 'video/ogg',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.flv': 'video/x-flv',
      '.wmv': 'video/x-ms-wmv'
    };
    const contentType = mimeTypes[ext] || 'video/mp4';

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      const fileStream = fsSync.createReadStream(fullPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      };
      
      res.writeHead(206, head);
      fileStream.pipe(res);
    } else {
      // No range, send entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      };
      
      res.writeHead(200, head);
      fsSync.createReadStream(fullPath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

// Generate thumbnail
app.get('/api/thumbnail', async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const fullPath = path.join(UPLOAD_DIR, filePath);
    
    // Security check
    if (!fullPath.startsWith(UPLOAD_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fsSync.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
    const isVideo = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv'].includes(ext);

    if (isImage) {
      // Generate image thumbnail using sharp
      const thumbnail = await sharp(fullPath)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      res.send(thumbnail);
    } else if (isVideo) {
      // Extract video thumbnail using ffmpeg
      const thumbnailPath = path.join(UPLOAD_DIR, '.thumbnails', `${path.basename(fullPath)}.jpg`);
      const thumbnailDir = path.dirname(thumbnailPath);
      
      // Create thumbnails directory if it doesn't exist
      if (!fsSync.existsSync(thumbnailDir)) {
        fsSync.mkdirSync(thumbnailDir, { recursive: true });
      }

      // Check if thumbnail already exists
      if (fsSync.existsSync(thumbnailPath)) {
        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400');
        fsSync.createReadStream(thumbnailPath).pipe(res);
      } else {
        // Generate thumbnail from video
        ffmpeg(fullPath)
          .screenshots({
            timestamps: ['00:00:01'],
            filename: path.basename(thumbnailPath),
            folder: thumbnailDir,
            size: '200x200'
          })
          .on('end', () => {
            res.set('Content-Type', 'image/jpeg');
            res.set('Cache-Control', 'public, max-age=86400');
            fsSync.createReadStream(thumbnailPath).pipe(res);
          })
          .on('error', (err) => {
            console.error('Error generating video thumbnail:', err);
            res.status(500).json({ error: 'Failed to generate thumbnail' });
          });
      }
    } else {
      res.status(400).json({ error: 'File type not supported for thumbnails' });
    }
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    res.status(500).json({ error: 'Failed to generate thumbnail' });
  }
});

// Create folder
app.post('/api/folder', async (req, res) => {
  try {
    const { path: folderPath, name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    
    const basePath = folderPath || '';
    if (!isValidPath(basePath)) {
      return res.status(403).json({ error: 'Invalid path' });
    }
    
    const fullPath = path.join(UPLOAD_DIR, basePath, name);
    
    await fs.mkdir(fullPath, { recursive: true });
    
    res.json({ success: true, path: path.relative(UPLOAD_DIR, fullPath) });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Delete file or folder
app.delete('/api/delete', async (req, res) => {
  try {
    const requestedPath = req.query.path || '';
    
    if (!isValidPath(requestedPath) || !requestedPath) {
      return res.status(403).json({ error: 'Invalid path' });
    }
    
    const fullPath = path.join(UPLOAD_DIR, requestedPath);
    
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting:', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// Rename file or folder
app.put('/api/rename', async (req, res) => {
  try {
    const { path: itemPath, newName } = req.body;
    
    if (!itemPath || !newName) {
      return res.status(400).json({ error: 'Path and new name are required' });
    }
    
    if (!isValidPath(itemPath)) {
      return res.status(403).json({ error: 'Invalid path' });
    }
    
    const fullPath = path.join(UPLOAD_DIR, itemPath);
    const newPath = path.join(path.dirname(fullPath), newName);
    
    await fs.rename(fullPath, newPath);
    
    res.json({ success: true, newPath: path.relative(UPLOAD_DIR, newPath) });
  } catch (error) {
    console.error('Error renaming:', error);
    res.status(500).json({ error: 'Failed to rename' });
  }
});

// Move file or folder
app.post('/api/move', async (req, res) => {
  try {
    const { sourcePath, destinationPath } = req.body;
    
    if (!sourcePath || !destinationPath) {
      return res.status(400).json({ error: 'Source and destination paths are required' });
    }
    
    if (!isValidPath(sourcePath) || !isValidPath(destinationPath)) {
      return res.status(403).json({ error: 'Invalid path' });
    }
    
    const fullSourcePath = path.join(UPLOAD_DIR, sourcePath);
    const fullDestPath = path.join(UPLOAD_DIR, destinationPath, path.basename(sourcePath));
    
    await fs.rename(fullSourcePath, fullDestPath);
    
    res.json({ success: true, newPath: path.relative(UPLOAD_DIR, fullDestPath) });
  } catch (error) {
    console.error('Error moving:', error);
    res.status(500).json({ error: 'Failed to move' });
  }
});

// Copy file or folder
app.post('/api/copy', async (req, res) => {
  try {
    const { sourcePath, destinationPath } = req.body;
    
    if (!sourcePath || !destinationPath) {
      return res.status(400).json({ error: 'Source and destination paths are required' });
    }
    
    if (!isValidPath(sourcePath) || !isValidPath(destinationPath)) {
      return res.status(403).json({ error: 'Invalid path' });
    }
    
    const fullSourcePath = path.join(UPLOAD_DIR, sourcePath);
    const fileName = path.basename(sourcePath);
    const fullDestPath = path.join(UPLOAD_DIR, destinationPath, fileName);
    
    const stats = await fs.stat(fullSourcePath);
    
    if (stats.isDirectory()) {
      await fs.cp(fullSourcePath, fullDestPath, { recursive: true });
    } else {
      await fs.copyFile(fullSourcePath, fullDestPath);
    }
    
    res.json({ success: true, newPath: path.relative(UPLOAD_DIR, fullDestPath) });
  } catch (error) {
    console.error('Error copying:', error);
    res.status(500).json({ error: 'Failed to copy' });
  }
});

// Search files
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const searchPath = req.query.path || '';
    
    if (!isValidPath(searchPath)) {
      return res.status(403).json({ error: 'Invalid path' });
    }
    
    const results = [];
    
    async function searchDirectory(dirPath, relativePath) {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const relPath = path.join(relativePath, item);
        
        if (item.toLowerCase().includes(query.toLowerCase())) {
          const stats = await getFileStats(itemPath, relPath);
          results.push(stats);
        }
        
        const stats = await fs.stat(itemPath);
        if (stats.isDirectory()) {
          await searchDirectory(itemPath, relPath);
        }
      }
    }
    
    const fullPath = path.join(UPLOAD_DIR, searchPath);
    await searchDirectory(fullPath, searchPath);
    
    res.json({ results, query });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`File Manager server running on http://localhost:${PORT}`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
});
