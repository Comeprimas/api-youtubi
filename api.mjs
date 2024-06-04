import express from 'express';
import fs from 'fs';
import { randomBytes } from 'crypto';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import yts from 'yt-search';

const app = express();
const port = process.env.PORT || 3000;

class YT {
    static async search(query) {
        const searchResults = await yts(query);
        return searchResults.videos;
    }

    static async downloadMusic(url) {
        try {
            const stream = ytdl(url, { filter: 'audioonly' });
            const songPath = `./audio/${randomBytes(3).toString('hex')}.mp3`;
            await new Promise((resolve, reject) => {
                ffmpeg(stream)
                    .audioBitrate(128)
                    .save(songPath)
                    .on('end', resolve)
                    .on('error', reject);
            });
            return { path: songPath, size: fs.statSync(songPath).size };
        } catch (error) {
            throw error;
        }
    }
}

app.get('/api/download/mp3', async (req, res) => {
    const { url, name } = req.query;
    if (!url && !name) {
        return res.status(400).json({ error: 'URL or name parameter is required' });
    }
    try {
        let downloadUrl = url;
        if (name) {
            const searchResults = await YT.search(name);
            if (searchResults.length === 0) {
                return res.status(404).json({ error: 'No results found for the given name' });
            }
            downloadUrl = `https://www.youtube.com/watch?v=${searchResults[0].videoId}`;
        }
        const result = await YT.downloadMusic(downloadUrl);
        res.download(result.path, 'download.mp3', (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to download file' });
            }
            fs.unlinkSync(result.path);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
