from flask import Flask, request, send_file, jsonify
import yt_dlp
import os

app = Flask(__name__)

def search_video(query):
    ydl_opts = {'quiet': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            search_result = ydl.extract_info(f"ytsearch:{query}", download=False)['entries'][0]
            return search_result
        except Exception as e:
            print(f"Error searching video: {e}")
            return None

def download_video(url, format):
    ydl_opts = {
        'format': 'bestaudio/best' if format == 'mp3' else 'bestvideo+bestaudio',
        'outtmpl': f'%(id)s.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }] if format == 'mp3' else []
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            print(f"Downloaded info dict: {info_dict}")
            filename = ydl.prepare_filename(info_dict)
            if format == 'mp3':
                filename = filename.rsplit('.', 1)[0] + '.mp3'
            print(f"Final filename: {filename}")
            return filename, info_dict
    except Exception as e:
        print(f"Error downloading video: {e}")
        return None, None

@app.route('/')
def home():
    return """
    <h1>api-youtubii</h1>
    <p><strong>Descrição:</strong> Esta API permite que você baixe vídeos do YouTube em formato MP4 ou MP3.</p>
    <p><strong>Como usar:</strong></p>
    <ul>
        <li><code>GET /api/mp3?name=<em>nome_do_video</em></code> - Baixa o áudio do vídeo em formato MP3.</li>
        <li><code>GET /api/mp4?name=<em>nome_do_video</em></code> - Baixa o vídeo em formato MP4.</li>
        <li><code>GET /api/mp3?url=<em>url_do_video</em></code> - Baixa o áudio do vídeo em formato MP3 a partir da URL.</li>
        <li><code>GET /api/mp4?url=<em>url_do_video</em></code> - Baixa o vídeo em formato MP4 a partir da URL.</li>
    </ul>
    <p><strong>Informações:</strong> Proibido vender esta API.</p>
    <p><strong>Criador:</strong> Luanzin dev</p>
    """

@app.route('/link/', methods=['GET'])
def get_video_details():
    name = request.args.get('name')
    url = request.args.get('url')

    if not name and not url:
        return jsonify({"error": "Missing 'name' or 'url' parameter."}), 400

    if name:
        video_info = search_video(name)
        if not video_info:
            return jsonify({"error": "Video not found."}), 404
        url = video_info['webpage_url']
        video_details = {
            "resultado": {
                "título": video_info.get('title', 'N/A'),
                "thumb": video_info.get('thumbnail', 'N/A'),
                "canal": video_info.get('uploader', 'N/A'),
                "publicado": video_info.get('upload_date', 'N/A'),
                "visualizações": video_info.get('view_count', 'N/A'),
                "link": url
            }
        }
    elif url:
        video_info = download_video(url, 'mp3')[1]  # Dummy download to get info
        if not video_info:
            return jsonify({"error": "Failed to retrieve video details."}), 500
        video_details = {
            "resultado": {
                "título": video_info.get('title', 'N/A'),
                "thumb": video_info.get('thumbnail', 'N/A'),
                "canal": video_info.get('uploader', 'N/A'),
                "publicado": video_info.get('upload_date', 'N/A'),
                "visualizações": video_info.get('view_count', 'N/A'),
                "link": url
            }
        }

    return jsonify(video_details)

@app.route('/api/<format>', methods=['GET'])
def download(format):
    if format not in ['mp3', 'mp4']:
        return jsonify({"error": "Invalid format. Use 'mp3' or 'mp4'."}), 400

    name = request.args.get('name')
    url = request.args.get('url')

    if not name and not url:
        return jsonify({"error": "Missing 'name' or 'url' parameter."}), 400

    if name:
        video_info = search_video(name)
        if not video_info:
            return jsonify({"error": "Video not found."}), 404
        url = video_info['webpage_url']

    filename, info_dict = download_video(url, format)
    if not filename or not os.path.exists(filename):
        return jsonify({"error": "Failed to download video."}), 500

    try:
        return send_file(filename, as_attachment=True)
    finally:
        if filename and os.path.exists(filename):
            os.remove(filename)

if __name__ == '__main__':
    app.run(debug=True)
