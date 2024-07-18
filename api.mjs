import express from 'express';
import fs from 'fs';
import { randomBytes } from 'crypto';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import yts from 'yt-search';
import path from 'path';
import { fileURLToPath } from 'url';

// Definir variável de ambiente para desativar atualizações do ytdl-core
process.env.YTDL_NO_UPDATE = '1';

// Definir __dirname para módulos ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 1000;

// Garantir que o diretório de áudio exista
const audioDir = path.join(__dirname, 'audio');
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir);
    console.log('Diretório de áudio criado:', audioDir);
} else {
    console.log('Diretório de áudio já existe:', audioDir);
}

class YT {
    static async search(query) {
        try {
            const searchResults = await yts(query);
            return searchResults.videos;
        } catch (error) {
            console.error('Erro ao pesquisar vídeos no YouTube:', error);
            throw new Error('Erro ao pesquisar vídeos no YouTube');
        }
    }

  static async downloadMusic(url) {
    try {
        console.log(`Iniciando download do vídeo: ${url}`);
        const stream = ytdl(url, { 
            filter: 'audioonly',
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Connection': 'keep-alive',
                }
            }
        });
        const songPath = path.join(audioDir, `${randomBytes(3).toString('hex')}.mp3`);
        console.log(`Salvando áudio em: ${songPath}`);

        await new Promise((resolve, reject) => {
            ffmpeg(stream)
                .audioBitrate(128)
                .save(songPath)
                .on('end', () => {
                    console.log('Download e conversão finalizados.');
                    resolve(songPath);
                })
                .on('error', (err) => {
                    console.error('Erro ao converter o vídeo:', err);
                    reject(new Error('Erro ao converter o vídeo'));
                });
        });

        return songPath;
    } catch (error) {
        console.error('Erro ao baixar música:', error);
        throw new Error('Erro ao baixar música');
    }
  }
}

const apiInfo = {
    mensagem: 'Bem-vindo à API de download de músicas do YouTube',
    instrucoes: 'Para baixar uma música, utilize os endpoints /api/download/mp3 ou /api/link/mp3.',
    creditos: 'Desenvolvido por Luanzin Dev',
    proibido: 'Proibida a venda ou comercialização desta API.'
};

app.get('/', (req, res) => {
    res.json(apiInfo);
});

app.get('/api/download/mp3', async (req, res) => {
    let { url, name } = req.query;
    try {
        if (!url && !name) {
            throw new Error('Parâmetro URL ou nome é obrigatório');
        }

        url = url ? decodeURIComponent(url) : undefined;
        name = name ? decodeURIComponent(name) : undefined;

        let downloadUrl = url;
        let videoInfo = {};

        if (name) {
            console.log(`Pesquisando vídeo para o nome: ${name}`);
            const searchResults = await YT.search(name);
            if (searchResults.length === 0) {
                throw new Error('Nenhum resultado encontrado para o nome fornecido');
            }
            downloadUrl = `https://www.youtube.com/watch?v=${searchResults[0].videoId}`;
            videoInfo = searchResults[0];
        } else {
            console.log(`Obtendo informações do vídeo para URL: ${url}`);
            const videoDetails = await ytdl.getInfo(url);
            videoInfo = {
                title: videoDetails.videoDetails.title,
                thumbnail: videoDetails.videoDetails.thumbnails[0].url,
                views: videoDetails.videoDetails.viewCount,
                uploadDate: videoDetails.videoDetails.uploadDate,
                lengthSeconds: videoDetails.videoDetails.lengthSeconds
            };
        }

        const songPath = await YT.downloadMusic(downloadUrl);
        const fileName = path.basename(songPath);
        const downloadUrlResponse = `http://${req.headers.host}/audio/${fileName}`;

        res.json({ downloadUrl: downloadUrlResponse, videoInfo });
    } catch (error) {
        console.error('Erro ao processar solicitação:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/audio/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(audioDir, fileName);
    res.download(filePath, 'download.mp3', (err) => {
        if (err) {
            console.error('Erro ao baixar arquivo:', err);
            res.status(500).json({ error: 'Falha ao baixar o arquivo' });
        } else {
            fs.unlinkSync(filePath);
        }
    });
});

app.get('/api/link/mp3', async (req, res) => {
    let { url, name } = req.query;
    try {
        if (!url && !name) {
            throw new Error('Parâmetro URL ou nome é obrigatório');
        }

        url = url ? decodeURIComponent(url) : undefined;
        name = name ? decodeURIComponent(name) : undefined;

        let downloadUrl = url;
        let videoInfo = {};

        if (name) {
            console.log(`Pesquisando vídeo para o nome: ${name}`);
            const searchResults = await YT.search(name);
            if (searchResults.length === 0) {
                throw new Error('Nenhum resultado encontrado para o nome fornecido');
            }
            downloadUrl = `https://www.youtube.com/watch?v=${searchResults[0].videoId}`;
            videoInfo = searchResults[0];
        } else {
            console.log(`Obtendo informações do vídeo para URL: ${url}`);
            const videoDetails = await ytdl.getInfo(url);
            videoInfo = {
                title: videoDetails.videoDetails.title,
                thumbnail: videoDetails.videoDetails.thumbnails[0].url,
                views: videoDetails.videoDetails.viewCount,
                uploadDate: videoDetails.videoDetails.uploadDate,
                lengthSeconds: videoDetails.videoDetails.lengthSeconds
            };
        }

        const songPath = await YT.downloadMusic(downloadUrl);
        const fileName = path.basename(songPath);
        const downloadUrlResponse = `http://${req.headers.host}/audio/${fileName}`;

        res.json({ downloadUrl: downloadUrlResponse, videoInfo });
    } catch (error) {
        console.error('Erro ao processar solicitação:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/link', async (req, res) => {
    let { url, name } = req.query;
    try {
        if (!url && !name) {
            throw new Error('Parâmetro URL ou nome é obrigatório');
        }

        url = url ? decodeURIComponent(url) : undefined;
        name = name ? decodeURIComponent(name) : undefined;

        let downloadUrl = url;
        let videoInfo = {};

        if (name) {
            console.log(`Pesquisando vídeo para o nome: ${name}`);
            const searchResults = await YT.search(name);
            if (searchResults.length === 0) {
                throw new Error('Nenhum resultado encontrado para o nome fornecido');
            }
            downloadUrl = `https://www.youtube.com/watch?v=${searchResults[0].videoId}`;
            videoInfo = searchResults[0];
        } else {
            console.log(`Obtendo informações do vídeo para URL: ${url}`);
            const videoDetails = await ytdl.getInfo(url);
            videoInfo = {
                title: videoDetails.videoDetails.title,
                thumbnail: videoDetails.videoDetails.thumbnails[0].url,
                views: videoDetails.videoDetails.viewCount,
                uploadDate: videoDetails.videoDetails.uploadDate,
                lengthSeconds: videoDetails.videoDetails.lengthSeconds
            };
        }

        res.json({ downloadUrl, videoInfo });
    } catch (error)console.error('Erro ao processar solicitação:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor está rodando na porta ${port}`);
});
