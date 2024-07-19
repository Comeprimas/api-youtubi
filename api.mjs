import express from 'express';
import fs from 'fs';
import path from 'path';
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const downloadsDir = path.join(__dirname, 'downloads');

// Garante que o diretório de downloads exista
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

app.use('/downloads', express.static(downloadsDir));

app.get('/api/mp3', async (req, res) => {
    const name = req.query.name;
    if (!name) {
        console.error('No name provided');
        return res.status(400).json({ error: 'No name provided' });
    }

    console.log(`Searching for MP3 for: ${name}`);

    try {
        const results = await ytsr(name, { limit: 1 });
        const video = results.items.find(item => item.type === 'video');

        if (!video) {
            console.error(`No results found for: ${name}`);
            return res.status(404).json({ error: 'No results found' });
        }

        const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
        console.log(`Video URL found: ${videoUrl}`);

        const id = uuidv4();
        const filePath = path.join(downloadsDir, `${id}.mp3`);
        const writeStream = fs.createWriteStream(filePath);

        console.log(`Downloading MP3 from ${videoUrl} to ${filePath}`);

        const stream = ytdl(videoUrl, { filter: 'audioonly' });

        stream.pipe(writeStream);

        stream.on('end', async () => {
            console.log(`Successfully downloaded MP3: ${filePath}`);

            res.download(filePath, `${id}.mp3`, async (err) => {
                if (err) {
                    console.error(`Error sending file: ${err.message}`);
                    return res.status(500).json({ error: 'Error sending file', details: err.message });
                }

                console.log(`File sent successfully: ${filePath}`);

                try {
                    await fs.promises.unlink(filePath);
                    console.log(`File deleted successfully: ${filePath}`);
                } catch (deleteErr) {
                    console.error(`Error deleting file: ${deleteErr.message}`);
                }
            });
        });

        stream.on('error', (err) => {
            console.error(`Error downloading MP3: ${err.message}`);
            return res.status(500).json({ error: 'Error downloading MP3', details: err.message });
        });
    } catch (err) {
        console.error(`Error processing request: ${err.message}`);
        return res.status(500).json({ error: 'Error processing request', details: err.message });
    }
});

app.get('/link/mp3', async (req, res) => {
    const name = req.query.name;
    if (!name) {
        console.error('No name provided');
        return res.status(400).json({ error: 'No name provided' });
    }

    console.log(`Searching for MP3 link for: ${name}`);

    try {
        const results = await ytsr(name, { limit: 1 });
        const video = results.items.find(item => item.type === 'video');

        if (!video) {
            console.error(`No results found for: ${name}`);
            return res.status(404).json({ error: 'No results found' });
        }

        console.log(`Video URL found: ${video.url}`);

        res.json({
            downloadLink: `/downloads/${video.id}.mp3`,
            title: video.title,
            description: video.description,
            thumbnail: video.bestThumbnail.url,
            views: video.views,
            duration: video.duration,
            author: video.author.name,
        });
    } catch (err) {
        console.error(`Error processing request: ${err.message}`);
        return res.status(500).json({ error: 'Error processing request', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
