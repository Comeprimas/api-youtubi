import express from 'express';
import fs from 'fs';
import { randomBytes } from 'crypto';
import ytdl from 'ytdl-core';
import yts from 'yt-search';
import * as ytM from 'youtube-music-api';

const app = express();
const port = process.env.PORT || 3000;

class YT {
    static async search(query, options = {}) {
        const searchResults = await yts(query);
        return searchResults.videos;
    }

    static async searchTrack(query) {
        try {
            const ytMusic = await ytM.search(query);
            const result = ytMusic.items.map(track => ({
                isYtMusic: true,
                title: `${track.title} - ${track.artist}`,
                artist: track.artist,
                id: track.videoId,
                url: 'https://youtu.be/' + track.videoId,
                album: track.album,
                duration: { seconds: track.durationInSeconds, label: track.duration },
                image: track.bestThumbnail.url
            }));
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async downloadMusic(query) {
        try {
            const getTrack = Array.isArray(query) ? query : await this.searchTrack(query);
            const search = getTrack[0];
            const videoInfo = await ytdl.getInfo(search.url);
            const stream = ytdl(search.url, { filter: 'audioonly' });
            const songPath = `./audio/${randomBytes(3).toString('hex')}.mp3`;
            await new Promise((resolve, reject) => {
                ffmpeg(stream)
                    .audioBitrate(128)
                    .save(songPath)
                    .on('end', resolve)
                    .on('error', reject);
            });
            // Escrever tags no arquivo de áudio (se necessário)
            return { meta: search, path: songPath, size: fs.statSync(songPath).size };
        } catch (error) {
            throw error;
        }
    }

    static async mp4(query, quality = 'highest') {
        try {
            const videoInfo = await ytdl.getInfo(query);
            const formats = ytdl.filterFormats(videoInfo.formats, 'videoandaudio');
            const format = ytdl.chooseFormat(formats, { quality });
            return {
                title: videoInfo.videoDetails.title,
                thumb: videoInfo.videoDetails.thumbnails.slice(-1)[0],
                date: videoInfo.videoDetails.publishDate,
                duration: videoInfo.videoDetails.lengthSeconds,
                channel: videoInfo.videoDetails.author.name,
                quality: format.qualityLabel,
                contentLength: format.contentLength,
                description: videoInfo.videoDetails.description,
                videoUrl: format.url
            };
        } catch (error) {
            throw error;
        }
    }
}

const ytIdRegex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/;

app.get('/search', async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }
    try {
        const results = await YT.search(query);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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
            // Arquivo é excluído após o download bem-sucedido
            fs.unlinkSync(result.path);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/download/mp4', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }
    try {
        const result = await YT.mp4(url);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});eturn result;
