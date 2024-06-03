import express from 'express';
import { randomBytes } from 'crypto';
import ytdl from 'youtubedl-core';
import yts from 'youtube-yts';
import * as ytM from 'node-youtube-music';

const app = express();
const port = process.env.PORT || 3000;

class YT {
    static isYTUrl = (url) => ytIdRegex.test(url);
    static getVideoID = (url) => ytIdRegex.exec(url)[1];
    static search = async (query, options = {}) => {
        const search = await yts.search({ query, hl: 'id', gl: 'ID', ...options });
        return search.videos;
    }
    static searchTrack = (query) => {
        return new Promise(async (resolve, reject) => {
            try {
                let ytMusic = await ytM.searchMusics(query);
                let result = ytMusic.map(track => ({
                    isYtMusic: true,
                    title: `${track.title} - ${track.artists.map(x => x.name).join(' ')}`,
                    artist: track.artists.map(x => x.name).join(' '),
                    id: track.youtubeId,
                    url: 'https://youtu.be/' + track.youtubeId,
                    album: track.album,
                    duration: { seconds: track.duration.totalSeconds, label: track.duration.label },
                    image: track.thumbnailUrl.replace('w120-h120', 'w600-h600')
                }));
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    }
    static downloadMusic = async (query) => {
        try {
            const getTrack = Array.isArray(query) ? query : await this.searchTrack(query);
            const search = getTrack[0];
            const videoInfo = await ytdl.getInfo('https://www.youtube.com/watch?v=' + search.id, { lang: 'id' });
            const songPath = `https://yourdomain.com/XliconMedia/audio/${randomBytes(3).toString('hex')}.mp3`; // Adjust the domain as needed
            return { meta: search, path: songPath, size: videoInfo.videoDetails.lengthSeconds };
import express from 'express';
import fs from 'fs';
import { randomBytes } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import ytdl from 'ytdl-core';
import yts from 'yt-search';
import * as ytM from 'youtube-music-api';

const app = express();
const port = process.env.PORT || 3000;

class YT {
    static isYTUrl = (url) => ytIdRegex.test(url);
    static getVideoID = (url) => ytIdRegex.exec(url)[1];
    static async WriteTags(filePath, Metadata) {
        // Implementação para escrever as tags do arquivo de áudio
        // Vou deixar essa parte para você adicionar
    }
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
            // Escrever tags no arquivo de áudio
            await this.WriteTags(songPath, {
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
});
                Title: search.title,
                Artist: search.artist,
                Image: search.image,
                Album: search.album,
                Year: videoInfo.videoDetails.publishDate.split('-')[0]
            });
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

import express from 'express';
import fs from 'fs';
import { randomBytes } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import ytdl from 'ytdl-core';
import yts from 'yt-search';
import * as ytM from 'youtube-music-api';

const app = express();
const port = process.env.PORT || 3000;

class YT {
    static isYTUrl = (url) => ytIdRegex.test(url);
    static getVideoID = (url) => ytIdRegex.exec(url)[1];
    static async WriteTags(filePath, Metadata) {
        // Implementação para escrever as tags do arquivo de áudio
        // Vou deixar essa parte para você adicionar
    }
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
