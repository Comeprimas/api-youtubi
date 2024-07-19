#!/bin/bash

# Cria uma pasta para as dependências
mkdir -p dependencies
cd dependencies

# Clona os repositórios dos pacotes do GitHub
git clone https://github.com/fent/node-ytdl-core.git
git clone https://github.com/talmobi/yt-search.git
git clone https://github.com/joshghent/youtube-music-api.git

# Instala as dependências de cada pacote
cd node-ytdl-core && npm install && cd ..
cd yt-search && npm install && cd ..
cd youtube-music-api && npm install && cd ..

# Volta para o diretório raiz
cd ..

# Cria o package.json se não existir
if [ ! -f package.json ]; then
  npm init -y
fi

# Instala as dependências principais do npm
npm install axios express fluent-ffmpeg youtube-yts yt-search node-id3 ytsr node-youtube-music youtubedl-core youtube-music-api

echo "Todas as dependências foram instaladas com sucesso!"
