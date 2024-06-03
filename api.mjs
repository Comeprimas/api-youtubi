import express from 'express';
import fs from 'fs';
import { randomBytes } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import NodeID3 from 'node-id3';
import ytdl from 'youtubedl-core';
import yts from 'youtube-yts';
import * as ytM from 'node-youtube-music';

const app = express();
const port = process.env.PORT || 3000;

class YT {
    static isYTUrl = (url) => ytIdRegex.test(url);
    static getVideoID = (url) => ytIdRegex.exec(url)[1];
    static WriteTags = async (filePath, Metadata) => {
        NodeID3.write({
            title: Metadata.Title,
            artist: Metadata.Artist,
            originalArtist: Metadata.Artist,
            image: {
                mime: 'jpeg',
                type: { id: 3, name: 'front cover' },
                imageBuffer: (await fetchBuffer(Metadata.Image)).buffer,
                description: `Cover of ${Metadata.Title}`
            },
            album: Metadata.Album,
            year: Metadata.Year || ''
        }, filePath);
    }
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
            let stream = ytdl(search.id, { filter: 'audioonly', quality: 140 });
            let songPath = `./XliconMedia/audio/${randomBytes(3).toString('hex')}.mp3`;
            stream.on('error', (err) => console.log(err));
            const file = await new Promise((resolve) => {
                ffmpeg(stream)
                    .audioFrequency(44100)
                    .audioChannels(2)
                    .audioBitrate(128)
                    .audioCodec('libmp3lame')
                    .audioQuality(5)
                    .toFormat('mp3')
                    .save(songPath)
                    .on('end', () => resolve(songPath));
            });
            await this.WriteTags(file, {
                Title: search.title,
                Artist: search.artist,
                Image: search.image,
                Album: search.album,
                Year: videoInfo.videoDetails.publishDate.split('-')[0]
            });
            return { meta: search, path: file, size: fs.statSync(songPath).size };
        } catch (error) {
            throw new Error(error);
        }
    }
    static mp4 = async (query, quality = 134) => {
        try {
            if (!query) throw new Error('Video ID or YouTube Url is required');
            const videoId = this.isYTUrl(query) ? this.getVideoID(query) : query;
            const videoInfo = await ytdl.getInfo('https://www.youtube.com/watch?v=' + videoId, { lang: 'id' });
            const format = ytdl.chooseFormat(videoInfo.formats, { format: quality, filter: 'videoandaudio' });
            return {
                title: videoInfo.videoDetails.title,
                thumb: videoInfo.videoDetails.thumbnails.slice(-1)[0],
                date: videoInfo.videoDetails.publishDate,
                duration: videoInfo.videoDetails.lengthSeconds,
                channel: videoInfo.videoDetails.ownerChannelName,
                quality: format.qualityLabel,
                contentLength: format.contentLength,
                description: videoInfo.videoDetails.description,
                videoUrl: format.url
            };
        } catch (error) {
            throw error;
        }
    }
    static mp3 = async (url, metadata = {}, autoWriteTags = false) => {
        try {
            if (!url) throw new Error('Video ID or YouTube Url is required');
            url = this.isYTUrl(url) ? 'https://www.youtube.com/watch?v=' + this.getVideoID(url) : url;
            const { videoDetails } = await ytdl.getInfo(url, { lang: 'id' });
            let stream = ytdl(url, { filter: 'audioonly', quality: 140 });
            let songPath = `./XliconMedia/audio/${randomBytes(3).toString('hex')}.mp3`;
            let starttime;
            stream.once('response', () => { starttime = Date.now(); });
            stream.on('progress', (chunkLength, downloaded, total) => {
                const percent = downloaded / total;
                const downloadedMinutes = (Date.now() - starttime) / 1000 / 60;
                const estimatedDownloadTime = (downloadedMinutes / percent) - downloadedMinutes;
            });
            const file = await new Promise((resolve) => {
                ffmpeg(stream)
                    .audioFrequency(44100)
                    .audioChannels(2)
                    .audioBitrate(128)
                    .audioCodec('libmp3lame')
                    .audioQuality(5)
                    .toFormat('mp3')
                    .save(songPath)
                    .on('end', () => resolve(songPath));
            });
            if (Object.keys(metadata).length !== 0) {
                await this.WriteTags(file, metadata);
            }
            if (autoWriteTags) {
                await this.WriteTags(file, {
                    Title: videoDetails.title,
                    Album: videoDetails.author.name,
                    Year: videoDetails.publishDate.split('-')[0],
                    Image: videoDetails.thumbnails.slice(-1)[0].url
                });
            }
            return {
                meta: { title: videoDetails.title, channel: videoDetails.author.name, seconds: videoDetails.lengthSeconds, image: videoDetails.thumbnails.slice(-1)[0].url },
                path: file,
                size: fs.statSync(songPath).size
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
        const result = await YT.mp3(url);
        res.download(result.path, 'download.mp3', (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to download file' });
            }
            // File is deleted after successful download
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