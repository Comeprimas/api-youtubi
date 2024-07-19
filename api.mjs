import express from 'express';
import ytdl from 'youtubedl-core';
import { searchMusics } from 'node-youtube-music'; // Tentando uma importação específica
import ffmpeg from 'fluent-ffmpeg';
import NodeID3 from 'node-id3';
import fs from 'fs';
import { randomBytes } from 'crypto';

const app = express();
const port = 3000;

const ytIdRegex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/;

class YT {
    static isYTUrl = (url) => ytIdRegex.test(url);

    static getVideoID = (url) => {
        if (!this.isYTUrl(url)) throw new Error('is not YouTube URL');
        return ytIdRegex.exec(url)[1];
    };

    static WriteTags = async (filePath, Metadata) => {
        NodeID3.write(
            {
                title: Metadata.Title,
                artist: Metadata.Artist,
                originalArtist: Metadata.Artist,
                image: {
                    mime: 'jpeg',
                    type: {
                        id: 3,
                        name: 'front cover',
                    },
                    imageBuffer: (await fetchBuffer(Metadata.Image)).buffer,
                    description: `Cover of ${Metadata.Title}`,
                },
                album: Metadata.Album,
                year: Metadata.Year || ''
            },
            filePath
        );
    };

    static searchTrack = async (query) => {
        try {
            let ytMusic = await searchMusics(query); // Usando a importação específica
            return ytMusic.map(track => ({
                isYtMusic: true,
                title: `${track.title} - ${track.artists.map(x => x.name).join(' ')}`,
                artist: track.artists.map(x => x.name).join(' '),
                id: track.youtubeId,
                url: 'https://youtu.be/' + track.youtubeId,
                album: track.album,
                duration: {
                    seconds: track.duration.totalSeconds,
                    label: track.duration.label
                },
                image: track.thumbnailUrl.replace('w120-h120', 'w600-h600')
            }));
        } catch (error) {
            throw error;
        }
    };

    static downloadMusic = async (query) => {
        try {
            const getTrack = await this.searchTrack(query);
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

            return {
                meta: search,
                path: file,
                size: fs.statSync(songPath).size
            };
        } catch (error) {
            throw new Error(error);
        }
    };
}

app.get('/api/mp3', async (req, res) => {
    const { name } = req.query;
    if (!name) {
        return res.status(400).json({ error: 'Name parameter is required' });
    }
    try {
        const result = await YT.downloadMusic(name);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`API is running on http://localhost:${port}`);
});

export default app;
