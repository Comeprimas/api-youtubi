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
            return { title: 'Música', downloadUrl: songPath };
        } catch (error) {
            throw new Error('Erro ao baixar música');
        }
    }
}

app.get('/api/download/mp3', async (req, res) => {
    const { url, name } = req.query;
    if (!url && !name) {
        return res.status(400).json({ success: false, error: 'Parâmetro URL ou nome é obrigatório' });
    }
    try {
        let downloadUrl = url;
        if (name) {
            const searchResults = await YT.search(name);
            if (searchResults.length === 0) {
                return res.status(404).json({ success: false, error: 'Nenhum resultado encontrado para o nome fornecido' });
            }
            downloadUrl = `https://www.youtube.com/watch?v=${searchResults[0].videoId}`;
        }
        const result = await YT.downloadMusic(downloadUrl);
        res.status(200).json({ success: true, message: 'Arquivo baixado com sucesso', title: 'Música', downloadUrl: result.downloadUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
});

app.listen(port, () => {
    console.log(`Servidor está rodando na porta ${port}`);
});
