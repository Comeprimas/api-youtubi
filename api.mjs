import express from 'express';
import fs from 'fs';
import { randomBytes } from 'crypto';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import yts from 'yt-search';

const app = express();
const port = process.env.PORT || 1000;

class YT {
    static async search(query) {
        try {
            const searchResults = await yts(query);
            return searchResults.videos;
        } catch (error) {
            throw new Error('Erro ao pesquisar vídeos no YouTube');
        }
    }

    static async downloadMusic(url) {
        try {
            const stream = ytdl(url, { filter: 'audioonly' });
            const songPath = `./audio/${randomBytes(3).toString('hex')}.mp3`;
            await new Promise((resolve, reject) => {
                ffmpeg(stream)
                    .audioBitrate(128)
                    .save(songPath)
                    .on('end', () => resolve(songPath))
                    .on('error', reject);
            });
            return songPath;
        } catch (error) {
            throw new Error('Erro ao baixar música');
        }
    }
}

app.get('/api/download/mp3', async (req, res) => {
    let { url, name } = req.query;
    try {
        if (!url && !name) {
            throw new Error('Parâmetro URL ou nome é obrigatório');
        }

        url = url ? encodeURI(url) : undefined;
        name = name ? encodeURI(name) : undefined;

        let videoUrl = url;
        if (name) {
            const searchResults = await YT.search(name);
            if (searchResults.length === 0) {
                throw new Error('Nenhum resultado encontrado para o nome fornecido');
            }
            videoUrl = `https://www.youtube.com/watch?v=${searchResults[0].videoId}`;
        }

        const songPath = await YT.downloadMusic(videoUrl);
        const fileName = songPath.split('/').pop();
        const fileDownloadUrl = `http://${req.headers.host}/audio/${fileName}`;
        res.json({ downloadUrl: fileDownloadUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/audio/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = `./audio/${fileName}`;
    res.download(filePath, 'download.mp3', (err) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Falha ao baixar o arquivo' });
        } else {
            fs.unlinkSync(filePath); // Excluir o arquivo após o download
        }
    });
});

app.listen(port, () => {
    console.log(`Servidor está rodando na porta ${port}`);
});
