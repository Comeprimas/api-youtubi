import express from 'express';
import ytdl from 'ytdl-core';
import yts from 'yt-search';

const app = express();
const port = process.env.PORT || 9999;

app.use((req, res, next) => {
    console.log(`Request Method: ${req.method}, Request URL: ${req.url}`);
    next();
});

class YT {
    static async search(query) {
        console.log(`Searching for: ${query}`);
        try {
            const searchResults = await yts(query);
            console.log(`Search results: ${JSON.stringify(searchResults.videos)}`);
            return searchResults.videos;
        } catch (error) {
            console.error('Error during search:', error);
            throw new Error('Erro ao pesquisar vídeos no YouTube');
        }
    }

    static async getVideoInfo(url) {
        console.log(`Getting video info from URL: ${url}`);
        try {
            const info = await ytdl.getInfo(url);
            const details = info.videoDetails;
            const formats = info.formats;
            
            const audioFormats = formats.filter(format => format.mimeType.startsWith('audio/'));
            const videoFormats = formats.filter(format => format.container === 'mp4' && format.hasVideo && format.hasAudio);
            
            const bestAudio = audioFormats.reduce((prev, curr) => (prev.audioBitrate > curr.audioBitrate ? prev : curr), audioFormats[0]);
            const bestVideo = videoFormats[0];
            
            return {
                title: details.title,
                thumbnail: details.thumbnails[0].url,
                views: details.viewCount,
                uploadDate: details.uploadDate,
                lengthSeconds: details.lengthSeconds,
                bestAudioUrl: bestAudio ? bestAudio.url : null,
                bestVideoUrl: bestVideo ? bestVideo.url : null
            };
        } catch (error) {
            console.error('Error getting video info:', error);
            throw new Error('Erro ao obter informações do vídeo');
        }
    }
}

app.get('/api/download/mp3', async (req, res) => {
    const { name } = req.query;
    console.log(`Received query - Name: ${name}`);
    
    try {
        if (!name) {
            console.error('Error: Name parameter is required');
            throw new Error('Parâmetro nome é obrigatório');
        }

        console.log(`Searching video by name: ${name}`);
        const searchResults = await YT.search(name);
        if (searchResults.length === 0) {
            console.error('Error: No results found for the given name');
            throw new Error('Nenhum resultado encontrado para o nome fornecido');
        }
        const videoUrl = `https://www.youtube.com/watch?v=${searchResults[0].videoId}`;
        const videoInfo = await YT.getVideoInfo(videoUrl);

        // Configurar cabeçalho para download do arquivo
        res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
        res.setHeader('Content-Type', 'audio/mp3');

        // Enviar o áudio diretamente para o cliente
        ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' }).pipe(res);
        
        // Enviar informações do vídeo como JSON após o início do download
        res.on('finish', () => {
            console.log(`Sending response with video info: ${JSON.stringify(videoInfo)}`);
            res.json({ videoInfo });
        });

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/download/mp4', async (req, res) => {
    const { name } = req.query;
    console.log(`Received query - Name: ${name}`);
    
    try {
        if (!name) {
            console.error('Error: Name parameter is required');
            throw new Error('Parâmetro nome é obrigatório');
        }

        console.log(`Searching video by name: ${name}`);
        const searchResults = await YT.search(name);
        if (searchResults.length === 0) {
            console.error('Error: No results found for the given name');
            throw new Error('Nenhum resultado encontrado para o nome fornecido');
        }
        const videoUrl = `https://www.youtube.com/watch?v=${searchResults[0].videoId}`;
        const videoInfo = await YT.getVideoInfo(videoUrl);

        // Configurar cabeçalho para download do arquivo
        res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
        res.setHeader('Content-Type', 'video/mp4');

        // Enviar o vídeo diretamente para o cliente
        ytdl(videoUrl, { filter: 'videoandaudio', quality: 'highest' }).pipe(res);
        
        // Enviar informações do vídeo como JSON após o início do download
        res.on('finish', () => {
            console.log(`Sending response with video info: ${JSON.stringify(videoInfo)}`);
            res.json({ videoInfo });
        });

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor está rodando na porta ${port}`);
});
