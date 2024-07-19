import express from 'express';
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Helper function to generate file path
const getFilePath = (type) => path.join(__dirname, 'downloads', `${Date.now()}.${type}`);

// Helper function to validate file size
const validateFile = (filePath) => fs.statSync(filePath).size > 0;

// Serve static files from 'downloads' directory
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Endpoint to search, download MP3 and return info
app.get('/api/mp3', async (req, res) => {
    const { name } = req.query;

    if (!name) {
        console.error('No name provided for MP3 download');
        return res.status(400).json({ error: 'No name provided for MP3 download' });
    }

    try {
        console.log(`Searching for MP3 for: ${name}`);
        const searchResults = await ytsr(name, { limit: 1 });
        
        if (searchResults.items.length === 0) {
            console.error('No results found for the given name');
            return res.status(404).json({ error: 'No results found for the given name' });
        }

        const video = searchResults.items[0];
        const videoUrl = video.url;
        console.log(`Video URL found: ${videoUrl}`);

        const filePath = getFilePath('mp3');
        console.log(`Downloading MP3 from ${videoUrl} to ${filePath}`);
        const stream = ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' });

        const fileStream = fs.createWriteStream(filePath);
        stream.pipe(fileStream)
            .on('finish', () => {
                if (!validateFile(filePath)) {
                    console.error('MP3 file is empty');
                    fs.unlinkSync(filePath);
                    return res.status(500).json({ error: 'MP3 file is empty' });
                }

                console.log(`MP3 download completed: ${filePath}`);
                res.json({
                    message: 'MP3 download completed',
                    downloadLink: `/downloads/${path.basename(filePath)}`,
                    videoInfo: {
                        title: video.title,
                        channel: video.author.name,
                        thumbnail: video.thumbnail,
                        duration: video.duration
                    }
                });
                // Clean up file after response
                fs.unlinkSync(filePath);
            })
            .on('error', (err) => {
                console.error('Error downloading MP3', err.message);
                res.status(500).json({ error: 'Error downloading MP3', details: err.message });
            });
    } catch (err) {
        console.error('Error during MP3 download', err.message);
        res.status(500).json({ error: 'Error during MP3 download', details: err.message });
    }
});

// Endpoint to search and return MP4 link
app.get('/link/mp4', async (req, res) => {
    const { name } = req.query;

    if (!name) {
        console.error('No name provided for MP4 link');
        return res.status(400).json({ error: 'No name provided for MP4 link' });
    }

    try {
        console.log(`Searching for MP4 for: ${name}`);
        const searchResults = await ytsr(name, { limit: 1 });
        
        if (searchResults.items.length === 0) {
            console.error('No results found for the given name');
            return res.status(404).json({ error: 'No results found for the given name' });
        }

        const video = searchResults.items[0];
        const videoUrl = video.url;
        console.log(`Video URL found: ${videoUrl}`);

        res.json({
            message: 'Video link found',
            downloadLink: videoUrl,
            videoInfo: {
                title: video.title,
                channel: video.author.name,
                thumbnail: video.thumbnail,
                duration: video.duration
            }
        });
    } catch (err) {
        console.error('Error during MP4 link retrieval', err.message);
        res.status(500).json({ error: 'Error during MP4 link retrieval', details: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
