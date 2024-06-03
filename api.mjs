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
        } catch (error) {
            throw new Error(error);
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
        const metadata = {
            title: result.meta.title,
            artist: result.meta.artist,
            url: result.path
        };
        // Assuming loli.sendMessage takes metadata as input to send the audio message
        loli.sendMessage(from, { audio: metadata });
        res.json({ message: 'Audio sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
