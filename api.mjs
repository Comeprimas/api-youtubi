import express from 'express';
import fs from 'fs';
import { randomBytes } from 'crypto';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';

const app = express();
const port = process.env.PORT || 3000;

class YT {
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
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }
    try {
        const result = await YT.downloadMusic(url);
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
