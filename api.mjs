import express from 'express';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';

const app = express();
const port = process.env.PORT || 3000;

class YT {
    static async downloadMusic(url) {
        try {
            const stream = ytdl(url, { filter: 'audioonly' });
            return new Promise((resolve, reject) => {
                ffmpeg(stream)
                    .audioBitrate(128)
                    .format('mp3') // Define o formato como mp3
                    .on('end', () => resolve())
                    .on('error', reject)
                    .pipe();
            });
        } catch (error) {
            throw new Error('Erro ao baixar música');
        }
    }
}

app.get('/api/download/mp3', async (req, res) => {
    const { url } = req.query;
    try {
        if (!url) {
            throw new Error('Parâmetro URL é obrigatório');
        }

        const songStream = await YT.downloadMusic(url);
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'attachment; filename="download.mp3"'
        });
        songStream.pipe(res); // Envia o arquivo de áudio diretamente como uma resposta para o cliente
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor está rodando na porta ${port}`);
});
