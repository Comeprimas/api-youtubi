import express from 'express';
import fs from 'fs';
import { randomBytes } from 'crypto';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import yts from 'yt-search';

const app = express();
const port = process.env.PORT || 3000;

// Verifica se a pasta 'audio' existe e a cria se não existir
const audioFolderPath = './audio';
if (!fs.existsSync(audioFolderPath)) {
    fs.mkdirSync(audioFolderPath);
}

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
                    .on('end', resolve)
                    .on('error', reject);
            });
            return { path: songPath, size: fs.statSync(songPath).size };
        } catch (error) {
            throw new Error('Erro ao baixar música');
        }
    }
}

app.get('/api/download/mp3', async (req, res) => {
    const { url, name } = req.query;
    if (!url && !name) {
        return res.status(400).json({ error: 'Parâmetro URL ou nome é obrigatório' });
    }
    try {
        let downloadUrl = url;
        if (name) {
            const searchResults = await YT.search(name);
            if (searchResults.length === 0) {
                return res.status(404).json({ error: 'Nenhum resultado encontrado para o nome fornecido' });
            }
            downloadUrl = `https://www.youtube.com/watch?v=${searchResults[0].videoId}`;
        }
        const result = await YT.downloadMusic(downloadUrl);
        res.download(result.path, 'download.mp3', (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Falha ao baixar o arquivo' });
            }
            fs.unlinkSync(result.path);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.listen(port, () => {
    console.log(`Servidor está rodando na porta ${port}`);
});
